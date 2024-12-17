import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export function generateToken(payload: object, expiresIn: string = '1d') {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token: string) {
    return jwt.verify(token, JWT_SECRET);
}