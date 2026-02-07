import {
  getStock,
  getStockById,
  createStock,
  updateStock,
  patchStock,
  deleteStock,
} from "../models/stock.models.js";

// GET all
export const getStockCont = async (req, res) => {
  try {
    const rows = await getStock(req, res);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving stock records" });
  }
};

// GET by ID
export const getStockByIdCont = async (req, res) => {
  try {
    const stock = await getStockById(req, res);

    if (!stock) {
      return res
        .status(404)
        .json({ message: "Registro de stock no encontrado" });
    }

    res.json(stock);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving stock record" });
  }
};

// CREATE
export const createStockCont = async (req, res) => {
  try {
    const stock = await createStock(req, res);
    res.json(stock);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating stock record" });
  }
};

// UPDATE (PUT)
export const updateStockCont = async (req, res) => {
  try {
    const updated = await updateStock(req, res);

    if (!updated) {
      return res
        .status(404)
        .json({ message: "Registro de stock no encontrado" });
    }

    res.json({
      message: "Registro de stock actualizado correctamente",
      stock: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating stock record" });
  }
};

// PATCH
export const patchStockCont = async (req, res) => {
  try {
    const updated = await patchStock(req, res);
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error patching stock record" });
  }
};

// Hard delete
export const deleteStockCont = async (req, res) => {
  try {
    const deleted = await deleteStock(req, res);

    if (deleted === 0) {
      return res
        .status(404)
        .json({ message: "Registro de stock no encontrado" });
    }

    res.json({ message: "Registro de stock eliminado permanentemente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting stock record" });
  }
};