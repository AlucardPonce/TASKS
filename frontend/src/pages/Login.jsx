import React, { useState, useEffect } from "react";
import { Form, Input, Button, message, Card } from "antd";
import axios from "axios";
import { loadCaptchaEnginge, LoadCanvasTemplate, validateCaptcha } from 'react-simple-captcha';
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:3001";

const Login = () => {
    const [loading, setLoading] = useState(false);
    const [captchaInput, setCaptchaInput] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");
    const [step, setStep] = useState("login"); // 'login' o 'verify'
    const navigate = useNavigate();

    useEffect(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        loadCaptchaEnginge(6);
    }, []);

    const onFinish = async (values) => {
        if (!validateCaptcha(captchaInput)) {
            message.error("Captcha incorrecto, por favor intenta de nuevo");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/login`, {
                email: values.email,
                password: values.password,
            });

            if (response.data.message === "Código de verificación enviado") {
                setEmail(values.email);
                setPassword(values.password);
                setStep("verify");
                message.success("Código de verificación enviado");
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Error en el inicio de sesión";
            message.error(errorMessage);
        }
        setLoading(false);
    };

    const handleVerify = async () => {
        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/verify`, {
                email,
                code,
            });

            const { token, role } = response.data;
            localStorage.setItem("token", token);
            localStorage.setItem("role", role);
            message.success("Inicio de sesión exitoso");
            navigate("/home");
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Error al verificar el código";
            message.error(errorMessage);
        }
        setLoading(false);
    };

    const handleResetPassword = async () => {
        const email = prompt("Ingresa tu correo para restablecer la contraseña:");
        if (email) {
            try {
                await axios.post(`${API_URL}/reset-password`, { email });
                message.success("Correo de recuperación enviado");
            } catch (error) {
                const resetErrorMessage = error.response?.data?.message || "No se pudo enviar el correo";
                message.error(resetErrorMessage);
            }
        }
    };

    return (
        <Card title="Iniciar Sesión" style={{ width: 400, margin: "50px auto" }}>
            {step === "login" ? (
                <Form layout="vertical" onFinish={onFinish}>
                    <Form.Item
                        label="Correo Electrónico"
                        name="email"
                        rules={[{ required: true, message: "Por favor ingresa tu correo" }, { type: "email", message: "Correo inválido" }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Contraseña"
                        name="password"
                        rules={[{ required: true, message: "Por favor ingresa tu contraseña" }]}
                    >
                        <Input.Password />
                    </Form.Item>

                    <Form.Item label="Captcha">
                        <LoadCanvasTemplate reloadText="Recargar" />
                        <Input
                            placeholder="Ingresa el captcha"
                            value={captchaInput}
                            onChange={(e) => setCaptchaInput(e.target.value)}
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block>
                            Iniciar Sesión
                        </Button>
                    </Form.Item>

                    <Button type="link" onClick={handleResetPassword}>
                        ¿Olvidaste tu contraseña?
                    </Button>
                </Form>
            ) : (
                <div>
                    <h2>Verificar Código</h2>
                    <div style={{ padding: "10px" }}>
                        <Input
                            style={{ padding: "10px" }}
                            placeholder="Código de verificación"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                        />
                    </div>
                    <div>
                        <Button
                            style={{ padding: "10px" }}
                            type="primary"
                            onClick={handleVerify}
                            loading={loading}
                            block
                        >
                            Verificar
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
};

export default Login;