import { db } from "../db/connection.database.js";

// ============================================
// FUNCIÓN PARA OBTENER TODOS LOS PEDIDOS
// ============================================
const findAll = async () => {
  try {
    console.log("📋 OrderModel - findAll - Obteniendo todos los pedidos...");
    
    const query = {
      text: `
        SELECT 
          o.id_order as id,
          o.order_date as "fechaCreacion",
          o.state as "estado",
          o.total,
          c.id_customer,
          u.first_name || ' ' || u.last_name as "cliente",
          u.email as "cliente_email",
          u.phone_number as "cliente_telefono",
          e.id_employee,
          emp_u.first_name || ' ' || emp_u.last_name as "empleado",
          COUNT(d.id_details) as "total_items"
        FROM "order" o
        LEFT JOIN customer c ON o.id_customer = c.id_customer
        LEFT JOIN "user" u ON c.id_user = u.id_user
        LEFT JOIN employee e ON o.id_employee = e.id_employee
        LEFT JOIN "user" emp_u ON e.id_user = emp_u.id_user
        LEFT JOIN details_order d ON o.id_order = d.id_order
        GROUP BY o.id_order, c.id_customer, u.id_user, e.id_employee, emp_u.id_user
        ORDER BY o.order_date DESC
      `,
    };
    
    const { rows } = await db.query(query.text);
    console.log(`✅ OrderModel - findAll - Pedidos encontrados: ${rows.length}`);
    
    return rows.map(order => ({
      ...order,
      estado: mapOrderState(order.estado),
      total: formatCurrency(order.total),
      fechaCreacion: new Date(order.fechaCreacion).toLocaleDateString('es-ES')
    }));
  } catch (error) {
    console.error("❌ OrderModel - findAll - Error:", error);
    throw error;
  }
};

// ============================================
// FUNCIÓN PARA OBTENER UN PEDIDO POR ID
// ============================================
const findById = async (id) => {
  try {
    console.log(`🔍 OrderModel - findById - Buscando pedido ID: ${id}`);
    
    // Obtener información principal del pedido
    const orderQuery = {
      text: `
        SELECT 
          o.id_order as id,
          o.order_date as "fechaCreacion",
          o.state as "estado",
          o.total,
          c.id_customer,
          u.first_name || ' ' || u.last_name as "cliente",
          u.email as "cliente_email",
          u.phone_number as "cliente_telefono",
          u.address as "direccionFactura",
          e.id_employee,
          emp_u.first_name || ' ' || emp_u.last_name as "empleado"
        FROM "order" o
        LEFT JOIN customer c ON o.id_customer = c.id_customer
        LEFT JOIN "user" u ON c.id_user = u.id_user
        LEFT JOIN employee e ON o.id_employee = e.id_employee
        LEFT JOIN "user" emp_u ON e.id_user = emp_u.id_user
        WHERE o.id_order = $1
      `,
      values: [id]
    };
    
    const orderResult = await db.query(orderQuery.text, orderQuery.values);
    const order = orderResult.rows[0];
    
    if (!order) return null;
    
    // Obtener detalles del pedido
    const detailsQuery = {
      text: `
        SELECT 
          d.id_details as "id",
          d.id_product,
          p.name_product as "nombre",
          p.description as "descripcion",
          p.price as "precio_unitario",
          1 as "cantidad",
          p.price as "subtotal",
          d.description as "nota"
        FROM details_order d
        LEFT JOIN product p ON d.id_product = p.id_product
        WHERE d.id_order = $1
      `,
      values: [id]
    };
    
    const detailsResult = await db.query(detailsQuery.text, detailsQuery.values);
    const lines = detailsResult.rows;
    
    return {
      ...order,
      estado: mapOrderState(order.estado),
      total: formatCurrency(order.total),
      fechaCreacion: new Date(order.fechaCreacion).toLocaleDateString('es-ES'),
      lines: lines.map(line => ({
        ...line,
        precio_unitario: formatCurrency(line.precio_unitario),
        subtotal: formatCurrency(line.subtotal)
      }))
    };
  } catch (error) {
    console.error(`❌ OrderModel - findById - Error:`, error);
    throw error;
  }
};

