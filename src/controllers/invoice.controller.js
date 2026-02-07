// src/controllers/invoice.controller.js
import { InvoiceModel } from "../models/invoice.model.js";

// ============================================
// OBTENER TODAS LAS FACTURAS
// ============================================
const getInvoices = async (req, res) => {
  try {
    console.log("📋 InvoiceController - getInvoices - Solicitando facturas...");
    
    const invoices = await InvoiceModel.findAll();
    
    return res.json({
      ok: true,
      invoices: invoices,
      total: invoices.length,
      message: `${invoices.length} facturas encontradas`
    });
  } catch (error) {
    console.error("❌ InvoiceController - getInvoices - Error:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor al obtener facturas",
      error: error.message
    });
  }
};

// ============================================
// OBTENER FACTURA POR ID
// ============================================
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        ok: false,
        msg: "ID de la factura requerido"
      });
    }
    
    console.log(`🔍 InvoiceController - getInvoiceById - ID: ${id}`);
    
    const invoice = await InvoiceModel.findById(id);
    
    if (!invoice) {
      return res.status(404).json({
        ok: false,
        msg: "Factura no encontrada"
      });
    }
    
    return res.json({
      ok: true,
      invoice: invoice
    });
  } catch (error) {
    console.error("❌ InvoiceController - getInvoiceById - Error:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor al obtener factura",
      error: error.message
    });
  }
};

// ============================================
// OBTENER PEDIDO POR ID PARA FACTURAR
// ============================================
const getOrderForInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        ok: false,
        msg: "ID del pedido requerido"
      });
    }
    
    console.log(`🔍 InvoiceController - getOrderForInvoice - ID: ${id}`);
    
    const order = await InvoiceModel.getOrderById(id);
    
    if (!order) {
      return res.status(404).json({
        ok: false,
        msg: "Pedido no encontrado o ya facturado"
      });
    }
    
    // Verificar si ya tiene factura
    const checkInvoiceQuery = {
      text: 'SELECT * FROM invoice WHERE id_order = $1',
      values: [id],
    };
    
    // Necesitamos importar db aquí
    const { db } = await import("../db/connection.database.js");
    const invoiceCheck = await db.query(checkInvoiceQuery.text, checkInvoiceQuery.values);
    
    if (invoiceCheck.rows.length > 0) {
      return res.status(400).json({
        ok: false,
        msg: "Este pedido ya tiene una factura asociada"
      });
    }
    
    return res.json({
      ok: true,
      order: order,
      message: "Pedido listo para facturar"
    });
  } catch (error) {
    console.error("❌ InvoiceController - getOrderForInvoice - Error:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor al obtener pedido",
      error: error.message
    });
  }
};

// ============================================
// CREAR NUEVA FACTURA
// ============================================
const createInvoice = async (req, res) => {
  try {
    const invoiceData = req.body;
    
    // Validaciones básicas
    if (!invoiceData.id_order || !invoiceData.lines || invoiceData.lines.length === 0) {
      return res.status(400).json({
        ok: false,
        msg: "ID del pedido y al menos un producto son requeridos"
      });
    }
    
    if (!invoiceData.subtotal || !invoiceData.tax || !invoiceData.total) {
      return res.status(400).json({
        ok: false,
        msg: "Los montos (subtotal, impuesto, total) son requeridos"
      });
    }
    
    console.log("📝 InvoiceController - createInvoice - Datos:", invoiceData);
    
    // Verificar que el pedido existe y no está facturado
    const order = await InvoiceModel.getOrderById(invoiceData.id_order);
    if (!order) {
      return res.status(404).json({
        ok: false,
        msg: "Pedido no encontrado"
      });
    }
    
    // Verificar si ya tiene factura
    const { db } = await import("../db/connection.database.js");
    const checkInvoiceQuery = {
      text: 'SELECT * FROM invoice WHERE id_order = $1',
      values: [invoiceData.id_order],
    };
    
    const invoiceCheck = await db.query(checkInvoiceQuery.text, checkInvoiceQuery.values);
    if (invoiceCheck.rows.length > 0) {
      return res.status(400).json({
        ok: false,
        msg: "Este pedido ya tiene una factura asociada"
      });
    }
    
    // Crear la factura
    const newInvoice = await InvoiceModel.create(invoiceData);
    
    return res.status(201).json({
      ok: true,
      msg: "Factura creada exitosamente",
      invoice: newInvoice,
      invoice_number: newInvoice.invoice_number
    });
  } catch (error) {
    console.error("❌ InvoiceController - createInvoice - Error:", error);
    
    // Manejo de errores específicos
    if (error.message.includes('duplicate key')) {
      return res.status(400).json({
        ok: false,
        msg: "Error al generar número de factura único"
      });
    }
    
    if (error.message.includes('foreign key constraint')) {
      return res.status(400).json({
        ok: false,
        msg: "Pedido o producto no válido"
      });
    }
    
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor al crear factura",
      error: error.message
    });
  }
};

