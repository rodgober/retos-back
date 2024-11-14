const Reto = require('../models/Reto');
const User = require('../models/User');
const express = require('express');
const { protect, admin, user } = require('../middleware/authMiddleware');
const router = express.Router();
require('dotenv').config();
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const multer = require('multer');
const path = require('path');



// Configurar multer para manejar los archivos de imagen
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Define el directorio donde se guardarán temporalmente los archivos
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });
///////////////////////////////////////////////////


router.post("/subir", upload.single("image"), async (req, res) => {

  try {
    const result = await cloudinary.uploader.upload(req.file.path);

    // Borra la imagen del almacenamiento temporal
    fs.unlinkSync(req.file.path);

    // Respuesta con la URL de la imagen
    res.json({ imageUrl: result.secure_url });
  } catch (error) {
    res.status(500).json({ error: "Error al subir la imagen" });
  }
});



////////////////////////////////////////////////////7

router.get('/', (req, res) => {
  res.status(200).json({ version: "1.4" });
});

// Ruta para agregar un nuevo reto (solo accesible por administradores)
router.post('/agregar', protect, admin, upload.fields([
  { name: 'pregunta', maxCount: 1 },
  { name: 'opciones', maxCount: 1 },  
  { name: 'razonamiento', maxCount: 1 }
]), async (req, res) => {
  const { tema, subtema, nombre, activo, tipo, respuesta, nivel } = req.body;
  console.log(req.files);
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
        console.log('Cloudinary config:', {
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });
        let preguntaResult;
        let razonamientoResult;
        let opcionesResult = null;
        const fs = require('fs');
                  try {
                    // Subir la imagen de la pregunta primero
                    const preguntaResult = await cloudinary.uploader.upload(req.files['pregunta'][0].path, {
                      folder: 'retos',  // Subir al folder 'retos'
                    });
                  
                    console.log("Pregunta subida:", preguntaResult.secure_url);

                    
                    if (req.files['opciones']) {
                      opcionesResult = await cloudinary.uploader.upload(req.files['opciones'][0].path, {
                        folder: 'opciones',  // Puedes especificar un folder en Cloudinary
                      });
                      fs.unlink(req.files['opciones'][0].path, (err) => {
                        if (err) console.error('Error al borrar archivo de pregunta:', err);
                      });

                    }
                    
                    // Subir la imagen del razonamiento después de que la pregunta haya sido subida
                    const razonamientoResult = await cloudinary.uploader.upload(req.files['razonamiento'][0].path, {
                      folder: 'razonamientos',  // Subir al folder 'razonamientos'
                    });
                  
                    // Borrar archivos temporales
                    fs.unlink(req.files['pregunta'][0].path, (err) => {
                      if (err) console.error('Error al borrar archivo de pregunta:', err);
                    });
                    fs.unlink(req.files['razonamiento'][0].path, (err) => {
                      if (err) console.error('Error al borrar archivo de razonamiento:', err);
                    });

                    const nuevoReto = new Reto({
                      tema,
                      subtema,
                      nombre,
                      nivel,
                      activo,
                      pregunta: preguntaResult.secure_url,
                      tipo,
                      opciones: opcionesResult ? opcionesResult.secure_url : null,
                      razonamiento: razonamientoResult.secure_url,
                      respuesta: valorConvertido
                    });

                    const retoGuardado = await nuevoReto.save();
                    res.status(201).json({
                      message: 'Reto agregado con éxito',
                      reto: retoGuardado,
                    });
                  
                  } catch (err) {
                    console.error("Error al subir archivos a Cloudinary:", err);
                  }  
    
  } catch (error) {
    if (error.name === 'ValidationError') {
      res.status(400).json({
          message: 'Error de validación al agregar el reto',
          errors: error.errors  // Detalles específicos de la validación
      });
  } else {
      res.status(500).json({
          message: 'Error al agregar el reto',
          error: error.message,  // Mensaje de error
          stack: error.stack     // Stack trace para depuración
      });
  }
  }
});

