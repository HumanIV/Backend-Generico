import { OrderModel } from "../models/order.model.js";
import { db } from "../db/connection.database.js"; 
// ============================================
// OBTENER TODOS LOS PEDIDOS
// ============================================
const getOrders = async (req, res) => {
  try {
    console.log("📋 OrderController - getOrders - Solicitando pedidos...");
    
    const orders = await OrderModel.findAll();
    
    return res.json({
      ok: true,
      orders: orders,
      total: orders.length,
      message: `${orders.length} pedidos encontrados`
    });
  } catch (error) {
    console.error("❌ OrderController - getOrders - Error:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor al obtener pedidos",
      error: error.message
    });
  }
};

// ============================================
// OBTENER UN PEDIDO POR ID
// ============================================
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        ok: false,
        msg: "ID del pedido requerido"
      });
    }
    
    console.log(`🔍 OrderController - getOrderById - ID: ${id}`);
    
    const order = await OrderModel.findById(id);
    
    if (!order) {
      return res.status(404).json({
        ok: false,
        msg: "Pedido no encontrado"
      });
    }
    
    return res.json({
      ok: true,
      order: order
    });
  } catch (error) {
    console.error("❌ OrderController - getOrderById - Error:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor al obtener pedido",
      error: error.message
    });
  }
};

// ============================================
// CREAR UN NUEVO PEDIDO
// ============================================
const createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    
    // Validaciones básicas
    if (!orderData.id_customer || !orderData.lines || orderData.lines.length === 0) {
      return res.status(400).json({
        ok: false,
        msg: "Cliente y al menos un producto son requeridos"
      });
    }
    
    console.log("📝 OrderController - createOrder - Datos:", orderData);
    
    // Agregar ID del empleado desde el token si no se proporciona
    if (!orderData.id_employee && req.user && req.user.userId) {
      // Aquí deberías obtener el id_employee basado en el userId
      // Por ahora, usamos un valor por defecto o el mismo userId
      orderData.id_employee = req.user.userId;
    }
    
    const newOrder = await OrderModel.create(orderData);
    
    return res.status(201).json({
      ok: true,
      msg: "Pedido creado exitosamente",
      order: newOrder
    });
  } catch (error) {
    console.error("❌ OrderController - createOrder - Error:", error);
    
    // Manejo de errores específicos
    if (error.message.includes('stock insuficiente')) {
      return res.status(400).json({
        ok: false,
        msg: error.message
      });
    }
    
    if (error.message.includes('foreign key constraint')) {
      return res.status(400).json({
        ok: false,
        msg: "Cliente o producto no válido"
      });
    }
    
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor al crear pedido",
      error: error.message
    });
  }
};

// ============================================
// ACTUALIZAR ESTADO DE PEDIDO
// ============================================
const updateOrderState = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    if (!id) {
      return res.status(400).json({
        ok: false,
        msg: "ID del pedido requerido"
      });
    }
    
    if (!estado || !['pending', 'shipped', 'delivered', 'cancelled'].includes(estado)) {
      return res.status(400).json({
        ok: false,
        msg: "Estado válido requerido: pending, shipped, delivered, cancelled"
      });
    }
    
    console.log(`🔄 OrderController - updateOrderState - ID: ${id}, Estado: ${estado}`);
    
    const updatedOrder = await OrderModel.updateState(id, estado);
    
    return res.json({
      ok: true,
      msg: `Pedido ${estado === 'cancelled' ? 'cancelado' : 'actualizado'} exitosamente`,
      order: updatedOrder
    });
  } catch (error) {
    console.error("❌ OrderController - updateOrderState - Error:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor al actualizar pedido",
      error: error.message
    });
  }
};

