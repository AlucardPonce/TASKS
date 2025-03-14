const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

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
    res.json({ secret: secret.base32 });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = users.find(user => user.email === email);

    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!await bcrypt.compare(password, user.password)) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }
    res.json({ requiresMFA: true });
});

app.post('verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    const user = users.find(user => user.email === email);

    const verify = speakeasy.totp.verify({
        secret: user.secret,
        encoding: 'base32',
        token,
        window: 1
    });

    if (verify) {
        res.json({ message: 'Success' });
    } else {
        res.status(400).json({ success: false });
    }
});

app.listen(3001, () => {console.log('Server running on port 3001');});
