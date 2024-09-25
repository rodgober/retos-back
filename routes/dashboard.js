const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRole = require('../middleware/authorizeRole');

// Ruta protegida para administradores
router.get('/', authenticateToken, authorizeRole('admin'), (req, res) => {
  res.send('Welcome to the Dashboard!');
});

module.exports = router;
