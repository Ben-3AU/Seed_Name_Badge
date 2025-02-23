// Terra Tag Calculator Widget

(() => {
    // Configuration
    const config = {
        BASE_URL: 'https://seednamebadge.vercel.app'
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
            if (printedSides === 'double') totalPrice += (size === 'A7' ? 0.50 : 1.00) * totalQuantity;
            if (inkCoverage === 'over40') totalPrice += (size === 'A7' ? 0.50 : 1.00) * totalQuantity;
            if (lanyards === 'no') totalPrice -= 0.50 * totalQuantity;

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

            if (shipping === 'express') shippingCost *= 2;
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
        currentView: 'calculator',
        stripe: null,
        elements: null,
        paymentElement: null,
        calculator: Calculator
    };

    // Initialize widget
    async function initWidget() {
        try {
            await loadDependencies();
            await initializeServices();
            injectStyles();
            createWidgetStructure();
            setupEventListeners();
        } catch (error) {
            console.error('Widget initialization error:', error);
        }
    }

    // Load external dependencies
    async function loadDependencies() {
        await Promise.all([
            loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/umd/supabase.min.js'),
            loadScript('https://js.stripe.com/v3/')
        ]);
    }

    // Helper function to load scripts
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Initialize services with secure configuration
    async function initializeServices() {
        try {
            // Fetch configuration from server
            const response = await fetch(`${config.BASE_URL}/api/config`);
            if (!response.ok) {
                throw new Error('Failed to fetch configuration');
            }
            const serviceConfig = await response.json();

            // Initialize Stripe
            state.stripe = Stripe(serviceConfig.stripePublicKey);

            // Initialize Supabase
            window.widgetSupabase = supabase.createClient(
                serviceConfig.supabaseUrl,
                serviceConfig.supabaseKey
            );
        } catch (error) {
            console.error('Error initializing services:', error);
            throw error;
        }
    }

    // Inject styles
    function injectStyles() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `${config.BASE_URL}/main.css`;
        document.head.appendChild(link);
    }

    // Create widget structure
    function createWidgetStructure() {
        const container = document.getElementById('terra-tag-calculator');
        if (!container) return;

        container.innerHTML = `
            <div class="terra-tag-widget">
                <div class="widget-view calculator-view active">
                    <h1 class="calculator-heading">Minimum order of 75</h1>
                    <form id="calculatorForm" class="calculator-form">
                        <!-- Quantity inputs -->
                        <div class="form-group">
                            <label for="quantityWithGuests">Enter quantity with guest details printed</label>
                            <input type="number" id="quantityWithGuests" name="quantityWithGuests" min="0" placeholder="0">
                        </div>
                        <div class="form-group">
                            <label for="quantityWithoutGuests">Enter quantity without guest details printed</label>
                            <input type="number" id="quantityWithoutGuests" name="quantityWithoutGuests" min="0" placeholder="0">
                        </div>

                        <!-- Options -->
                        <div class="form-group">
                            <label>Size</label>
                            <div class="button-group">
                                <button type="button" class="option-button selected" data-name="size" data-value="A7">A7</button>
                                <button type="button" class="option-button" data-name="size" data-value="A6">A6</button>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Printed sides</label>
                            <div class="button-group">
                                <button type="button" class="option-button selected" data-name="printedSides" data-value="single">Single sided</button>
                                <button type="button" class="option-button" data-name="printedSides" data-value="double">Double sided</button>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Ink coverage</label>
                            <div class="button-group">
                                <button type="button" class="option-button selected" data-name="inkCoverage" data-value="upTo40">Up to 40%</button>
                                <button type="button" class="option-button" data-name="inkCoverage" data-value="over40">Over 40%</button>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Lanyards included</label>
                            <div class="button-group">
                                <button type="button" class="option-button selected" data-name="lanyards" data-value="yes">Yes</button>
                                <button type="button" class="option-button" data-name="lanyards" data-value="no">No</button>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Shipping</label>
                            <div class="button-group">
                                <button type="button" class="option-button selected" data-name="shipping" data-value="standard">Standard</button>
                                <button type="button" class="option-button" data-name="shipping" data-value="express">Express</button>
                            </div>
                        </div>

                        <!-- Total price display -->
                        <div id="totalPrice" class="total-price"></div>

                        <!-- Action buttons -->
                        <div id="actionButtons" class="action-buttons" style="display: none;">
                            <div class="button-group">
                                <button type="button" class="action-button" id="orderNowBtn">Order Now</button>
                                <button type="button" class="action-button" id="emailQuoteBtn">Email the quote</button>
                            </div>
                        </div>

                        <!-- Forms -->
                        <div id="emailQuoteForm" class="additional-form" style="display: none;">
                            <div class="form-group">
                                <label for="quoteFirstName">First name</label>
                                <input type="text" id="quoteFirstName" name="quoteFirstName" required>
                            </div>
                            <div class="form-group">
                                <label for="quoteEmail">Email</label>
                                <input type="email" id="quoteEmail" name="quoteEmail" required>
                            </div>
                            <button type="button" class="submit-button" id="submitQuoteBtn" disabled>
                                <div class="button-content">
                                    <div class="spinner"></div>
                                    <span>Submit</span>
                                </div>
                            </button>
                            <div id="quoteSuccessMessage" class="quote-success-message">Quote sent! Please check your inbox.</div>
                        </div>

                        <div id="orderForm" class="additional-form" style="display: none;">
                            <div class="form-group">
                                <label for="orderFirstName">First name</label>
                                <input type="text" id="orderFirstName" name="orderFirstName" required>
                            </div>
                            <div class="form-group">
                                <label for="orderLastName">Last name</label>
                                <input type="text" id="orderLastName" name="orderLastName" required>
                            </div>
                            <div class="form-group">
                                <label for="orderCompany">Company</label>
                                <input type="text" id="orderCompany" name="orderCompany">
                            </div>
                            <div class="form-group">
                                <label for="orderEmail">Email</label>
                                <input type="email" id="orderEmail" name="orderEmail" required>
                            </div>
                            <div class="form-group">
                                <label>Paper type</label>
                                <div class="button-group">
                                    <button type="button" class="option-button" data-name="paperType" data-value="mixedHerb">Mixed herb</button>
                                    <button type="button" class="option-button" data-name="paperType" data-value="mixedFlower">Mixed flower</button>
                                    <button type="button" class="option-button" data-name="paperType" data-value="randomMix">Random mix</button>
                                </div>
                            </div>
                            <button type="button" class="submit-button" id="payNowBtn" disabled>
                                <div class="button-content">
                                    <div class="spinner"></div>
                                    <span>Checkout</span>
                                </div>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    // Setup event listeners
    function setupEventListeners() {
        const widget = document.querySelector('.terra-tag-widget');
        if (!widget) return;

        // Prevent form submission
        widget.querySelector('#calculatorForm').addEventListener('submit', e => e.preventDefault());

        // Add quantity input listeners
        widget.querySelector('#quantityWithGuests').addEventListener('input', updateDisplay);
        widget.querySelector('#quantityWithoutGuests').addEventListener('input', updateDisplay);

        // Add button click listeners
        widget.querySelectorAll('.option-button').forEach(button => {
            button.addEventListener('click', e => {
                e.preventDefault();
                const buttonGroup = e.target.closest('.button-group');
                buttonGroup.querySelectorAll('.option-button').forEach(btn => {
                    btn.classList.remove('selected');
                });
                e.target.classList.add('selected');
                updateDisplay();
                if (e.target.getAttribute('data-name') === 'paperType') {
                    validateOrderForm();
                }
            });
        });

        // Add form handlers
        setupFormHandlers(widget);
    }

    // Setup form handlers
    function setupFormHandlers(widget) {
        const emailQuoteBtn = widget.querySelector('#emailQuoteBtn');
        const orderNowBtn = widget.querySelector('#orderNowBtn');
        const emailQuoteForm = widget.querySelector('#emailQuoteForm');
        const orderForm = widget.querySelector('#orderForm');

        emailQuoteBtn.addEventListener('click', () => {
            emailQuoteForm.style.display = 'block';
            orderForm.style.display = 'none';
            emailQuoteBtn.classList.add('selected');
            orderNowBtn.classList.remove('selected');
        });

        orderNowBtn.addEventListener('click', () => {
            orderForm.style.display = 'block';
            emailQuoteForm.style.display = 'none';
            orderNowBtn.classList.add('selected');
            emailQuoteBtn.classList.remove('selected');
        });

        // Form validation
        emailQuoteForm.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', validateEmailQuoteForm);
        });

        orderForm.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', validateOrderForm);
        });

        // Submit handlers
        widget.querySelector('#submitQuoteBtn').addEventListener('click', handleQuoteSubmission);
        widget.querySelector('#payNowBtn').addEventListener('click', handleOrderSubmission);
    }

    // Update display based on calculator state
    function updateDisplay() {
        const widget = document.querySelector('.terra-tag-widget');
        const values = getFormValues();
        const totalQuantity = Calculator.getTotalQuantity(values.withGuests, values.withoutGuests);
        
        const totalPriceDiv = widget.querySelector('#totalPrice');
        const actionButtons = widget.querySelector('#actionButtons');
        const emailQuoteForm = widget.querySelector('#emailQuoteForm');
        const orderForm = widget.querySelector('#orderForm');

        if (totalQuantity < 75) {
            totalPriceDiv.style.display = 'none';
            actionButtons.style.display = 'none';
            emailQuoteForm.style.display = 'none';
            orderForm.style.display = 'none';
        } else {
            const totalPrice = Calculator.getTotalPrice(values);
            const gst = Calculator.getGST(totalPrice);
            const co2Savings = Calculator.getCO2Savings(totalQuantity);

            totalPriceDiv.innerHTML = `
                <div class="total-price-content">
                    <div class="total-cost">Total Cost: $${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div class="price-details">
                        <div>GST Included: $${gst.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div>CO2 emissions saved: ${co2Savings.toFixed(2)} kg</div>
                    </div>
                </div>
            `;
            totalPriceDiv.style.display = 'block';
            actionButtons.style.display = 'block';
        }
    }

    // Get form values
    function getFormValues() {
        const widget = document.querySelector('.terra-tag-widget');
        return {
            withGuests: parseInt(widget.querySelector('#quantityWithGuests').value) || 0,
            withoutGuests: parseInt(widget.querySelector('#quantityWithoutGuests').value) || 0,
            size: getSelectedValue('size'),
            printedSides: getSelectedValue('printedSides'),
            inkCoverage: getSelectedValue('inkCoverage'),
            lanyards: getSelectedValue('lanyards'),
            shipping: getSelectedValue('shipping')
        };
    }

    // Get selected value helper
    function getSelectedValue(name) {
        const selected = document.querySelector(`.terra-tag-widget .option-button.selected[data-name="${name}"]`);
        return selected ? selected.getAttribute('data-value') : null;
    }

    // Form validation helpers
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function validateEmailQuoteForm() {
        const widget = document.querySelector('.terra-tag-widget');
        const firstName = widget.querySelector('#quoteFirstName').value.trim();
        const email = widget.querySelector('#quoteEmail').value.trim();
        widget.querySelector('#submitQuoteBtn').disabled = !(firstName && isValidEmail(email));
    }

    function validateOrderForm() {
        const firstName = document.getElementById('orderFirstName').value.trim();
        const lastName = document.getElementById('orderLastName').value.trim();
        const email = document.getElementById('orderEmail').value.trim();
        const paperType = getSelectedValue('paperType');
        
        const isValidEmail = (email) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        };
        
        document.getElementById('payNowBtn').disabled = !(firstName && lastName && isValidEmail(email) && paperType);
    }

    // Handle quote submission
    async function handleQuoteSubmission(event) {
        event.preventDefault();
        
        const submitButton = document.querySelector('#submitQuoteBtn');
        submitButton.classList.add('loading');
        
        const values = getFormValues();
        const totalPrice = Calculator.getTotalPrice(values);
        const gstAmount = Calculator.getGST(totalPrice);
        const totalQuantity = Calculator.getTotalQuantity(values.withGuests, values.withoutGuests);
        
        const quoteData = {
            quantity_with_guests: values.withGuests,
            quantity_without_guests: values.withoutGuests,
            size: values.size,
            printed_sides: values.printedSides,
            ink_coverage: values.inkCoverage,
            lanyards: values.lanyards === 'yes',
            shipping: values.shipping,
            first_name: document.querySelector('#quoteFirstName').value.trim(),
            email: document.querySelector('#quoteEmail').value.trim(),
            total_quantity: totalQuantity,
            total_cost: Number(totalPrice.toFixed(2)),
            gst_amount: Number(gstAmount.toFixed(2)),
            co2_savings: Calculator.getCO2Savings(totalQuantity),
            email_sent: false
        };

        try {
            const response = await fetch(`${config.BASE_URL}/api/submit-quote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(quoteData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to process quote');
            }

            const successMessage = document.querySelector('#quoteSuccessMessage');
            successMessage.classList.add('visible');
            setTimeout(() => successMessage.classList.remove('visible'), 3000);
            
        } catch (error) {
            console.error('Error sending quote:', error);
            alert('Error sending quote. Please try again.');
        } finally {
            submitButton.classList.remove('loading');
        }
    }

    // Handle order submission
    async function handleOrderSubmission(event) {
        event.preventDefault();
        
        const payNowBtn = document.querySelector('#payNowBtn');
        payNowBtn.classList.add('loading');
        
        const values = getFormValues();
        const totalPrice = Calculator.getTotalPrice(values);
        const gstAmount = Calculator.getGST(totalPrice);
        const totalQuantity = Calculator.getTotalQuantity(values.withGuests, values.withoutGuests);
        
        const orderData = {
            quantity_with_guests: values.withGuests,
            quantity_without_guests: values.withoutGuests,
            size: values.size,
            printed_sides: values.printedSides,
            ink_coverage: values.inkCoverage,
            lanyards: values.lanyards === 'yes',
            shipping: values.shipping,
            paper_type: getSelectedValue('paperType'),
            first_name: document.querySelector('#orderFirstName').value.trim(),
            last_name: document.querySelector('#orderLastName').value.trim(),
            company: document.querySelector('#orderCompany').value.trim(),
            email: document.querySelector('#orderEmail').value.trim(),
            total_quantity: totalQuantity,
            total_cost: Number(totalPrice.toFixed(2)),
            gst_amount: Number(gstAmount.toFixed(2)),
            co2_savings: Calculator.getCO2Savings(totalQuantity)
        };

        try {
            const response = await fetch(`${config.BASE_URL}/api/create-payment-intent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderData })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create payment intent');
            }

            const { clientSecret } = await response.json();
            
            // Initialize Stripe
            const stripe = Stripe(window.stripePublicKey);
            
            // Redirect to Stripe Checkout
            const result = await stripe.redirectToCheckout({
                sessionId: clientSecret
            });

            if (result.error) {
                throw result.error;
            }
        } catch (error) {
            console.error('Error processing order:', error);
            alert('Error processing order: ' + (error.message || 'Unknown error'));
            payNowBtn.classList.remove('loading');
        }
    }

    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWidget);
    } else {
        initWidget();
    }
})(); 