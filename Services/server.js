const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const fs = require('fs');
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

const transporter = nodemailer.createTransport({
    service: 'gmail', // Puedes usar cualquier servicio de correo electrónico
    auth: {
        user: 'poncealucard@gmail.com',
        pass: 'egapytjokznsagqt'
    }
});


const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Obtener el token del header

    if (!token) {
        return res.status(401).json({ message: 'Token no proporcionado' });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Token inválido o expirado' });
        }

        req.user = decoded; // Asigna los datos del usuario al objeto `req`
        next();
    });
};



const generateRandomPassword = () => {
    return Math.random().toString(36).slice(-8); // Genera una contraseña aleatoria de 8 caracteres
};
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

    if (storedAttempts.lockUntil && now < storedAttempts.lockUntil) {
        return { allowed: false, message: "Cuenta bloqueada. Intenta más tarde." };
    }

    return { allowed: storedAttempts.attempts < 3, message: "Intenta iniciar sesión nuevamente." };
};

const updateAttempts = async (email, reset = false) => {
    const userDoc = db.collection("loginAttempts").doc(email);
    const docSnap = await userDoc.get();
    let attempts = reset ? 0 : (docSnap.exists ? docSnap.data().attempts + 1 : 1);
    let lockUntil = null;
    if (attempts >= 3) {
        lockUntil = Date.now() + 10 * 1000;
    }
    await userDoc.set({ attempts, lockUntil }, { merge: true });
};

// Almacenamiento temporal de códigos de verificación
const verificationCodes = {};

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const { allowed, message } = await checkAttempts(email);

    const now = new Date().toISOString();

    if (!allowed) {
        const userDoc = await db.collection("loginAttempts").doc(email).get();
        const lockUntil = userDoc.data().lockUntil;
        const unlockTime = new Date(lockUntil).toISOString();

        const logMessage = `${now} - Cuenta BLOQUEADA para ${email}. Desbloqueo a las: ${unlockTime}\n`;
        fs.appendFile('log.txt', logMessage, (err) => {
            if (err) {
                console.error('Error al escribir en el archivo de logs:', err);
            }
        });
        return res.status(403).json({ message: "Cuenta bloqueada. Intenta más tarde." });
    }

    try {
        const userDoc = await db.collection("users").doc(email).get();
        if (!userDoc.exists) {
            const logMessage = `${now} - Usuario NO encontrado: ${email}\n`;
            fs.appendFile('log.txt', logMessage, () => { });
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        const userData = userDoc.data();
        const isMatch = await bcrypt.compare(password, userData.password);

        if (!isMatch) {
            await updateAttempts(email);
            const logMessage = `${now} - Intento FALLIDO de ${email}\n`;
            fs.appendFile('log.txt', logMessage, () => { });
            return res.status(401).json({ message: "Credenciales incorrectas" });
        }

        // Generar un código de verificación
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        verificationCodes[email] = verificationCode;

        // Enviar el código por correo electrónico
        const mailOptions = {
            from: 'poncealucard@gmail.com',
            to: email,
            subject: 'Código de Verificación',
            text: `Tu código de verificación es: ${verificationCode}`,
        };

        await transporter.sendMail(mailOptions);

        const logMessage = `${now} - Código de verificación enviado a ${email}\n`;
        fs.appendFile('log.txt', logMessage, () => { });

        return res.status(200).json({ message: "Código de verificación enviado" });
    } catch (error) {
        const logMessage = `${now} - Error de servidor para ${email}: ${error.message}\n`;
        fs.appendFile('log.txt', logMessage, () => { });
        return res.status(500).json({ message: "Error en el servidor. Intenta nuevamente." });
    }
});

// Endpoint para verificar el código
app.post("/verify", async (req, res) => {
    const { email, code } = req.body;

    try {
        if (verificationCodes[email] === code) {
            // Generar un token JWT
            const userDoc = await db.collection("users").doc(email).get();
            const userData = userDoc.data();
            const token = jwt.sign({ email, role: userData.role }, SECRET_KEY, { expiresIn: "10m" });

            // Eliminar el código de verificación después de usarlo
            delete verificationCodes[email];

            const logMessage = `${new Date().toISOString()} - Inicio de sesión EXITOSO de ${email}\n`;
            fs.appendFile('log.txt', logMessage, () => { });

            return res.status(200).json({ token, role: userData.role });
        } else {
            return res.status(400).json({ message: "Código de verificación incorrecto" });
        }
    } catch (error) {
        const logMessage = `${new Date().toISOString()} - Error al verificar el código para ${email}: ${error.message}\n`;
        fs.appendFile('log.txt', logMessage, () => { });
        return res.status(500).json({ message: "Error en el servidor. Intenta nuevamente." });
    }
});



app.post("/reset-password", async (req, res) => {
    const { email } = req.body;
    try {
        const newPassword = generateRandomPassword();
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.collection("users").doc(email).update({ password: hashedPassword });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Restablecimiento de contraseña',
            text: `Tu nueva contraseña es: ${newPassword}`
        };

        await transporter.sendMail(mailOptions);

        res.json({ message: "Correo de recuperación enviado" });
    } catch (error) {
        console.error("Error al enviar el correo de recuperación:", error);
        res.status(400).json({ message: "No se pudo enviar el correo", error: error.message });
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

app.get("/some-protected-route", verifyToken, (req, res) => {
    res.json({ message: "Validación de token correco y Ruta protegida accedida correctamente", user: req.user });
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));