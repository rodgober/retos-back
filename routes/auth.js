const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const router = express.Router();

const crypto = require('crypto');

function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

router.post('/register', async (req, res) => {
  try {
    console.log(req.body);
    const { name, lastName, password, role, nivel } = req.body;
    const mail = req.body.mail.toLowerCase();
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
      return res.status(400).json({ message: "Usuario y contraseña no válida"});
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET);
    res.json({ token, role: user.role, name: user.name });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.post('/forgot-password', async (req, res) => {
  const { mail } = req.body;
  try {
          const user = await User.findOne({ mail });
          console.log(mail);
          if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado." });
          }

          const resetToken = generateResetToken();
          user.resetToken = resetToken;
          user.tokenExpires = Date.now() + 3600000; // Token válido por 1 hora
          await user.save();

          // Configuración de transporte de nodemailer
          let transporter = nodemailer.createTransport({
            service: 'Gmail', // o cualquier otro servicio de email como Outlook o SMTP personalizado
            auth: {
                user: 'rodrigogon@gmail.com', // Tu dirección de email
                pass: 'qkhxfcscokxkubah', // Tu contraseña de email o un app password si usas autenticación en dos pasos
            },
            tls: {
                rejectUnauthorized: false        // Ignorar certificados autofirmados
            }
          });

          // Enviar correo de recuperación
          const mailOptions = {
            to: user.mail,
            from: 'rodrigogon@gmail.com',
            subject: 'Recuperación de contraseña',
            text: `Recibiste este correo porque solicitaste la recuperación de tu contraseña.\n\n` +
                  `Haz clic en el siguiente enlace o cópialo en tu navegador para completar el proceso:\n\n` +
                  `https://mathethon.com/reset-password/${resetToken}\n\n` +
                  `Si no solicitaste este cambio, ignora este correo.\n`
          };
          await transporter.sendMail(mailOptions);
          res.json({ message: 'Correo de recuperación enviado' });
      } catch (error) {
          console.error(error);
          res.status(500).json({ message: 'Error al enviar el correo' });
      }

 // const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
  // Función para enviar el correo con el link
  //sendResetEmail(user.mail, resetLink);

  //res.json({ message: "Correo enviado con instrucciones para restablecer la contraseña." });
 // res.json({ message: resetLink });
});

// Endpoint de restablecimiento de contraseña en el backend (por ejemplo, en routes/auth.js)
router.post('/reset-password/:token', async (req, res) => {
  try {
      const user = await User.findOne({
          resetToken: req.params.token,
          tokenExpires: { $gt: Date.now() } // Verifica que el token no haya expirado
      });
      if (!user) return res.status(400).json({ message: 'Token inválido o expirado' });

      // Actualizar la contraseña
      const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
      user.password = hashedPassword; // Asegúrate de encriptar la contraseña antes de guardarla
      user.resetToken = undefined;
      user.tokenExpires = undefined;
      await user.save();

      res.json({ message: 'Contraseña restablecida exitosamente' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al restablecer la contraseña' });
  }
});



module.exports = router;
