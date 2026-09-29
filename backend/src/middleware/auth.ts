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

/**
 * Middleware: optionalAuth
 * Used on public routes where auth is optional (e.g. job listing).
 * If a valid token is present, it attaches req.user.
 * If no token or invalid token, it simply continues without error.
 * This allows us to show isSaved flags to logged-in users.
 */
export const optionalAuth = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret) {
      try {
        const verified = jwt.verify(token, jwtSecret) as { userId: string; telegramId: string };
        req.user = verified;
      } catch {
        // Invalid token — silently ignore, treat as unauthenticated
      }
    }
  }

  next(); // always proceed
};

/**
 * Middleware: authenticateAdmin
 * Protects admin routes by verifying the JWT token has an admin role.
 */
export const authenticateAdmin = (req: Request, res: Response, next: NextFunction): any => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied, token missing' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ error: 'Internal server error' });
  }

  try {
    const verified = jwt.verify(token, jwtSecret) as { role?: string };
    if (verified.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied, not an admin' });
    }
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired admin token' });
  }
};
