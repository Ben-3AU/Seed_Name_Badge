import { UI } from './constants.js';

export class StateManager {
    constructor() {
        this.state = {
            view: 'calculator',
            formData: {
                withGuests: '',
                withoutGuests: '',
                size: 'A7',
                printedSides: 'single',
                inkCoverage: 'upTo40',
                lanyards: 'yes',
                shipping: 'standard',
                paperType: 'mixedHerb'
            },
            errors: new Map(),
            loading: new Map(),
            cache: new Map(),
            orderData: null,
            clientSecret: null,
            orderId: null
        };
        this.subscribers = new Set();
        this.loadFromStorage();
    }

    // State getters
    get(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this.state);
    }

    // State setters
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => obj[key] = obj[key] || {}, this.state);
        target[lastKey] = value;
        this.notifySubscribers();
        this.saveToStorage();
    }

    // Form data management
    updateFormData(data) {
        this.state.formData = { ...this.state.formData, ...data };
        this.notifySubscribers();
        this.saveToStorage();
    }

    // View management
    setView(view) {
        this.state.view = view;
        this.notifySubscribers();
    }

    // Error management
    setError(field, message) {
        this.state.errors.set(field, message);
        this.notifySubscribers();
    }

    clearError(field) {
        this.state.errors.delete(field);
        this.notifySubscribers();
    }

    clearAllErrors() {
        this.state.errors.clear();
        this.notifySubscribers();
    }

    // Loading state management
    setLoading(type, isLoading) {
        this.state.loading.set(type, isLoading);
        this.notifySubscribers();
    }

    // Cache management
    setCache(key, value) {
        this.state.cache.set(key, value);
        this.saveToStorage();
    }

    getCache(key) {
        return this.state.cache.get(key);
    }

    clearCache(key) {
        if (key) {
            this.state.cache.delete(key);
        } else {
            this.state.cache.clear();
        }
        this.saveToStorage();
    }

    // Order management
    setOrderData(data) {
        this.state.orderData = data;
        this.notifySubscribers();
        this.saveToStorage();
    }

    setClientSecret(secret) {
        this.state.clientSecret = secret;
        this.notifySubscribers();
    }

    setOrderId(id) {
        this.state.orderId = id;
        this.notifySubscribers();
        this.saveToStorage();
    }

    // Storage management
    saveToStorage() {
        const storageData = {
            formData: this.state.formData,
            cache: Array.from(this.state.cache.entries()),
            orderData: this.state.orderData,
            orderId: this.state.orderId
        };
        localStorage.setItem('terraTagState', JSON.stringify(storageData));
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem('terraTagState');
            if (stored) {
                const data = JSON.parse(stored);
                this.state.formData = { ...this.state.formData, ...data.formData };
                this.state.cache = new Map(data.cache || []);
                this.state.orderData = data.orderData;
                this.state.orderId = data.orderId;
            }
        } catch (error) {
            console.error('Error loading state from storage:', error);
        }
    }

    // Subscription management
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    notifySubscribers() {
        this.subscribers.forEach(callback => callback(this.state));
    }

    // Reset state
    reset() {
        this.state = {
            view: 'calculator',
            formData: {
                withGuests: '',
                withoutGuests: '',
                size: 'A7',
                printedSides: 'single',
                inkCoverage: 'upTo40',
                lanyards: 'yes',
                shipping: 'standard',
                paperType: 'mixedHerb'
            },
            errors: new Map(),
            loading: new Map(),
            cache: new Map(),
            orderData: null,
            clientSecret: null,
            orderId: null
        };
        localStorage.removeItem('terraTagState');
        this.notifySubscribers();
    }
} 