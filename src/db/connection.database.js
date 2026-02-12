import pkg from 'pg';
const { Pool } = pkg;

// Configuración para NEON - usando connection string
const connectionString = process.env.DATABASE_URL;

// Configuración del pool para Neon
const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false // IMPORTANTE para Neon
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 200000,
});

// Función para probar la conexión (actualizada para Neon)
export const testConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    
    // Verificar que las tablas principales existan
    const checkQuery = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN ('user', 'role', 'employee', 'customer')
      ORDER BY table_name
    `);
    
    console.log(' Tablas verificadas:', checkQuery.rows.map(r => r.table_name).join(', '));
    
    // Obtener información de la base de datos
    const dbInfo = await client.query(`
      SELECT 
        version() as postgres_version,
        current_database() as database_name,
        current_user as username,
        inet_server_addr() as server_address
    `);
    
    console.log('📊 Información de Neon:');
    console.log('   - Base de datos:', dbInfo.rows[0].database_name);
    console.log('   - PostgreSQL:', dbInfo.rows[0].postgres_version.split(',')[0]);
    console.log('   - Usuario:', dbInfo.rows[0].username);
    console.log('   - Proveedor: Neon');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error al conectar a NEON PostgreSQL:', error.message);
    console.log('🔍 Detalles del error:', {
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    return false;
    
  } finally {
    if (client) client.release();
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
  // Método para obtener estadísticas del pool
  getPoolStats: () => ({
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  })
};

export default pool;