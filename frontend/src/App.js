import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'; // Cambié 'Switch' por 'Routes' y 'Route' por la nueva versión
import Home from './pages/home';
import Login from './pages/Login';

const App = () => {
  return (
    <Router>
      <Routes> {/* Se reemplaza 'Switch' por 'Routes' */}
        <Route path="/login" element={<Login />} /> {/* Se usa 'element' en lugar de 'component' */}
        <Route path="/home" element={<Home />} />
        <Route path="/" element={<Login />} />
      </Routes>
    </Router>
  );
};

export default App;
