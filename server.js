const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard')
const perfilRoutes = require('./routes/perfil');
const retoRoutes = require('./routes/reto');
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'production'}`,
});

const app = express();

// Habilitar el modo de depuración de mongoose para ver las consultas
mongoose.set('debug', true);

// Middleware
app.use(cors({
  origin: '*', // O configura específicamente los orígenes permitidos
}));
app.use(express.json());

// Rutas de autenticación
app.use('/api', authRoutes);

// Rutas protegidas
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/perfil', perfilRoutes);
app.use('/api/reto', retoRoutes);

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('No se pudo conectar a MongoDB', err));

// Iniciar servidor
const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => console.log(`Servidor en puerto ${port}`));
