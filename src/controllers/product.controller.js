// controllers/product.controller.js
import { ProductModel } from "../models/product.model.js";

// ============================================
// OBTENER TODOS LOS PRODUCTOS
// ============================================
const getProducts = async (req, res) => {
  try {
    console.log("📦 ProductController - getProducts - Solicitando productos...");
    
    const products = await ProductModel.findAll();
    
    // Transformar productos para incluir campo 'stock'
    const transformedProducts = products.map(product => ({
      ...product,
      stock: product.Cantidad || 0, // Mapear Cantidad a stock
      quantity: product.Cantidad || 0 // También incluir quantity por si acaso
    }));
    
    return res.json({
      ok: true,
      products: transformedProducts,
      total: products.length,
      message: `${products.length} productos encontrados`
    });
  } catch (error) {
    console.error("❌ ProductController - getProducts - Error:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor al obtener productos",
      error: error.message
    });
  }
};
// ============================================
// BUSCAR PRODUCTOS
// ============================================
const searchProducts = async (req, res) => {
  try {
    const { search } = req.query;
    
    if (!search || search.trim() === '') {
      return res.status(400).json({
        ok: false,
        msg: "Término de búsqueda requerido"
      });
    }
    
    console.log(`🔍 ProductController - searchProducts - Buscando: "${search}"`);
    
    const products = await ProductModel.search(search);
    
    return res.json({
      ok: true,
      products: products,
      total: products.length,
      searchTerm: search
    });
  } catch (error) {
    console.error("❌ ProductController - searchProducts - Error:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor al buscar productos",
      error: error.message
    });
  }
};

// ============================================
// OBTENER UN PRODUCTO POR ID
// ============================================
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        ok: false,
        msg: "ID del producto requerido"
      });
    }
    
    console.log(`🔍 ProductController - getProductById - ID: ${id}`);
    
    const product = await ProductModel.findById(id);
    
    if (!product) {
      return res.status(404).json({
        ok: false,
        msg: "Producto no encontrado"
      });
    }
    
    return res.json({
      ok: true,
      product: product
    });
  } catch (error) {
    console.error("❌ ProductController - getProductById - Error:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor al obtener producto",
      error: error.message
    });
  }
};

// ============================================
// CREAR UN NUEVO PRODUCTO
// ============================================
const createProduct = async (req, res) => {
  try {
    const productData = req.body;
    
    // Validaciones básicas
    if (!productData.Nombre || !productData.Precio_Unit) {
      return res.status(400).json({
        ok: false,
        msg: "Nombre y precio son requeridos"
      });
    }
    
    console.log("📝 ProductController - createProduct - Datos:", productData);
    
    const newProduct = await ProductModel.create(productData);
    
    return res.status(201).json({
      ok: true,
      msg: "Producto creado exitosamente",
      product: newProduct
    });
  } catch (error) {
    console.error("❌ ProductController - createProduct - Error:", error);
    
    // Manejo de errores específicos
    if (error.message.includes('violates unique constraint')) {
      return res.status(400).json({
        ok: false,
        msg: "Ya existe un producto con ese nombre"
      });
    }
    
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor al crear producto",
      error: error.message
    });
  }
};

// ============================================
// ACTUALIZAR UN PRODUCTO
// ============================================
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productData = req.body;
    
    if (!id) {
      return res.status(400).json({
        ok: false,
        msg: "ID del producto requerido"
      });
    }
    
    console.log(`✏️ ProductController - updateProduct - ID: ${id}`, productData);
    
    const updatedProduct = await ProductModel.update(id, productData);
    
    if (!updatedProduct) {
      return res.status(404).json({
        ok: false,
        msg: "Producto no encontrado"
      });
    }
    
    return res.json({
      ok: true,
      msg: "Producto actualizado exitosamente",
      product: updatedProduct
    });
  } catch (error) {
    console.error("❌ ProductController - updateProduct - Error:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor al actualizar producto",
      error: error.message
    });
  }
};

// ============================================
// ELIMINAR UN PRODUCTO
// ============================================
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        ok: false,
        msg: "ID del producto requerido"
      });
    }
    
    console.log(`🗑️ ProductController - deleteProduct - ID: ${id}`);
    
    const result = await ProductModel.remove(id);
    
    return res.json({
      ok: true,
      msg: "Producto eliminado exitosamente",
      id: result.id_product
    });
  } catch (error) {
    console.error("❌ ProductController - deleteProduct - Error:", error);
    
    // Manejo de errores específicos
    if (error.message.includes('No se puede eliminar')) {
      return res.status(400).json({
        ok: false,
        msg: error.message,
        suggestion: "Desactive el producto en lugar de eliminarlo"
      });
    }
    
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor al eliminar producto",
      error: error.message
    });
  }
};

// ============================================
// OBTENER DATOS AUXILIARES
// ============================================
const getCategories = async (req, res) => {
  try {
    const categories = await ProductModel.getCategories();
    
    return res.json({
      ok: true,
      categories: categories
    });
  } catch (error) {
    console.error("❌ ProductController - getCategories - Error:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor al obtener categorías"
    });
  }
};

const getDepartments = async (req, res) => {
  try {
    const departments = await ProductModel.getDepartments();
    
    return res.json({
      ok: true,
      departments: departments
    });
  } catch (error) {
    console.error("❌ ProductController - getDepartments - Error:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error del servidor al obtener departamentos"
    });
  }
};

// ============================================
// EXPORTACIÓN
// ============================================
export const ProductController = {
  getProducts,
  searchProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getDepartments
};