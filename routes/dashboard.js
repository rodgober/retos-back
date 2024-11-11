const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRole = require('../middleware/authorizeRole');
const User = require('../models/User');
const Reto = require('../models/Reto');

// Ruta protegida para administradores
router.get('/', authenticateToken, authorizeRole('admin'), (req, res) => {
  res.send('Welcome to the Dashboard!');
});

// Endpoint para obtener el número de usuarios con rol "user"
router.get('/usuarios/count', async (req, res) => {
  try {
      // Contar usuarios con rol "user"
      const count = await User.countDocuments({ role: 'user' });
      res.json({ totalUsers: count });
  } catch (error) {
      console.error('Error al contar usuarios:', error);
      res.status(500).json({ message: 'Error al contar usuarios' });
  }
});

// Endpoint para obtener la lista de usuarios y sus respuestas correctas"
router.get('/usuarios/top', async (req, res) => {
  console.log("Si entró");
  try {
      const usuariosOrdenados = await User.aggregate([
        {
            $addFields: {
                totalRespuestas: { $size: "$answers" } // Agrega un campo con la cantidad de respuestas
            }
        },
        {
            $sort: { totalRespuestas: -1 } // Ordena de mayor a menor según la cantidad de respuestas
        },
        {
            $project: { // Incluye solo los campos que necesitas en el resultado
                _id: 1,
                name: 1,
                lastName: 1,
                totalRespuestas: 1
            }
        }
      ]);
      res.json({ usuariosOrdenados: usuariosOrdenados });
  } catch (error) {
      console.error('Error al contar usuarios:', error);
      res.status(500).json({ message: 'Error al contar usuarios' });
  }
});

// Endpoint para obtener el número de retos activos
router.get('/retosactivos/count', async (req, res) => {
  try {
      // Contar usuarios con rol "user"
      const count = await Reto.countDocuments({ activo: 'true' });
      res.json({ totalRetos: count });
  } catch (error) {
      console.error('Error al contar retos:', error);
      res.status(500).json({ message: 'Error al contar retos' });
  }
});

// Endpoint para obtener el número de retos inactivos
router.get('/retosinactivos/count', async (req, res) => {
  try {
      // Contar usuarios con rol "user"
      const count = await Reto.countDocuments({ activo: 'false' });
      res.json({ totalRetos: count });
  } catch (error) {
      console.error('Error al contar retos:', error);
      res.status(500).json({ message: 'Error al contar retos' });
  }
});

// Endpoint para obtener el número de respuestas recibidas
router.get('/respuestas/count', async (req, res) => {
  try {
    // Obtener todos los usuarios y sumar la longitud del campo answers
    const users = await User.find({}, 'answers');  // Solo traer el campo answers
    
    // Sumar la longitud del arreglo answers de todos los usuarios
    const totalRespuestas = users.reduce((acc, user) => acc + user.answers.length, 0);
    
    res.json({ totalRespuestas });
} catch (error) {
    console.error('Error al contar respuestas:', error);
    res.status(500).json({ message: 'Error al contar respuestas' });
}
});

router.get('/reto/:id', async (req, res) => {
  try {
    const reto = await Reto.findById(req.params.id); // Busca el reto por ID
    if (reto) {
      res.json(reto); // Si el reto existe, devuelve los detalles
    } else {
      res.status(404).json({ message: 'Reto no encontrado' }); // Si no se encuentra, error 404
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el reto' }); // Error en el servidor
  }
});

module.exports = router;
