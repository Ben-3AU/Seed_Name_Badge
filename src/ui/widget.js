import { UI } from '../core/constants.js';
import { Calculator } from '../core/calculator.js';
import { State } from '../core/state.js';
import { StripeService } from '../services/stripe.js';
import { Button } from './components/Button.js';
import { Input } from './components/Input.js';
import { Summary } from './components/Summary.js';

export class TerraTagWidget {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with id "${containerId}" not found`);
        }

        this.calculator = new Calculator();
        this.state = new State();
        this.stripeService = new StripeService();
    }

    async initialize() {
        try {
            await this.stripeService.initialize();
            this.createStructure();
            this.setupEventListeners();
            this.updateDisplay();
        } catch (error) {
            console.error('Failed to initialize widget:', error);
            this.showError('Failed to initialize calculator. Please refresh the page.');
        }
    }

    createStructure() {
        this.container.innerHTML = `
            <div class="terra-tag-widget">
                <h1 class="terra-tag-title">${UI.LABELS.title}</h1>
                <form class="terra-tag-form">
                    <div class="form-row">
                        ${new Input({
                            type: 'number',
                            name: 'withGuests',
                            label: UI.LABELS.forms.withGuests,
                            value: this.state.data.formData.withGuests,
                            onChange: (e) => this.handleQuantityChange(e)
                        }).render().outerHTML}
                        
                        ${new Input({
                            type: 'number',
                            name: 'withoutGuests',
                            label: UI.LABELS.forms.withoutGuests,
                            value: this.state.data.formData.withoutGuests,
                            onChange: (e) => this.handleQuantityChange(e)
                        }).render().outerHTML}
                    </div>

                    <div class="options-section">
                        ${this.createOptionsGroup('size', UI.LABELS.forms.size, UI.OPTIONS.size)}
                        ${this.createOptionsGroup('printedSides', UI.LABELS.forms.printedSides, UI.OPTIONS.printedSides)}
                        ${this.createOptionsGroup('inkCoverage', UI.LABELS.forms.inkCoverage, UI.OPTIONS.inkCoverage)}
                        ${this.createOptionsGroup('lanyards', UI.LABELS.forms.lanyards, UI.OPTIONS.lanyards)}
                        ${this.createOptionsGroup('shipping', UI.LABELS.forms.shipping, UI.OPTIONS.shipping)}
                    </div>

                    <div id="totalPrice" class="price-section"></div>

                    <div class="actions-section">
                        ${new Button({
                            type: 'primary',
                            label: UI.LABELS.buttons.getQuote,
                            onClick: () => this.showQuoteForm()
                        }).render().outerHTML}
                        
                        ${new Button({
                            type: 'secondary',
                            label: UI.LABELS.buttons.payNow,
                            onClick: () => this.showOrderForm()
                        }).render().outerHTML}
                    </div>
                </form>

                <div id="quoteForm" class="form-section" style="display: none;">
                    <h2>Get Quote</h2>
                    ${new Input({
                        type: 'text',
                        name: 'firstName',
                        label: UI.LABELS.forms.firstName,
                        required: true
                    }).render().outerHTML}
                    
                    ${new Input({
                        type: 'email',
                        name: 'email',
                        label: UI.LABELS.forms.email,
                        required: true
                    }).render().outerHTML}
                    
                    ${new Button({
                        type: 'primary',
                        label: UI.LABELS.buttons.getQuote,
                        onClick: (e) => this.handleQuoteSubmit(e)
                    }).render().outerHTML}
                </div>

                <div id="orderForm" class="form-section" style="display: none;">
                    <h2>Complete Order</h2>
                    ${new Input({
                        type: 'text',
                        name: 'firstName',
                        label: UI.LABELS.forms.firstName,
                        required: true
                    }).render().outerHTML}
                    
                    ${new Input({
                        type: 'text',
                        name: 'lastName',
                        label: UI.LABELS.forms.lastName,
                        required: true
                    }).render().outerHTML}
                    
                    ${new Input({
                        type: 'text',
                        name: 'company',
                        label: UI.LABELS.forms.company
                    }).render().outerHTML}
                    
