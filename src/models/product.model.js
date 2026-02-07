// models/product.model.js
import { db } from "../db/connection.database.js";

// ============================================
// FUNCIONES AUXILIARES
// ============================================
const formatCurrency = (value) => {
  if (!value) return '$0.00';
  return `$${parseFloat(value).toFixed(2)}`;
};

const mapStatus = (status) => {
  if (!status) return 'Agotado';
  const statusMap = {
    'available': 'Disponible',
    'disponible': 'Disponible',
    'out_of_stock': 'Agotado',
    'agotado': 'Agotado',
    'low_stock': 'Bajo Stock',
    'inactive': 'Inactivo'
  };
  return statusMap[status.toLowerCase()] || 'Agotado';
};

// ============================================
// FUNCIÓN PARA OBTENER TODOS LOS PRODUCTOS
// ============================================
const findAll = async () => {
  try {
    console.log("🔍 ProductModel - findAll - Obteniendo todos los productos...");
    
    const query = {
      text: `
        SELECT 
          p.id_product as id,
          p.name_product as "Nombre",
          p.description as "Descripcion",
          p.price as "Precio_Unit",
          c.name_category as "Categoria",
          p.id_category,
          d.name_department as "Departamento",
          p.id_department,
          'Disponible' as "Estatus", -- Temporal, ajustar según lógica de stock
          0 as "Cantidad" -- Temporal, se debe calcular del stock
        FROM product p
        LEFT JOIN category c ON p.id_category = c.id_category
        LEFT JOIN department d ON p.id_department = d.id_department
        ORDER BY p.id_product DESC
      `,
    };
    
    const { rows } = await db.query(query.text);
    console.log(`✅ ProductModel - findAll - Productos encontrados: ${rows.length}`);
    
    // Calcular stock real y estatus para cada producto
    const productsWithStock = await Promise.all(rows.map(async (product) => {
      // Obtener stock actual del producto
      const stockQuery = {
        text: `
          SELECT 
            COALESCE(SUM(
              CASE 
                WHEN movement_type = 'entry' THEN quantity
                WHEN movement_type = 'exit' THEN -quantity
                ELSE 0
              END
            ), 0) as stock_actual
          FROM stock
          WHERE id_product = $1
        `,
        values: [product.id]
      };
      
      const stockResult = await db.query(stockQuery.text, stockQuery.values);
      const stockActual = stockResult.rows[0]?.stock_actual || 0;
      
      // Determinar estatus basado en stock
      let estatus = 'Agotado';
      if (stockActual > 10) estatus = 'Disponible';
      else if (stockActual > 0 && stockActual <= 10) estatus = 'Bajo Stock';
      
      return {
        ...product,
        Cantidad: stockActual,
        Estatus: estatus,
        Precio_Unit: formatCurrency(product.Precio_Unit)
      };
    }));
    
    return productsWithStock;
  } catch (error) {
    console.error("❌ ProductModel - findAll - Error:", error);
    throw error;
  }
};

// ============================================
// FUNCIÓN PARA BUSCAR PRODUCTOS
// ============================================
const search = async (searchTerm) => {
  try {
    console.log(`🔍 ProductModel - search - Buscando: ${searchTerm}`);
    
    const query = {
      text: `
        SELECT 
          p.id_product as id,
          p.name_product as "Nombre",
          p.description as "Descripcion",
          p.price as "Precio_Unit",
          c.name_category as "Categoria",
          'Disponible' as "Estatus",
          0 as "Cantidad"
        FROM product p
        LEFT JOIN category c ON p.id_category = c.id_category
        WHERE p.name_product ILIKE $1 
          OR p.description ILIKE $1 
          OR c.name_category ILIKE $1
        ORDER BY p.name_product
      `,
      values: [`%${searchTerm}%`]
    };
    
    const { rows } = await db.query(query.text, query.values);
    console.log(`✅ ProductModel - search - Resultados: ${rows.length}`);
    
    return rows.map(product => ({
      ...product,
      Precio_Unit: formatCurrency(product.Precio_Unit)
    }));
  } catch (error) {
    console.error("❌ ProductModel - search - Error:", error);
    throw error;
  }
};

