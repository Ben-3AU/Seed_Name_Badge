export class StripeService {
    constructor() {
        this.stripe = null;
        this.elements = null;
        this.initialized = false;
        this.retryCount = 0;
        this.MAX_RETRIES = 3;
        this.RETRY_DELAY = 2000;
    }

    async initialize() {
        try {
            if (this.initialized) return true;

            const response = await this.fetchWithRetry('/api/config');
            if (!response.ok) {
                throw new Error('Failed to fetch Stripe configuration');
            }

            const { publishableKey } = await response.json();
            if (!publishableKey) {
                throw new Error('No publishable key found in configuration');
            }

            this.stripe = Stripe(publishableKey);
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize Stripe:', error);
            this.initialized = false;
            throw error;
        }
    }

    async fetchWithRetry(url, options = {}) {
        let lastError;
        for (let i = 0; i < this.MAX_RETRIES; i++) {
            try {
                const response = await fetch(url, options);
                if (response.ok) return response;
                lastError = new Error(`HTTP error! status: ${response.status}`);
            } catch (error) {
                lastError = error;
            }
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * this.RETRY_DELAY));
        }
        throw lastError;
    }

    isInitialized() {
        return this.initialized && this.stripe !== null;
    }

    async processPayment(orderData) {
        if (!this.isInitialized()) {
            await this.initialize();
        }

        try {
            // Create payment intent
            const { clientSecret, orderId } = await this.createPaymentIntent(orderData);
            
            // Create payment element
            const elements = this.createPaymentElement(clientSecret);
            
            // Return payment details
            return {
                clientSecret,
                orderId,
                elements,
                error: null
            };
        } catch (error) {
            console.error('Payment processing failed:', error);
            return { error: this.formatError(error) };
        }
    }

    async createPaymentIntent(orderData) {
        try {
            const response = await this.fetchWithRetry('/api/create-payment-intent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });

            const data = await response.json();
            if (!data.clientSecret) {
                throw new Error('No client secret received');
            }

            return data;
        } catch (error) {
            console.error('Payment intent creation failed:', error);
            throw error;
        }
    }

    createPaymentElement(clientSecret) {
        if (!this.isInitialized()) {
            throw new Error('Stripe not initialized');
        }

        const options = {
            clientSecret,
            appearance: {
                theme: 'stripe',
                variables: {
                    colorPrimary: '#1b4c57',
                    colorBackground: '#ffffff',
                    colorText: '#1b4c57',
                    colorDanger: '#df1b41',
                    fontFamily: 'Verdana, system-ui, sans-serif',
                    borderRadius: '6px'
                }
            },
            layout: {
                type: 'tabs',
                defaultCollapsed: false
            },
            fields: {
                billingDetails: {
                    name: 'never'
                }
            }
        };

        this.elements = this.stripe.elements(options);
        return this.elements;
    }

    async confirmPayment(returnUrl) {
        if (!this.isInitialized()) {
            throw new Error('Stripe not initialized');
        }

        if (!this.elements) {
            throw new Error('Payment elements not created');
        }

        try {
            const { error } = await this.stripe.confirmPayment({
                elements: this.elements,
                confirmParams: {
                    return_url: returnUrl
                }
            });

            if (error) {
                throw error;
            }

            return { error: null };
        } catch (error) {
            console.error('Payment confirmation failed:', error);
            return { error: this.formatError(error) };
        }
    }

    async verifyPayment(clientSecret) {
        if (!this.isInitialized()) {
            await this.initialize();
        }

        try {
            const { paymentIntent } = await this.stripe.retrievePaymentIntent(clientSecret);
            return {
                success: paymentIntent.status === 'succeeded',
                status: paymentIntent.status,
                error: null
            };
        } catch (error) {
            console.error('Payment verification failed:', error);
            return {
                success: false,
                status: 'failed',
                error: this.formatError(error)
            };
        }
    }

    formatError(error) {
        if (error.type === 'card_error' || error.type === 'validation_error') {
            return {
                type: error.type,
                message: error.message,
                code: error.code
            };
        }

        return {
            type: 'api_error',
            message: 'An unexpected error occurred',
            code: error.code || 'unknown'
        };
    }

    cleanup() {
        if (this.elements) {
            this.elements.unmount();
            this.elements = null;
        }
        this.initialized = false;
        this.stripe = null;
    }
} 