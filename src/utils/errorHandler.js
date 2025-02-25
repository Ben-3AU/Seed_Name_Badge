import { UI } from '../core/constants.js';
import { Message } from '../ui/components/UILibrary.js';
import { isValidEmail, validateField as validateFieldHelper, retryOperation } from './helpers.js';

export class ErrorHandler {
    static ERROR_TYPES = {
        VALIDATION: 'validation',
        API: 'api',
        NETWORK: 'network',
        PAYMENT: 'payment',
        SYSTEM: 'system'
    };

    static ERROR_CODES = {
        INVALID_INPUT: 'INVALID_INPUT',
        REQUIRED_FIELD: 'REQUIRED_FIELD',
        API_ERROR: 'API_ERROR',
        NETWORK_ERROR: 'NETWORK_ERROR',
        PAYMENT_ERROR: 'PAYMENT_ERROR',
        SYSTEM_ERROR: 'SYSTEM_ERROR'
    };

    constructor(state) {
        this.state = state;
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.retryDelay = 1000;
    }

    handleError(error, context = {}) {
        const { type = ErrorHandler.ERROR_TYPES.SYSTEM, field = null, component = null } = context;
        
        // Log error for debugging
        console.error(`Error in ${context.component || 'unknown component'}:`, error);

        // Format error message
        const message = this.formatErrorMessage(error, type);

        // Update state with error
        if (field) {
            this.state.setError(field, message);
        }

        // Show error message if component is provided
        if (component && component.showMessage) {
            component.showMessage(message, 'error');
        }

        // Return formatted error for further handling if needed
        return {
            type,
            message,
            code: error.code || ErrorHandler.ERROR_CODES.SYSTEM_ERROR,
            field
        };
    }

    async handleAsyncOperation(operation, context = {}) {
        try {
            return await retryOperation(
                operation,
                this.maxRetries,
                this.retryDelay
            );
        } catch (error) {
            const formattedError = this.handleError(error, context);
            throw formattedError;
        }
    }

    formatErrorMessage(error, type) {
        if (typeof error === 'string') {
            return error;
        }

        // Use predefined messages from UI constants if available
        if (error.code && UI.MESSAGES.error[error.code]) {
            return UI.MESSAGES.error[error.code];
        }

        // Format based on error type
        switch (type) {
            case ErrorHandler.ERROR_TYPES.VALIDATION:
                return error.message || UI.MESSAGES.error.validation.generic;
            case ErrorHandler.ERROR_TYPES.API:
                return error.message || UI.MESSAGES.error.api.generic;
            case ErrorHandler.ERROR_TYPES.NETWORK:
                return UI.MESSAGES.error.network;
            case ErrorHandler.ERROR_TYPES.PAYMENT:
                return error.message || UI.MESSAGES.error.payment.generic;
            default:
                return error.message || UI.MESSAGES.error.system.generic;
        }
    }

    clearError(field) {
        this.state.clearError(field);
    }

    clearAllErrors() {
        this.state.clearAllErrors();
    }

    resetRetryAttempts(component) {
        this.retryAttempts.delete(component);
    }

    validateField(field, value, rules = {}) {
        const errors = validateFieldHelper(field, value, rules);

        if (errors.length > 0) {
            this.handleError(new Error(errors[0]), {
                type: ErrorHandler.ERROR_TYPES.VALIDATION,
                field
            });
            return false;
        }

        this.clearError(field);
        return true;
    }
} 