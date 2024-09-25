const mongoose = require('mongoose');

const retoSchema = new mongoose.Schema({
  tema: { type: String, required: true },
  subtema: { type: String, required: true },
  nombre: { type: String, required: true },
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
        switch (this.tipo) {
          case 'abierto':
            return typeof respuesta === 'string';  // Debe ser texto
          case 'multiple':
            return typeof respuesta === 'number' && respuesta < 6;  // Número menor a 10
          case 'booleano':
            return typeof respuesta === 'boolean';  // Debe ser booleano
          case 'numerico':
            return Array.isArray(respuesta) && respuesta.length === 2 && respuesta.every(num => typeof num === 'number');  // Arreglo de 2 números
          default:
            return false;
        }
      },
      message: props => `Respuesta inválida para el tipo de reto ${props.value}`
    }
  },
  razonamiento: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Reto', retoSchema);

