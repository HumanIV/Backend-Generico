// src/models/invoice.model.js
import { db } from "../db/connection.database.js";

export const InvoiceModel = {
  // ============================================
  // OBTENER TODAS LAS FACTURAS
  // ============================================
  async findAll() {
    try {
      console.log("📋 InvoiceModel - findAll - Buscando facturas...");
      
      const query = {
        text: `
          SELECT 
            i.*,
            o.order_date,
            c.id_customer,
            u.first_name || ' ' || u.last_name as customer_name,
            u.dni as customer_rif,
            u.email as customer_email,
            u.address as customer_address
          FROM invoice i
          LEFT JOIN "order" o ON i.id_order = o.id_order
          LEFT JOIN customer c ON o.id_customer = c.id_customer
          LEFT JOIN "user" u ON c.id_user = u.id_user
          ORDER BY i.issue_date DESC
        `,
      };
      
      const { rows } = await db.query(query.text);
      console.log(`✅ InvoiceModel - findAll - ${rows.length} facturas encontradas`);
      return rows;
    } catch (error) {
      console.error("❌ InvoiceModel - findAll - Error:", error);
      throw error;
    }
  },

  // ============================================
  // OBTENER FACTURA POR ID
  // ============================================
  async findById(id) {
    try {
      console.log(`🔍 InvoiceModel - findById - Buscando factura ID: ${id}`);
      
      const invoiceQuery = {
        text: `
          SELECT 
            i.*,
            o.order_date,
            c.id_customer,
            u.first_name || ' ' || u.last_name as customer_name,
            u.dni as customer_rif,
            u.email as customer_email,
            u.address as customer_address,
            emp.first_name || ' ' || emp.last_name as employee_name
          FROM invoice i
          LEFT JOIN "order" o ON i.id_order = o.id_order
          LEFT JOIN customer c ON o.id_customer = c.id_customer
          LEFT JOIN "user" u ON c.id_user = u.id_user
          LEFT JOIN employee e ON o.id_employee = e.id_employee
          LEFT JOIN "user" emp ON e.id_user = emp.id_user
          WHERE i.id_invoice = $1
        `,
        values: [id],
      };
      
      const { rows } = await db.query(invoiceQuery.text, invoiceQuery.values);
      
      if (rows.length === 0) {
        console.log(`❌ InvoiceModel - findById - Factura ${id} no encontrada`);
        return null;
      }
      
      const invoice = rows[0];
      
      // Obtener líneas de la factura
      const linesQuery = {
        text: `
          SELECT 
            il.*,
            p.name_product as product_name,
            p.description as product_description
          FROM invoice_line il
          LEFT JOIN product p ON il.id_product = p.id_product
          WHERE il.id_invoice = $1
        `,
        values: [id],
      };
      
      const linesResult = await db.query(linesQuery.text, linesQuery.values);
      invoice.lines = linesResult.rows;
      
      console.log(`✅ InvoiceModel - findById - Factura ${id} encontrada`);
      return invoice;
    } catch (error) {
      console.error(`❌ InvoiceModel - findById - Error:`, error);
      throw error;
    }
  },

  // ============================================
  // CREAR NUEVA FACTURA
  // ============================================
  async create(invoiceData) {
    try {
      console.log("📝 InvoiceModel - create - Creando factura:", invoiceData);
      
      // Generar número de factura único
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const invoiceNumber = `FACT-${year}${month}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      // Iniciar transacción
      await db.query('BEGIN');
      
      // Insertar factura principal
      const invoiceQuery = {
        text: `
          INSERT INTO invoice (
            id_order,
            invoice_number,
            subtotal,
            tax,
            total,
            payment_method,
            notes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `,
        values: [
          invoiceData.id_order,
          invoiceNumber,
          invoiceData.subtotal,
          invoiceData.tax,
          invoiceData.total,
          invoiceData.payment_method || 'Contado',
          invoiceData.notes || ''
        ],
      };
      
      const invoiceResult = await db.query(invoiceQuery.text, invoiceQuery.values);
      const newInvoice = invoiceResult.rows[0];
      
      // Insertar líneas de la factura
      if (invoiceData.lines && invoiceData.lines.length > 0) {
        for (const line of invoiceData.lines) {
          const lineQuery = {
            text: `
              INSERT INTO invoice_line (
                id_invoice,
                id_product,
                quantity,
                unit_price,
                line_total
              )
              VALUES ($1, $2, $3, $4, $5)
            `,
            values: [
              newInvoice.id_invoice,
              line.id_product,
              line.quantity,
              line.unit_price,
              line.line_total || (line.quantity * line.unit_price)
            ],
          };
          
          await db.query(lineQuery.text, lineQuery.values);
        }
      }
      
      // Actualizar estado del pedido a "facturado"
      const updateOrderQuery = {
        text: `
          UPDATE "order"
          SET state = 'delivered'
          WHERE id_order = $1
        `,
        values: [invoiceData.id_order],
      };
      
      await db.query(updateOrderQuery.text, updateOrderQuery.values);
      
      await db.query('COMMIT');
      
      console.log(`✅ InvoiceModel - create - Factura creada ID: ${newInvoice.id_invoice}`);
      return this.findById(newInvoice.id_invoice);
      
    } catch (error) {
      await db.query('ROLLBACK');
      console.error("❌ InvoiceModel - create - Error:", error);
      throw error;
    }
  },




// ============================================
// OBTENER PEDIDO POR ID CON DETALLES
// ============================================
async getOrderById(id) {
  try {
    console.log(`🔍 InvoiceModel - getOrderById - Buscando pedido ID: ${id}`);
    
    const orderQuery = {
      text: `
        SELECT 
          o.*,
          c.id_customer,
          u.first_name || ' ' || u.last_name as customer_name,
          u.dni as customer_rif,
          u.email as customer_email,
          u.address as customer_address,
          u.phone_number as customer_phone,
          emp.first_name || ' ' || emp.last_name as employee_name
        FROM "order" o
        LEFT JOIN customer c ON o.id_customer = c.id_customer
        LEFT JOIN "user" u ON c.id_user = u.id_user
        LEFT JOIN employee e ON o.id_employee = e.id_employee
        LEFT JOIN "user" emp ON e.id_user = emp.id_user
        WHERE o.id_order = $1 AND o.state != 'cancelled'
      `,
      values: [id],
    };
    
    const { rows } = await db.query(orderQuery.text, orderQuery.values);
    
    if (rows.length === 0) {
      console.log(`❌ InvoiceModel - getOrderById - Pedido ${id} no encontrado`);
      return null;
    }
    
    const order = rows[0];
    
    // Obtener detalles del pedido con información del producto
    // NOTA: Cambié "do" por "d" para evitar conflicto con palabra reservada
    const detailsQuery = {
      text: `
        SELECT 
          d.*,
          p.name_product as product_name,
          p.description as product_description,
          p.price as product_price
        FROM details_order d
        LEFT JOIN product p ON d.id_product = p.id_product
        WHERE d.id_order = $1
      `,
      values: [id],
    };
    
    const detailsResult = await db.query(detailsQuery.text, detailsQuery.values);
    order.lines = detailsResult.rows;
    
    // Calcular total si no está en la BD
    if (!order.total && order.lines.length > 0) {
      order.total = order.lines.reduce((sum, line) => {
        const price = line.product_price || 0;
        const quantity = line.quantity || 1;
        return sum + (price * quantity);
      }, 0);
    }
    
    console.log(`✅ InvoiceModel - getOrderById - Pedido ${id} encontrado con ${order.lines.length} líneas`);
    return order;
  } catch (error) {
    console.error(`❌ InvoiceModel - getOrderById - Error:`, error);
    throw error;
  }
},







  // ============================================
  // OBTENER FACTURA POR ID
  // ============================================
  async findById(id) {
    try {
      console.log(`🔍 InvoiceModel - findById - Buscando factura ID: ${id}`);
      
      const query = {
        text: `
          SELECT 
            i.*,
            o.id_order,
            o.total as order_total,
            c.id_customer,
            u.first_name || ' ' || u.last_name as customer_name,
            u.dni as customer_rif,
            u.email as customer_email
          FROM invoice i
          LEFT JOIN "order" o ON i.id_order = o.id_order
          LEFT JOIN customer c ON o.id_customer = c.id_customer
          LEFT JOIN "user" u ON c.id_user = u.id_user
          WHERE i.id_invoice = $1
        `,
        values: [id],
      };
      
      const { rows } = await db.query(query.text, query.values);
      
      if (rows.length === 0) {
        console.log(`❌ InvoiceModel - findById - Factura ${id} no encontrada`);
        return null;
      }
      
      const invoice = rows[0];
      
      // Obtener líneas de la factura
      const linesQuery = {
        text: `
          SELECT 
            il.*,
            p.name_product as product_name,
            p.description as product_description,
            p.price as product_price
          FROM invoice_line il
          LEFT JOIN product p ON il.id_product = p.id_product
          WHERE il.id_invoice = $1
        `,
        values: [id],
      };
      
      const linesResult = await db.query(linesQuery.text, linesQuery.values);
      invoice.lines = linesResult.rows;
      
      console.log(`✅ InvoiceModel - findById - Factura ${id} encontrada con ${invoice.lines.length} líneas`);
      return invoice;
    } catch (error) {
      console.error(`❌ InvoiceModel - findById - Error:`, error);
      throw error;
    }
  },



  // ============================================
  // OBTENER PEDIDOS PENDIENTES DE FACTURAR
  // ============================================
  async getPendingOrders() {
    try {
      console.log("📋 InvoiceModel - getPendingOrders - Buscando pedidos pendientes...");
      
      const query = {
        text: `
          SELECT 
            o.*,
            c.id_customer,
            u.first_name || ' ' || u.last_name as customer_name,
            u.dni as customer_rif,
            u.email as customer_email
          FROM "order" o
          LEFT JOIN customer c ON o.id_customer = c.id_customer
          LEFT JOIN "user" u ON c.id_user = u.id_user
          WHERE o.state IN ('pending', 'shipped')
            AND NOT EXISTS (
              SELECT 1 FROM invoice i WHERE i.id_order = o.id_order
            )
          ORDER BY o.order_date DESC
        `,
      };
      
      const { rows } = await db.query(query.text);
      console.log(`✅ InvoiceModel - getPendingOrders - ${rows.length} pedidos pendientes`);
      return rows;
    } catch (error) {
      console.error("❌ InvoiceModel - getPendingOrders - Error:", error);
      throw error;
    }
  },

  // ============================================
  // ELIMINAR FACTURA
  // ============================================
  async remove(id) {
    try {
      console.log(`🗑️ InvoiceModel - remove - Eliminando factura ID: ${id}`);
      
      // Verificar si la factura existe
      const checkQuery = {
        text: 'SELECT * FROM invoice WHERE id_invoice = $1',
        values: [id],
      };
      
      const checkResult = await db.query(checkQuery.text, checkQuery.values);
      
      if (checkResult.rows.length === 0) {
        console.log(`❌ InvoiceModel - remove - Factura ${id} no encontrada`);
        return false;
      }
      
      // Iniciar transacción
      await db.query('BEGIN');
      
      // Obtener el id_order antes de eliminar
      const orderId = checkResult.rows[0].id_order;
      
      // Eliminar líneas de la factura (se eliminarán en cascada por la FK)
      const deleteLinesQuery = {
        text: 'DELETE FROM invoice_line WHERE id_invoice = $1',
        values: [id],
      };
      
      await db.query(deleteLinesQuery.text, deleteLinesQuery.values);
      
      // Eliminar la factura
      const deleteQuery = {
        text: 'DELETE FROM invoice WHERE id_invoice = $1 RETURNING id_invoice',
        values: [id],
      };
      
      const result = await db.query(deleteQuery.text, deleteQuery.values);
      
      // Revertir estado del pedido a "shipped"
      if (orderId) {
        const updateOrderQuery = {
          text: `
            UPDATE "order"
            SET state = 'shipped'
            WHERE id_order = $1
          `,
          values: [orderId],
        };
        
        await db.query(updateOrderQuery.text, updateOrderQuery.values);
      }
      
      await db.query('COMMIT');
      
      console.log(`✅ InvoiceModel - remove - Factura ${id} eliminada`);
      return result.rowCount > 0;
      
    } catch (error) {
      await db.query('ROLLBACK');
      console.error(`❌ InvoiceModel - remove - Error:`, error);
      throw error;
    }
  },
};