// TTS routes for CallWaiting.ai
// Handles text-to-speech generation using tts.odia.dev

import { Router, Request, Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import ttsService from '../services/ttsService.js';

export const router = Router();

// Middleware to verify authentication
const requireAuth = (req: Request, res: Response, next: Function) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Authentication required' 
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ 
      error: 'Invalid or expired token' 
    });
  }

  (req as any).user = decoded;
  next();
};

// Generate speech from text
router.post('/generate', requireAuth, async (req: Request, res: Response) => {
  try {
    const { text, voice, language, speed, pitch, format } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        error: 'Text is required'
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        error: 'Text too long. Maximum 5000 characters allowed.'
      });
    }

    const result = await ttsService.generateSpeech({
      text: text.trim(),
      voice,
      language,
      speed: speed || 1.0,
      pitch: pitch || 1.0,
      format: format || 'wav'
    });

    if (!result.success) {
      return res.status(500).json({
        error: 'Failed to generate speech',
        message: result.error
      });
    }

    // Return audio as base64 data URL
    if (result.audioData) {
      const format = req.body.format || 'wav';
      const mimeType = format === 'mp3' ? 'audio/mpeg' : 
                      format === 'ogg' ? 'audio/ogg' : 'audio/wav';
      
      const base64Audio = result.audioData.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Audio}`;

      res.json({
        success: true,
        data: {
          audioUrl: dataUrl,
          metadata: result.metadata
        }
      });
    } else {
      res.status(500).json({
        error: 'No audio data generated'
      });
    }

  } catch (error) {
    console.error('Error generating speech:', error);
    res.status(500).json({
      error: 'Failed to generate speech',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate CallWaiting.ai greeting
router.post('/greeting', requireAuth, async (req: Request, res: Response) => {
  try {
    const { businessName, voice, language } = req.body;

    if (!businessName || businessName.trim().length === 0) {
      return res.status(400).json({
        error: 'Business name is required'
      });
    }

    const result = await ttsService.generateCallWaitingGreeting(
      businessName.trim(),
      voice,
      language
    );

    if (!result.success) {
      return res.status(500).json({
        error: 'Failed to generate greeting',
        message: result.error
      });
    }

    // Return audio as base64 data URL
    if (result.audioData) {
      const base64Audio = result.audioData.toString('base64');
      const dataUrl = `data:audio/wav;base64,${base64Audio}`;

      res.json({
        success: true,
        data: {
          audioUrl: dataUrl,
          metadata: result.metadata
        }
      });
    } else {
      res.status(500).json({
        error: 'No audio data generated'
      });
    }

  } catch (error) {
    console.error('Error generating greeting:', error);
    res.status(500).json({
      error: 'Failed to generate greeting',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate appointment confirmation
router.post('/appointment-confirmation', requireAuth, async (req: Request, res: Response) => {
  try {
    const { businessName, appointmentDate, appointmentTime, customerName, voice, language } = req.body;

    if (!businessName || !appointmentDate || !appointmentTime) {
      return res.status(400).json({
        error: 'Business name, appointment date, and time are required'
      });
    }

    const result = await ttsService.generateAppointmentConfirmation(
      businessName.trim(),
      appointmentDate,
      appointmentTime,
      customerName,
      voice,
      language
    );

    if (!result.success) {
      return res.status(500).json({
        error: 'Failed to generate appointment confirmation',
        message: result.error
      });
    }

    // Return audio as base64 data URL
    if (result.audioData) {
      const base64Audio = result.audioData.toString('base64');
      const dataUrl = `data:audio/wav;base64,${base64Audio}`;

      res.json({
        success: true,
        data: {
          audioUrl: dataUrl,
          metadata: result.metadata
        }
      });
    } else {
      res.status(500).json({
        error: 'No audio data generated'
      });
    }

  } catch (error) {
    console.error('Error generating appointment confirmation:', error);
    res.status(500).json({
      error: 'Failed to generate appointment confirmation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate order confirmation
router.post('/order-confirmation', requireAuth, async (req: Request, res: Response) => {
  try {
    const { businessName, orderTotal, currency, customerName, voice, language } = req.body;

    if (!businessName || !orderTotal) {
      return res.status(400).json({
        error: 'Business name and order total are required'
      });
    }

    const result = await ttsService.generateOrderConfirmation(
      businessName.trim(),
      parseFloat(orderTotal),
      currency || 'USD',
      customerName,
      voice,
      language
    );

    if (!result.success) {
      return res.status(500).json({
        error: 'Failed to generate order confirmation',
        message: result.error
      });
    }

    // Return audio as base64 data URL
    if (result.audioData) {
      const base64Audio = result.audioData.toString('base64');
      const dataUrl = `data:audio/wav;base64,${base64Audio}`;

      res.json({
        success: true,
        data: {
          audioUrl: dataUrl,
          metadata: result.metadata
        }
      });
    } else {
      res.status(500).json({
        error: 'No audio data generated'
      });
    }

  } catch (error) {
    console.error('Error generating order confirmation:', error);
    res.status(500).json({
      error: 'Failed to generate order confirmation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate goodbye message
router.post('/goodbye', requireAuth, async (req: Request, res: Response) => {
  try {
    const { businessName, voice, language } = req.body;

    if (!businessName || businessName.trim().length === 0) {
      return res.status(400).json({
        error: 'Business name is required'
      });
    }

    const result = await ttsService.generateGoodbyeMessage(
      businessName.trim(),
      voice,
      language
    );

    if (!result.success) {
      return res.status(500).json({
        error: 'Failed to generate goodbye message',
        message: result.error
      });
    }

    // Return audio as base64 data URL
    if (result.audioData) {
      const base64Audio = result.audioData.toString('base64');
      const dataUrl = `data:audio/wav;base64,${base64Audio}`;

      res.json({
        success: true,
        data: {
          audioUrl: dataUrl,
          metadata: result.metadata
        }
      });
    } else {
      res.status(500).json({
        error: 'No audio data generated'
      });
    }

  } catch (error) {
    console.error('Error generating goodbye message:', error);
    res.status(500).json({
      error: 'Failed to generate goodbye message',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate hold message
router.post('/hold-message', requireAuth, async (req: Request, res: Response) => {
  try {
    const { businessName, voice, language } = req.body;

    if (!businessName || businessName.trim().length === 0) {
      return res.status(400).json({
        error: 'Business name is required'
      });
    }

    const result = await ttsService.generateHoldMessage(
      businessName.trim(),
      voice,
      language
    );

    if (!result.success) {
      return res.status(500).json({
        error: 'Failed to generate hold message',
        message: result.error
      });
    }

    // Return audio as base64 data URL
    if (result.audioData) {
      const base64Audio = result.audioData.toString('base64');
      const dataUrl = `data:audio/wav;base64,${base64Audio}`;

      res.json({
        success: true,
        data: {
          audioUrl: dataUrl,
          metadata: result.metadata
        }
      });
    } else {
      res.status(500).json({
        error: 'No audio data generated'
      });
    }

  } catch (error) {
    console.error('Error generating hold message:', error);
    res.status(500).json({
      error: 'Failed to generate hold message',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate error message
router.post('/error-message', requireAuth, async (req: Request, res: Response) => {
  try {
    const { voice, language } = req.body;

    const result = await ttsService.generateErrorMessage(voice, language);

    if (!result.success) {
      return res.status(500).json({
        error: 'Failed to generate error message',
        message: result.error
      });
    }

    // Return audio as base64 data URL
    if (result.audioData) {
      const base64Audio = result.audioData.toString('base64');
      const dataUrl = `data:audio/wav;base64,${base64Audio}`;

      res.json({
        success: true,
        data: {
          audioUrl: dataUrl,
          metadata: result.metadata
        }
      });
    } else {
      res.status(500).json({
        error: 'No audio data generated'
      });
    }

  } catch (error) {
    console.error('Error generating error message:', error);
    res.status(500).json({
      error: 'Failed to generate error message',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get available voices
router.get('/voices', async (req: Request, res: Response) => {
  try {
    const result = await ttsService.getAvailableVoices();

    if (result.error) {
      return res.status(500).json({
        error: 'Failed to fetch voices',
        message: result.error
      });
    }

    res.json({
      success: true,
      data: result.voices
    });

  } catch (error) {
    console.error('Error fetching voices:', error);
    res.status(500).json({
      error: 'Failed to fetch voices',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get supported languages
router.get('/languages', async (req: Request, res: Response) => {
  try {
    const result = await ttsService.getSupportedLanguages();

    if (result.error) {
      return res.status(500).json({
        error: 'Failed to fetch languages',
        message: result.error
      });
    }

    res.json({
      success: true,
      data: result.languages
    });

  } catch (error) {
    console.error('Error fetching languages:', error);
    res.status(500).json({
      error: 'Failed to fetch languages',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check TTS service health
router.get('/health', async (req: Request, res: Response) => {
  try {
    const result = await ttsService.checkHealth();

    res.json({
      success: true,
      data: {
        healthy: result.healthy,
        error: result.error
      }
    });

  } catch (error) {
    console.error('Error checking TTS health:', error);
    res.status(500).json({
      error: 'Failed to check TTS health',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