// ============================================
// ELIMINAR UN PEDIDO (CORREGIDA)
// ============================================
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        ok: false,
        msg: "ID del pedido requerido"
      });
    }
    
    console.log(`🗑️ OrderController - deleteOrder - Eliminando pedido ID: ${id}`);
    
    // Usar la función del modelo en lugar de hacer queries directos
    const deleted = await OrderModel.remove(id);
    
    if (!deleted) {
      return res.status(404).json({
        ok: false,
        msg: "Pedido no encontrado"
      });
    }
    
    return res.json({
      ok: true,
      msg: "Pedido eliminado exitosamente",
      deletedOrderId: id
    });
    
  } catch (error) {
    console.error("❌ OrderController - deleteOrder - Error:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor al eliminar pedido",
      error: error.message
    });
  }
};

// ============================================
// OBTENER CLIENTES (ACTUALIZADA)
// ============================================
const getCustomers = async (req, res) => {
  try {
    // Modificar la query para incluir el RIF desde la tabla user
    const query = {
      text: `
        SELECT 
          c.id_customer as id,
          u.first_name || ' ' || u.last_name as nombre,
          u.email,
          u.dni as rif,  -- Obtenemos el RIF desde user.dni
          u.phone_number as telefono,
          u.address as direccion,
          c.shipping_address,
          c.purchase_limit
        FROM customer c
        LEFT JOIN "user" u ON c.id_user = u.id_user
        WHERE u.id_role = 3 OR u.id_role IS NULL  -- Solo clientes (rol 3) o sin rol
        ORDER BY u.first_name, u.last_name
      `,
    };
    
    const { rows } = await db.query(query.text);
    return res.json({
      ok: true,
      customers: rows
    });
  } catch (error) {
    console.error("❌ OrderController - getCustomers - Error:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor al obtener clientes"
    });
  }
};

// ============================================
// OBTENER EMPLEADOS
// ============================================
const getEmployees = async (req, res) => {
  try {
    const employees = await OrderModel.getEmployees();
    
    return res.json({
      ok: true,
      employees: employees
    });
  } catch (error) {
    console.error("❌ OrderController - getEmployees - Error:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor al obtener empleados"
    });
  }
};

// ============================================
// OBTENER PEDIDOS POR CLIENTE
// ============================================
const getOrdersByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    
    if (!customerId) {
      return res.status(400).json({
        ok: false,
        msg: "ID del cliente requerido"
      });
    }
    
    console.log(`🔍 OrderController - getOrdersByCustomer - Cliente ID: ${customerId}`);
    
    const orders = await OrderModel.findAll();
    const customerOrders = orders.filter(order => order.id_customer == customerId);
    
    return res.json({
      ok: true,
      orders: customerOrders,
      total: customerOrders.length
    });
  } catch (error) {
    console.error("❌ OrderController - getOrdersByCustomer - Error:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor al obtener pedidos del cliente"
    });
  }
};

