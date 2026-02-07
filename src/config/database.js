import pkg from 'pg';
const { Pool } = pkg;

// Configuración para NEON - usando connection string
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false // IMPORTANTE para Neon
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 200000,
});

// Función para probar la conexión
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    
    // Verificar que las tablas principales existan
    const checkQuery = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN ('user', 'role', 'employee', 'customer')
      ORDER BY table_name
    `);
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Error al conectar a NEON PostgreSQL:', error.message);
    return false;
  }
};

// Manejo de errores de conexión
pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de conexiones:', err.message);
});

// Exportar el pool para usar en los modelos
export const db = {
  query: (text, params) => pool.query(text, params),
  pool: pool,
};

export default pool;