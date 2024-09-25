const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRole = require('../middleware/authorizeRole');

// Ruta protegida para usuarios
router.get('/', authenticateToken, authorizeRole('user'), (req, res) => {
  res.send('Welcome to your Profile!');
});

module.exports = router;