// ============================================
// FUNCIÓN PARA OBTENER UN PRODUCTO POR ID
// ============================================
const findById = async (id) => {
  try {
    console.log(`🔍 ProductModel - findById - Buscando producto ID: ${id}`);
    
    const query = {
      text: `
        SELECT 
          p.id_product as id,
          p.name_product as "Nombre",
          p.description as "Descripcion",
          p.price as "Precio_Unit",
          p.id_category,
          c.name_category as "Categoria",
          p.id_department,
          d.name_department as "Departamento"
        FROM product p
        LEFT JOIN category c ON p.id_category = c.id_category
        LEFT JOIN department d ON p.id_department = d.id_department
        WHERE p.id_product = $1
      `,
      values: [id]
    };
    
    const { rows } = await db.query(query.text, query.values);
    const product = rows[0];
    
    if (product) {
      // Obtener stock actual
      const stockQuery = {
        text: `
          SELECT 
            COALESCE(SUM(
              CASE 
                WHEN movement_type = 'entry' THEN quantity
                WHEN movement_type = 'exit' THEN -quantity
                ELSE 0
              END
            ), 0) as stock_actual
          FROM stock
          WHERE id_product = $1
        `,
        values: [id]
      };
      
      const stockResult = await db.query(stockQuery.text, stockQuery.values);
      const stockActual = stockResult.rows[0]?.stock_actual || 0;
      
      // Determinar estatus
      let estatus = 'Agotado';
      if (stockActual > 10) estatus = 'Disponible';
      else if (stockActual > 0 && stockActual <= 10) estatus = 'Bajo Stock';
      
      return {
        ...product,
        Cantidad: stockActual,
        Estatus: estatus,
        Precio_Unit: formatCurrency(product.Precio_Unit)
      };
    }
    
    return null;
  } catch (error) {
    console.error(`❌ ProductModel - findById - Error:`, error);
    throw error;
  }
};

