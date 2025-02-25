const fs = require('fs');
const path = require('path');

/**
 * Custom error class for API errors
 */
class APIError extends Error {
    constructor(message, statusCode = 500, details = null) {
        super(message);
        this.name = 'APIError';
        this.statusCode = statusCode;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Async handler wrapper to eliminate try-catch blocks
 */
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error('Error:', {
        name: err.name,
        message: err.message,
        statusCode: err.statusCode,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        details: err.details
    });

    logError(err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    const details = err.details || null;

    res.status(statusCode).json({
        error: true,
        message,
        details: process.env.NODE_ENV === 'development' ? details : undefined,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

/**
 * Log error to file
 */
const logError = (error) => {
    try {
        const logDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir);
        }

        const logEntry = {
            timestamp: new Date().toISOString(),
            name: error.name,
            message: error.message,
            statusCode: error.statusCode,
            stack: error.stack,
            details: error.details
        };

        const logFile = path.join(logDir, 'error-logs.txt');
        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    } catch (logError) {
        console.error('Error writing to log file:', logError);
    }
};

/**
 * Validate request data against a schema
 */
const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            const { error } = schema.validate(req.body);
            if (error) {
                throw new APIError('Validation error', 400, error.details);
            }
            next();
        } catch (err) {
            next(err);
        }
    };
};

/**
 * Rate limiting middleware
 */
const rateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
    const requests = new Map();

    return (req, res, next) => {
        const ip = req.ip;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean up old requests
        requests.forEach((timestamp, key) => {
            if (timestamp < windowStart) {
                requests.delete(key);
            }
        });

        // Check current IP's request count
        const requestTimes = requests.get(ip) || [];
        const recentRequests = requestTimes.filter(time => time > windowStart);

        if (recentRequests.length >= max) {
            throw new APIError('Too many requests', 429);
        }

        // Add current request
        requests.set(ip, [...recentRequests, now]);
        next();
    };
};

module.exports = {
    APIError,
    asyncHandler,
    errorHandler,
    validateRequest,
    rateLimit,
    logError
}; 