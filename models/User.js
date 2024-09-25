const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  reto_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reto', // Referencia al modelo de retos
    required: true
  },
  nombre: { type: String, required: true }, //Nombre corto para reconocer mas facilmente el reto
  respuesta: { type: String, required: true },
  fecha_respuesta: {
    type: Date,
    default: Date.now // Almacena la fecha y hora actual por defecto
  }
});

const userSchema = new mongoose.Schema({
  mail: { type: String, required: true, unique: true },
  name: {type: String, required: true},
  lastName: {type: String, required: true},
  password: { type: String, required: true },
  role: { type: String, required: true },
  nivel: { type: Number, required: true},
  answers: [answerSchema],
});

const User = mongoose.model('User', userSchema);

module.exports = User;
