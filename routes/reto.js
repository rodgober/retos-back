const Reto = require('../models/Reto');
const User = require('../models/User');
const express = require('express');
const { protect, admin, user } = require('../middleware/authMiddleware');
const router = express.Router();
const cloudinary = require('../cloudinary');
const multer = require('multer');
const path = require('path');

// Configurar multer para manejar los archivos de imagen
const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Ruta para agregar un nuevo reto (solo accesible por administradores)
router.post('/agregar', protect, admin, upload.fields([
  { name: 'pregunta', maxCount: 1 },
  { name: 'opciones', maxCount: 1 },  
  { name: 'razonamiento', maxCount: 1 }
]), async (req, res) => {
  const { tema, subtema, nombre, tipo, respuesta } = req.body;

  try {

    let valorConvertido;

    // Usamos un switch para convertir el valor según el tipo de reto
    switch (tipo) {
      case 'multiple':
        valorConvertido = parseInt(respuesta, 10); // Para opción múltiple (entero)
        break;
      case 'booleano':
        valorConvertido = respuesta === 'true';  // Para booleans (true/false)
        break;
      case 'numerico':
        valorConvertido = respuesta.split(',').map(num => parseFloat(num)); // Para rango numérico (arreglo de flotantes)
        break;
      case 'abierto':
      default:
        valorConvertido = respuesta; // Para respuestas abiertas (texto, sin conversión)
        break;
    }

    const preguntaResult = await cloudinary.uploader.upload(req.files['pregunta'][0].path, {
      folder: 'retos',  // Puedes especificar un folder en Cloudinary
    });

    let opcionesResult = null;
    if (req.files['opciones']) {
      opcionesResult = await cloudinary.uploader.upload(req.files['opciones'][0].path, {
        folder: 'opciones',  // Puedes especificar un folder en Cloudinary
      });
    }

    // Subir la imagen de la explicación a Cloudinary
    const razonamientoResult = await cloudinary.uploader.upload(req.files['razonamiento'][0].path, {
      folder: 'razonamientos',  // Puedes especificar un folder en Cloudinary
    });

    const nuevoReto = new Reto({
      tema,
      subtema,
      nombre,
      pregunta: preguntaResult.secure_url,
      tipo,
      opciones: opcionesResult ? opcionesResult.secure_url : null,
      razonamiento: razonamientoResult.secure_url,
      respuesta: valorConvertido,
    });
    
    const retoGuardado = await nuevoReto.save();
    res.status(201).json({
      message: 'Reto agregado con éxito',
      reto: retoGuardado,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al agregar el reto', reto });
  }
});

// Ruta para listar retos (ruta más específica primero) (muestra los contestados por el user y  5 que no ha contestado)
router.get('/listar', protect, async (req, res) => {
  try {
    // Obtener el usuario autenticado
    const usuarioId = req.user._id;

    // Obtener los retos que ya ha resuelto el usuario
    const usuario = await User.findById(usuarioId).populate('answers.reto_id'); // answers es el campo donde se guardan los retos resueltos

    const retosResueltosIds = usuario.answers.map(answer => answer.reto_id); // Obtener los IDs de los retos resueltos

    // Buscar 5 retos que no estén en la lista de retos resueltos
    const retosNoResueltos = await Reto.find({ _id: { $nin: retosResueltosIds } }).limit(5);
    res.status(200).json(retosNoResueltos);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar retos', error });
  }
});

// Ruta para obtener los retos resueltos por un user, protegida para usuarios autenticados con rol 'user'
router.get('/resueltos', protect, user, async (req, res) => {
  const userId = req.user._id;
  try {
    const user = await User.findById(userId); // Busca el reto por ID

    if (user) {
      res.json(user.answers); // Si el reto existe, devuelve los detalles
    } else {
      res.status(404).json({ message: 'Usuario no encontrado' }); // Si no se encuentra, error 404
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el usuario' }); // Error en el servidor
  }
});

// Ruta para obtener los detalles de un reto por su ID, protegida para usuarios autenticados con rol 'user'
router.get('/:id', protect, user, async (req, res) => {
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

// Ruta para recibir la respuesta del usuario
router.post('/:id/responder', protect, async (req, res) => {
  const { id } = req.params;
  const { respuesta, nombre } = req.body; // Respuesta enviada por el usuario
  const userId = req.user._id; // Asumiendo que tienes la info del usuario autenticado

  try {

    // Buscar el reto por su ID
    const reto = await Reto.findById(id);
    if (!reto) {
      return res.status(404).json({ message: 'Reto no encontrado' });
    } 
    // Comparar la respuesta del usuario con la solución del reto
    const esCorrecto = compararRespuestas(reto, respuesta);
    
    if (esCorrecto) {
      // Si la respuesta es correcta, actualizar el registro del usuario
    const user = await User.findById(userId);
      user.answers.push({
        reto_id: id,
        nombre: nombre,
        respuesta: respuesta,
        fecha_respuesta: new Date(),
      });
      await user.save();
      // Puedes también incrementar puntos u otros aspectos del usuario
      return res.json({ message: 'Respuesta correcta', correcto: true });
    } else {
      return res.json({ message: 'Respuesta incorrecta', correcto: false });
    } 
  } catch (error) {
    return res.status(500).json({ message: 'Error al verificar la respuesta', error });
  }
  
  // Función para comparar la respuesta del usuario con la correcta
    function compararRespuestas(reto, respuesta) {
      // Aquí va la lógica de comparación. Ejemplo para varios tipos de retos:
      if (reto.tipo === 'abierto') {
        return reto.respuesta.toLowerCase() === respuesta.toLowerCase();
      } else if (reto.tipo === 'multiple') {
        return reto.respuesta === parseInt(respuesta);
      } else if (reto.tipo === 'booleano') {
        return String(reto.respuesta).toLowerCase() === respuesta.toLowerCase();
      } else if (reto.tipo === 'numerico') {
        const [min, max] = reto.respuesta; // Asumiendo que la respuesta es un rango
        const respuestaNumerica = parseFloat(respuesta);
        return respuestaNumerica >= min && respuestaNumerica <= max;
      }
      return false; // Si el tipo de reto no coincide 
    }
});

// Ruta para verificar si el usuario ya ha contestado el reto
router.get('/:id/resuelto', protect, async (req, res) => {
  const { id: retoId } = req.params;
  const userId = req.user._id; // Se obtiene el id del usuario autenticado

  try {
    // Buscar al usuario por su ID y verificar si ya ha contestado el reto
    const user = await User.findById(userId).select('answers');
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar si el reto ya está en las respuestas del usuario
    const retoResuelto = user.answers.find(answer => 
      answer.reto_id.toString() === retoId
    );
    console.log(retoResuelto);
    if (retoResuelto) {
      return res.status(200).json(retoResuelto);
    } else {
      return res.status(404).json({ message: 'Reto no contestado' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Error al verificar contestación', error });
  }
});

module.exports = router;
