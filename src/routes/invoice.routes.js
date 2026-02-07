// src/routes/invoice.routes.js
import { Router } from "express";
import { InvoiceController } from "../controllers/invoice.controller.js";
// Si tu middleware se llama authenticate en lugar de validateToken
import { authenticate } from "../middlewares/jwt.middleware.js";

const router = Router();

// Obtener todas las facturas
router.get("/", authenticate, InvoiceController.getInvoices);

// Obtener factura por ID
router.get("/:id", authenticate, InvoiceController.getInvoiceById);

// Obtener pedido para facturar
router.get("/order/:id", authenticate, InvoiceController.getOrderForInvoice);

// Obtener pedidos pendientes de facturar
router.get("/pending/orders", authenticate, InvoiceController.getPendingOrders);

// Obtener facturas por cliente
router.get("/customer/:customerId", authenticate, InvoiceController.getInvoicesByCustomer);

// Crear nueva factura
router.post("/", authenticate, InvoiceController.createInvoice);

// Eliminar factura
router.delete("/:id", authenticate, InvoiceController.deleteInvoice);

export default router;