import React, { useState } from "react";
import { Form, Input, Button, message, Card } from "antd";
import axios from "axios";

const API_URL = "http://localhost:3001";

const Login = () => {
    const [loading, setLoading] = useState(false);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            // Enviamos la solicitud de login
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
            // Manejo de errores mejorado
            const errorMessage = error.response?.data?.message || "Error en el inicio de sesión";
            console.error("Error al iniciar sesión:", errorMessage);
            message.error(errorMessage); // Mostrar mensaje de error en el frontend
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
                // Mejor manejo de errores en la función de restablecimiento de contraseña
                const resetErrorMessage = error.response?.data?.message || "No se pudo enviar el correo";
                console.error("Error al enviar el correo de recuperación:", resetErrorMessage);
                message.error(resetErrorMessage); // Mostrar mensaje de error en el frontend
            }
        }
    };

    return (
        <Card title="Iniciar Sesión" style={{ width: 400, margin: "50px auto" }}>
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