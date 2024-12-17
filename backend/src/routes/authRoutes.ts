import express from 'express';
import { ativacao, register, login, verifyEmail, verifyEmail2, requestPasswordReset, resetPassword } from '../controllers/authController';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify', verifyEmail);
router.get('/verify2', verifyEmail2);
router.post('/password', requestPasswordReset);
router.post('/resetpassword', resetPassword);
router.post('/ativacao', ativacao);

export default router;
