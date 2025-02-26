// Seed Name Badge Calculator Widget
(() => {
    // UI Constants
    const UI = {
        LABELS: {
            title: 'Minimum order of 75',
            forms: {
                withGuests: 'Enter quantity with guest details printed',
                withoutGuests: 'Enter quantity without guest details printed',
                size: 'Size',
                printedSides: 'Printed sides',
                inkCoverage: 'Ink coverage',
                lanyards: 'Lanyards included',
                shipping: 'Shipping',
                firstName: 'First name',
                lastName: 'Last name',
                email: 'Email',
                company: 'Company',
                paperType: 'Paper type'
            },
            buttons: {
                getQuote: 'Email the quote',
                payNow: 'Order Now',
                back: '← Back to Calculator'
            }
        },
        OPTIONS: {
            size: ['A7', 'A6'],
            printedSides: ['Single', 'Double'],
            inkCoverage: ['Up to 40%', 'Over 40%'],
            lanyards: ['Yes', 'No'],
            shipping: ['Standard', 'Express'],
            paperType: ['Mixed herb', 'Mixed flower', 'Random mix']
        }
    };

    // Calculator functionality
    const Calculator = {
        getTotalQuantity(withGuests, withoutGuests) {
            return (withGuests || 0) + (withoutGuests || 0);
        },

        getTotalPrice(values) {
            const { withGuests, withoutGuests, size, printedSides, inkCoverage, lanyards, shipping } = values;
            const totalQuantity = this.getTotalQuantity(withGuests, withoutGuests);
            let totalPrice = (withGuests * 6) + (withoutGuests * 5);

            if (totalQuantity > 300) totalPrice -= 0.50 * totalQuantity;

            if (size === 'A6') totalPrice += 3 * totalQuantity;
            if (printedSides === 'Double') totalPrice += (size === 'A7' ? 0.50 : 1.00) * totalQuantity;
            if (inkCoverage === 'Over 40%') totalPrice += (size === 'A7' ? 0.50 : 1.00) * totalQuantity;
            if (lanyards === 'No') totalPrice -= 0.50 * totalQuantity;

            let shippingCost = 0;
            if (size === 'A7') {
                if (totalQuantity < 200) shippingCost = 20;
                else if (totalQuantity <= 500) shippingCost = 30;
                else shippingCost = 50;
            } else {
                if (totalQuantity < 200) shippingCost = 30;
                else if (totalQuantity <= 500) shippingCost = 45;
                else shippingCost = 75;
            }

            if (shipping === 'Express') shippingCost *= 2;
            totalPrice += shippingCost;
            totalPrice *= 1.10;
            totalPrice *= 1.017;

            return totalPrice;
        },

        getGST(totalPrice) {
            return totalPrice / 11;
        },

        getCO2Savings(totalQuantity) {
            return totalQuantity * 0.11;
        }
    };

    // State management
    const state = {
        formData: {
            withGuests: 0,
            withoutGuests: 0,
            size: 'A7',
            printedSides: 'Single',
            inkCoverage: 'Up to 40%',
            lanyards: 'Yes',
            shipping: 'Standard',
            paperType: 'Mixed herb'
        },
        stripe: null
    };

    // Initialize widget
    async function initWidget() {
        try {
            injectStyles();
            await loadDependencies();
            createWidgetStructure();
            setupEventListeners();
        } catch (error) {
            console.error('Widget initialization error:', error);
        }
    }

    // Load external dependencies
    async function loadDependencies() {
        await loadScript('https://js.stripe.com/v3/');
        state.stripe = Stripe('YOUR_PUBLISHABLE_KEY'); // Replace with actual key
    }

    // Helper function to load scripts
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Create widget structure
    function createWidgetStructure() {
        const container = document.getElementById('terra-tag-calculator');
        if (!container) return;

        container.innerHTML = `
            <div class="calculator-container">
                <h1 class="calculator-heading">${UI.LABELS.title}</h1>
                <form class="calculator-form">
                    <div class="form-group">
                        <label>${UI.LABELS.forms.withGuests}</label>
                        <input type="number" id="withGuests" min="0" value="" placeholder="0">
                    </div>
                    <div class="form-group">
                        <label>${UI.LABELS.forms.withoutGuests}</label>
                        <input type="number" id="withoutGuests" min="0" value="" placeholder="0">
                    </div>
                    ${createOptionsGroups()}
                    <div class="action-buttons">
                        <div class="button-group">
                            <button type="button" id="payNowBtn" class="action-button">${UI.LABELS.buttons.payNow}</button>
                            <button type="button" id="getQuoteBtn" class="action-button">${UI.LABELS.buttons.getQuote}</button>
                        </div>
                    </div>
                </form>
            </div>
            <div id="quoteForm" class="form-overlay" style="display: none;">
                <div class="form-container">
                    <h2>Get Quote</h2>
                    <form id="emailQuoteForm">
                        <div class="form-group">
                            <label>${UI.LABELS.forms.firstName}</label>
                            <input type="text" id="quoteFirstName" required>
                        </div>
                        <div class="form-group">
                            <label>${UI.LABELS.forms.lastName}</label>
                            <input type="text" id="quoteLastName" required>
                        </div>
                        <div class="form-group">
                            <label>${UI.LABELS.forms.email}</label>
                            <input type="email" id="quoteEmail" required>
                        </div>
                        <div class="form-group">
                            <label>${UI.LABELS.forms.company}</label>
                            <input type="text" id="quoteCompany" required>
                        </div>
                        <div class="button-group">
                            <button type="submit" class="action-button">Send Quote</button>
                            <button type="button" class="action-button" onclick="document.getElementById('quoteForm').style.display='none'">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
            <div id="paymentForm" class="form-overlay" style="display: none;">
                <div class="form-container">
                    <h2>Complete Order</h2>
                    <form id="orderForm">
                        <div class="form-group">
                            <label>${UI.LABELS.forms.firstName}</label>
                            <input type="text" id="orderFirstName" required>
                        </div>
                        <div class="form-group">
                            <label>${UI.LABELS.forms.lastName}</label>
                            <input type="text" id="orderLastName" required>
                        </div>
                        <div class="form-group">
                            <label>${UI.LABELS.forms.email}</label>
                            <input type="email" id="orderEmail" required>
                        </div>
                        <div class="form-group">
                            <label>${UI.LABELS.forms.company}</label>
                            <input type="text" id="orderCompany" required>
                        </div>
                        <div id="card-element" class="form-group">
                            <!-- Stripe Card Element will be inserted here -->
                        </div>
                        <div id="card-errors" role="alert"></div>
                        <div class="button-group">
                            <button type="submit" class="action-button">Pay Now</button>
                            <button type="button" class="action-button" onclick="document.getElementById('paymentForm').style.display='none'">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    // Create options groups HTML
    function createOptionsGroups() {
        // Define the order of options
        const optionOrder = ['size', 'printedSides', 'inkCoverage', 'lanyards', 'shipping'];
        
        return optionOrder.map(name => `
            <div class="form-group" data-type="${name}">
                <label>${UI.LABELS.forms[name]}</label>
                <div class="button-group">
                    ${UI.OPTIONS[name].map(option => `
                        <button type="button"
                            class="option-button ${state.formData[name] === option ? 'selected' : ''}"
                            data-name="${name}"
                            data-value="${option}"
                        >${option}</button>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    // Setup event listeners
    function setupEventListeners() {
        const container = document.getElementById('terra-tag-calculator');
        if (!container) return;

        // Quantity inputs
        container.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', handleQuantityChange);
        });

        // Option buttons
        container.querySelectorAll('.option-button').forEach(button => {
            button.addEventListener('click', handleOptionSelect);
        });

        // Action buttons
        container.querySelector('#getQuoteBtn').addEventListener('click', handleGetQuote);
        container.querySelector('#payNowBtn').addEventListener('click', handlePayNow);
    }

    // Event handlers
    function handleQuantityChange(event) {
        const { id, value } = event.target;
        // Clear the placeholder when user starts typing
        if (value !== '') {
            event.target.placeholder = '';
        } else {
            event.target.placeholder = '0';
        }
        state.formData[id] = parseInt(value) || 0;
        updateDisplay();
    }

    function handleOptionSelect(event) {
        const { name, value } = event.target.dataset;
        state.formData[name] = value;
        
        // Update button states
        const buttons = document.querySelectorAll(`[data-name="${name}"]`);
        buttons.forEach(button => {
            button.classList.toggle('selected', button.dataset.value === value);
        });
        
        updateDisplay();
    }

    async function handleGetQuote() {
        console.log('Quote button clicked');
        const quoteForm = document.getElementById('quoteForm');
        console.log('Quote form element:', quoteForm);
        
        quoteForm.style.display = 'flex';
        console.log('Quote form display style:', quoteForm.style.display);
        
        const emailQuoteForm = document.getElementById('emailQuoteForm');
        
        emailQuoteForm.onsubmit = async (e) => {
            e.preventDefault();
            
            const formData = {
                firstName: document.getElementById('quoteFirstName').value,
                lastName: document.getElementById('quoteLastName').value,
                email: document.getElementById('quoteEmail').value,
                company: document.getElementById('quoteCompany').value,
                orderDetails: {
                    ...state.formData,
                    totalPrice: Calculator.getTotalPrice(state.formData),
                    gst: Calculator.getGST(Calculator.getTotalPrice(state.formData)),
                    co2Savings: Calculator.getCO2Savings(
                        Calculator.getTotalQuantity(state.formData.withGuests, state.formData.withoutGuests)
                    )
                }
            };

            try {
                const response = await fetch('/api/send-quote', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) throw new Error('Failed to send quote');

                alert('Quote has been sent to your email!');
                quoteForm.style.display = 'none';
                emailQuoteForm.reset();
            } catch (error) {
                console.error('Error sending quote:', error);
                alert('Failed to send quote. Please try again.');
            }
        };
    }

    async function handlePayNow() {
        console.log('Pay now button clicked');
        const paymentForm = document.getElementById('paymentForm');
        console.log('Payment form element:', paymentForm);
        
        paymentForm.style.display = 'flex';
        console.log('Payment form display style:', paymentForm.style.display);
        
        const orderForm = document.getElementById('orderForm');
        const stripe = state.stripe;
        
        if (!stripe) {
            console.error('Stripe has not been initialized');
            return;
        }

        // Create and mount the Stripe card Element
        const elements = stripe.elements();
        const card = elements.create('card');
        card.mount('#card-element');

        // Handle validation errors
        card.addEventListener('change', function(event) {
            const displayError = document.getElementById('card-errors');
            if (event.error) {
                displayError.textContent = event.error.message;
            } else {
                displayError.textContent = '';
            }
        });

        orderForm.onsubmit = async (e) => {
            e.preventDefault();
            const submitButton = orderForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;

            try {
                const formData = {
                    firstName: document.getElementById('orderFirstName').value,
                    lastName: document.getElementById('orderLastName').value,
                    email: document.getElementById('orderEmail').value,
                    company: document.getElementById('orderCompany').value,
                    orderDetails: {
                        ...state.formData,
                        totalPrice: Calculator.getTotalPrice(state.formData),
                        gst: Calculator.getGST(Calculator.getTotalPrice(state.formData)),
                        co2Savings: Calculator.getCO2Savings(
                            Calculator.getTotalQuantity(state.formData.withGuests, state.formData.withoutGuests)
                        )
                    }
                };

                // Create payment intent
                const response = await fetch('/api/create-payment-intent', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) throw new Error('Failed to create payment intent');

                const { clientSecret } = await response.json();

                // Confirm payment
                const result = await stripe.confirmCardPayment(clientSecret, {
                    payment_method: {
                        card: card,
                        billing_details: {
                            name: `${formData.firstName} ${formData.lastName}`,
                            email: formData.email
                        }
                    }
                });

                if (result.error) {
                    throw new Error(result.error.message);
                }

                // Payment successful
                alert('Payment successful! Order confirmation has been sent to your email.');
                paymentForm.style.display = 'none';
                orderForm.reset();
                card.clear();

            } catch (error) {
                console.error('Payment error:', error);
                alert('Payment failed: ' + error.message);
            }

            submitButton.disabled = false;
        };
    }

    // Update display
    function updateDisplay() {
        const totalQuantity = Calculator.getTotalQuantity(
            state.formData.withGuests,
            state.formData.withoutGuests
        );

        const form = document.querySelector('.calculator-form');
        const actionButtons = document.querySelector('.action-buttons');
        let priceSection = document.getElementById('totalPrice');

        // Remove existing price section if it exists
        if (priceSection) {
            priceSection.remove();
        }

        if (totalQuantity < 75) {
            actionButtons.style.display = 'none';
            return;
        }

        // Create new price section
        priceSection = document.createElement('div');
        priceSection.id = 'totalPrice';
        priceSection.className = 'total-price';

        const totalPrice = Calculator.getTotalPrice(state.formData);
        const gst = Calculator.getGST(totalPrice);
        const co2Savings = Calculator.getCO2Savings(totalQuantity);

        priceSection.innerHTML = `
            <div class="total-price-content">
                <div class="total-cost">Total cost: ${formatCurrency(totalPrice)}</div>
                <div class="price-details">
                    <div>GST Included: ${formatCurrency(gst)}</div>
                    <div>CO2 Savings: ${co2Savings.toFixed(2)} kg</div>
                </div>
            </div>
        `;

        // Insert price section before action buttons
        form.insertBefore(priceSection, actionButtons);
        actionButtons.style.display = 'block';
    }

    // Helper functions
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD'
        }).format(amount);
    }

    // Inject required styles
    function injectStyles() {
        if (document.getElementById('terra-tag-calculator-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'terra-tag-calculator-styles';
        styles.textContent = `
            /* Base styles for widget */
            #terra-tag-calculator {
                font-size: 16px;
                font-family: Verdana, sans-serif;
                line-height: 1.6;
                color: #1b4c57;
            }

            #terra-tag-calculator * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            .calculator-container {
                max-width: 600px;
                margin: 2rem auto;
                padding: 2rem;
                background-color: #fff;
                border-radius: 8px;
            }

            .calculator-heading {
                font-family: Verdana, sans-serif !important;
                font-size: 1.5rem !important;
                font-weight: normal !important;
                color: #1b4c57 !important;
                text-align: center !important;
                margin-bottom: 2rem !important;
                line-height: 1.6 !important;
            }

            .calculator-form {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }

            .form-group {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                margin-bottom: 1.5rem;
            }

            label {
                font-size: 16px;
                font-weight: 500;
                color: #1b4c57;
            }

            input[type="number"],
            input[type="text"],
            input[type="email"] {
                padding: 0 1rem;
                height: 48px;
                font-size: 16px !important;
                font-family: Verdana, sans-serif;
                line-height: normal;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                width: 100%;
                transition: border-color 0.2s ease;
                color: #1b4c57;
                -webkit-appearance: textfield;
                appearance: textfield;
                text-indent: 1rem;
            }

            input[type="number"]::placeholder,
            input[type="text"]::placeholder,
            input[type="email"]::placeholder {
                color: #1b4c57 !important;
                opacity: 0.5 !important;
                font-size: 16px;
                text-indent: 1rem;
            }

            /* Remove spinner buttons */
            input[type="number"]::-webkit-inner-spin-button,
            input[type="number"]::-webkit-outer-spin-button {
                -webkit-appearance: none;
                margin: 0;
            }

            input[type="number"] {
                -moz-appearance: textfield;
            }

            .button-group {
                display: flex;
                gap: 0;
            }

            .option-button {
                flex: 1;
                padding: 0.75rem 1rem;
                font-family: Verdana, sans-serif;
                font-size: 0.9375rem;
                font-weight: normal;
                color: #1b4c57;
                background-color: #edf2f7;
                border: 1px solid #e2e8f0;
                border-radius: 0;
                cursor: pointer;
                transition: all 0.2s ease;
                height: 48px;
                -webkit-user-select: none;
                user-select: none;
                outline: none;
            }

            .option-button:hover {
                background-color: #e2e8f0;
            }

            .option-button.selected {
                background-color: #1b4c57;
                border-color: #1b4c57;
                color: white;
            }

            .option-button:first-child {
                border-top-left-radius: 6px;
                border-bottom-left-radius: 6px;
            }

            .option-button:last-child {
                border-top-right-radius: 6px;
                border-bottom-right-radius: 6px;
            }

            .total-price-content {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                margin: 0 !important;
                padding: 0.5rem !important;
                background-color: #f7fafc !important;
                border-radius: 6px !important;
            }

            .total-cost {
                font-size: 2em !important;
                font-weight: 600 !important;
                margin-bottom: 0.5rem !important;
                font-family: Verdana, sans-serif !important;
                line-height: 1.2 !important;
            }

            .price-details {
                display: flex !important;
                flex-direction: column !important;
                width: 100% !important;
                text-align: center !important;
                font-size: 14px !important;
                font-family: Verdana, sans-serif !important;
            }

            .price-details div:first-child {
                margin-bottom: 0.125rem !important;
            }

            .price-details div:last-child {
                margin-bottom: 0.5rem !important;
            }

            #terra-tag-calculator .total-price {
                color: #1b4c57 !important;
                text-align: center !important;
                font-family: Verdana, sans-serif !important;
            }

            .action-buttons {
                margin-top: 1.5rem;
                display: none;
            }

            .action-buttons .button-group {
                display: flex;
                gap: 0;
                justify-content: center;
                width: 100%;
            }

            .action-button {
                flex: 1;
                padding: 0.75rem 1rem;
                font-size: 1rem;
                font-weight: 600;
                color: #1b4c57;
                background-color: #edf2f7;
                border: 1px solid #e2e8f0;
                border-radius: 0;
                cursor: pointer;
                transition: all 0.2s ease;
                height: 48px;
                width: 100%;
            }

            .action-button:hover {
                background-color: #e2e8f0;
            }

            .action-button.selected {
                background-color: #1b4c57;
                border-color: #1b4c57;
                color: white;
            }

            .action-button:first-child {
                border-top-left-radius: 6px;
                border-bottom-left-radius: 6px;
            }

            .action-button:last-child {
                border-top-right-radius: 6px;
                border-bottom-right-radius: 6px;
            }

            @media (max-width: 640px) {
                .calculator-container {
                    margin: 1rem;
                    padding: 1.5rem;
                }

                .button-group {
                    flex-direction: column;
                }

                .option-button {
                    width: 100%;
                    border-radius: 0;
                }

                .option-button:first-child {
                    border-radius: 6px 6px 0 0;
                }

                .option-button:last-child {
                    border-radius: 0 0 6px 6px;
                }

                .action-buttons .button-group {
                    flex-direction: column;
                    align-items: stretch;
                }

                .action-button {
                    width: 100%;
                    border-radius: 0;
                }

                .action-button:first-child {
                    border-radius: 6px 6px 0 0;
                }

                .action-button:last-child {
                    border-radius: 0 0 6px 6px;
                }
            }

            .form-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }

            .form-container {
                background-color: white;
                padding: 2rem;
                border-radius: 8px;
                width: 100%;
                max-width: 500px;
                margin: 1rem;
            }

            .form-container h2 {
                font-family: Verdana, sans-serif;
                font-size: 1.5rem;
                font-weight: normal;
                color: #1b4c57;
                text-align: center;
                margin-bottom: 1.5rem;
            }

            #card-element {
                padding: 1rem;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                background-color: white;
            }

            #card-errors {
                color: #dc2626;
                font-size: 0.875rem;
                margin-top: 0.5rem;
                margin-bottom: 1rem;
            }
        `;

        document.head.appendChild(styles);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWidget);
    } else {
        initWidget();
    }
})(); 