// models/user.model.js - VERSIÓN COMPLETA Y CORRECTA
import { db } from "../db/connection.database.js";
import bcryptjs from "bcryptjs";

// ============================================
// FUNCIÓN PRINCIPAL ACTUALIZADA - findOneByEmail
// ============================================
const findOneByEmail = async (email) => {
  try {
    const query = {
      text: `
        SELECT 
          u.id_user as id,
          u.dni,
          u.user_name as username,
          u.password,
          u.first_name as nombre,
          u.last_name as apellido,
          u.email,
          u.address,
          u.phone_number,
          u.avatar_url,
          u.is_active,
          u.created_at,
          u.last_login,
          u.email_verified,
          u.id_role,
          r.name_role as tipo_rol,
          e.id_employee,
          e.commission,
          c.id_customer,
          c.shipping_address,
          c.purchase_limit
        FROM "user" u
        LEFT JOIN role r ON u.id_role = r.id_role
        LEFT JOIN employee e ON u.id_user = e.id_user
        LEFT JOIN customer c ON u.id_user = c.id_user
        WHERE u.email = $1
      `,
      values: [email],
    };
    
    console.log("🔍 UserModel - findOneByEmail - Buscando usuario:", email);
    const { rows } = await db.query(query.text, query.values);
    const user = rows[0];
    
    if (user) {
      console.log("✅ UserModel - Usuario encontrado:", {
        id: user.id,
        username: user.username,
        id_role: user.id_role,
        tipo_rol: user.tipo_rol,
        has_avatar: !!user.avatar_url
      });
      
      // Añadir Id_rol para compatibilidad con frontend
      user.Id_rol = user.id_role;
    }
    
    return user;
  } catch (error) {
    console.error("❌ Error en findOneByEmail:", error);
    throw error;
  }
};

// ============================================
// FUNCIÓN findOneByUsername (FALTANTE)
// ============================================
const findOneByUsername = async (username) => {
  try {
    const query = {
      text: `
        SELECT 
          u.id_user as id,
          u.dni,
          u.user_name as username,
          u.password,
          u.first_name as nombre,
          u.last_name as apellido,
          u.email,
          u.address,
          u.phone_number,
          u.avatar_url,
          u.is_active,
          u.created_at,
          u.last_login,
          u.email_verified,
          u.id_role,
          r.name_role as tipo_rol,
          e.id_employee,
          e.commission,
          c.id_customer,
          c.shipping_address,
          c.purchase_limit
        FROM "user" u
        LEFT JOIN role r ON u.id_role = r.id_role
        LEFT JOIN employee e ON u.id_user = e.id_user
        LEFT JOIN customer c ON u.id_user = c.id_user
        WHERE u.user_name = $1 OR u.email = $1
      `,
      values: [username],
    };
    
    const { rows } = await db.query(query.text, query.values);
    const user = rows[0];
    
    if (user) {
      user.Id_rol = user.id_role;
    }
    
    return user;
  } catch (error) {
    console.error("Error in findOneByUsername:", error);
    throw error;
  }
};

// ============================================
// FUNCIÓN ACTUALIZADA - findOneById
// ============================================
const findOneById = async (id) => {
  try {
    const query = {
      text: `
        SELECT 
          u.id_user as id,
          u.dni,
          u.user_name as username,
          u.password,
          u.first_name as nombre,
          u.last_name as apellido,
          u.email,
          u.address,
          u.phone_number,
          u.avatar_url,
          u.is_active,
          u.created_at,
          u.last_login,
          u.email_verified,
          u.id_role,
          r.name_role as tipo_rol,
          e.id_employee,
          e.commission,
          c.id_customer,
          c.shipping_address,
          c.purchase_limit
        FROM "user" u
        LEFT JOIN role r ON u.id_role = r.id_role
        LEFT JOIN employee e ON u.id_user = e.id_user
        LEFT JOIN customer c ON u.id_user = c.id_user
        WHERE u.id_user = $1
      `,
      values: [id],
    };
    
    const { rows } = await db.query(query.text, query.values);
    const user = rows[0];
    
    if (user) {
      user.Id_rol = user.id_role;
    }
    
    return user;
  } catch (error) {
    console.error("Error in findOneById:", error);
    throw error;
  }
};

