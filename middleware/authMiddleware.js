const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware para verificar si el usuario tiene token correcto
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.userId).select('-password');

      next();
    } catch (error) {
      res.status(401).json({ message: 'No autorizado, token fallido' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'No autorizado, no hay token' });
  }
};

// Middleware para verificar si el usuario es admin
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Acceso denegado, no eres administrador' });
  }
};

  const user = (req, res, next) => {
    if (req.user && req.user.role === 'user') {
      next(); // Si es user, permite el acceso
    } else {
      res.status(403).json({ message: 'No autorizado, necesitas rol de usuario' });
    }
};

module.exports = { protect, admin, user };
