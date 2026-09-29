import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export const adminLogin = async (req: Request, res: Response): Promise<any> => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      console.error('ADMIN_PASSWORD is not set in the environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (password !== adminPassword) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'JWT_SECRET is not configured' });
    }

    // Create an admin token valid for 24 hours
    const token = jwt.sign({ role: 'admin' }, jwtSecret, { expiresIn: '24h' });

    return res.json({ token, message: 'Admin login successful' });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
};
