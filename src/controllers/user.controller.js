// controllers/user.controller.js - VERSIÓN SIMPLIFICADA Y FUNCIONAL
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/user.model.js";
import { JWT_SECRET, JWT_REFRESH_SECRET } from "../middlewares/jwt.middleware.js";
import cloudinary from '../config/cloudinary.config.js';

// ============================================
// FUNCIONES PRINCIPALES (QUE COINCIDEN CON TUS RUTAS)
// ============================================

// REGISTRO
const register = async (req, res) => {
  try {
    const { 
      dni, user_name, email, password, id_role,
      first_name, last_name, address, phone_number,
      commission, shipping_address, purchase_limit, avatar_url
    } = req.body;

    if (!email || !password || !id_role || !first_name || !last_name || !dni) {
      return res.status(400).json({
        ok: false,
        msg: "Faltan campos requeridos",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        ok: false,
        msg: "La contraseña debe tener al menos 6 caracteres",
      });
    }

    // Verificar si el email ya existe
    const existingUserByEmail = await UserModel.findOneByEmail(email);
    if (existingUserByEmail) {
      return res.status(400).json({
        ok: false,
        msg: "El email ya existe",
      });
    }

    // Verificar si el DNI ya existe
    const existingUserByDni = await UserModel.findByCedula(dni);
    if (existingUserByDni) {
      return res.status(400).json({
        ok: false,
        msg: "El DNI ya existe",
      });
    }

    const newUser = await UserModel.create({
      dni,
      user_name: user_name || email,
      email,
      password,
      id_role,
      first_name,
      last_name,
      address,
      phone_number,
      commission,
      shipping_address,
      purchase_limit
    });

    if (!newUser) {
      return res.status(500).json({
        ok: false,
        msg: "Error creando usuario",
      });
    }

    // Si se proporcionó avatar, actualizarlo
    if (avatar_url) {
      try {
        await UserModel.updateAvatar(newUser.id, avatar_url);
      } catch (avatarError) {
        console.log("⚠️ Error asignando avatar:", avatarError.message);
      }
    }

    return res.status(201).json({
      ok: true,
      msg: "Usuario creado exitosamente",
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        nombre: newUser.nombre || newUser.first_name,
        apellido: newUser.apellido || newUser.last_name,
        dni: newUser.dni,
        phone_number: newUser.phone_number,
        avatar_url: newUser.avatar_url,
        id_role: newUser.id_role,
        is_active: newUser.is_active
      },
    });
  } catch (error) {
    console.error("Error in register:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor",
      error: error.message,
    });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        msg: "Email y contraseña son requeridos",
      });
    }

    const user = await UserModel.findOneByEmail(email);
    if (!user) {
      return res.status(400).json({
        ok: false,
        msg: "Email o contraseña incorrectos",
      });
    }

    // Verificar si el usuario está activo
    if (user.is_active === false) {
      return res.status(403).json({
        ok: false,
        msg: "Cuenta inactiva. Contacte al administrador",
      });
    }

    // Verificar contraseña
    let validPassword = false;
    
    if (user.password.startsWith('$2')) {
      validPassword = await bcryptjs.compare(password, user.password);
    } else {
      validPassword = (user.password === password);
      
      if (validPassword) {
        try {
          await UserModel.migratePasswordToHash(user.id, password);
        } catch (migrateError) {
          console.log("⚠️ Error migrando password:", migrateError.message);
        }
      }
    }
    
    if (!validPassword) {
      return res.status(400).json({
        ok: false,
        msg: "Email o contraseña incorrectos",
      });
    }

    // Verificar si es empleado
    let employeeInfo = null;
    try {
      employeeInfo = await UserModel.isEmployee(user.id);
    } catch (error) {
      console.log("ℹ️ No es empleado:", error.message);
    }

    // Verificar si es cliente
    let customerInfo = null;
    try {
      customerInfo = await UserModel.isCustomer(user.id);
    } catch (error) {
      console.log("ℹ️ No es cliente:", error.message);
    }

    // Actualizar último login
    try {
      await UserModel.updateLastLogin(user.id);
    } catch (updateError) {
      console.log("⚠️ Error actualizando last_login:", updateError.message);
    }

    // Generar tokens
    const accessToken = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        Id_rol: user.id_role,
        nombre: user.nombre || user.first_name,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Preparar respuesta
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      nombre: user.nombre || user.first_name,
      apellido: user.apellido || user.last_name,
      cedula: user.dni,
      telefono: user.phone_number,
      address: user.address,
      avatar_url: user.avatar_url,
      phone_number: user.phone_number,
      id_role: user.id_role,
      is_active: user.is_active !== false,
      status: user.is_active !== false ? 'activo' : 'inactivo',
      created_at: user.created_at
    };

    // Agregar información específica
    if (employeeInfo) {
      userResponse.id_employee = employeeInfo.id_employee;
      userResponse.commission = employeeInfo.commission;
      userResponse.es_empleado = true;
    }

    if (customerInfo) {
      userResponse.id_customer = customerInfo.id_customer;
      userResponse.shipping_address = customerInfo.shipping_address;
      userResponse.purchase_limit = customerInfo.purchase_limit;
      userResponse.es_cliente = true;
    }

    res.json({
      ok: true,
      msg: "Login exitoso",
      accessToken,
      refreshToken,
      user: userResponse,
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({
      ok: false,
      msg: "Error del servidor",
      error: error.message,
    });
  }
};

