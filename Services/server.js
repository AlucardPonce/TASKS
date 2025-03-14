const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');

app.use(cors());

app.use(bodyParser.json());
app.use(express.json());

const users = [];

app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const secret = speakeasy.generateSecret({ length: 20 });

    const user = {
        email,
        password: hashedPassword,
        secret: secret.base32
    };

    users.push(user);

    const otpauthUrl = `otpauth://totp/${email}?secret=${secret.base32}&issuer=MiApp`;

    res.json({ secret: otpauthUrl }); // Enviamos la URL compatible con QR
    console.log(users);
});


app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = users.find(user => user.email === email);

    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    res.json({ requiresMFA: true, message: "Usuario autenticado. Ingresa el código OTP" });
});


app.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    const user = users.find(user => user.email === email);

    if (!user) {
        return res.status(400).json({ message: "Usuario no encontrado" });
    }

    const verify = speakeasy.totp.verify({
        secret: user.secret,
        encoding: 'base32',
        token: otp,
        window: 1
    });

    if (verify) {
        res.json({ message: 'Inicio de sesión exitoso' });
    } else {
        res.status(400).json({ message: 'Código OTP incorrecto' });
    }
});

app.listen(3001, () => { console.log('Server running on port 3001'); });
