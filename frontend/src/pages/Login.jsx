import React, { useState } from "react";
import QRCode from "react-qr-code";
import axios from "axios";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState("login");
    const [secretUrl, setSecretUrl] = useState("");
//
    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post("http://localhost:3001/register", {
                email,
                password
            });
            console.log(res.data);
            if (res.data.secret) {
                setSecretUrl(res.data.secret);
                setStep("qr");
            }
        } catch (error) {
            console.error("Error en el registro:", error);
        }
    };
    //modif

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post("http://localhost:3001/login", {
                email,
                password
            });

            if (res.data.requiresMFA) {
                setStep("otp");
            } else {
                alert("Inicio de sesión exitoso");
            }
        } catch (error) {
            console.error("Error en inicio de sesión:", error);
            alert("Error en el inicio de sesión");
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post("http://localhost:3001/verify-otp", {
                email,
                otp
            });
            alert(res.data.message);
        } catch (error) {
            console.error("Error en la verificación de OTP:", error);
            alert("Error al verificar OTP");
        }
    };

    return (
        <div>
            {step === "login" && (
                <form onSubmit={handleLogin}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button type="submit">Iniciar sesión</button>
                    <button type="button" onClick={handleRegister}>
                        Registrarse
                    </button>
                </form>
            )}

            {step === "otp" && (
                <form onSubmit={handleVerifyOTP}>
                    <input
                        type="text"
                        placeholder="Código OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                    />
                    <button type="submit">Verificar OTP</button>
                </form>
            )}

            {step === "qr" && (
                <div>
                    <QRCode value={secretUrl} />
                    <p>Escanea este código QR con Google Authenticator</p>
                </div>
            )}
        </div>
    );
};

export default Login;
