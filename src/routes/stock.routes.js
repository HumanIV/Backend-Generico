import { Router } from "express";
import {
  getStockCont,
  getStockByIdCont,
  createStockCont,
  updateStockCont,
  patchStockCont,
  deleteStockCont,
} from "../controllers/stock.controllers.js";

const router = Router();

router.get("/", getStockCont);
router.get("/:id_stock", getStockByIdCont);
router.post("/", createStockCont);
router.put("/:id_stock", updateStockCont);
router.patch("/:id_stock", patchStockCont);
router.delete("/:id_stock", deleteStockCont);

export default router;