// REFRESH TOKEN
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        ok: false,
        msg: "Refresh token requerido",
      });
    }

    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      const userId = decoded.userId;

      const user = await UserModel.findOneById(userId);
      if (!user) {
        return res.status(404).json({
          ok: false,
          msg: "Usuario no encontrado",
        });
      }

      // Generar nuevos tokens
      const accessToken = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          Id_rol: user.id_role,
          nombre: user.nombre || user.first_name,
          email: user.email,
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      const newRefreshToken = jwt.sign(
        { userId: user.id },
        JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        ok: true,
        accessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          ok: false,
          msg: "Refresh token expirado",
        });
      }
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          ok: false,
          msg: "Refresh token inválido",
        });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error en refreshToken:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor",
    });
  }
};

// LOGOUT
const logout = async (req, res) => {
  try {
    return res.json({
      ok: true,
      msg: "Sesión cerrada exitosamente",
    });
  } catch (error) {
    console.error("Error en logout:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor",
    });
  }
};

// PROFILE
const profile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await UserModel.findOneById(userId);

    if (!user) {
      return res.status(404).json({
        ok: false,
        msg: "Usuario no encontrado",
      });
    }

    // Remover password
    const { password, ...userWithoutPassword } = user;

    return res.json({
      ok: true,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error en profile:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor",
      error: error.message,
    });
  }
};


