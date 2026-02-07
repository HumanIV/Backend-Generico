import { Router } from "express";
import { OrderController } from "../controllers/order.controller.js";
import { authenticate } from "../middlewares/jwt.middleware.js";

const router = Router();

// Rutas públicas (si las hay) - por ejemplo, obtener clientes para formularios
router.get("/customers", OrderController.getCustomers);
router.get("/employees", OrderController.getEmployees);

// Rutas protegidas (requieren autenticación)
router.get("/", authenticate, OrderController.getOrders);
router.get("/customer/:customerId", authenticate, OrderController.getOrdersByCustomer);
router.get("/:id", authenticate, OrderController.getOrderById);
router.post("/", authenticate, OrderController.createOrder);
router.put("/:id/state", authenticate, OrderController.updateOrderState);
router.delete("/:id", authenticate, OrderController.deleteOrder); // <-- Agregar esta línea
router.post("/customers", OrderController.createCustomer); // <-- Agregar esta línea

export default router;