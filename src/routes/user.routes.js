// routes/user.routes.js - VERSIÓN CORREGIDA
import express from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/jwt.middleware.js';
import { uploadSingle, handleUploadError } from '../middlewares/upload.middleware.js';

const router = express.Router();

// ============================================
// RUTAS PÚBLICAS
// ============================================

// Registro de usuario
router.post('/register', UserController.register);

// Login de usuario
router.post('/login', UserController.login);

// Refresh token - CORREGIDO: refreshToken en lugar de refToken
router.post('/refresh-token', UserController.refreshToken);

// Logout
router.post('/logout', UserController.logout);

// ============================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================

// Perfil del usuario actual
router.get('/profile', authenticate, UserController.profile);

// Listar todos los usuarios (para administración)
router.get('/list', authenticate, UserController.listUsers);

// Buscar usuarios
router.get('/search', authenticate, UserController.searchUsers);

// Actualizar perfil (sin archivo)
router.put('/update-profile', authenticate, UserController.updateProfile);

// ============================================
// RUTAS PARA AVATAR (Cloudinary)
// ============================================

// Subir avatar
router.post(
  '/upload-avatar',
  authenticate,
  uploadSingle('avatar'),
  handleUploadError,
  UserController.uploadAvatar
);

// Eliminar avatar
router.delete('/delete-avatar', authenticate, UserController.deleteAvatar);

// Actualizar avatar por URL
router.put('/update-avatar', authenticate, UserController.updateAvatar);

// Actualizar perfil con avatar (opcional)
router.put(
  '/update-profile-with-avatar',
  authenticate,
  uploadSingle('avatar'),
  handleUploadError,
  UserController.updateProfileWithAvatar
);

// ============================================
// RUTAS PARA ADMINISTRACIÓN DE USUARIOS
// ============================================

// Obtener usuario por ID
router.get('/:id', authenticate, UserController.getUserById);

// Actualizar usuario (admin)
router.put('/:id', authenticate, UserController.updateUser);

// Cambiar estado de usuario (activar/desactivar)
router.put('/:id/status', authenticate, UserController.changeUserStatus);

// Reactivar usuario
router.put('/:id/reactivate', authenticate, UserController.reactivateUser);

// Activar usuario (alias)
router.put('/:id/activate', authenticate, UserController.activateUser);

// Desactivar usuario (alias)
router.put('/:id/deactivate', authenticate, UserController.deactivateUser);

// Eliminar usuario
router.delete('/:id', authenticate, UserController.deleteUser);

// ============================================
// RUTAS PARA CONTRASEÑAS
// ============================================

// Cambiar contraseña del usuario actual
router.put('/change-password', authenticate, UserController.changePassword);

// Migración de passwords (solo desarrollo)
router.post('/migrate-passwords', authenticate, UserController.migrateAllPasswords);

// Funciones no implementadas (para mantener compatibilidad)
router.post('/forgot-password', (req, res) => {
  return res.status(501).json({
    ok: false,
    msg: "Funcionalidad no implementada en sistema simple. Contacte al administrador.",
  });
});

router.post('/reset-password', (req, res) => {
  return res.status(501).json({
    ok: false,
    msg: "Funcionalidad no implementada en sistema simple. Contacte al administrador.",
  });
});

export default router;