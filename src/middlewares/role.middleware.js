// Mapeo de Id_rol a nombres de roles para SISTEMA DE VENTAS
export const roleMap = {
  1: 'admin',        // Administrador del sistema
  2: 'gerente',      // Gerente de tienda
  3: 'empleado',     // Empleado de ventas
  4: 'cliente'       // Cliente
};

// Configuración de permisos por ruta para SISTEMA DE VENTAS
const routePermissions = {
  // Rutas de administración (solo admin)
  '/api/users/list': ['admin'],
  '/api/users/activate/:id': ['admin'],
  '/api/users/deactivate/:id': ['admin'],
  '/api/users/:id': ['admin'],
  '/api/users/migrate-passwords': ['admin'],
  
  // Rutas de gestión de productos (admin y gerente)
  '/api/products': ['admin', 'gerente'],
  '/api/products/*': ['admin', 'gerente'],
  
  // Rutas de gestión de inventario (admin, gerente y empleados)
  '/api/inventory': ['admin', 'gerente', 'empleado'],
  '/api/inventory/*': ['admin', 'gerente', 'empleado'],
  
  // Rutas de gestión de pedidos (admin, gerente y empleados)
  '/api/orders': ['admin', 'gerente', 'empleado'],
  '/api/orders/*': ['admin', 'gerente', 'empleado'],
  
  // Rutas de facturación (admin y gerente)
  '/api/billing': ['admin', 'gerente'],
  '/api/billing/*': ['admin', 'gerente'],
  
  // Rutas de reportes (admin y gerente)
  '/api/reports': ['admin', 'gerente'],
  '/api/reports/*': ['admin', 'gerente'],
  
  // Rutas de stock (admin, gerente y empleados)
  '/api/stock': ['admin', 'gerente', 'empleado'],
  '/api/stock/*': ['admin', 'gerente', 'empleado'],
  
  // Rutas específicas de empleado
  '/api/employee/dashboard': ['empleado'],
  '/api/employee/orders': ['empleado'],
  
  // Rutas específicas de cliente
  '/api/customer/products': ['cliente'],
  '/api/customer/orders': ['cliente'],
  '/api/customer/profile': ['cliente'],
  
  // Rutas de perfil (todos los roles)
  '/api/users/profile': ['admin', 'gerente', 'empleado', 'cliente'],
  '/api/users/change-password': ['admin', 'gerente', 'empleado', 'cliente'],
  
  // Rutas públicas (ya manejadas en routeGuard)
};

/**
 * Middleware para verificación automática de roles
 */
export const autoVerifyRole = async (req, res, next) => {
  try {
    const path = req.path;
    const method = req.method;
    
    console.log(`\n🔍 AUTO VERIFY ROLE - ${method} ${path}`);
    
    if (!req.user || !req.user.userId) {
      console.log(`⚠️ No hay usuario autenticado, continuando...`);
      return next();
    }

    // Buscar coincidencias en las rutas protegidas
    let requiredRoles = [];
    let matchedPattern = '';
    
    for (const [routePattern, roles] of Object.entries(routePermissions)) {
      // Convertir patrón a regex
      const regexPattern = routePattern
        .replace(/\*/g, '.*')
        .replace(/:\w+/g, '\\w+');
      
      const regex = new RegExp(`^${regexPattern}$`);
      
      if (regex.test(path)) {
        requiredRoles = roles;
        matchedPattern = routePattern;
        console.log(`🎯 Patrón encontrado: "${routePattern}" → Roles requeridos: [${roles.join(', ')}]`);
        break;
      }
    }

    // Si la ruta no tiene restricciones de rol, permitir acceso
    if (requiredRoles.length === 0) {
      console.log(`✅ Ruta "${path}" no tiene restricciones de rol, permitiendo acceso`);
      return next();
    }

    // Obtener rol del usuario desde el token
    const userRoleId = req.user.Id_rol;
    const userRole = roleMap[userRoleId] || 'cliente';
    
    console.log(`👤 Rol del usuario: "${userRole}" (Id_rol: ${userRoleId})`);

    // Verificar si el usuario tiene el rol requerido
    if (!requiredRoles.includes(userRole)) {
      console.warn(`\n🚨 ACCESO DENEGADO - Ruta: ${path}`);
      console.warn(`   Usuario ID: ${req.user.userId}`);
      console.warn(`   Usuario rol: ${userRole}`);
      console.warn(`   Roles requeridos: ${requiredRoles.join(', ')}`);
      
      return res.status(403).json({
        ok: false,
        msg: "Acceso denegado. No tienes permisos suficientes.",
        details: {
          userRole,
          requiredRoles,
          path,
          userId: req.user.userId,
          username: req.user.username
        }
      });
    }

    console.log(`\n✅ ACCESO PERMITIDO - Ruta: ${path} para ${userRole}`);
    console.log(`   Usuario: ${req.user.username} (ID: ${req.user.userId})`);
    
    // Agregar información del rol al request
    req.user.role = userRole;
    req.user.roleName = userRole;
    
    next();
  } catch (error) {
    console.error("\n❌ AUTO VERIFY ROLE - Error:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error verificando permisos",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Middleware para verificar roles específicos explícitamente
 */
export const verifyRole = (requiredRoles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          ok: false,
          msg: "Usuario no autenticado",
        });
      }

      const userRoleId = req.user.Id_rol;
      const userRole = roleMap[userRoleId] || 'cliente';
      
      console.log(`\n🔍 VERIFY ROLE EXPLÍCITO - Usuario: ${req.user.userId}, Rol: ${userRole}`);
      console.log(`   Roles requeridos: [${requiredRoles.join(', ')}]`);

      if (requiredRoles.length === 0) {
        console.log(`✅ Sin roles requeridos, permitiendo acceso`);
        return next();
      }

      if (!requiredRoles.includes(userRole)) {
        console.warn(`\n🚨 ACCESO DENEGADO - verifyRole explícito`);
        console.warn(`   Usuario rol: ${userRole}`);
        console.warn(`   Roles requeridos: ${requiredRoles.join(', ')}`);
        
        return res.status(403).json({
          ok: false,
          msg: "Acceso denegado. Permisos insuficientes.",
          userRole,
          requiredRoles
        });
      }

      console.log(`✅ ACCESO PERMITIDO - Rol ${userRole} tiene permisos`);
      req.user.role = userRole;
      next();
    } catch (error) {
      console.error("\n❌ VERIFY ROLE - Error:", error);
      return res.status(500).json({
        ok: false,
        msg: "Error verificando permisos específicos",
      });
    }
  };
};

// Exportar routePermissions para debugging
export const getRoutePermissions = () => {
  return routePermissions;
};

export default {
  autoVerifyRole,
  verifyRole,
  roleMap,
  getRoutePermissions
};