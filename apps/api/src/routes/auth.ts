// @ts-nocheck
import { Router, Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { generateToken, verifyToken } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

export const router = Router();

// Register a new user with email verification
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, email, password' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long' 
      });
    }
    
    // Create user in Supabase with email confirmation
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          full_name: name
        },
        emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email`
      }
    });

    if (authError) {
      console.error('Error creating user:', authError);
      return res.status(400).json({ 
        error: 'Failed to create user', 
        message: authError.message 
      });
    }

    // Don't return token immediately - user needs to verify email first
    res.status(201).json({ 
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        id: authData.user?.id,
        email: authData.user?.email,
        email_confirmed: authData.user?.email_confirmed_at ? true : false
      },
      requires_verification: true
    });
  } catch (error: any) {
    console.error('Error registering user:', error);
    res.status(500).json({ 
      error: 'Failed to register user', 
      message: error.message 
    });
  }
});

// Login user with email verification check
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

    // Check if email is verified
    if (!authData.user.email_confirmed_at) {
      return res.status(403).json({ 
        error: 'Email not verified', 
        message: 'Please verify your email before logging in',
        requires_verification: true
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
        name: authData.user.user_metadata?.name,
        email_confirmed: true
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

// Resend email verification
router.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email`
      }
    });

    if (error) {
      console.error('Error resending verification:', error);
      return res.status(400).json({ 
        error: 'Failed to resend verification email', 
        message: error.message 
      });
    }

    res.json({ 
      message: 'Verification email sent successfully' 
    });
  } catch (error: any) {
    console.error('Error resending verification:', error);
    res.status(500).json({ 
      error: 'Failed to resend verification', 
      message: error.message 
    });
  }
});

// Request password reset
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password`
    });

    if (error) {
      console.error('Error sending password reset:', error);
      return res.status(400).json({ 
        error: 'Failed to send password reset email', 
        message: error.message 
      });
    }

    res.json({ 
      message: 'Password reset email sent successfully' 
    });
  } catch (error: any) {
    console.error('Error sending password reset:', error);
    res.status(500).json({ 
      error: 'Failed to send password reset', 
      message: error.message 
    });
  }
});

// Update password
router.post('/update-password', async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long' 
      });
    }

    const { error } = await supabase.auth.updateUser({
      password
    });

    if (error) {
      console.error('Error updating password:', error);
      return res.status(400).json({ 
        error: 'Failed to update password', 
        message: error.message 
      });
    }

    res.json({ 
      message: 'Password updated successfully' 
    });
  } catch (error: any) {
    console.error('Error updating password:', error);
    res.status(500).json({ 
      error: 'Failed to update password', 
      message: error.message 
    });
  }
});
