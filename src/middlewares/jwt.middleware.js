// middlewares/jwt.middleware.js - VERSIÓN COMPLETA Y CORREGIDA
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de JWT (SIN DUPLICADOS)
const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_super_seguro_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'tu_refresh_secreto_super_seguro_2026';

// Middleware de autenticación principal
const authenticate = (req, res, next) => {
  try {
    console.log('🔐 MIDDLEWARE - Verificando autenticación...');
    
    // Obtener token del header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      console.log('❌ MIDDLEWARE - No hay header Authorization');
      return res.status(401).json({
        ok: false,
        msg: 'Acceso denegado. Token no proporcionado.'
      });
    }

    // Verificar formato "Bearer token"
    if (!authHeader.startsWith('Bearer ')) {
      console.log('❌ MIDDLEWARE - Formato de token incorrecto');
      return res.status(401).json({
        ok: false,
        msg: 'Formato de token incorrecto. Use: Bearer <token>'
      });
    }

    // Extraer token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      console.log('❌ MIDDLEWARE - Token vacío');
      return res.status(401).json({
        ok: false,
        msg: 'Token no proporcionado'
      });
    }

    console.log('🔍 MIDDLEWARE - Verificando token JWT...');
    
    // Verificar y decodificar token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    console.log('✅ MIDDLEWARE - Token válido para usuario:', {
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email
    });

    // Agregar información del usuario al request
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      Id_rol: decoded.Id_rol,
      email: decoded.email,
      nombre: decoded.nombre,
      apellido: decoded.apellido,
      avatar_url: decoded.avatar_url,
      es_empleado: decoded.es_empleado,
      es_cliente: decoded.es_cliente
    };

    next();
  } catch (error) {
    console.error('❌ MIDDLEWARE - Error de autenticación:', error.message);
    
    // Manejar diferentes tipos de errores
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        ok: false,
        msg: 'Token expirado. Por favor, inicie sesión nuevamente.'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        ok: false,
        msg: 'Token inválido o corrupto.'
      });
    }

    if (error.name === 'NotBeforeError') {
      return res.status(401).json({
        ok: false,
        msg: 'Token no activo aún.'
      });
    }

    // Error general
    return res.status(401).json({
      ok: false,
      msg: 'Error de autenticación. Token inválido o expirado.'
    });
  }
};

// Middleware para verificar roles específicos
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    console.log('👮 MIDDLEWARE - Verificando autorización para roles:', allowedRoles);
    
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        msg: 'Usuario no autenticado'
      });
    }

    const userRole = req.user.Id_rol;
    console.log('👤 MIDDLEWARE - Rol del usuario:', userRole);

    // Verificar si el rol del usuario está en los permitidos
    if (!allowedRoles.includes(userRole)) {
      console.log('❌ MIDDLEWARE - Acceso denegado. Rol no permitido');
      return res.status(403).json({
        ok: false,
        msg: 'Acceso denegado. No tienes permisos suficientes.',
        requiredRoles: allowedRoles,
        yourRole: userRole
      });
    }

    console.log('✅ MIDDLEWARE - Autorización concedida');
    next();
  };
};

// Middleware para verificar si es administrador
const isAdmin = (req, res, next) => {
  return authorize(1)(req, res, next); // ID 1 = admin
};

// Middleware para verificar si es gerente o admin
const isManagerOrAdmin = (req, res, next) => {
  return authorize(1, 2)(req, res, next); // ID 1 = admin, 2 = gerente
};

// Middleware para verificar si es empleado o superior
const isEmployeeOrAbove = (req, res, next) => {
  return authorize(1, 2, 3)(req, res, next); // admin, gerente, empleado
};

// Función para generar tokens
const generateToken = (userData) => {
  return jwt.sign(userData, JWT_SECRET, { expiresIn: '24h' });
};

// Función para generar refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

// Middleware para verificar refresh token
const verifyRefreshToken = (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        ok: false,
        msg: 'Refresh token es requerido'
      });
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    req.userId = decoded.userId;
    
    next();
  } catch (error) {
    console.error('❌ Error verificando refresh token:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        ok: false,
        msg: 'Refresh token expirado'
      });
    }
    
    return res.status(401).json({
      ok: false,
      msg: 'Refresh token inválido'
    });
  }
};

// Exportar todo
export {
  authenticate,
  authorize,
  isAdmin,
  isManagerOrAdmin,
  isEmployeeOrAbove,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  JWT_SECRET,
  JWT_REFRESH_SECRET
};

// También puedes exportar por defecto si prefieres
export default {
  authenticate,
  authorize,
  isAdmin,
  isManagerOrAdmin,
  isEmployeeOrAbove,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  JWT_SECRET,
  JWT_REFRESH_SECRET
};