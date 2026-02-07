import dotenv from 'dotenv';
dotenv.config();

import { testConnection } from './src/config/database.js';

async function runTest() {
  console.log('🔗 Probando conexión a Neon...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL no está definida en .env');
    process.exit(1);
  }
  
  console.log('📡 Connection String:', process.env.DATABASE_URL.replace(/:[^:@]*@/, ':****@'));
  
  const connected = await testConnection();
  
  if (connected) {
    console.log('🎉 ¡Conexión exitosa! Tu backend está listo para conectar con Neon.');
    
    // Prueba adicional: contar registros
    const { db } = await import('./src/config/database.js');
    const users = await db.query('SELECT COUNT(*) FROM public."user"');
    const products = await db.query('SELECT COUNT(*) FROM public.product');
    
    console.log(`👥 Usuarios en DB: ${users.rows[0].count}`);
    console.log(`🛒 Productos en DB: ${products.rows[0].count}`);
  } else {
    console.log('❌ Falló la conexión. Revisa los detalles arriba.');
    process.exit(1);
  }
}

runTest();