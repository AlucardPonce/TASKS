import React, { useState } from "react";
import { Form, Input, Button, message, Card } from "antd";
import axios from "axios";
import { loadCaptchaEnginge, LoadCanvasTemplate, validateCaptcha } from 'react-simple-captcha';

const API_URL = "http://localhost:3001";

const Login = () => {
    const [loading, setLoading] = useState(false);
    const [captchaInput, setCaptchaInput] = useState("");

    // Cargar captcha cuando el componente se monta
    React.useEffect(() => {
        loadCaptchaEnginge(6); // 6 es la cantidad de caracteres
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

            const { token, role } = response.data;
            localStorage.setItem("token", token);
            localStorage.setItem("role", role);
            message.success("Inicio de sesión exitoso");
            console.log("Usuario autenticado:", response.data);
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Error en el inicio de sesión";
            console.error("Error al iniciar sesión:", errorMessage);
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
                console.error("Error al enviar el correo de recuperación:", resetErrorMessage);
                message.error(resetErrorMessage);
            }
        }
    };

    return (
        <Card title="Iniciar Sesión" style={{ width: 400, margin: "50px auto" }}>
            <Form layout="vertical" onFinish={onFinish}>
                <Form.Item
                    label="Correo Electrónico"
                    name="email"
                    rules={[
                        { required: true, message: "Por favor ingresa tu correo" },
                        { type: "email", message: "Correo inválido" },
                    ]}
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
        </Card>
    );
};

export default Login;
