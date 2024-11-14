// routes/contact.js
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

router.post('/mensaje', async (req, res) => {
    const { email, message } = req.body;

    // Configura el transportador de Nodemailer
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

    try {
        // Configura el mensaje de correo
        await transporter.sendMail({
            from: email, // Correo del remitente
            to: 'rodrigogon@gmail.com', // Tu dirección de correo a la que quieres recibir el mensaje
            subject: 'Nuevo mensaje de contacto en Mathethon.com',
            text: message, // Mensaje
            html: `<p>Correo: ${email}</p><p>Mensaje: ${message}</p>`, // Mensaje en HTML
        });

        res.status(200).json({ message: 'Mensaje enviado con éxito' });
    } catch (error) {
        console.error("Error al enviar el correo:", error);
        res.status(500).json({ message: 'Error al enviar el mensaje' });
    }
});

module.exports = router;
