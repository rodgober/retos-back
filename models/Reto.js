const mongoose = require('mongoose');

const retoSchema = new mongoose.Schema({
  tema: { type: String, required: true },
  subtema: { type: String, required: true },
  nombre: { type: String, required: true },
  activo: { type: Boolean, required: true, default: false },
  nivel: { type: Number, required: true, },
  pregunta: { type: String },  // URL de la imagen
  tipo: { 
    type: String, 
    enum: ['abierto', 'multiple', 'booleano', 'numerico'], 
    required: true 
  },
  opciones: {
    type: String,  // Un único string opcional
    default: null  // Opcional incluso para tipo "multiple"
  },
  respuesta: {
    type: mongoose.Schema.Types.Mixed,  // Tipo mixto para aceptar diferentes formatos
    required: true,
    validate: {
      validator: function (respuesta) {
        try {
          console.log(`Validando respuesta para el tipo de reto: ${this.tipo}`);
          console.log(`Valor de la respuesta: ${respuesta}`);
    
          // Verifica si el tipo de reto está presente
          if (!this.tipo) {
            console.error('Tipo de reto no definido');
            return false;
          }
    
          switch (this.tipo) {
            case 'abierto':
              console.log("Validando como 'abierto'");
              return typeof respuesta === 'string';  // Debe ser texto
    
            case 'multiple':
              console.log("Validando como 'multiple'");
              return typeof respuesta === 'number' && respuesta < 6;  // Número menor a 6
    
            case 'booleano':
              console.log("Validando como 'booleano'");
              console.log(`Tipo de dato de la respuesta booleano: ${typeof respuesta}`);
              return typeof respuesta === 'boolean';  // Debe ser booleano
    
            case 'numerico':
              console.log("Validando como 'numerico'");
              const isValidArray = Array.isArray(respuesta) && respuesta.length === 2 && respuesta.every(num => typeof num === 'number');
              console.log(`Respuesta es válida como numérico: ${isValidArray}`);
              return isValidArray;  // Arreglo de 2 números
    
            default:
              console.error('Tipo de reto no reconocido');
              return false;
          }
        } catch (error) {
          console.error('Error durante la validación:', error);
          return false;
        }
      },
      message: props => `Respuesta inválida para el tipo de reto ${this.tipo} con valor ${props.value}`
    }
  },
  razonamiento: { type: String, required: true }
}, { timestamps: true });

// Pre-hook para asegurarse de que el tipo esté disponible antes de validar
retoSchema.pre('validate', async function (next) {
  try {
    if (!this.isNew) {
      const retoOriginal = await this.constructor.findById(this._id);
      if (retoOriginal) {
        this.tipo = retoOriginal.tipo;  // Asigna el tipo del reto original si está presente
        console.log(`Tipo asignado desde base de datos: ${this.tipo}`);
      }
    }
    next();
  } catch (error) {
    console.error('Error en el pre-hook:', error);
    next(error);
  }
});

module.exports = mongoose.model('Reto', retoSchema);