const create = async (orderData) => {
  try {
    console.log("📝 OrderModel - create - Creando pedido:", orderData);
    
    const { 
      id_customer, 
      id_employee, 
      lines = [],
      total,
      estado = 'pending'
    } = orderData;
    
    // Iniciar transacción
    await db.query('BEGIN');
    
    // VALIDAR STOCK PARA CADA PRODUCTO ANTES DE CREAR EL PEDIDO
    for (const line of lines) {
      const stockQuery = {
        text: `
          SELECT 
            COALESCE(SUM(CASE WHEN movement_type = 'entry' THEN quantity ELSE -quantity END), 0) as stock_actual
          FROM stock 
          WHERE id_product = $1
        `,
        values: [line.id_product]
      };
      
      const stockResult = await db.query(stockQuery.text, stockQuery.values);
      const stockActual = parseFloat(stockResult.rows[0]?.stock_actual || 0);
      
      console.log(`📊 Producto ${line.id_product}: Stock actual = ${stockActual}, Requerido = ${line.cantidad}`);
      
      if (stockActual < line.cantidad) {
        // Obtener nombre del producto para el mensaje de error
        const productQuery = {
          text: 'SELECT name_product FROM product WHERE id_product = $1',
          values: [line.id_product]
        };
        
        const productResult = await db.query(productQuery.text, productQuery.values);
        const productName = productResult.rows[0]?.name_product || 'Producto';
        
        throw new Error(`Stock insuficiente para "${productName}". Stock disponible: ${stockActual}, Cantidad solicitada: ${line.cantidad}`);
      }
    }
    
    // Crear el pedido principal
    const orderQuery = {
      text: `
        INSERT INTO "order" (
          id_customer, 
          id_employee, 
          state, 
          total
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      values: [id_customer, id_employee, estado, total]
    };
    
    const orderResult = await db.query(orderQuery.text, orderQuery.values);
    const newOrder = orderResult.rows[0];
    
    // Crear detalles del pedido
    for (const line of lines) {
      const detailQuery = {
        text: `
          INSERT INTO details_order (id_order, id_product, description)
          VALUES ($1, $2, $3)
        `,
        values: [newOrder.id_order, line.id_product, line.nota || '']
      };
      
      await db.query(detailQuery.text, detailQuery.values);
      
      // Registrar salida de stock
      const stockQuery = {
        text: `
          INSERT INTO stock (id_product, movement_type, quantity, note_stock)
          VALUES ($1, 'exit', $2, $3)
        `,
        values: [
          line.id_product, 
          line.cantidad, 
          `Salida por pedido #${newOrder.id_order}`
        ]
      };
      
      await db.query(stockQuery.text, stockQuery.values);
    }
    
    await db.query('COMMIT');
    
    console.log(`✅ OrderModel - create - Pedido creado ID: ${newOrder.id_order}`);
    return await findById(newOrder.id_order);
    
  } catch (error) {
    await db.query('ROLLBACK');
    console.error("❌ OrderModel - create - Error:", error);
    throw error;
  }
};

// ============================================
// FUNCIÓN PARA ACTUALIZAR ESTADO DE PEDIDO
// ============================================
const updateState = async (id, estado) => {
  try {
    console.log(`🔄 OrderModel - updateState - Pedido ID: ${id}, Nuevo estado: ${estado}`);
    
    const query = {
      text: `
        UPDATE "order" 
        SET state = $1 
        WHERE id_order = $2
        RETURNING *
      `,
      values: [estado, id]
    };
    
    const { rows } = await db.query(query.text, query.values);
    const updatedOrder = rows[0];
    
    if (!updatedOrder) {
      throw new Error("Pedido no encontrado");
    }
    
    console.log(`✅ OrderModel - updateState - Pedido actualizado ID: ${id}`);
    return await findById(id);
  } catch (error) {
    console.error(`❌ OrderModel - updateState - Error:`, error);
    throw error;
  }
};

