import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express's Request type to include the decoded user payload
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    telegramId: string;
  };
}

/**
 * Middleware: authenticateToken
 * Protects routes by verifying the JWT token sent in the Authorization header.
 * Expects header: Authorization: Bearer <token>
 */
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): any => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract token after "Bearer "

  if (!token) {
    return res.status(401).json({ error: 'Access denied, token missing' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ error: 'Internal server error' });
  }

  try {
    // Verify and decode the JWT token using the secret key
    const verified = jwt.verify(token, jwtSecret) as { userId: string; telegramId: string };
    req.user = verified; // Attach decoded payload to request object
    next();             // Pass control to the next handler
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};
