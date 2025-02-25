import { UI } from '../core/constants.js';

// Form validation and error handling
export class FormManager {
    constructor(options = {}) {
        this.cache = new Cache();
        this.errors = new Map();
        this.elements = new Map();
        this.options = {
            autosave: true,
            autosaveInterval: 5000,
            storageKey: 'formData',
            ...options
        };
        
        if (this.options.autosave) {
            this.setupAutosave();
        }
    }

    setupAutosave() {
        this.autosaveInterval = setInterval(() => {
            if (this.cache.get('isDirty')) {
                this.saveFormState();
                this.cache.set('isDirty', false);
            }
        }, this.options.autosaveInterval);
    }

    saveFormState() {
        try {
            const formData = this.getFormData();
            localStorage.setItem(this.options.storageKey, JSON.stringify(formData));
        } catch (error) {
            console.error('Failed to save form state:', error);
        }
    }

    restoreFormState() {
        try {
            const saved = localStorage.getItem(this.options.storageKey);
            if (saved) {
                const formData = JSON.parse(saved);
                Object.entries(formData).forEach(([key, value]) => {
                    this.cache.set(key, value || '');
                });
                
                const form = this.elements.get('form');
                if (form) {
                    setFormData(form, formData);
                }
            }
        } catch (error) {
            console.error('Failed to restore form state:', error);
        }
    }

    validateField(field, value, isBlur = false) {
        const errors = validateField(field, value);
        const errorMessage = errors[0] || '';
        
        if (this.errors.get(field) !== errorMessage) {
            this.errors.set(field, errorMessage);
            this.updateFieldUI(field);
            
            this.cache.set(`${field}Valid`, !errorMessage);
            this.cache.set(`${field}Error`, errorMessage);
            
            if (!errorMessage && isBlur && this.options.autosave) {
                this.saveFormState();
            }
        }

        return !errorMessage;
    }

    updateFieldUI(field) {
        const input = this.elements.get(`${field}Input`);
        const error = this.errors.get(field);
        
        if (input) {
            if (error) {
                input.setError(error);
            } else {
                input.clearError();
            }
        }
    }

    getFormData() {
        const form = this.elements.get('form');
        return form ? getFormData(form) : {};
    }

    cleanup() {
        if (this.autosaveInterval) {
            clearInterval(this.autosaveInterval);
        }
        this.cache.clear();
        this.errors.clear();
    }
}

// Validation helpers
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function validateFormData(data, requiredFields = []) {
    const errors = {};

    requiredFields.forEach(field => {
        if (!data[field]) {
            errors[field] = UI.MESSAGES.error.validation.required;
        }
    });

    if (data.email && !isValidEmail(data.email)) {
        errors.email = UI.MESSAGES.error.validation.email;
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}

// Formatting helpers
export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

export function formatNumber(number) {
    return number.toLocaleString('en-US');
}

export function formatCO2Savings(kg) {
    return `${kg.toFixed(2)} kg`;
}

export function formatDisplayValue(type, value) {
    return UI.DISPLAY_VALUES[type]?.[value] || value;
}

// DOM helpers
export function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'dataset') {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                element.dataset[dataKey] = dataValue;
            });
        } else if (key === 'textContent') {
            element.textContent = value;
        } else {
            element.setAttribute(key, value);
        }
    });

    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else {
            element.appendChild(child);
        }
    });

    return element;
}

// Style injection helper
export function injectStyles(id, styles) {
    if (document.querySelector(`#${id}`)) {
        return;
    }

    const styleElement = createElement('style', {
        id,
        textContent: styles
    });

    document.head.appendChild(styleElement);
}

// Async helpers
export function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function for limiting execution rate
 */
export function throttle(func, limit) {
    let inThrottle;
    return function throttledFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Form validation helpers
export function validateField(field, value, options = {}) {
    const errors = [];
    const { required = true, minLength = 2 } = options;

    // Common validation rules
    if (required && !value.trim()) {
        errors.push(UI.MESSAGES.error.validation.required);
        return errors;
    }

    switch (field) {
        case 'firstName':
        case 'lastName':
            if (value.trim().length < minLength) {
                errors.push(`${field === 'firstName' ? 'First' : 'Last'} name must be at least ${minLength} characters long`);
            }
            break;

        case 'email':
            if (!isValidEmail(value)) {
                errors.push(UI.MESSAGES.error.validation.email);
            }
            break;

        case 'company':
            if (value.trim() && value.trim().length < minLength) {
                errors.push('Company name must be at least 2 characters long');
            }
            break;

        case 'quantity':
            const quantity = parseInt(value);
            if (isNaN(quantity) || quantity < 0) {
                errors.push('Quantity must be a positive number');
            }
            break;
    }

    return errors;
}

// Error handling helpers
export function handleApiError(error, context = '') {
    console.error(`API Error ${context ? `(${context})` : ''}:`, error);
    return {
        error: true,
        message: error.message || UI.MESSAGES.error.system.general
    };
}

// UI feedback helpers
export function showErrorFeedback(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    element.classList.add('shake');
    setTimeout(() => element.classList.remove('shake'), 500);
}

export function clearErrorFeedback(element) {
    element.textContent = '';
    element.style.display = 'none';
    element.classList.remove('shake');
}

// Form state management helpers
export function getFormData(form) {
    const formData = new FormData(form);
    const data = {};
    for (const [key, value] of formData.entries()) {
        data[key] = value;
    }
    return data;
}

export function setFormData(form, data) {
    Object.entries(data).forEach(([key, value]) => {
        const input = form.querySelector(`[name="${key}"]`);
        if (input) {
            input.value = value;
        }
    });
}

// Cache management helper
export class Cache {
    constructor() {
        this.store = new Map();
    }

    get(key) {
        return this.store.get(key);
    }

    set(key, value) {
        this.store.set(key, value);
    }

    has(key) {
        return this.store.has(key);
    }

    delete(key) {
        this.store.delete(key);
    }

    clear() {
        this.store.clear();
    }

    clearByPrefix(prefix) {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                this.store.delete(key);
            }
        }
    }
}

// Retry helper
export async function retryOperation(operation, maxRetries = 3, delay = 2000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            await new Promise(resolve => 
                setTimeout(resolve, Math.pow(2, i) * delay)
            );
        }
    }
    
    throw lastError;
} 