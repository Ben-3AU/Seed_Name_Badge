import { UI } from './constants.js';

export class State {
    constructor() {
        this.data = {
            formData: {
                withGuests: 0,
                withoutGuests: 0,
                size: 'A7',
                printedSides: 'single',
                inkCoverage: 'upTo40',
                lanyards: 'yes',
                shipping: 'standard'
            },
            loading: new Map(),
            errors: new Map(),
            view: 'calculator',
            orderId: null
        };
        
        this.subscribers = new Set();
        this.cache = new Map();
        this.debounceTimeout = null;
        this.DEBOUNCE_DELAY = 300;
    }

    get(path) {
        // Check cache first
        const cacheKey = Array.isArray(path) ? path.join('.') : path;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Navigate to the requested data
        let result = this.data;
        if (path) {
            const parts = Array.isArray(path) ? path : path.split('.');
            for (const part of parts) {
                if (result === undefined || result === null) {
                    return undefined;
                }
                result = result[part];
            }
        }

        // Cache the result
        this.cache.set(cacheKey, result);
        return result;
    }

    update(path, value) {
        // Clear cache for affected paths
        this.clearCacheForPath(path);

        // Update the data
        let current = this.data;
        const parts = Array.isArray(path) ? path : path.split('.');
        const lastPart = parts.pop();

        for (const part of parts) {
            if (!(part in current)) {
                current[part] = {};
            }
            current = current[part];
        }

        // Only update if value has changed
        if (current[lastPart] !== value) {
            current[lastPart] = value;
            this.debouncedNotify();
        }
    }

    setView(view) {
        if (this.data.view !== view) {
            this.data.view = view;
            this.clearCache();
            this.notifySubscribers();
        }
    }

    setLoading(type, isLoading) {
        this.data.loading.set(type, isLoading);
        this.notifySubscribers();
    }

    setError(field, message) {
        this.data.errors.set(field, message);
        this.notifySubscribers();
    }

    clearError(field) {
        this.data.errors.delete(field);
        this.notifySubscribers();
    }

    clearAllErrors() {
        this.data.errors.clear();
        this.notifySubscribers();
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    debouncedNotify() {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(() => {
            this.notifySubscribers();
        }, this.DEBOUNCE_DELAY);
    }

    notifySubscribers() {
        this.subscribers.forEach(callback => {
            try {
                callback(this.data);
            } catch (error) {
                console.error('Error in subscriber callback:', error);
            }
        });
    }

    clearCacheForPath(path) {
        const parts = Array.isArray(path) ? path : path.split('.');
        const prefix = parts.join('.');
        
        for (const key of this.cache.keys()) {
            if (key === prefix || key.startsWith(prefix + '.')) {
                this.cache.delete(key);
            }
        }
    }

    clearCache() {
        this.cache.clear();
    }

    saveToSession() {
        try {
            const dataToSave = {
                formData: this.data.formData,
                view: this.data.view,
                orderId: this.data.orderId
            };
            localStorage.setItem('terraTagState', JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Failed to save state to session:', error);
        }
    }

    restoreFromSession() {
        try {
            const saved = localStorage.getItem('terraTagState');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.data.formData = { ...this.data.formData, ...parsed.formData };
                this.data.view = parsed.view || 'calculator';
                this.data.orderId = parsed.orderId;
                this.notifySubscribers();
            }
        } catch (error) {
            console.error('Failed to restore state from session:', error);
        }
    }

    reset() {
        this.data = {
            formData: {
                withGuests: 0,
                withoutGuests: 0,
                size: 'A7',
                printedSides: 'single',
                inkCoverage: 'upTo40',
                lanyards: 'yes',
                shipping: 'standard'
            },
            loading: new Map(),
            errors: new Map(),
            view: 'calculator',
            orderId: null
        };
        
        this.clearCache();
        localStorage.removeItem('terraTagState');
        this.notifySubscribers();
    }

    validate() {
        const errors = new Map();
        const { formData } = this.data;

        // Validate quantities
        const totalQuantity = (parseInt(formData.withGuests) || 0) + 
                            (parseInt(formData.withoutGuests) || 0);
        
        if (totalQuantity < 75) {
            errors.set('quantity', 'Minimum order quantity is 75');
        }

        // Validate other fields
        if (!formData.size) errors.set('size', 'Size is required');
        if (!formData.printedSides) errors.set('printedSides', 'Printed sides selection is required');
        if (!formData.inkCoverage) errors.set('inkCoverage', 'Ink coverage selection is required');
        if (!formData.shipping) errors.set('shipping', 'Shipping method is required');

        this.data.errors = errors;
        return errors.size === 0;
    }
} 