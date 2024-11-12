const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const crypto = require('crypto');

function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

router.post('/register', async (req, res) => {
  try {
    console.log(req.body);
    const { name, lastName, mail, password, role, nivel } = req.body;
  
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, lastName, mail, password: hashedPassword, role, nivel });
    await newUser.save();
    res.status(201).send('Usuario registrado exitosamente');
  } catch (err) {
    if (err.code === 11000) { // Código de error para índices únicos
      return res.status(400).send('El correo ya está registrado');
    }
    res.status(500).send(err.message);
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { mail, password } = req.body;
    const user = await User.findOne({ mail });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).send('Usuario y contraseña no válida');
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET);
    res.json({ token, role: user.role, name: user.name });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.post('/forgot-password', async (req, res) => {
  const { mail } = req.body;
  const user = await User.findOne({ mail });

  if (!user) {
    return res.status(404).json({ message: "Usuario no encontrado." });
  }

  const resetToken = generateResetToken();
  user.resetToken = resetToken;
  user.tokenExpires = Date.now() + 3600000; // Token válido por 1 hora
  await user.save();

  const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

  // Función para enviar el correo con el link
  //sendResetEmail(user.mail, resetLink);

  //res.json({ message: "Correo enviado con instrucciones para restablecer la contraseña." });
  res.json({ message: resetLink });
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  console.log("Token recibido: ", token);
  console.log("NewPassword recibido: ", newPassword);
  const user = await User.findOne({ resetToken: token, tokenExpires: { $gt: Date.now() } });

  if (!user) {
    return res.status(400).json({ message: "Token inválido o expirado." });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.resetToken = undefined;
  user.tokenExpires = undefined;
  await user.save();

  res.json({ message: "Contraseña restablecida correctamente." });
});



module.exports = router;