// ============================================
// FUNCIÓN ACTUALIZADA - create
// ============================================
const create = async ({
  dni,
  user_name,
  password,
  first_name,
  last_name,
  email,
  address,
  id_role,
  phone_number,
  commission,
  shipping_address,
  purchase_limit
}) => {
  try {
    console.log("🔍 CREATE - Creando usuario con datos:", {
      dni, user_name, first_name, last_name, email, id_role, phone_number
    });

    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);
    
    console.log("🔍 CREATE - Password hasheado. Longitud:", hashedPassword.length);

    const query = {
      text: `
        INSERT INTO "user" (
          dni, user_name, password, first_name, last_name, 
          email, address, phone_number, id_role
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
      values: [dni, user_name, hashedPassword, first_name, last_name, 
               email, address, phone_number || null, id_role],
    };
    
    const { rows } = await db.query(query.text, query.values);
    const newUser = rows[0];
    
    console.log("✅ CREATE - Usuario creado exitosamente:", newUser.id_user);
    
    if (id_role === 2 || id_role === 3) {
      try {
        await db.query(
          'INSERT INTO employee (id_user, phone_number, commission) VALUES ($1, $2, $3)',
          [newUser.id_user, phone_number || null, commission || 0]
        );
        console.log("✅ CREATE - Registro de empleado creado");
      } catch (empError) {
        console.log("⚠️ CREATE - Error creando empleado:", empError.message);
      }
    }
    
    if (id_role === 4) {
      try {
        await db.query(
          'INSERT INTO customer (id_user, shipping_address, purchase_limit) VALUES ($1, $2, $3)',
          [newUser.id_user, shipping_address || address || null, purchase_limit || 10000]
        );
        console.log("✅ CREATE - Registro de cliente creado");
      } catch (custError) {
        console.log("⚠️ CREATE - Error creando cliente:", custError.message);
      }
    }
    
    return await getUserExtendedInfo(newUser.id_user);
    
  } catch (error) {
    console.error("❌ CREATE - Error creando usuario:", error.message);
    throw error;
  }
};

// ============================================
// FUNCIÓN ACTUALIZADA - updateProfile
// ============================================
const updateProfile = async (id, { 
  email, first_name, last_name, address, phone_number, avatar_url 
}) => {
  try {
    const userQuery = {
      text: `
        UPDATE "user"
        SET 
          email = COALESCE($1, email),
          first_name = COALESCE($2, first_name),
          last_name = COALESCE($3, last_name),
          address = COALESCE($4, address),
          phone_number = COALESCE($5, phone_number),
          avatar_url = COALESCE($6, avatar_url)
        WHERE id_user = $7
        RETURNING *
      `,
      values: [email, first_name, last_name, address, 
               phone_number, avatar_url, id],
    };
    
    const { rows } = await db.query(userQuery.text, userQuery.values);
    const user = rows[0];
    
    // Si es empleado y actualiza teléfono, actualizar también en tabla employee
    if (phone_number) {
      try {
        await db.query(
          'UPDATE employee SET phone_number = $1 WHERE id_user = $2',
          [phone_number, id]
        );
      } catch (empError) {
        console.log("⚠️ No se pudo actualizar teléfono de empleado:", empError.message);
      }
    }
    
    return user;
  } catch (error) {
    console.error("Error in updateProfile:", error);
    throw error;
  }
};

// ============================================
// FUNCIÓN ACTUALIZADA - updateLastLogin
// ============================================
const updateLastLogin = async (id) => {
  try {
    const query = {
      text: 'UPDATE "user" SET last_login = CURRENT_TIMESTAMP WHERE id_user = $1',
      values: [id],
    };
    
    await db.query(query.text, query.values);
    console.log(`🕐 Usuario ${id} - Último login actualizado`);
  } catch (error) {
    console.error("Error in updateLastLogin:", error);
  }
};

// ============================================
// FUNCIÓN NUEVA - updateAvatar
// ============================================
const updateAvatar = async (id, avatar_url) => {
  try {
    const query = {
      text: 'UPDATE "user" SET avatar_url = $1 WHERE id_user = $2 RETURNING id_user, avatar_url',
      values: [avatar_url, id],
    };
    
    const { rows } = await db.query(query.text, query.values);
    return rows[0];
  } catch (error) {
    console.error("Error in updateAvatar:", error);
    throw error;
  }
};

// ============================================
// FUNCIÓN ACTUALIZADA - getUserExtendedInfo
// ============================================
const getUserExtendedInfo = async (userId) => {
  try {
    const userQuery = {
      text: `
        SELECT 
          u.id_user as id,
          u.dni,
          u.user_name as username,
          u.password,
          u.first_name as nombre,
          u.last_name as apellido,
          u.email,
          u.address,
          u.phone_number,
          u.avatar_url,
          u.is_active,
          u.created_at,
          u.last_login,
          u.email_verified,
          u.id_role,
          r.name_role,
          e.id_employee, 
          e.commission,
          c.id_customer, 
          c.shipping_address, 
          c.purchase_limit
        FROM "user" u
        LEFT JOIN role r ON u.id_role = r.id_role
        LEFT JOIN employee e ON u.id_user = e.id_user
        LEFT JOIN customer c ON u.id_user = c.id_user
        WHERE u.id_user = $1
      `,
      values: [userId]
    };
    
    const { rows } = await db.query(userQuery.text, userQuery.values);
    const user = rows[0];
    
    if (user) {
      user.Id_rol = user.id_role;
    }
    
    return user;
  } catch (error) {
    console.error("Error en getUserExtendedInfo:", error);
    throw error;
  }
};




// ============================================
// FUNCIÓN SIMPLIFICADA - findAll (SIN PROBLEMAS)
// ============================================
const findAll = async () => {
  try {
    console.log("🔍 findAll - Ejecutando consulta SQL...");
    
    // CONSULTA SIMPLIFICADA - SIN COMENTARIOS NI OPERADORES <
    const queryText = `
      SELECT 
        u.id_user as id,
        u.dni,
        u.user_name as username,
        u.first_name as nombre,
        u.last_name as apellido,
        u.email,
        u.address,
        u.phone_number,
        u.avatar_url,
        u.is_active,
        u.created_at,
        u.id_role,
        r.name_role as tipo_rol,
        e.phone_number as emp_phone,
        c.shipping_address
      FROM "user" u
      LEFT JOIN role r ON u.id_role = r.id_role
      LEFT JOIN employee e ON u.id_user = e.id_user
      LEFT JOIN customer c ON u.id_user = c.id_user
      ORDER BY u.id_user
    `;
    
    const { rows } = await db.query(queryText);
    console.log(`🔍 findAll - Resultados: ${rows.length} usuarios`);
    
    // Transformar los resultados de forma segura
    const transformedUsers = rows.map(user => {
      const userObj = user;
      
      // Log para depuración
      console.log(`👤 Usuario ID ${userObj.id}: is_active = ${userObj.is_active}, tipo: ${typeof userObj.is_active}`);
      
      // Determinar si está activo de forma segura
      let isActive = false;
      if (userObj.is_active === true || userObj.is_active === 1) {
        isActive = true;
      } else if (typeof userObj.is_active === 'string') {
        isActive = userObj.is_active.toLowerCase() === 'true' || 
                   userObj.is_active === '1' ||
                   userObj.is_active === 'activo' ||
                   userObj.is_active === 'active';
      }
      
      return {
        ...userObj,
        Id_rol: userObj.id_role,
        is_active: isActive,
        status: isActive ? 'activo' : 'inactivo'
      };
    });
    
    return transformedUsers;
  } catch (error) {
    console.error("❌ Error in findAll users:", error.message);
    console.error("❌ Error stack:", error.stack);
    throw error;
  }
};

// ============================================
// FUNCIÓN updatePassword (FALTANTE)
// ============================================
const updatePassword = async (id, hashedPassword) => {
  try {
    const query = {
      text: 'UPDATE "user" SET password = $1 WHERE id_user = $2 RETURNING *',
      values: [hashedPassword, id],
    };
    const { rows } = await db.query(query.text, query.values);
    return rows[0];
  } catch (error) {
    console.error("Error in updatePassword:", error);
    throw error;
  }
};

// CORRECCIÓN COMPLETA DE LA FUNCIÓN setActive:
const setActive = async (id, isActive) => {
  try {
    console.log(`🔄 USERMODEL - Cambiando estado usuario ${id} a ${isActive ? 'activo' : 'inactivo'}`);
    
    // PostgreSQL usa true/false para booleanos, pero también acepta 1/0
    const isActiveValue = isActive ? true : false;
    
    // POSTGRESQL usa $1, $2 para parámetros, no ?
    const result = await db.query(
      `UPDATE "user" SET is_active = $1 WHERE id_user = $2`,
      [isActiveValue, id]
    );
    
    console.log(`📊 USERMODEL - Filas afectadas: ${result.rowCount}`);
    
    if (result.rowCount === 0) {
      throw new Error("Usuario no encontrado");
    }
    
    // Verificar directamente en la base de datos (PostgreSQL)
    const verifyQuery = await db.query(
      `SELECT id_user as id, is_active FROM "user" WHERE id_user = $1`,
      [id]
    );
    
    if (verifyQuery.rows.length > 0) {
      const verifiedUser = verifyQuery.rows[0];
      console.log(`✅ USERMODEL - Verificado en DB: usuario ${id}, is_active = ${verifiedUser.is_active} (${verifiedUser.is_active ? 'activo' : 'inactivo'})`);
    }
    
    const updatedUser = await findOneById(id);
    console.log(`✅ USERMODEL - Estado actualizado: usuario ${id}, is_active = ${updatedUser.is_active}, tipo: ${typeof updatedUser.is_active}`);
    
    return updatedUser;
  } catch (error) {
    console.error(`❌ USERMODEL - Error cambiando estado usuario ${id}:`, error);
    throw error;
  }
};
// ============================================
// FUNCIÓN remove (FALTANTE)
// ============================================
const remove = async (id) => {
  try {
    const query = {
      text: 'DELETE FROM "user" WHERE id_user = $1 RETURNING id_user as id',
      values: [id],
    };
    const { rows } = await db.query(query.text, query.values);
    return rows[0];
  } catch (error) {
    console.error("Error in remove user:", error);
    throw error;
  }
};

// ============================================
// FUNCIÓN findByCedula (FALTANTE)
// ============================================
const findByCedula = async (dni) => {
  try {
    const query = {
      text: `
        SELECT 
          u.id_user as id,
          u.dni,
          u.user_name as username,
          u.password,
          u.first_name as nombre,
          u.last_name as apellido,
          u.email,
          u.address,
          u.id_role,
          r.name_role as tipo_rol
        FROM "user" u
        LEFT JOIN role r ON u.id_role = r.id_role
        WHERE u.dni = $1
      `,
      values: [dni],
    };
    
    const { rows } = await db.query(query.text, query.values);
    const user = rows[0];
    
    if (user) {
      user.Id_rol = user.id_role;
    }
    
    return user;
  } catch (error) {
    console.error("Error in findByCedula:", error);
    throw error;
  }
};

// ============================================
// FUNCIÓN searchByUsername (FALTANTE)
// ============================================
const searchByUsername = async (searchTerm) => {
  try {
    const query = {
      text: `
        SELECT 
          u.id_user as id,
          u.user_name as username,
          u.email,
          u.first_name as nombre,
          u.last_name as apellido,
          u.dni,
          u.id_role,
          r.name_role as tipo_rol
        FROM "user" u
        LEFT JOIN role r ON u.id_role = r.id_role
        WHERE u.user_name ILIKE $1 
           OR u.email ILIKE $1 
           OR u.first_name ILIKE $1 
           OR u.last_name ILIKE $1
           OR u.dni ILIKE $1
        ORDER BY u.id_user
      `,
      values: [`%${searchTerm}%`],
    };
    
    const { rows } = await db.query(query.text, query.values);
    
    return rows.map(user => ({
      ...user,
      Id_rol: user.id_role
    }));
  } catch (error) {
    console.error("Error in searchByUsername:", error);
    throw error;
  }
};

// ============================================
// FUNCIONES DE MIGRACIÓN (FALTANTES)
// ============================================
const migratePasswordToHash = async (userId, plainPassword) => {
  try {
    console.log(`🔄 MIGRATE - Migrando password a hash para usuario ${userId}`);
    
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(plainPassword, salt);
    
    const query = {
      text: `UPDATE "user" SET password = $1 WHERE id_user = $2`,
      values: [hashedPassword, userId],
    };
    
    await db.query(query.text, query.values);
    console.log(`✅ MIGRATE - Password migrado exitosamente para usuario ${userId}`);
    
    return hashedPassword;
  } catch (error) {
    console.error(`❌ MIGRATE - Error migrando password usuario ${userId}:`, error);
    throw error;
  }
};

const migrateAllPasswords = async () => {
  try {
    console.log("🚀 MIGRATE ALL - Iniciando migración de todos los passwords...");
    
    const query = {
      text: `SELECT id_user, password, user_name, email FROM "user" WHERE password IS NOT NULL AND password != '' AND password NOT LIKE '$2%'`
    };
    
    const { rows } = await db.query(query.text);
    
    console.log(`📊 MIGRATE ALL - Encontrados ${rows.length} usuarios para migrar`);
    
    let migrated = 0;
    let errors = 0;
    const results = [];
    
    for (const user of rows) {
      try {
        if (!user.password || user.password.trim() === '') {
          console.log(`⚠️ Usuario ${user.id_user} tiene password vacío, omitiendo`);
          continue;
        }
        
        console.log(`🔄 Migrando usuario ${user.id_user} (${user.user_name || user.email})`);
        
        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(user.password, salt);
        
        const updateQuery = {
          text: `UPDATE "user" SET password = $1 WHERE id_user = $2`,
          values: [hashedPassword, user.id_user]
        };
        
        await db.query(updateQuery.text, updateQuery.values);
        migrated++;
        
        results.push({
          id: user.id_user,
          username: user.user_name || user.email,
          status: 'success'
        });
        
        console.log(`✅ Migrado usuario ${user.id_user}`);
        
      } catch (error) {
        errors++;
        results.push({
          id: user.id_user,
          username: user.user_name || user.email,
          status: 'error',
          error: error.message
        });
        console.error(`❌ Error migrando usuario ${user.id_user}:`, error.message);
      }
    }
    
    console.log(`🎉 MIGRATE ALL - Migración completada: ${migrated} exitosos, ${errors} errores`);
    
    return { migrated, errors, total: rows.length, results };
    
  } catch (error) {
    console.error("❌ MIGRATE ALL - Error general:", error);
    throw error;
  }
};

// ============================================
// FUNCIONES DE ROL ESPECÍFICO (FALTANTES)
// ============================================
const isEmployee = async (userId) => {
  try {
    const query = {
      text: 'SELECT * FROM employee WHERE id_user = $1',
      values: [userId]
    };
    const { rows } = await db.query(query.text, query.values);
    return rows[0];
  } catch (error) {
    console.error("Error en isEmployee:", error);
    throw error;
  }
};

const isCustomer = async (userId) => {
  try {
    const query = {
      text: 'SELECT * FROM customer WHERE id_user = $1',
      values: [userId]
    };
    const { rows } = await db.query(query.text, query.values);
    return rows[0];
  } catch (error) {
    console.error("Error en isCustomer:", error);
    throw error;
  }
};

// ============================================
// FUNCIÓN PARA DEBUG (FALTANTE)
// ============================================
const debugUserQuery = async (email) => {
  try {
    console.log("🧪 DEBUG - Ejecutando query de prueba...");
    
    const query = {
      text: `
        SELECT 
          u.id_user,
          u.id_role,
          u.id_role as "Id_rol",  -- Con comillas para mantener mayúsculas
          u.id_role as id_rol     -- Sin comillas (minúscula)
        FROM "user" u
        WHERE u.email = $1
      `,
      values: [email],
    };
    
    const { rows } = await db.query(query.text, query.values);
    const user = rows[0];
    
    if (user) {
      console.log("🧪 DEBUG - Resultados de query:");
      console.log("  id_user:", user.id_user);
      console.log("  id_role:", user.id_role);
      console.log("  'Id_rol' (con comillas):", user.Id_rol);
      console.log("  id_rol (sin comillas):", user.id_rol);
      console.log("  Todas las keys:", Object.keys(user));
    }
    
    return user;
  } catch (error) {
    console.error("Error en debugUserQuery:", error);
  }
};

// ============================================
// EXPORTACIÓN COMPLETA
// ============================================
export const UserModel = {
  // CRUD básico
  create,
  findOneByUsername,
  findOneById,
  findOneByEmail,
  findAll,
  updatePassword,
  updateProfile,
  updateLastLogin,
  updateAvatar,
  setActive,
  remove,
  findByCedula,
  searchByUsername,
  
  // Funciones de migración
  migratePasswordToHash,
  migrateAllPasswords,
  
  // Funciones de rol específico
  isEmployee,
  isCustomer,
  
  // Funciones para compatibilidad
  isProfesor: async () => null,
  isRepresentante: async () => null,
  verifySecurityAnswer: async () => { throw new Error("Funcionalidad no implementada") },
  updateProfileWithSecurity: async () => { throw new Error("Funcionalidad no implementada") },
  changePasswordWithSecurity: async () => { throw new Error("Funcionalidad no implementada") },
  setPasswordResetToken: async () => { throw new Error("Funcionalidad no implementada") },
  findByPasswordResetToken: async () => { throw new Error("Funcionalidad no implementada") },
  clearPasswordResetToken: async (id) => { console.log("clearPasswordResetToken llamado para:", id) },
  setEmailVerificationToken: async () => { throw new Error("Funcionalidad no implementada") },
  verifyEmail: async () => { throw new Error("Funcionalidad no implementada") },
  
  // Alias para compatibilidad
  getExtendedInfo: getUserExtendedInfo,
  
  // Funciones de debug
  debugUserQuery
};