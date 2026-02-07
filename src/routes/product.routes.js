// routes/product.routes.js
import { Router } from "express";
import { ProductController } from "../controllers/product.controller.js";
import { authenticate } from "../middlewares/jwt.middleware.js"; // Cambiar verifyToken por authenticate

const router = Router();

// Rutas públicas
router.get("/categories", ProductController.getCategories);
router.get("/departments", ProductController.getDepartments);

// Rutas protegidas
router.get("/", authenticate, ProductController.getProducts);
router.get("/search", authenticate, ProductController.searchProducts);
router.get("/:id", authenticate, ProductController.getProductById);
router.post("/", authenticate, ProductController.createProduct);
router.put("/:id", authenticate, ProductController.updateProduct);
router.delete("/:id", authenticate, ProductController.deleteProduct);

export default router;