const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const serviceAccount = JSON.parse(process.env.FSA);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const app = express();
app.use(express.json());
app.use(cors());

db.collection('users').limit(1).get()
    .then(() => console.log('✅ Conexión a Firebase establecida correctamente'))
    .catch((err) => console.error('❌ Error al conectar con Firebase:', err));

const SECRET_KEY = process.env.JWT_SECRET || "supersecret";

const checkAttempts = async (email) => {
    const userDoc = db.collection("loginAttempts").doc(email);
    const docSnap = await userDoc.get();
    const storedAttempts = docSnap.exists ? docSnap.data() : { attempts: 0, lockUntil: null };

    const now = Date.now();

    // Si el tiempo de bloqueo ha expirado, restablecer los intentos
    if (storedAttempts.lockUntil && now >= storedAttempts.lockUntil) {
        await userDoc.set({ attempts: 0, lockUntil: null }, { merge: true });
        storedAttempts.attempts = 0;
        storedAttempts.lockUntil = null;
    }

    // Si la cuenta está bloqueada, devolver un mensaje de error
    if (storedAttempts.lockUntil && now < storedAttempts.lockUntil) {
        return { allowed: false, message: "Cuenta bloqueada. Intenta más tarde." };
    }

    // Si no está bloqueada, devolver el estado actual
    return { allowed: storedAttempts.attempts < 3, message: "Intenta iniciar sesión nuevamente." };
};

const updateAttempts = async (email, reset = false) => {
    const userDoc = db.collection("loginAttempts").doc(email);
    const docSnap = await userDoc.get();
    let attempts = reset ? 0 : (docSnap.exists ? docSnap.data().attempts + 1 : 1);
    let lockUntil = null;
    if (attempts >= 3) {
        lockUntil = Date.now() + 10 * 1000; // Bloquea por 10 segundos
    }
    await userDoc.set({ attempts, lockUntil }, { merge: true });
};

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const { allowed, message } = await checkAttempts(email);
    if (!allowed) return res.status(403).json({ message }); // Mensaje de cuenta bloqueada

    try {
        const userDoc = await db.collection("users").doc(email).get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: "Usuario no encontrado" }); // Mensaje de usuario no encontrado
        }

        const userData = userDoc.data();
        const isMatch = await bcrypt.compare(password, userData.password);
        if (!isMatch) {
            await updateAttempts(email);
            return res.status(401).json({ message: "Credenciales incorrectas" }); // Mensaje de credenciales incorrectas
        }

        await updateAttempts(email, true);
        const token = jwt.sign({ email, role: userData.role }, SECRET_KEY, { expiresIn: "10m" });
        res.json({ token, role: userData.role });
    } catch (error) {
        res.status(500).json({ message: "Error en el servidor. Intenta nuevamente." }); // Mensaje de error genérico
    }
});

app.post("/reset-password", async (req, res) => {
    const { email } = req.body;
    try {
        await admin.auth().generatePasswordResetLink(email);
        res.json({ message: "Correo de recuperación enviado" });
    } catch (error) {
        res.status(400).json({ message: "No se pudo enviar el correo" });
    }
});
const createUserRole = async (email, role) => {
    try {
        await db.collection("roles").doc(email).set({ role });
        console.log(`Rol '${role}' asignado al usuario ${email}`);
    } catch (error) {
        console.error(`Error al asignar rol al usuario ${email}:`, error);
    }
};

const createLoginAttempt = async (email) => {
    try {
        await db.collection("loginAttempts").doc(email).set({ attempts: 0, lockUntil: null }, { merge: true });
        console.log(`Intentos de inicio de sesión para el usuario ${email} creados.`);
    } catch (error) {
        console.error(`Error al crear intentos de inicio de sesión para ${email}:`, error);
    }
};
app.post("/register", async (req, res) => {
    const { email, password, role } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.collection("users").doc(email).set({ email, password: hashedPassword, role });

        await createUserRole(email, role);
        await createLoginAttempt(email);

        res.status(201).json({ message: "Usuario registrado correctamente" });
    } catch (error) {
        res.status(400).json({ message: `Error al registrar usuario: ${error.message}` });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));