const listUsers = async (req, res) => {
  try {
    console.log('🔍 LISTUSERS - Iniciando consulta...');
    
    // Usar findAll sin procesamiento previo
    const users = await UserModel.findAll();
    
    console.log(`🔍 LISTUSERS - Usuarios encontrados en DB: ${users.length}`);
    
    const processedUsers = [];
    
    for (const user of users) {
      // Convertir a objeto plano
      const userObj = user.toJSON ? user.toJSON() : user;
      
      // DEPURACIÓN DETALLADA
      console.log(`👤 Usuario ID ${userObj.id}:`, {
        is_active: userObj.is_active,
        is_active_type: typeof userObj.is_active,
        is_active_raw: JSON.stringify(userObj.is_active),
        rawData: userObj
      });
      
      // Remover password
      const { password, ...userWithoutPassword } = userObj;
      
      // LOGICA CORREGIDA: Determinar si está activo
      let isActive = true;
      
      // Verificar el valor REAL de is_active
      if (userObj.is_active === 0 || 
          userObj.is_active === false ||
          userObj.is_active === 'false' ||
          userObj.is_active === '0' ||
          userObj.is_active === 'inactivo' ||
          userObj.is_active === 'inactive') {
        isActive = false;
        console.log(`   🚨 Usuario ${userObj.id} marcado como INACTIVO (valor: ${userObj.is_active})`);
      }
      else if (userObj.is_active === 1 || 
               userObj.is_active === true ||
               userObj.is_active === 'true' ||
               userObj.is_active === '1' ||
               userObj.is_active === 'activo' ||
               userObj.is_active === 'active') {
        isActive = true;
      }
      else {
        // Para valores null, undefined o cualquier otro, asumir activo
        console.log(`   ⚠️ Usuario ${userObj.id} tiene is_active = ${userObj.is_active}, usando 'activo' por defecto`);
      }
      
      const processedUser = {
        ...userWithoutPassword,
        id_user: userObj.id,
        status: isActive ? 'activo' : 'inactivo',
        is_active: isActive,
        register_creation: userObj.created_at,
        Id_rol: userObj.id_role,
        // Incluir el valor original para depuración
        _original_is_active: userObj.is_active,
        _is_active_type: typeof userObj.is_active
      };
      
      processedUsers.push(processedUser);
    }
    
    // Contar usuarios inactivos
    const inactiveCount = processedUsers.filter(u => !u.is_active).length;
    console.log(`📊 LISTUSERS - Total procesados: ${processedUsers.length}, Inactivos: ${inactiveCount}`);
    
    // Mostrar IDs de usuarios inactivos
    if (inactiveCount > 0) {
      const inactiveIds = processedUsers.filter(u => !u.is_active).map(u => u.id);
      console.log(`📋 LISTUSERS - IDs de usuarios inactivos:`, inactiveIds);
    }
    
    return res.json({
      ok: true,
      users: processedUsers,
      total: processedUsers.length,
      _debug: {
        total_users: processedUsers.length,
        inactive_users: inactiveCount,
        server_time: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("❌ LISTUSERS - Error:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor",
      error: error.message,
    });
  }
};



// SEARCH USERS
const searchUsers = async (req, res) => {
  try {
    const { search } = req.query;
    if (!search) {
      return res.status(400).json({
        ok: false,
        msg: "Parámetro de búsqueda requerido",
      });
    }
    
    const users = await UserModel.searchByUsername(search);
    
    const processedUsers = users.map(user => {
      const userObj = user.toJSON ? user.toJSON() : user;
      const { password, ...userWithoutPassword } = userObj;
      
      const normalizedStatus = userObj.is_active === true || 
                               userObj.is_active === 1 || 
                               userObj.is_active === 'true' || 
                               userObj.is_active === '1' ||
                               userObj.is_active === 'activo' || 
                               userObj.is_active === 'active' 
                               ? 'activo' : 'inactivo';
      
      return {
        ...userWithoutPassword,
        id_user: userObj.id,
        status: normalizedStatus,
        is_active: normalizedStatus === 'activo',
      };
    });
    
    return res.json({
      ok: true,
      users: processedUsers,
      total: processedUsers.length,
    });
  } catch (error) {
    console.error("Error en searchUsers:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor",
      error: error.message,
    });
  }
};

// UPDATE PROFILE
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { email, first_name, last_name, address, phone_number, avatar_url } = req.body;

    // Verificar si el email ya existe
    if (email) {
      const existingUserByEmail = await UserModel.findOneByEmail(email);
      if (existingUserByEmail && existingUserByEmail.id !== userId) {
        return res.status(400).json({
          ok: false,
          msg: "El email ya existe",
        });
      }
    }

    const updatedUser = await UserModel.updateProfile(userId, {
      email,
      first_name,
      last_name,
      address,
      phone_number,
      avatar_url
    });

    if (!updatedUser) {
      return res.status(404).json({
        ok: false,
        msg: "Usuario no encontrado",
      });
    }

    return res.json({
      ok: true,
      msg: "Perfil actualizado exitosamente",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error en updateProfile:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor",
      error: error.message,
    });
  }
};

// ============================================
// FUNCIONES PARA AVATAR
// ============================================

const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        msg: 'No se subió ningún archivo'
      });
    }

    const avatarUrl = req.file.path;
    
    // Eliminar avatar anterior si existe
    const user = await UserModel.findOneById(userId);
    if (user && user.avatar_url && user.avatar_url.includes('cloudinary')) {
      try {
        const oldUrlParts = user.avatar_url.split('/');
        const oldFileName = oldUrlParts[oldUrlParts.length - 1];
        const oldPublicId = oldFileName.split('.')[0];
        const oldFullPublicId = `user_avatars/${oldPublicId}`;
        await cloudinary.uploader.destroy(oldFullPublicId);
      } catch (deleteError) {
        console.log('⚠️ Error eliminando imagen anterior:', deleteError.message);
      }
    }
    
    await UserModel.updateAvatar(userId, avatarUrl);

    return res.json({
      ok: true,
      msg: 'Avatar subido exitosamente',
      avatar_url: avatarUrl,
    });
  } catch (error) {
    console.error('Error subiendo avatar:', error);
    return res.status(500).json({
      ok: false,
      msg: 'Error al subir avatar',
      error: error.message
    });
  }
};

