import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = "http://localhost:3001";

const Home = () => {
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
        } else {
            verifyToken(token);
        }
    }, [navigate]); // Dependencia de navigate

    const verifyToken = async (token) => {
        try {
            const response = await axios.get(`${API_URL}/some-protected-route`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
    
            setMessage(response.data.message);
        } catch (error) {
            if (error.response && error.response.status === 401) {
                setMessage('Token inválido o expirado. Por favor, inicia sesión de nuevo.');
                localStorage.removeItem('token'); 
                navigate('/login'); 
            } else {
                setMessage('Ocurrió un error. Intenta nuevamente.');
            }
        }
    };
    

    return (
        <div>
            <h1>Página Protegida</h1>
            <p>{message}</p>
        </div>
    );
};

export default Home;
