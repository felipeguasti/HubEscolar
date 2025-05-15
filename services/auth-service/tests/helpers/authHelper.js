import jwt from 'jsonwebtoken';
import { getMidnightExpiration } from '../../src/services/constants.js';

export const generateTestToken = (user) => {
    return jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: getMidnightExpiration() }
    );
};