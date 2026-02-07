import "dotenv/config";
import app from "./app.js";
import { testConnection } from "./db/connection.database.js"; // ← ¡CORREGIDO!

const PORT = process.env.PORT || 3001;

// Conectar a la base de datos y luego iniciar servidor
const startServer = async () => {
  try {
    console.log("🔍 Iniciando servidor Aplication-Backend con Neon...");
    
    // Probar conexión a la base de datos de NEON
    console.log("🔗 Probando conexión a Neon PostgreSQL...");
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error("❌ No se pudo conectar a Neon PostgreSQL. Verifica:");
      console.log("   1. Connection string en .env");
      console.log("   2. Credenciales de Neon");
      console.log("   3. Firewall/red");
      console.log("   ⏳ El servidor se iniciará, pero las rutas fallarán.");
    } else {
      console.log("✅ Neon PostgreSQL conectado correctamente");
      console.log("   📍 Base de datos: Lenguaje3");
      console.log("   ⚡ Proveedor: Neon");
    }
    
    // Iniciar servidor
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Servidor Gescol iniciado en: http://localhost:${PORT}`);
      console.log("\n📋 Rutas principales:");
      console.log("🔗 POST   /api/users/register");
      console.log("🔗 POST   /api/users/login");
      console.log("🔗 POST   /api/users/refresh-token");
      console.log("🔗 GET    /api/users/profile       (requiere token)");
      console.log("🔗 GET    /api/health");
      console.log("🔗 GET    /api/products");
      console.log("🔗 GET    /api/orders");
      console.log("🔗 GET    /api/invoices");
      console.log(`\n🌍 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`); // ← CORREGIDO (usa backticks)
      console.log(`📁 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Base de datos: ${dbConnected ? 'Neon PostgreSQL ✅' : 'Desconectada ⚠️'}`);
      
      if (!dbConnected) {
        console.warn("\n⚠️  ADVERTENCIA: El servidor está corriendo sin conexión a la base de datos.");
        console.warn("   Las rutas de usuarios/productos/ordenes no funcionarán correctamente.");
      }
    });
    
  } catch (error) {
    console.error("❌ Error crítico al iniciar el servidor:", error);
    process.exit(1);
  }
};

// Manejar cierre elegante del servidor
process.on('SIGINT', () => {
  console.log('\n👋 Recibida señal SIGINT. Cerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Recibida señal SIGTERM. Cerrando servidor...');
  process.exit(0);
});

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
});

// Iniciar el servidor
startServer();