const deleteAvatar = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await UserModel.findOneById(userId);
    if (!user.avatar_url) {
      return res.status(400).json({
        ok: false,
        msg: 'El usuario no tiene avatar'
      });
    }

    // Eliminar de Cloudinary si es una URL de Cloudinary
    if (user.avatar_url.includes('cloudinary')) {
      try {
        const urlParts = user.avatar_url.split('/');
        const fileNameWithExtension = urlParts[urlParts.length - 1];
        const publicId = fileNameWithExtension.split('.')[0];
        const fullPublicId = `user_avatars/${publicId}`;
        await cloudinary.uploader.destroy(fullPublicId);
      } catch (cloudinaryError) {
        console.log('⚠️ Error eliminando de Cloudinary:', cloudinaryError.message);
      }
    }

    await UserModel.updateAvatar(userId, null);

    return res.json({
      ok: true,
      msg: 'Avatar eliminado exitosamente',
      avatar_url: null
    });
  } catch (error) {
    console.error('Error eliminando avatar:', error);
    return res.status(500).json({
      ok: false,
      msg: 'Error al eliminar avatar',
      error: error.message
    });
  }
};

const updateAvatar = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { avatar_url } = req.body;

    if (!avatar_url) {
      return res.status(400).json({
        ok: false,
        msg: "URL del avatar requerida",
      });
    }

    // Eliminar avatar anterior si es de Cloudinary
    const user = await UserModel.findOneById(userId);
    if (user && user.avatar_url && user.avatar_url.includes('cloudinary')) {
      try {
        const urlParts = user.avatar_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const publicId = fileName.split('.')[0];
        const fullPublicId = `user_avatars/${publicId}`;
        await cloudinary.uploader.destroy(fullPublicId);
      } catch (deleteError) {
        console.log('⚠️ Error eliminando imagen anterior:', deleteError.message);
      }
    }

    await UserModel.updateAvatar(userId, avatar_url);

    return res.json({
      ok: true,
      msg: "Avatar actualizado exitosamente",
      avatar_url,
    });
  } catch (error) {
    console.error("Error actualizando avatar:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor",
      error: error.message,
    });
  }
};

const updateProfileWithAvatar = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { email, first_name, last_name, address, phone_number } = req.body;

    let avatarUrl = null;

    // Si se subió un archivo, procesar avatar
    if (req.file) {
      avatarUrl = req.file.path;
      
      // Eliminar avatar anterior si existe
      const user = await UserModel.findOneById(userId);
      if (user && user.avatar_url && user.avatar_url.includes('cloudinary')) {
        try {
          const oldUrlParts = user.avatar_url.split('/');
          const oldFileName = oldUrlParts[oldUrlParts.length - 1];
          const oldPublicId = oldFileName.split('.')[0];
          const oldFullPublicId = `user_avatars/${oldPublicId}`;
          await cloudinary.uploader.destroy(oldFullPublicId);
        } catch (deleteError) {
          console.log('⚠️ Error eliminando imagen anterior:', deleteError.message);
        }
      }
    }

    // Verificar si el email ya existe
    if (email) {
      const existingUserByEmail = await UserModel.findOneByEmail(email);
      if (existingUserByEmail && existingUserByEmail.id !== userId) {
        return res.status(400).json({
          ok: false,
          msg: "El email ya existe",
        });
      }
    }

    const updatedUser = await UserModel.updateProfile(userId, {
      email,
      first_name,
      last_name,
      address,
      phone_number,
      avatar_url: avatarUrl
    });

    if (!updatedUser) {
      return res.status(404).json({
        ok: false,
        msg: "Usuario no encontrado",
      });
    }

    return res.json({
      ok: true,
      msg: "Perfil actualizado exitosamente",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error en updateProfileWithAvatar:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor",
      error: error.message,
    });
  }
};

