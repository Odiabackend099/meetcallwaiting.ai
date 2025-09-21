// @ts-nocheck
import { Router, Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { generateToken, verifyToken } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

export const router = Router();

// Register a new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, email, password' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user in Supabase (using auth.users table)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name,
        full_name: name
      }
    });

    if (authError) {
      console.error('Error creating user:', authError);
      return res.status(400).json({ 
        error: 'Failed to create user', 
        message: authError.message 
      });
    }

    // Generate JWT token
    const token = generateToken({ 
      userId: authData.user.id, 
      email: authData.user.email 
    });

    res.status(201).json({ 
      message: 'User registered successfully',
      token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: authData.user.user_metadata.name
      }
    });
  } catch (error: any) {
    console.error('Error registering user:', error);
    res.status(500).json({ 
      error: 'Failed to register user', 
      message: error.message 
    });
  }
});

// Login user
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, password' 
      });
    }

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('Error logging in:', authError);
      return res.status(401).json({ 
        error: 'Invalid credentials', 
        message: 'Email or password is incorrect' 
      });
    }

    // Generate JWT token
    const token = generateToken({ 
      userId: authData.user.id, 
      email: authData.user.email 
    });

    res.json({ 
      message: 'Login successful',
      token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: authData.user.user_metadata?.name
      }
    });
  } catch (error: any) {
    console.error('Error logging in:', error);
    res.status(500).json({ 
      error: 'Failed to login', 
      message: error.message 
    });
  }
});

// Logout user
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      // In a real implementation, you might want to blacklist the token
      // For now, we'll just return success
    }

    res.json({ message: 'Logout successful' });
  } catch (error: any) {
    console.error('Error logging out:', error);
    res.status(500).json({ 
      error: 'Failed to logout', 
      message: error.message 
    });
  }
});

// Verify token
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'No token provided' 
      });
    }

    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ 
        error: 'Invalid or expired token' 
      });
    }

    res.json({ 
      valid: true,
      user: decoded
    });
  } catch (error: any) {
    console.error('Error verifying token:', error);
    res.status(500).json({ 
      error: 'Failed to verify token', 
      message: error.message 
    });
  }
});

// Refresh token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'No token provided' 
      });
    }

    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ 
        error: 'Invalid or expired token' 
      });
    }

    // Generate new token
    const newToken = generateToken({ 
      userId: decoded.userId, 
      email: decoded.email 
    });

    res.json({ 
      message: 'Token refreshed successfully',
      token: newToken
    });
  } catch (error: any) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ 
      error: 'Failed to refresh token', 
      message: error.message 
    });
  }
});
