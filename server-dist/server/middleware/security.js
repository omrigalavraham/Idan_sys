import helmet from 'helmet';
import hpp from 'hpp';
import { rateLimit } from 'express-rate-limit';

// Rate limiting middleware
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Increased for production use
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    return req.ip + ':' + req.headers['user-agent'];
  },
  handler: (req, res) => {
    console.log('Rate limit exceeded:', {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent']
    });
    res.status(429).json({
      error: 'Too many requests, please try again later'
    });
  }
});

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "wss:", "https:", "http:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "data:", "blob:"],
      frameSrc: ["'none'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"]
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: true,
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  ieNoOpen: true
});

// Input validation middleware
export const validateInput = (req, res, next) => {
  try {
    // Skip validation for profile update endpoints to allow avatar uploads
    if (req.path.includes('/users/profile/') && req.method === 'PUT') {
      console.log('Skipping validation for profile update:', req.path);
      return next();
    }
    
    const sanitizeValue = (value, key) => {
      if (typeof value === 'string') {
        // Skip validation for avatar_url fields (base64 images)
        if (key === 'avatar_url' && value.startsWith('data:image/')) {
          // Only check size for avatar images
          if (value.length > 10000000) { // 10MB
            throw new Error('Avatar image too large');
          }
          return value; // Return as-is for avatar images
        }
        
        // Basic XSS prevention for other strings
        value = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        value = value.replace(/javascript:/gi, '');
        value = value.replace(/on\w+\s*=/gi, '');
        
        value = value.trim();
        
        // Check maximum length (increased for base64 images)
        if (value.length > 10000000) { // 10MB
          throw new Error('Input too long');
        }
        
        // Check for suspicious characters (not including base64 images)
        if (!value.startsWith('data:image/') && /[<>{}$]/.test(value)) {
          throw new Error('Suspicious characters detected');
        }
      }
      
      if (Array.isArray(value)) {
        return value.map((item, index) => sanitizeValue(item, `${key}[${index}]`));
      }
      
      if (typeof value === 'object' && value !== null) {
        const sanitized = {};
        for (const objKey in value) {
          if (Object.prototype.hasOwnProperty.call(value, objKey)) {
            sanitized[objKey] = sanitizeValue(value[objKey], objKey);
          }
        }
        return sanitized;
      }
      
      return value;
    };

    // Sanitize request body
    if (req.body) {
      req.body = sanitizeValue(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeValue(req.query);
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeValue(req.params);
    }

    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Input validation failed:', message);
    res.status(400).json({
      error: 'Invalid input detected'
    });
  }
};

// HPP protection middleware
export const preventHPP = hpp({
  checkBody: true,
  checkQuery: true
});

// Custom error handler
export const errorHandler = (err, req, res, next) => {
  const errorId = Math.random().toString(36).substring(7);
  console.error('Server error:', {
    id: errorId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      error: 'An internal server error occurred',
      errorId
    });
  } else {
    res.status(500).json({
      error: err.message,
      stack: err.stack,
      errorId
    });
  }
};

// CORS configuration
export const corsOptions = {
  origin: (origin, callback) => {
    const envOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    const defaultOrigins = [
      'http://localhost:1573',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:1573',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'https://avraham-tikshoret.onrender.com',
      'https://lead-management-system.onrender.com',
      'https://*.onrender.com'
    ];
    const allowedOrigins = [...envOrigins, ...defaultOrigins];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        // Handle wildcard domains
        const pattern = allowedOrigin.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(origin);
      }
      return allowedOrigin === origin;
    });
    
    // In development, allow all localhost origins
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS violation:', {
        origin,
        allowedOrigins
      });
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Session-ID',
    'X-Device-Fingerprint',
    'X-Request-ID',
    'X-Session-Token',
    'x-session-token'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Request-ID'],
  credentials: true,
  maxAge: 600,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Request ID middleware
export const addRequestId = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(7);
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

// Security logging middleware
export const logSecurityEvent = (req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (res.statusCode >= 400) {
      console.log('HTTP error:', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.headers['x-request-id']
      });
    }
  });
  next();
};