// ============================================
// CREAR UN NUEVO CLIENTE (CORREGIDA CON TU ESTRUCTURA)
// ============================================
const createCustomer = async (req, res) => {
  try {
    const customerData = req.body;
    
    // Validaciones básicas
    if (!customerData.nombre || !customerData.rif) {
      return res.status(400).json({
        ok: false,
        msg: "Nombre y RIF son requeridos"
      });
    }
    
    console.log("👤 OrderController - createCustomer - Datos:", customerData);
    
    // Extraer nombre y apellido
    const nombres = customerData.nombre.split(' ');
    const first_name = nombres[0] || customerData.nombre;
    const last_name = nombres.slice(1).join(' ') || '';
    
    // Crear email si no se proporciona
    const email = customerData.email || 
      `${customerData.nombre.toLowerCase().replace(/\s+/g, '')}@cliente.com`;
    
    // Crear username único (usando RIF sin caracteres especiales)
    const username = `cliente_${customerData.rif.replace(/[^a-zA-Z0-9]/g, '')}`;
    
    // Obtener ID del rol "customer" (buscamos primero, si no existe usamos 3 por defecto)
    let roleId = 3; // ID por defecto para clientes
    
    try {
      const roleQuery = {
        text: 'SELECT id_role FROM role WHERE name_role = $1',
        values: ['customer']
      };
      const roleResult = await db.query(roleQuery.text, roleQuery.values);
      if (roleResult.rows.length > 0) {
        roleId = roleResult.rows[0].id_role;
      } else {
        // Si no existe el rol customer, lo creamos
        const createRoleQuery = {
          text: 'INSERT INTO role (name_role, permissions) VALUES ($1, $2) RETURNING id_role',
          values: ['customer', '["view_own_orders", "view_products"]']
        };
        const newRoleResult = await db.query(createRoleQuery.text, createRoleQuery.values);
        roleId = newRoleResult.rows[0].id_role;
        console.log(`🎭 Rol 'customer' creado con ID: ${roleId}`);
      }
    } catch (roleError) {
      console.log("⚠️ No se pudo obtener/crear rol, usando ID por defecto:", roleId);
    }
    
    // Crear usuario primero - USANDO LA ESTRUCTURA CORRECTA DE TU BD
    const userQuery = {
      text: `
        INSERT INTO "user" (
          id_role,
          user_name,        -- ¡CORRECTO! Tu BD tiene user_name (con guión)
          password,         -- ¡CORRECTO! Tu BD tiene password (no password_hash)
          first_name,
          last_name,
          email,
          address,
          dni,
          phone_number
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id_user
      `,
      values: [
        roleId,                      // id_role
        username,                    // user_name (con guión)
        'password123',               // password temporal
        first_name,                  // first_name
        last_name,                   // last_name
        email,                       // email
        customerData.direccion || '',// address
        customerData.rif,            // dni (guardamos el RIF aquí)
        customerData.telefono || ''  // phone_number
      ]
    };
    
    console.log("👤 Ejecutando query de usuario...");
    const userResult = await db.query(userQuery.text, userQuery.values);
    const id_user = userResult.rows[0].id_user;
    
    console.log(`👤 Usuario creado con ID: ${id_user}`);
    
    // Ahora crear el cliente - TU TABLA CUSTOMER NO TIENE COLUMNA RIF
    console.log("👤 Creando cliente...");
    
    const customerQuery = {
      text: `
        INSERT INTO customer (
          id_user,
          shipping_address,
          purchase_limit
          -- Tu tabla customer NO tiene columna rif según tu estructura
        )
        VALUES ($1, $2, $3)
        RETURNING id_customer
      `,
      values: [
        id_user,
        customerData.direccionEntrega || customerData.direccion || '',
        1000000  // purchase_limit por defecto
      ]
    };
    
    const customerResult = await db.query(customerQuery.text, customerQuery.values);
    const id_customer = customerResult.rows[0].id_customer;
    
    console.log(`✅ Cliente creado con ID: ${id_customer}`);
    
    return res.status(201).json({
      ok: true,
      msg: "Cliente creado exitosamente",
      customerId: id_customer,
      customer: {
        id: id_customer,
        nombre: customerData.nombre,
        rif: customerData.rif,
        email: email,
        telefono: customerData.telefono || '',
        direccion: customerData.direccion || '',
        shipping_address: customerData.direccionEntrega || customerData.direccion || '',
        user_name: username
      }
    });
    
  } catch (error) {
    console.error("❌ OrderController - createCustomer - Error:", error);
    console.error("❌ Error detallado:", error.message);
    
    if (error.message.includes('duplicate key')) {
      if (error.message.includes('user_name')) {
        return res.status(400).json({
          ok: false,
          msg: "El nombre de usuario ya existe. Intente con otro RIF."
        });
      }
      if (error.message.includes('email')) {
        return res.status(400).json({
          ok: false,
          msg: "El email ya está registrado."
        });
      }
      return res.status(400).json({
        ok: false,
        msg: "El RIF o usuario ya existe"
      });
    }
    
    if (error.message.includes('no existe la columna')) {
      return res.status(500).json({
        ok: false,
        msg: `Error en estructura de tabla: ${error.message}. Verifica las columnas de tu base de datos.`,
        error: error.message
      });
    }
    
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor al crear cliente",
      error: error.message
    });
  }
};

// ============================================
// EXPORTACIÓN
// ============================================
export const OrderController = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderState,
  deleteOrder,
  getCustomers,
  getEmployees,
  getOrdersByCustomer,
  createCustomer 
};