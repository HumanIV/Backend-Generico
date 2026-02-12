import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/user.routes.js";
import productRoutes from './routes/product.routes.js';
import orderRoutes from './routes/order.routes.js';
import invoiceRoutes from "./routes/invoice.routes.js";

// IMPORTAR MIDDLEWARES DE PROTECCIÓN
import { routeGuard } from "./middlewares/routeGuard.middleware.js";

dotenv.config();

const app = express();

// ============================================
// CONFIGURACIÓN CORS MEJORADA
// ============================================
// Configuración principal de CORS
const corsOptions = {
  origin: function (origin, callback) {
    // En desarrollo, permitir cualquier origen
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      console.log(`🌍 Desarrollo: Permitiendo origen ${origin}`);
      return callback(null, true);
    }
    
    // En producción, solo permitir orígenes específicos
    const allowedOrigins = [
      'https://aplicationfrontend.netlify.app',
      'http://localhost:3000',
      'http://localhost:5173'
    ];
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
  maxAge: 86400 // 24 horas para cachear preflight
};

app.use(cors(corsOptions));

// ============================================
// MIDDLEWARE ESPECIAL PARA PREFLIGHT REQUESTS
// ============================================
// Middleware para manejar todas las preflight requests manualmente
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    console.log(`🔄 Preflight request para: ${req.path}`);
    
    // Establecer headers CORS
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Max-Age', '86400');
    
    return res.status(204).end(); // No Content
  }
  next();
});

// ============================================
// MIDDLEWARES BÁSICOS
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// LOGGING DE PETICIONES
// ============================================
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'} - ${new Date().toLocaleTimeString()}`);
  next();
});

// ============================================
// RUTAS PÚBLICAS (NO REQUIEREN AUTENTICACIÓN)
// ============================================
app.get("/api/health", (req, res) => {
  // Headers CORS explícitos
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  res.json({
    ok: true,
    message: "✅ API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    cors: "Configurado correctamente",
    backendUrl: "http://localhost:3001",
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
    status: "Conectado y listo"
  });
});

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Bienvenido a la API de Gescol",
    endpoints: {
      auth: "/api/users",
      health: "/api/health",
      verify: "/api/verify-permission"
    },
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development"
  });
});

// Ruta de utilidad para el frontend
app.get("/api/verify-permission", (req, res) => {
  res.json({
    ok: true,
    message: "Sistema de protección de rutas activo",
    features: {
      jwtAuthentication: true,
      roleBasedAuthorization: true,
      routeGuardMiddleware: true,
      autoRoleVerification: true
    },
    timestamp: new Date().toISOString()
  });
});

// ============================================
// MIDDLEWARE DE PROTECCIÓN GLOBAL DE RUTAS
// ============================================
app.use(routeGuard());

// ============================================
// RUTAS PROTEGIDAS (REQUIEREN AUTENTICACIÓN)
// ============================================
app.use("/api/users", userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use("/api/invoices", invoiceRoutes);

// ============================================
// MIDDLEWARE PARA RUTAS NO ENCONTRADAS
// ============================================
app.use((req, res) => {
  console.warn(`⚠️ Ruta no encontrada: ${req.method} ${req.path}`);
  
  res.status(404).json({
    ok: false,
    msg: "Route not found",
    path: req.path,
    method: req.method,
    availableEndpoints: {
      auth: "/api/users",
      health: "/api/health",
      verify: "/api/verify-permission"
    }
  });
});

// ============================================
// MIDDLEWARE DE MANEJO DE ERRORES GLOBAL
// ============================================
app.use((error, req, res, next) => {
  console.error("🔥 Error global:", error.message);
  
  const statusCode = error.status || 500;
  const message = error.message || "Internal server error";
  
  res.status(statusCode).json({
    ok: false,
    msg: message,
    error: process.env.NODE_ENV === "development" ? {
      message: error.message,
      stack: error.stack
    } : undefined,
  });
});

export default app;