// ============================================
// OBTENER PEDIDOS PENDIENTES DE FACTURAR
// ============================================
const getPendingOrders = async (req, res) => {
  try {
    console.log("📋 InvoiceController - getPendingOrders - Solicitando pedidos pendientes...");
    
    const orders = await InvoiceModel.getPendingOrders();
    
    return res.json({
      ok: true,
      orders: orders,
      total: orders.length,
      message: `${orders.length} pedidos pendientes de facturar`
    });
  } catch (error) {
    console.error("❌ InvoiceController - getPendingOrders - Error:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor al obtener pedidos pendientes",
      error: error.message
    });
  }
};

// ============================================
// ELIMINAR FACTURA
// ============================================
const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        ok: false,
        msg: "ID de la factura requerido"
      });
    }
    
    console.log(`🗑️ InvoiceController - deleteInvoice - Eliminando factura ID: ${id}`);
    
    const deleted = await InvoiceModel.remove(id);
    
    if (!deleted) {
      return res.status(404).json({
        ok: false,
        msg: "Factura no encontrada"
      });
    }
    
    return res.json({
      ok: true,
      msg: "Factura eliminada exitosamente",
      deletedInvoiceId: id
    });
  } catch (error) {
    console.error("❌ InvoiceController - deleteInvoice - Error:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor al eliminar factura",
      error: error.message
    });
  }
};

// ============================================
// OBTENER FACTURAS POR CLIENTE
// ============================================
const getInvoicesByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    
    if (!customerId) {
      return res.status(400).json({
        ok: false,
        msg: "ID del cliente requerido"
      });
    }
    
    console.log(`🔍 InvoiceController - getInvoicesByCustomer - Cliente ID: ${customerId}`);
    
    const { db } = await import("../db/connection.database.js");
    
    const query = {
      text: `
        SELECT 
          i.*,
          o.order_date,
          u.first_name || ' ' || u.last_name as customer_name
        FROM invoice i
        LEFT JOIN "order" o ON i.id_order = o.id_order
        LEFT JOIN customer c ON o.id_customer = c.id_customer
        LEFT JOIN "user" u ON c.id_user = u.id_user
        WHERE c.id_customer = $1
        ORDER BY i.issue_date DESC
      `,
      values: [customerId],
    };
    
    const { rows } = await db.query(query.text, query.values);
    
    return res.json({
      ok: true,
      invoices: rows,
      total: rows.length
    });
  } catch (error) {
    console.error("❌ InvoiceController - getInvoicesByCustomer - Error:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor al obtener facturas del cliente",
      error: error.message
    });
  }
};

// ============================================
// EXPORTACIÓN
// ============================================
export const InvoiceController = {
  getInvoices,
  getInvoiceById,
  getOrderForInvoice,
  createInvoice,
  getPendingOrders,
  deleteInvoice,
  getInvoicesByCustomer
};