// ============================================
// FUNCIONES PARA ADMINISTRACIÓN DE USUARIOS
// ============================================

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await UserModel.findOneById(id);

    if (!user) {
      return res.status(404).json({
        ok: false,
        msg: "Usuario no encontrado",
      });
    }

    const { password, ...userWithoutPassword } = user;
    
    return res.json({
      ok: true,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error en getUserById:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor",
      error: error.message,
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { dni, user_name, email, first_name, last_name, address, phone_number, id_role, password } = req.body;

    const existingUser = await UserModel.findOneById(id);
    if (!existingUser) {
      return res.status(404).json({
        ok: false,
        msg: "Usuario no encontrado",
      });
    }

    // Verificar unicidad de email
    if (email && email !== existingUser.email) {
      const userWithEmail = await UserModel.findOneByEmail(email);
      if (userWithEmail && userWithEmail.id !== parseInt(id)) {
        return res.status(400).json({
          ok: false,
          msg: "El email ya existe",
        });
      }
    }

    // Verificar unicidad de DNI
    if (dni && dni !== existingUser.dni) {
      const userWithDni = await UserModel.findByCedula(dni);
      if (userWithDni && userWithDni.id !== parseInt(id)) {
        return res.status(400).json({
          ok: false,
          msg: "El DNI ya existe",
        });
      }
    }

    // Preparar datos
    const updateData = {
      dni: dni || existingUser.dni,
      email: email || existingUser.email,
      first_name: first_name || existingUser.first_name,
      last_name: last_name || existingUser.last_name,
      address: address !== undefined ? address : existingUser.address,
      phone_number: phone_number !== undefined ? phone_number : existingUser.phone_number,
    };

    // Actualizar username si se proporciona
    if (user_name && user_name !== existingUser.username) {
      const userWithUsername = await UserModel.findOneByUsername(user_name);
      if (userWithUsername && userWithUsername.id !== parseInt(id)) {
        return res.status(400).json({
          ok: false,
          msg: "El nombre de usuario ya existe",
        });
      }
      updateData.user_name = user_name;
    }

    // Actualizar rol
    if (id_role) {
      updateData.id_role = id_role;
    }

    // Actualizar password
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          ok: false,
          msg: "La contraseña debe tener al menos 6 caracteres",
        });
      }
      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(password, salt);
      updateData.password = hashedPassword;
    }

    const updatedUser = await UserModel.updateProfile(id, updateData);

    return res.json({
      ok: true,
      msg: "Usuario actualizado exitosamente",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error en updateUser:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor",
      error: error.message,
    });
  }
};

const changeUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status === undefined) {
      return res.status(400).json({
        ok: false,
        msg: "Estado requerido",
      });
    }

    const user = await UserModel.findOneById(id);
    if (!user) {
      return res.status(404).json({
        ok: false,
        msg: "Usuario no encontrado",
      });
    }

    // Convertir status a booleano
    let isActive;
    if (typeof status === 'string') {
      isActive = status === 'true' || status === 'activo' || status === 'active' || status === '1';
    } else {
      isActive = Boolean(status);
    }

    const updatedUser = await UserModel.setActive(id, isActive);

    return res.json({
      ok: true,
      msg: `Usuario ${isActive ? 'activado' : 'desactivado'} exitosamente`,
      user: {
        ...updatedUser,
        status: isActive ? 'activo' : 'inactivo',
        is_active: isActive
      },
    });
  } catch (error) {
    console.error("Error en changeUserStatus:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor",
      error: error.message,
    });
  }
};

const reactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await UserModel.findOneById(id);
    
    if (!user) {
      return res.status(404).json({
        ok: false,
        msg: "Usuario no encontrado",
      });
    }

    const updatedUser = await UserModel.setActive(id, true);

    return res.json({
      ok: true,
      msg: "Usuario reactivado exitosamente",
      user: {
        ...updatedUser,
        status: 'activo',
        is_active: true
      },
    });
  } catch (error) {
    console.error("Error en reactivateUser:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor",
      error: error.message,
    });
  }
};

// Alias para activateUser
const activateUser = async (req, res) => {
  return changeUserStatus(req, res);
};

