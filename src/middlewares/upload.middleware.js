// middlewares/upload.middleware.js
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.config.js';

// Configurar almacenamiento en Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'user_avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 500, height: 500, crop: 'limit', quality: 'auto' }
    ],
    public_id: (req, file) => {
      const userId = req.user?.userId || 'anonymous';
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      return `avatar_${userId}_${timestamp}_${random}`;
    }
  }
});

// Configurar multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    // Aceptar solo imágenes
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, PNG, GIF, WebP)'), false);
    }
  }
});

export const uploadSingle = (fieldName) => upload.single(fieldName);

export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        ok: false,
        msg: 'El archivo es demasiado grande. Máximo 5MB'
      });
    }
    return res.status(400).json({
      ok: false,
      msg: `Error al subir archivo: ${err.message}`
    });
  } else if (err) {
    return res.status(400).json({
      ok: false,
      msg: err.message
    });
  }
  next();
};