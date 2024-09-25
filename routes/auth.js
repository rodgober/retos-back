const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config(); // Cargar variables del archivo .env

const router = express.Router();

// Registro
router.post('/register', async (req, res) => {
  try {
    console.log(req.body);
    const { name, lastName, mail, password, role, nivel } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, lastName, mail, password: hashedPassword, role, nivel });
    await newUser.save();
    res.status(201).send('User registered');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { mail, password } = req.body;
    const user = await User.findOne({ mail });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).send('Invalid credentials');
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET);
    res.json({ token, role: user.role });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;
