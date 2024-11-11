const User = require('../models/User');
const express = require('express');
const { protect, admin, user } = require('../middleware/authMiddleware');
const router = express.Router();

//Devuelve el perfil del usuario que hace la solicitud
router.get('/', protect, user, async (req, res) => {
  const userId = req.user._id;
  try {
    const user = await User.findById(userId).select('-password -role'); // Busca el user

    if (user) {
      res.json(user); // Si el user existe, devuelve los detalles
    } else {
      res.status(404).json({ message: 'Usuario no encontrado' }); // Si no se encuentra, error 404
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el usuario' }); // Error en el servidor
  }
});



module.exports = router;