// ============================================
// FUNCIÓN PARA CREAR UN PRODUCTO
// ============================================
const create = async (productData) => {
  try {
    console.log("🔍 ProductModel - create - Creando producto:", productData);
    
    const { 
      Nombre, 
      Descripcion, 
      Precio_Unit, 
      id_category, 
      id_department,
      Cantidad 
    } = productData;
    
    // Primero, obtener o crear la categoría
    let categoryId = id_category;
    if (!categoryId && productData.Categoria) {
      const categoryQuery = {
        text: 'SELECT id_category FROM category WHERE name_category = $1',
        values: [productData.Categoria]
      };
      
      const catResult = await db.query(categoryQuery.text, categoryQuery.values);
      if (catResult.rows[0]) {
        categoryId = catResult.rows[0].id_category;
      } else {
        const newCatQuery = {
          text: 'INSERT INTO category (name_category) VALUES ($1) RETURNING id_category',
          values: [productData.Categoria]
        };
        const newCatResult = await db.query(newCatQuery.text, newCatQuery.values);
        categoryId = newCatResult.rows[0].id_category;
      }
    }
    
    // Crear el producto
    const productQuery = {
      text: `
        INSERT INTO product (
          name_product, 
          description, 
          price, 
          id_category, 
          id_department
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      values: [
        Nombre, 
        Descripcion, 
        parseFloat(Precio_Unit.replace('$', '').replace(',', '')), 
        categoryId, 
        id_department || null
      ]
    };
    
    const { rows } = await db.query(productQuery.text, productQuery.values);
    const newProduct = rows[0];
    
    // Si hay cantidad inicial, crear movimiento de entrada
    if (Cantidad && Cantidad > 0) {
      const stockQuery = {
        text: `
          INSERT INTO stock (
            id_product, 
            movement_type, 
            quantity, 
            note_stock
          )
          VALUES ($1, 'entry', $2, $3)
        `,
        values: [newProduct.id_product, parseInt(Cantidad), 'Stock inicial']
      };
      
      await db.query(stockQuery.text, stockQuery.values);
    }
    
    console.log(`✅ ProductModel - create - Producto creado ID: ${newProduct.id_product}`);
    return await findById(newProduct.id_product);
  } catch (error) {
    console.error("❌ ProductModel - create - Error:", error);
    throw error;
  }
};

// ============================================
// FUNCIÓN PARA ACTUALIZAR UN PRODUCTO
// ============================================
const update = async (id, productData) => {
  try {
    console.log(`🔍 ProductModel - update - Actualizando producto ID: ${id}`, productData);
    
    const { 
      Nombre, 
      Descripcion, 
      Precio_Unit, 
      id_category,
      Categoria,
      Cantidad 
    } = productData;
    
    // Manejar categoría
    let categoryId = id_category;
    if (!categoryId && Categoria) {
      const categoryQuery = {
        text: 'SELECT id_category FROM category WHERE name_category = $1',
        values: [Categoria]
      };
      
      const catResult = await db.query(categoryQuery.text, categoryQuery.values);
      if (catResult.rows[0]) {
        categoryId = catResult.rows[0].id_category;
      } else {
        const newCatQuery = {
          text: 'INSERT INTO category (name_category) VALUES ($1) RETURNING id_category',
          values: [Categoria]
        };
        const newCatResult = await db.query(newCatQuery.text, newCatQuery.values);
        categoryId = newCatResult.rows[0].id_category;
      }
    }
    
    // Actualizar producto
    const productQuery = {
      text: `
        UPDATE product 
        SET 
          name_product = COALESCE($1, name_product),
          description = COALESCE($2, description),
          price = COALESCE($3, price),
          id_category = COALESCE($4, id_category),
          updated_at = CURRENT_TIMESTAMP
        WHERE id_product = $5
        RETURNING *
      `,
      values: [
        Nombre, 
        Descripcion, 
        Precio_Unit ? parseFloat(Precio_Unit.replace('$', '').replace(',', '')) : null, 
        categoryId, 
        id
      ]
    };
    
    const { rows } = await db.query(productQuery.text, productQuery.values);
    const updatedProduct = rows[0];
    
    // Si hay cambio en cantidad, ajustar stock
    if (Cantidad !== undefined) {
      const currentStockQuery = {
        text: `
          SELECT 
            COALESCE(SUM(
              CASE 
                WHEN movement_type = 'entry' THEN quantity
                WHEN movement_type = 'exit' THEN -quantity
                ELSE 0
              END
            ), 0) as stock_actual
          FROM stock
          WHERE id_product = $1
        `,
        values: [id]
      };
      
      const currentStockResult = await db.query(currentStockQuery.text, currentStockQuery.values);
      const currentStock = currentStockResult.rows[0]?.stock_actual || 0;
      const difference = parseInt(Cantidad) - currentStock;
      
      if (difference !== 0) {
        const stockQuery = {
          text: `
            INSERT INTO stock (
              id_product, 
              movement_type, 
              quantity, 
              note_stock
            )
            VALUES ($1, $2, $3, $4)
          `,
          values: [
            id, 
            difference > 0 ? 'entry' : 'exit', 
            Math.abs(difference), 
            'Ajuste de inventario'
          ]
        };
        
        await db.query(stockQuery.text, stockQuery.values);
      }
    }
    
    console.log(`✅ ProductModel - update - Producto actualizado ID: ${id}`);
    return await findById(id);
  } catch (error) {
    console.error(`❌ ProductModel - update - Error:`, error);
    throw error;
  }
};

// ============================================
// FUNCIÓN PARA ELIMINAR UN PRODUCTO
// ============================================
const remove = async (id) => {
  try {
    console.log(`🔍 ProductModel - remove - Eliminando producto ID: ${id}`);
    
    // Verificar si tiene stock
    const stockQuery = {
      text: 'SELECT COUNT(*) as stock_count FROM stock WHERE id_product = $1',
      values: [id]
    };
    
    const stockResult = await db.query(stockQuery.text, stockQuery.values);
    const hasStock = parseInt(stockResult.rows[0]?.stock_count) > 0;
    
    if (hasStock) {
      throw new Error('No se puede eliminar un producto con movimientos de stock');
    }
    
    // Verificar si está en órdenes
    const orderQuery = {
      text: 'SELECT COUNT(*) as order_count FROM details_order WHERE id_product = $1',
      values: [id]
    };
    
    const orderResult = await db.query(orderQuery.text, orderQuery.values);
    const inOrders = parseInt(orderResult.rows[0]?.order_count) > 0;
    
    if (inOrders) {
      throw new Error('No se puede eliminar un producto con órdenes asociadas');
    }
    
    // Eliminar producto
    const deleteQuery = {
      text: 'DELETE FROM product WHERE id_product = $1 RETURNING id_product',
      values: [id]
    };
    
    const { rows } = await db.query(deleteQuery.text, deleteQuery.values);
    
    console.log(`✅ ProductModel - remove - Producto eliminado ID: ${id}`);
    return rows[0];
  } catch (error) {
    console.error(`❌ ProductModel - remove - Error:`, error);
    throw error;
  }
};

// ============================================
// FUNCIONES ADICIONALES
// ============================================
const getCategories = async () => {
  try {
    const query = {
      text: 'SELECT id_category as id, name_category as name FROM category ORDER BY name_category'
    };
    
    const { rows } = await db.query(query.text);
    return rows;
  } catch (error) {
    console.error("Error obteniendo categorías:", error);
    return [];
  }
};

const getDepartments = async () => {
  try {
    const query = {
      text: 'SELECT id_department as id, name_department as name FROM department ORDER BY name_department'
    };
    
    const { rows } = await db.query(query.text);
    return rows;
  } catch (error) {
    console.error("Error obteniendo departamentos:", error);
    return [];
  }
};

// ============================================
// EXPORTACIÓN
// ============================================
export const ProductModel = {
  // CRUD básico
  findAll,
  findById,
  create,
  update,
  remove,
  
  // Búsqueda
  search,
  
  // Datos auxiliares
  getCategories,
  getDepartments
};