// ============================================
// FUNCIÓN PARA OBTENER CLIENTES (ACTUALIZADA)
// ============================================
const getCustomers = async () => {
  try {
    const query = {
      text: `
        SELECT 
          c.id_customer as id,
          u.first_name || ' ' || u.last_name as nombre,
          u.email,
          u.dni as rif,  -- Obtener RIF desde user.dni
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
    return rows;
  } catch (error) {
    console.error("❌ OrderModel - getCustomers - Error:", error);
    return [];
  }
};

// ============================================
// FUNCIÓN PARA OBTENER EMPLEADOS (PARA SELECT)
// ============================================
const getEmployees = async () => {
  try {
    const query = {
      text: `
        SELECT 
          e.id_employee as id,
          u.first_name || ' ' || u.last_name as nombre,
          u.email,
          u.phone_number as telefono,
          e.commission
        FROM employee e
        LEFT JOIN "user" u ON e.id_user = u.id_user
        WHERE u.is_active = true
        ORDER BY u.first_name, u.last_name
      `,
    };
    
    const { rows } = await db.query(query.text);
    return rows;
  } catch (error) {
    console.error("❌ OrderModel - getEmployees - Error:", error);
    return [];
  }
};

// ============================================
// FUNCIÓN PARA ELIMINAR UN PEDIDO
// ============================================
const remove = async (id) => {
  try {
    console.log(`🗑️ OrderModel - remove - Eliminando pedido ID: ${id}`);
    
    // Obtener detalles del pedido
    const detailsQuery = {
      text: `
        SELECT 
          d.id_product,
          p.name_product,
          d.description
        FROM details_order d
        LEFT JOIN product p ON d.id_product = p.id_product
        WHERE d.id_order = $1
      `,
      values: [id]
    };
    
    const detailsResult = await db.query(detailsQuery.text, detailsQuery.values);
    const orderDetails = detailsResult.rows;
    
    // Iniciar transacción
    await db.query('BEGIN');
    
    // Devolver stock por cada producto en el pedido (1 unidad por cada detalle)
    for (const detail of orderDetails) {
      const stockReturnQuery = {
        text: `
          INSERT INTO stock (
            id_product, 
            movement_type, 
            quantity, 
            note_stock
          )
          VALUES ($1, 'entry', 1, $2)
        `,
        values: [
          detail.id_product, 
          `Devolución por eliminación de pedido #${id} - ${detail.name_product || 'Producto'}`
        ]
      };
      
      await db.query(stockReturnQuery.text, stockReturnQuery.values);
      console.log(`📦 Devolviendo stock: 1 unidad del producto ${detail.id_product}`);
    }
    
    // Eliminar detalles del pedido
    const deleteDetailsQuery = {
      text: 'DELETE FROM details_order WHERE id_order = $1',
      values: [id]
    };
    await db.query(deleteDetailsQuery.text, deleteDetailsQuery.values);
    
    // Eliminar pedido principal
    const deleteOrderQuery = {
      text: 'DELETE FROM "order" WHERE id_order = $1 RETURNING id_order',
      values: [id]
    };
    
    const result = await db.query(deleteOrderQuery.text, deleteOrderQuery.values);
    
    // Confirmar transacción
    await db.query('COMMIT');
    
    console.log(`✅ OrderModel - remove - Pedido eliminado ID: ${id}`);
    return result.rowCount > 0;
    
  } catch (error) {
    // Revertir transacción en caso de error
    await db.query('ROLLBACK');
    console.error(`❌ OrderModel - remove - Error:`, error);
    throw error;
  }
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================
const formatCurrency = (value) => {
  if (!value) return '$0.00';
  return `$${parseFloat(value).toFixed(2)}`;
};

const mapOrderState = (estado) => {
  const stateMap = {
    'pending': 'Pendiente',
    'shipped': 'Enviado',
    'delivered': 'Entregado',
    'cancelled': 'Cancelado'
  };
  return stateMap[estado] || estado;
};

// ============================================
// EXPORTACIÓN
// ============================================
export const OrderModel = {
  // CRUD básico
  findAll,
  findById,
  create,
  updateState,
  remove,
  
  // Datos auxiliares
  getCustomers,
  getEmployees
};