// Alias para deactivateUser  
const deactivateUser = async (req, res) => {
  req.body.status = false;
  return changeUserStatus(req, res);
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await UserModel.findOneById(id);
    if (!user) {
      return res.status(404).json({
        ok: false,
        msg: "Usuario no encontrado",
      });
    }
    
    // Verificar si tiene registros relacionados
    try {
      const employeeInfo = await UserModel.isEmployee(id);
      if (employeeInfo) {
        return res.status(400).json({
          ok: false,
          msg: "No se puede eliminar empleados con registros relacionados",
          suggestion: "Use desactivar en lugar de eliminar"
        });
      }
    } catch (error) {
      console.log("ℹ️ Verificando empleado:", error.message);
    }
    
    // Eliminar avatar si existe
    if (user.avatar_url && user.avatar_url.includes('cloudinary')) {
      try {
        const urlParts = user.avatar_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const publicId = fileName.split('.')[0];
        const fullPublicId = `user_avatars/${publicId}`;
        await cloudinary.uploader.destroy(fullPublicId);
      } catch (deleteError) {
        console.log('⚠️ Error eliminando avatar:', deleteError.message);
      }
    }
    
    const result = await UserModel.remove(id);
    
    return res.json({
      ok: true,
      msg: "Usuario eliminado exitosamente",
      id: result.id,
    });
  } catch (error) {
    console.error("Error eliminando usuario:", error);
    
    // Manejar error de foreign key
    if (error.message.includes('foreign key constraint') || 
        error.message.includes('viola la llave foránea')) {
      return res.status(400).json({
        ok: false,
        msg: "No se puede eliminar este usuario porque tiene registros relacionados",
        suggestion: "Desactive el usuario en lugar de eliminarlo"
      });
    }
    
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor",
      error: error.message,
    });
  }
};

// ============================================
// FUNCIONES PARA CONTRASEÑAS
// ============================================

const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        ok: false,
        msg: "Contraseña actual y nueva contraseña requeridas",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        ok: false,
        msg: "La nueva contraseña debe tener al menos 6 caracteres",
      });
    }

    const user = await UserModel.findOneById(userId);
    if (!user) {
      return res.status(404).json({
        ok: false,
        msg: "Usuario no encontrado",
      });
    }

    // Verificar contraseña actual
    let validCurrentPassword = false;
    
    if (user.password.startsWith('$2')) {
      validCurrentPassword = await bcryptjs.compare(currentPassword, user.password);
    } else {
      validCurrentPassword = (user.password === currentPassword);
      
      if (validCurrentPassword) {
        try {
          await UserModel.migratePasswordToHash(userId, currentPassword);
        } catch (migrateError) {
          console.log("⚠️ Error migrando password:", migrateError.message);
        }
      }
    }

    if (!validCurrentPassword) {
      return res.status(400).json({
        ok: false,
        msg: "Contraseña actual incorrecta",
      });
    }

    // Hash de la nueva contraseña
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(newPassword, salt);

    await UserModel.updatePassword(userId, hashedPassword);

    return res.json({
      ok: true,
      msg: "Contraseña cambiada exitosamente",
    });
  } catch (error) {
    console.error("Error en changePassword:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor",
      error: error.message,
    });
  }
};

const migrateAllPasswords = async (req, res) => {
  try {
    const result = await UserModel.migrateAllPasswords();
    
    return res.json({
      ok: true,
      msg: `Migración completada: ${result.migrated} migrados, ${result.errors} errores`,
      ...result
    });
    
  } catch (error) {
    console.error("Error en migrateAllPasswords:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor",
      error: error.message,
    });
  }
};

// ============================================
// EXPORTACIÓN
// ============================================
export const UserController = {
  // Rutas públicas
  register,
  login,
  refreshToken,
  logout,
  
  // Rutas protegidas
  profile,
  listUsers,
  searchUsers,
  updateProfile,
  
  // Avatar
  uploadAvatar,
  deleteAvatar,
  updateAvatar,
  updateProfileWithAvatar,
  
  // Administración
  getUserById,
  updateUser,
  changeUserStatus,
  reactivateUser,
  activateUser,
  deactivateUser,
  deleteUser,
  
  // Contraseñas
  changePassword,
  migrateAllPasswords
};