                    ${new Input({
                        type: 'email',
                        name: 'email',
                        label: UI.LABELS.forms.email,
                        required: true
                    }).render().outerHTML}
                    
                    ${this.createOptionsGroup('paperType', UI.LABELS.forms.paperType, UI.OPTIONS.paperType)}
                    
                    ${new Button({
                        type: 'primary',
                        label: UI.LABELS.buttons.payNow,
                        onClick: (e) => this.handleOrderSubmit(e)
                    }).render().outerHTML}
                </div>
            </div>
        `;

        this.injectStyles();
    }

    createOptionsGroup(name, label, options) {
        return `
            <div class="options-group">
                <label>${label}</label>
                <div class="options-buttons">
                    ${options.map((option, index) => `
                        <button type="button"
                            class="option-button ${this.state.data.formData[name] === option ? 'selected' : ''}"
                            data-option="${name}"
                            data-value="${option}"
                            onclick="this.handleOptionSelect('${name}', '${option}')"
                        >
                            ${option}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Quantity inputs
        this.container.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', (e) => this.handleQuantityChange(e));
        });

        // Option buttons
        this.container.querySelectorAll('.option-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const { option, value } = e.target.dataset;
                this.handleOptionSelect(option, value);
            });
        });

        // Form inputs
        this.container.querySelectorAll('input[type="text"], input[type="email"]').forEach(input => {
            input.addEventListener('input', (e) => {
                this.state.updateFormData({
                    [e.target.name]: e.target.value
                });
            });
        });
    }

    handleQuantityChange(event) {
        const { name, value } = event.target;
        this.state.updateFormData({
            [name]: parseInt(value) || 0
        });
        this.updateDisplay();
    }

    handleOptionSelect(option, value) {
        this.state.updateFormData({ [option]: value });
        
        // Update button states
        const buttons = this.container.querySelectorAll(`[data-option="${option}"]`);
        buttons.forEach(button => {
            button.classList.toggle('selected', button.dataset.value === value);
        });
        
        this.updateDisplay();
    }

    updateDisplay() {
        const { formData } = this.state.data;
        const totalQuantity = this.calculator.getTotalQuantity(
            formData.withGuests,
            formData.withoutGuests
        );

        const priceSection = this.container.querySelector('#totalPrice');
        const actionsSection = this.container.querySelector('.actions-section');

        if (totalQuantity < 75) {
            priceSection.innerHTML = `
                <div class="warning-message">
                    ${UI.MESSAGES.error.validation.minQuantity}
                </div>
            `;
            actionsSection.style.display = 'none';
            return;
        }

        const totalPrice = this.calculator.getTotalPrice(formData);
        const gst = this.calculator.getGST(totalPrice);
        const co2Savings = this.calculator.getCO2Savings(totalQuantity);

        priceSection.innerHTML = `
            <div class="price-content">
                <div class="total-price">
                    ${this.formatCurrency(totalPrice)}
                </div>
                <div class="price-details">
                    <div>GST Included: ${this.formatCurrency(gst)}</div>
                    <div>CO2 Savings: ${co2Savings.toFixed(2)} kg</div>
                </div>
            </div>
        `;

        actionsSection.style.display = 'flex';
    }

    showQuoteForm() {
        if (!this.state.validate()) {
            return;
        }

        this.container.querySelector('#quoteForm').style.display = 'block';
        this.container.querySelector('#orderForm').style.display = 'none';
    }

    showOrderForm() {
        if (!this.state.validate()) {
            return;
        }

        this.container.querySelector('#orderForm').style.display = 'block';
        this.container.querySelector('#quoteForm').style.display = 'none';
    }

    validateQuantity() {
        const withGuests = parseInt(this.container.querySelector('#withGuests').value) || 0;
        const withoutGuests = parseInt(this.container.querySelector('#withoutGuests').value) || 0;
        const totalQuantity = withGuests + withoutGuests;

        if (totalQuantity < 75) {
            this.setError('quantity', UI.MESSAGES.error.validation.minQuantity);
            return false;
        }

        this.clearError('quantity');
        return true;
    }

    validateField(input) {
        const value = input.value.trim();
        const name = input.name;

        if (input.required && !value) {
            this.setFieldError(input, UI.MESSAGES.error.validation.required);
            return false;
        }

        if (input.type === 'email' && value && !this.isValidEmail(value)) {
            this.setFieldError(input, UI.MESSAGES.error.validation.email);
            return false;
        }

        this.clearFieldError(input);
        return true;
    }

    setFieldError(input, message) {
        const errorDiv = input.parentElement.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            input.classList.add('error');
            this.formErrors.set(input.name, message);
        }
    }

    clearFieldError(input) {
        const errorDiv = input.parentElement.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.textContent = '';
            input.classList.remove('error');
            this.formErrors.delete(input.name);
        }
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    handleError(error, context = '') {
        console.error(`${context}:`, error);
        this.showError(error.message || UI.MESSAGES.error.system.general);
    }

    async handleQuoteSubmit(event) {
        event.preventDefault();
        const form = event.target;
        let isValid = true;

        // Validate all fields
        form.querySelectorAll('input').forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        if (!isValid) return;

        try {
            const formData = new FormData(form);
            const quoteData = {
                ...Object.fromEntries(formData),
                ...this.state.data.formData,
                totalPrice: this.calculator.getTotalPrice(this.state.data.formData)
            };

            const response = await fetch('/api/quote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(quoteData)
            });

            if (!response.ok) throw new Error(UI.MESSAGES.error.quote);

            this.showSuccess(UI.MESSAGES.success.quote);
            this.showCalculatorView();
        } catch (error) {
            this.handleError(error, 'Quote submission failed');
        }
    }

    async handleOrderSubmit(event) {
        event.preventDefault();
        
        const submitButton = event.target.querySelector('button[type="submit"]');
        submitButton.classList.add('loading');
        
        try {
            if (!this.stripeService.isInitialized()) {
                throw new Error(UI.MESSAGES.error.system.stripe);
            }

            const formData = new FormData(event.target);
            const orderData = {
                quantity_with_guests: parseInt(this.state.data.formData.withGuests) || 0,
                quantity_without_guests: parseInt(this.state.data.formData.withoutGuests) || 0,
                size: this.state.data.formData.size,
                printed_sides: this.state.data.formData.printedSides,
                ink_coverage: this.state.data.formData.inkCoverage,
                lanyards: this.state.data.formData.lanyards === 'yes',
                shipping: this.state.data.formData.shipping,
                paper_type: formData.get('paperType'),
                first_name: formData.get('firstName'),
                last_name: formData.get('lastName'),
                company: formData.get('company') || '',
                email: formData.get('email'),
                total_quantity: this.calculator.getTotalQuantity(
                    this.state.data.formData.withGuests,
                    this.state.data.formData.withoutGuests
                ),
                total_cost: this.calculator.getTotalPrice(this.state.data.formData),
                gst_amount: this.calculator.getGST(this.calculator.getTotalPrice(this.state.data.formData)),
                co2_savings: this.calculator.getCO2Savings(this.calculator.getTotalQuantity(
                    this.state.data.formData.withGuests,
                    this.state.data.formData.withoutGuests
                ))
            };

            // Store order data in state
            this.state.update({ orderData });

            // Create payment intent
            const response = await fetch('/api/create-payment-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderData })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create payment intent');
            }

            const { clientSecret, orderId } = await response.json();
            
            // Hide calculator form and show payment form
            this.showPaymentForm(orderData, clientSecret, orderId);
            
        } catch (error) {
            console.error('Order submission error:', error);
            this.showError(UI.MESSAGES.error.payment);
        } finally {
            submitButton.classList.remove('loading');
        }
    }

    showPaymentForm(orderData, clientSecret, orderId) {
        const calculatorForm = this.container.querySelector('#calculator-form');
        calculatorForm.style.display = 'none';
        
        const paymentContainer = document.createElement('div');
        paymentContainer.id = 'payment-container';
        paymentContainer.innerHTML = `
            <div class="payment-form">
                <button class="back-button" onclick="this.handleBackButtonClick()">
                    ${UI.LABELS.buttons.back}
                </button>
                <h2>Complete Your Order</h2>
                
                <div class="order-summary">
                    <h3>Order Summary</h3>
                    <div class="summary-row">
                        <span>Name:</span>
                        <span>${orderData.first_name} ${orderData.last_name}</span>
                    </div>
                    <div class="summary-row">
                        <span>Email:</span>
                        <span>${orderData.email}</span>
                    </div>
                    <div class="summary-row">
                        <span>Total Quantity:</span>
                        <span>${orderData.total_quantity} badges</span>
                    </div>
                    <div class="summary-row">
                        <span>Total Amount:</span>
                        <span>$${orderData.total_cost.toFixed(2)}</span>
                    </div>
                </div>

                <form id="payment-form">
                    <div class="form-group">
                        <label for="card-name">Name on card</label>
                        <input id="card-name" type="text" required>
                    </div>
                    <div id="payment-element"></div>
                    <button id="submit-payment" class="submit-button">
                        <span id="button-text">Pay Now</span>
                        <div class="spinner" id="payment-spinner" style="display: none;"></div>
                    </button>
                    <div id="payment-message" class="payment-message"></div>
                </form>
            </div>
        `;
        
        this.container.appendChild(paymentContainer);

        // Create payment element
        const elements = this.stripeService.stripe.elements({
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
            }
        });

        const paymentElement = elements.create('payment', {
            layout: {
                type: 'tabs',
                defaultCollapsed: false
            },
            fields: {
                billingDetails: {
                    name: 'never'
                }
            }
        });

        paymentElement.mount('#payment-element');
        
        // Handle payment form submission
        const form = document.getElementById('payment-form');
        let submitted = false;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (submitted) {
                console.log('Payment already submitted');
                return;
            }

            const cardName = document.getElementById('card-name').value.trim();
            if (!cardName) {
                document.getElementById('payment-message').textContent = 'Please enter the name on your card';
                return;
            }

            const submitButton = document.getElementById('submit-payment');
            const spinner = document.getElementById('payment-spinner');
            const buttonText = document.getElementById('button-text');
            const messageDiv = document.getElementById('payment-message');

            submitted = true;
            submitButton.disabled = true;
            spinner.style.display = 'inline-block';
            buttonText.textContent = 'Processing...';
            messageDiv.textContent = '';

            try {
                const { error } = await this.stripeService.stripe.confirmPayment({
                    elements,
                    confirmParams: {
                        payment_method_data: {
                            billing_details: {
                                name: cardName
                            }
                        },
                        return_url: `${window.location.origin}/payment/success?order_id=${orderId}`
                    }
                });

                if (error) {
                    console.error('Payment error:', error);
                    messageDiv.textContent = error.message;
                    submitted = false;
                    submitButton.disabled = false;
                    spinner.style.display = 'none';
                    buttonText.textContent = 'Pay Now';
                }
            } catch (error) {
                console.error('Unexpected payment error:', error);
                messageDiv.textContent = 'An unexpected error occurred. Please try again.';
                submitted = false;
                submitButton.disabled = false;
                spinner.style.display = 'none';
                buttonText.textContent = 'Pay Now';
            }
        });
    }

    handleBackButtonClick() {
        const paymentContainer = document.getElementById('payment-container');
        if (paymentContainer) {
            paymentContainer.remove();
        }

        const calculatorForm = this.container.querySelector('#calculator-form');
        calculatorForm.style.display = 'block';
    }

    showSuccess(message) {
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.textContent = message;
        
        this.container.appendChild(successMessage);
        setTimeout(() => successMessage.remove(), 3000);
    }

    showError(message) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = message;
        
        this.container.appendChild(errorMessage);
        setTimeout(() => errorMessage.remove(), 3000);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    injectStyles() {
        if (document.querySelector('#terra-tag-widget-styles')) {
            return;
        }

        const styles = document.createElement('style');
        styles.id = 'terra-tag-widget-styles';
        styles.textContent = `
            .terra-tag-widget {
                font-family: ${UI.FONTS.primary};
                max-width: 600px;
                margin: 0 auto;
                padding: ${UI.SPACING.large};
            }

            .terra-tag-title {
                font-size: ${UI.FONTS.sizes.xlarge};
                color: ${UI.COLORS.text.primary};
                text-align: center;
                margin-bottom: ${UI.SPACING.large};
            }

            .terra-tag-form {
                display: flex;
                flex-direction: column;
                gap: ${UI.SPACING.large};
            }

            .form-row {
                display: flex;
                gap: ${UI.SPACING.medium};
            }

            .options-section {
                display: flex;
                flex-direction: column;
                gap: ${UI.SPACING.medium};
            }

            .options-group {
                display: flex;
                flex-direction: column;
                gap: ${UI.SPACING.small};
            }

            .options-buttons {
                display: flex;
                gap: 0;
            }

            .option-button {
                flex: 1;
                padding: ${UI.SPACING.medium};
                font-family: ${UI.FONTS.primary};
                font-size: ${UI.FONTS.sizes.medium};
                background: ${UI.COLORS.background.light};
                border: 1px solid ${UI.COLORS.border};
                color: ${UI.COLORS.text.primary};
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .option-button:first-child {
                border-radius: 4px 0 0 4px;
            }

            .option-button:last-child {
                border-radius: 0 4px 4px 0;
            }

            .option-button.selected {
                background: ${UI.COLORS.primary};
                color: ${UI.COLORS.text.light};
                border-color: ${UI.COLORS.primary};
            }

            .price-section {
                background: ${UI.COLORS.background.light};
                padding: ${UI.SPACING.large};
                border-radius: 8px;
                text-align: center;
            }

            .total-price {
                font-size: ${UI.FONTS.sizes.xlarge};
                font-weight: 600;
                color: ${UI.COLORS.text.primary};
                margin-bottom: ${UI.SPACING.small};
            }

            .price-details {
                font-size: ${UI.FONTS.sizes.small};
                color: ${UI.COLORS.text.secondary};
            }

            .actions-section {
                display: flex;
                gap: ${UI.SPACING.medium};
                justify-content: center;
            }

            .form-section {
                margin-top: ${UI.SPACING.large};
                padding-top: ${UI.SPACING.large};
                border-top: 1px solid ${UI.COLORS.border};
            }

            .form-section h2 {
                font-size: ${UI.FONTS.sizes.large};
                color: ${UI.COLORS.text.primary};
                margin-bottom: ${UI.SPACING.large};
            }

            .success-message,
            .error-message {
                position: fixed;
                bottom: ${UI.SPACING.large};
                left: 50%;
                transform: translateX(-50%);
                padding: ${UI.SPACING.medium} ${UI.SPACING.large};
                border-radius: 4px;
                font-family: ${UI.FONTS.primary};
                font-size: ${UI.FONTS.sizes.medium};
                animation: slideUp 0.3s ease;
            }

            .success-message {
                background: ${UI.COLORS.success};
                color: ${UI.COLORS.text.light};
            }

            .error-message {
                background: ${UI.COLORS.error};
                color: ${UI.COLORS.text.light};
            }

            @keyframes slideUp {
                from {
                    transform: translate(-50%, 100%);
                    opacity: 0;
                }
                to {
                    transform: translate(-50%, 0);
                    opacity: 1;
                }
            }

            @media (max-width: 640px) {
                .terra-tag-widget {
                    padding: ${UI.SPACING.medium};
                }

                .form-row {
                    flex-direction: column;
                }

                .options-buttons {
                    flex-direction: column;
                }

                .option-button:first-child {
                    border-radius: 4px 4px 0 0;
                }

                .option-button:last-child {
                    border-radius: 0 0 4px 4px;
                }

                .actions-section {
                    flex-direction: column;
                }
            }
        `;

        document.head.appendChild(styles);
    }
}

// Initialize widget when script is loaded
const initializeWidget = () => {
    const widgetContainer = document.getElementById('terra-tag-calculator');
    if (widgetContainer) {
        const widget = new TerraTagWidget('terra-tag-calculator');
        widget.initialize().catch(error => {
            console.error('Failed to initialize widget:', error);
        });
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWidget);
} else {
    initializeWidget();
} 