router.put('/editar/:id', protect, admin, upload.fields([
  { name: 'pregunta', maxCount: 1 },
  { name: 'opciones', maxCount: 1 },  
  { name: 'razonamiento', maxCount: 1 }
]), async (req, res) => {

  console.log("Así llega para editar un reto")
  console.log(req.body)

  const retoId = req.params.id;
  const updatedData = req.body; // Los campos que quieres actualizar

  let preguntaResult = null;
  if (req.files['pregunta']) {
    preguntaResult = await cloudinary.uploader.upload(req.files['pregunta'][0].path, {
      folder: 'retos',  // Puedes especificar un folder en Cloudinary
    });
  }

  let razonamientoResult = null;
  if (req.files['razonamiento']) {
    razonamientoResult = await cloudinary.uploader.upload(req.files['razonamiento'][0].path, {
      folder: 'razonamientos',  // Puedes especificar un folder en Cloudinary
    });
  }

  let opcionesResult = null;
  if (req.files['opciones']) {
    opcionesResult = await cloudinary.uploader.upload(req.files['opciones'][0].path, {
      folder: 'opciones',  // Puedes especificar un folder en Cloudinary
    });
  }

  
  let valorConvertido;
    // Usamos un switch para convertir el valor según el tipo de reto
    switch (updatedData.tipo) {
      case 'multiple':
        valorConvertido = parseInt(updatedData.respuesta, 10); // Para opción múltiple (entero)
        break;
      case 'booleano':
        valorConvertido = updatedData.respuesta === 'true';  // Para booleans (true/false)
        break;
      case 'numerico':
        valorConvertido = updatedData.respuesta.split(',').map(num => parseFloat(num)); // Para rango numérico (arreglo de flotantes)
        break;
      case 'abierto':
      default:
        valorConvertido = updatedData.respuesta; // Para respuestas abiertas (texto, sin conversión)
        break;
    }
    if (updatedData.respuesta){
      updatedData.respuesta = valorConvertido
    }

  try {
    
    if (preguntaResult) {
      updatedData.pregunta = preguntaResult.secure_url;
    }
    if (razonamientoResult) {
      updatedData.razonamiento = razonamientoResult.secure_url;
    }
    if (opcionesResult) {
      updatedData.opciones = opcionesResult.secure_url;
    }else{
      updatedData.opciones = null;
    }
    console.log(updatedData);
    // Busca el reto por su id y actualiza los campos
    const retoActualizado = await Reto.findById(retoId);  // Obtener el reto original
    if (!retoActualizado) {
      throw new Error('Reto no encontrado');
    }
    
    // Actualiza solo los campos que necesitas
    Object.assign(retoActualizado, updatedData);
    
    // Guarda el documento actualizado
    await retoActualizado.save();  // Esto disparará los hooks de validación y el pre-hook
    
    console.log('Reto actualizado correctamente:', retoActualizado);
    

    if (!retoActualizado) {
      return res.status(404).json({ message: 'Reto no encontrado' });
    }

    res.status(200).json({ message: 'Reto actualizado', reto: retoActualizado });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el reto', error: error.message });
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
   // const retosNoResueltos = (await Reto.find({ _id: { $nin: retosResueltosIds }, activo: true }).limit(5).select('_id nombre'));
    const retosNoResueltos = await Reto.find({
      _id: { $nin: retosResueltosIds },
      activo: true
  })
  .sort({ nivel: 1, createdAt: 1 }) // Ordena por nivel de menor a mayor
  .limit(5)
  .select('_id nombre');
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

// Endpoint para obtener TODOS los retos activos
router.get('/activos', protect, async (req, res) => {
  try {
    // Buscar 5 retos que no estén en la lista de retos resueltos
    const activos = (await Reto.find({ activo: true }).select('_id nombre nivel'));
    res.status(200).json(activos);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar retos', error });
  }
});

// Endpoint para obtener TODOS los retos activos
router.get('/inactivos', protect, async (req, res) => {
  try {
    // Buscar 5 retos que no estén en la lista de retos resueltos
    const activos = (await Reto.find({ activo: false }).select('_id nombre'));
    res.status(200).json(activos);
  } catch (error) {
    res.status(500).json({ message: 'Error al listar retos', error });
  }
});

// Ruta para obtener los detalles de un reto por su ID, protegida para usuarios autenticados con rol 'user'
router.get('/:id', protect, user, async (req, res) => {
  try {
    const reto = await Reto.findById(req.params.id).select('-respuesta -razonamiento'); // Busca el reto por ID

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
      const user = await User.findById(userId);
      user.attempts.push({
        reto_id: id,
        nombre: nombre,
        respuesta: respuesta,
        fecha_respuesta: new Date(),
      });
      await user.save();
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
    };
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
    let retoResuelto = user.answers.find(answer => 
      answer.reto_id.toString() === retoId
    );
    if (retoResuelto) {
      //Esta es la solución que yo propuse antes de chatGPT
      const reto = await Reto.findById(retoId).select('tipo razonamiento');
      const retoResueltoConRazonamiento = JSON.parse(JSON.stringify(retoResuelto));
      retoResueltoConRazonamiento.razonamiento = reto.razonamiento ;
      retoResueltoConRazonamiento.tipo = reto.tipo ;
      return res.status(200).json(retoResueltoConRazonamiento);
    } else {
      return res.status(404).json({ message: 'Reto no contestado' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Error al verificar contestación', error });
  }
});

// Ruta para verificar el número de intentos para el reto
router.get('/:id/intentos', protect, async (req, res) => {
  const { id: retoId } = req.params;
  const userId = req.user._id; // Se obtiene el id del usuario autenticado

  try {
    // Buscar al usuario por su ID y verificar si ya ha contestado el reto
    const user = await User.findById(userId).select('attempts');
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar si el reto ya está en las respuestas del usuario
    const intentos = user.attempts.filter(answer => 
      answer.reto_id.toString() === retoId
    );
    console.log(intentos);
    if (intentos) {
      return res.status(200).json(intentos);
    } else {
      return res.status(404).json({ message: 'No hay intentos' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Error al verificar contestación', error });
  }
});

// Endpoint para obtener el número de retos activos
router.get('/retosactivos/count', protect, async (req, res) => {
  try {
      // Contar usuarios con rol "user"
      const count = await Reto.countDocuments({ activo: 'true' });
      res.json({ totalRetos: count });
  } catch (error) {
      console.error('Error al contar retos:', error);
      res.status(500).json({ message: 'Error al contar retos' });
  }
});

module.exports = router;
