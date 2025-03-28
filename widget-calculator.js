// Calculator functionality
let BASE_URL;  // Declare BASE_URL at the top level
let elements;
let paymentElement;

function initializeCalculator(baseUrl) {
    // Store the base URL
    BASE_URL = baseUrl;  // Assign to the top-level variable

    // Get the widget container and wrap it in the isolation container
    const widgetContainer = document.querySelector('.terra-tag-widget');
    const isolatedWrapper = document.createElement('div');
    isolatedWrapper.className = 'isolated-widget';
    widgetContainer.parentNode.insertBefore(isolatedWrapper, widgetContainer);
    isolatedWrapper.appendChild(widgetContainer);

    // Initialize Supabase
    const supabaseUrl = 'https://pxxqvjxmzmsqunrhegcq.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4eHF2anhtem1zcXVucmhlZ2NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg0NDk0NTcsImV4cCI6MjA1NDAyNTQ1N30.5CUbSb2OR9H4IrGHx_vxmIPZCWN8x7TYoG5RUeYAehM';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    
    // Expose Supabase client globally for script.js to use
    window.widgetSupabase = supabase;

    // Initialize Stripe with the key (using the already loaded Stripe.js)
    const stripe = Stripe('pk_live_51PU4ZkFyte3lbtucdgGucWHujvqpFePwORDTuyJ3OzdyI387Iyu7IZwiSECKP6gxWkm0P3YUsx4qKKFWYI2ctLlf00tl9X8um6');

    // Get form elements early
    const emailQuoteForm = widgetContainer.querySelector('.additional-form#emailQuoteForm');
    const orderForm = widgetContainer.querySelector('.additional-form#orderForm');
    const actionButtons = widgetContainer.querySelector('#actionButtons');

    // Ensure forms are hidden initially
    if (emailQuoteForm) emailQuoteForm.classList.add('hidden');
    if (orderForm) orderForm.classList.add('hidden');
    if (actionButtons) actionButtons.style.display = 'none';

    // Core calculation functions
    function calculateTotalQuantity() {
        const withGuests = parseInt(document.querySelector('.terra-tag-widget #quantityWithGuests').value) || 0;
        const withoutGuests = parseInt(document.querySelector('.terra-tag-widget #quantityWithoutGuests').value) || 0;
        return withGuests + withoutGuests;
    }

    function getSelectedValue(name) {
        const selected = document.querySelector(`.terra-tag-widget .option-button.selected[data-name="${name}"]`);
        return selected ? selected.getAttribute('data-value') : null;
    }

    function calculateTotalPrice() {
        const totalQuantity = calculateTotalQuantity();
        const withGuests = parseInt(document.querySelector('.terra-tag-widget #quantityWithGuests').value) || 0;
        const withoutGuests = parseInt(document.querySelector('.terra-tag-widget #quantityWithoutGuests').value) || 0;
        let totalPrice = (withGuests * 6) + (withoutGuests * 5);

        if (totalQuantity > 300) totalPrice -= 0.50 * totalQuantity;

        const size = getSelectedValue('size');
        const printedSides = getSelectedValue('printedSides');
        const inkCoverage = getSelectedValue('inkCoverage');
        const lanyards = getSelectedValue('lanyards');
        const shipping = getSelectedValue('shipping');

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
    }

    function calculateGST(totalPrice) {
        return totalPrice / 11;
    }

    function calculateCO2Savings() {
        return calculateTotalQuantity() * 0.11;
    }

    // Initialize display state
    updateDisplay();

    // Display function
    function updateDisplay() {
        const totalQuantity = calculateTotalQuantity();
        const totalPriceDiv = document.querySelector('.terra-tag-widget #totalPrice');
        const actionButtons = document.querySelector('.terra-tag-widget #actionButtons');
        const emailQuoteForm = document.querySelector('.terra-tag-widget .additional-form#emailQuoteForm');
        const orderForm = document.querySelector('.terra-tag-widget .additional-form#orderForm');

        if (totalQuantity < 80) {
            totalPriceDiv.classList.remove('show');
            actionButtons.style.display = 'none';
            emailQuoteForm.classList.add('hidden');
            orderForm.classList.add('hidden');
        } else {
            const totalPrice = calculateTotalPrice();
            const gstAmount = calculateGST(totalPrice);
            const co2Savings = calculateCO2Savings();

            totalPriceDiv.innerHTML = `
                <div class="total-price-container">
                    <div class="total-cost">Total Cost: $${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }).format(totalPrice)}</div>
                    <div class="gst-amount">GST Included: $${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }).format(gstAmount)}</div>
                    <div class="co2-savings">CO2 emissions saved: ${co2Savings.toFixed(2)} kg</div>
                </div>
            `;
            totalPriceDiv.classList.add('show');
            actionButtons.style.display = 'block';
        }
    }

    // Event Listeners
    const widget = document.querySelector('.terra-tag-widget');
    
    // Prevent form submission
    widget.querySelector('#calculatorForm').addEventListener('submit', e => e.preventDefault());

    // Add quantity input listeners
    widget.querySelector('#quantityWithGuests').addEventListener('input', updateDisplay);
    widget.querySelector('#quantityWithoutGuests').addEventListener('input', updateDisplay);

    // Add button click listeners for all option buttons
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

    // Add email quote button handler
    const emailQuoteBtn = widget.querySelector('#emailQuoteBtn');
    const orderNowBtn = widget.querySelector('#orderNowBtn');

    emailQuoteBtn.addEventListener('click', () => {
        // Track email quote button click
        trackWidgetEvent('quote_form_open', {
            'event_category': 'widget_interaction',
            'event_label': 'Email Quote Form Opened'
        });

        emailQuoteForm.classList.remove('hidden');
        orderForm.classList.add('hidden');
        emailQuoteBtn.classList.add('selected');
        orderNowBtn.classList.remove('selected');
    });

    orderNowBtn.addEventListener('click', () => {
        // Track order now button click
        trackWidgetEvent('order_form_open', {
            'event_category': 'widget_interaction',
            'event_label': 'Order Form Opened'
        });

        orderForm.classList.remove('hidden');
        emailQuoteForm.classList.add('hidden');
        orderNowBtn.classList.add('selected');
        emailQuoteBtn.classList.remove('selected');
    });

    // Function to validate email format
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Function to validate email quote form
    function validateEmailQuoteForm() {
        const firstName = widget.querySelector('.additional-form#emailQuoteForm #quoteFirstName').value.trim();
        const email = widget.querySelector('.additional-form#emailQuoteForm #quoteEmail').value.trim();
        widget.querySelector('#submitQuoteBtn').disabled = !(firstName && isValidEmail(email));
    }

    // Function to validate order form
    function validateOrderForm() {
        const firstName = widget.querySelector('.additional-form#orderForm #orderFirstName').value.trim();
        const lastName = widget.querySelector('.additional-form#orderForm #orderLastName').value.trim();
        const email = widget.querySelector('.additional-form#orderForm #orderEmail').value.trim();
        const paperType = getSelectedValue('paperType');
        widget.querySelector('#payNowBtn').disabled = !(firstName && lastName && isValidEmail(email) && paperType);
    }

    // Add form validation listeners
    widget.querySelector('.additional-form#emailQuoteForm').querySelectorAll('input').forEach(input => {
        input.addEventListener('input', validateEmailQuoteForm);
    });

    widget.querySelector('.additional-form#orderForm').querySelectorAll('input').forEach(input => {
        input.addEventListener('input', validateOrderForm);
    });

    // Add button content structure to submit buttons with proper spinner HTML
    const submitQuoteBtn = widget.querySelector('#submitQuoteBtn');
    submitQuoteBtn.innerHTML = `
        <div class="button-content">
            <div class="spinner"></div>
            <span>Submit</span>
        </div>
    `;

    const payNowBtn = widget.querySelector('#payNowBtn');
    payNowBtn.innerHTML = `
        <div class="button-content">
            <div class="spinner"></div>
            <span>Checkout</span>
        </div>
    `;

    // Add GA tracking function
    function trackWidgetEvent(eventName, eventParams = {}) {
        // Check if gtag is available
        if (typeof window.gtag === 'function') {
            gtag('event', eventName, {
                ...eventParams,
                'send_to': 'G-48WMB90XSP'  // Widget stream measurement ID
            });
        }
    }

    // Handle quote submission
    submitQuoteBtn.addEventListener('click', async function(event) {
        // Track the quote submission attempt
        trackWidgetEvent('quote_submit', {
            'event_category': 'widget_interaction',
            'event_label': 'Quote Requested'
        });

        event.preventDefault();
        
        // Show spinner and change text
        submitQuoteBtn.classList.add('loading');
        submitQuoteBtn.querySelector('span').textContent = 'Sending';
        
        const totalCost = calculateTotalPrice();
        const gstAmount = calculateGST(totalCost);
        
        const quoteData = {
            quantity_with_guests: parseInt(document.querySelector('.terra-tag-widget #quantityWithGuests').value) || 0,
            quantity_without_guests: parseInt(document.querySelector('.terra-tag-widget #quantityWithoutGuests').value) || 0,
            size: getSelectedValue('size'),
            printed_sides: getSelectedValue('printedSides'),
            ink_coverage: getSelectedValue('inkCoverage'),
            lanyards: getSelectedValue('lanyards') === 'yes',
            shipping: getSelectedValue('shipping'),
            first_name: document.querySelector('.terra-tag-widget #quoteFirstName').value.trim(),
            email: document.querySelector('.terra-tag-widget #quoteEmail').value.trim(),
            total_quantity: calculateTotalQuantity(),
            total_cost: Number(totalCost.toFixed(2)),
            gst_amount: Number(gstAmount.toFixed(2)),
            co2_savings: calculateCO2Savings(),
            email_sent: false
        };

        try {
            console.log('Submitting quote data:', quoteData);
            // Submit for email processing
            const response = await fetch(`${BASE_URL}/api/v1/submit-quote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ quoteData })
            });

            let responseData;
            try {
                responseData = await response.json();
            } catch (parseError) {
                console.error('Error parsing response:', parseError);
                throw new Error('Server error occurred. Please try again.');
            }

            if (!response.ok) {
                throw new Error(responseData.error || 'Failed to process quote. Please try again.');
            }

            console.log('Quote submission result:', responseData);

            // Show success message
            const successMessage = document.querySelector('.terra-tag-widget #quoteSuccessMessage');
            successMessage.textContent = 'Quote sent! Please check your inbox';
            successMessage.classList.add('visible');
            
            // Hide success message after 3 seconds
            setTimeout(() => {
                successMessage.classList.remove('visible');
            }, 3000);
            
        } catch (error) {
            console.error('Error submitting quote:', error);
            alert(error.message || 'Failed to send quote. Please try again.');
        } finally {
            // Restore button state
            submitQuoteBtn.classList.remove('loading');
            submitQuoteBtn.querySelector('span').textContent = 'Submit';
        }
    });

    // Handle order submission
    payNowBtn.addEventListener('click', handleOrderSubmission);

    // Payment related functions
    async function initializePaymentElement(clientSecret, orderData) {
        if (!clientSecret) {
            throw new Error('Client secret is required to initialize payment element');
        }

        const appearance = {
            theme: 'stripe',
            variables: {
                colorPrimary: '#1b4c57',
                colorBackground: '#ffffff',
                colorText: '#1b4c57',
                colorDanger: '#df1b41',
                fontFamily: '"Ideal Sans", system-ui, sans-serif',
                spacingUnit: '4px',
                spacingGridRow: '16px',
                fontSizeBase: '16px',
                fontSizeSm: '16px',
                spacingTab: '3px'
            },
            rules: {
                '.Label': {
                    color: '#30313d',
                    fontFamily: '"Ideal Sans", system-ui, sans-serif',
                    fontSize: '0.9em',
                    marginBottom: '3px',
                    fontWeight: 'normal'
                },
                '.Input': {
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    fontSize: '16px',
                    colorText: '#1b4c57',
                    fontFamily: '"Ideal Sans", system-ui, sans-serif'
                }
            }
        };

        elements = stripe.elements({ 
            appearance, 
            clientSecret,
            loader: 'never'
        });
        
        // Create and mount the payment element
        paymentElement = elements.create('payment', {
            layout: {
                type: 'tabs',
                defaultCollapsed: false
            },
            wallets: {
                googlePay: 'auto'
            },
            fields: {
                billingDetails: {
                    name: 'never'
                }
            }
        });
        
        // Get the views
        const calculatorView = widget.querySelector('.calculator-view');
        const paymentView = widget.querySelector('.payment-view');
        
        if (!calculatorView || !paymentView) {
            throw new Error('Required views not found');
        }

        // Update the payment view HTML structure
        paymentView.innerHTML = `
            <div class="payment-container">
                <a href="#" class="back-link">← Back</a>
                
                <div class="order-details">
                    <h2>Order Summary</h2>
                    <div class="order-summary">
                        <div class="summary-row">
                            <div class="label">Name:</div>
                            <div class="value">${orderData.first_name} ${orderData.last_name}</div>
                        </div>
                        
                        <div class="summary-row">
                            <div class="label">Company:</div>
                            <div class="value">${orderData.company}</div>
                        </div>
                        
                        <div class="summary-row">
                            <div class="label">Email:</div>
                            <div class="value">${orderData.email}</div>
                        </div>
                        
                        <div class="summary-row">
                            <div class="label">Qty with guest details:</div>
                            <div class="value">${orderData.quantity_with_guests}</div>
                        </div>
                        
                        <div class="summary-row">
                            <div class="label">Qty without guest details:</div>
                            <div class="value">${orderData.quantity_without_guests}</div>
                        </div>
                        
                        <div class="summary-row">
                            <div class="label">Total quantity:</div>
                            <div class="value">${orderData.total_quantity}</div>
                        </div>
                        
                        <div class="summary-row">
                            <div class="label">Size:</div>
                            <div class="value">${orderData.size}</div>
                        </div>
                        
                        <div class="summary-row">
                            <div class="label">Printed sides:</div>
                            <div class="value">${orderData.printed_sides === 'double' ? 'Double sided' : 'Single sided'}</div>
                        </div>
                        
                        <div class="summary-row">
                            <div class="label">Ink coverage:</div>
                            <div class="value">${orderData.ink_coverage === 'over40' ? 'Over 40%' : 'Up to 40%'}</div>
                        </div>
                        
                        <div class="summary-row">
                            <div class="label">Lanyards:</div>
                            <div class="value">${orderData.lanyards ? 'Yes' : 'No'}</div>
                        </div>
                        
                        <div class="summary-row">
                            <div class="label">Shipping:</div>
                            <div class="value">${orderData.shipping.charAt(0).toUpperCase() + orderData.shipping.slice(1)}</div>
                        </div>
                        
                        <div class="summary-row">
                            <div class="label">Paper type:</div>
                            <div class="value">${orderData.paper_type.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, str => str.toUpperCase())}</div>
                        </div>
                    </div>
                    <div class="total-amount">Total: $${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }).format(orderData.total_cost)}</div>
                </div>

                <form id="payment-form">
                    <div class="card-name-group">
                        <label for="card-name">Name on card</label>
                        <input id="card-name" type="text" required>
                    </div>
                    <div id="payment-element"></div>
                    <button id="submit-payment" class="payment-button">
                        <div class="spinner" id="spinner"></div>
                        <span id="button-text">Pay now</span>
                    </button>
                    <div id="payment-message"></div>
                </form>
            </div>
        `;

        // Hide calculator view and show payment view
        calculatorView.style.display = 'none';
        paymentView.style.display = 'block';
        
        // Scroll to top of widget
        widget.scrollIntoView({ behavior: 'smooth' });
        
        // Mount the payment element
        const paymentElementMount = paymentView.querySelector('#payment-element');
        if (!paymentElementMount) {
            throw new Error('Payment element mount point not found');
        }

        paymentElement.mount('#payment-element');
        
        // Add event listener to the submit button
        const submitButton = paymentView.querySelector('#submit-payment');
        if (submitButton) {
            submitButton.addEventListener('click', handlePaymentSubmission);
        }

        // Add event listener to the back link
        const backLink = paymentView.querySelector('.back-link');
        if (backLink) {
            backLink.addEventListener('click', (e) => {
                e.preventDefault();
                paymentView.style.display = 'none';
                calculatorView.style.display = 'block';
            });
        }
    }

    async function handlePaymentSubmission(e) {
        e.preventDefault();

        // Calculate total cost
        const totalCost = calculateTotalPrice();

        // Track the pay now button click with revenue information
        trackWidgetEvent('payment_submit', {
            'event_category': 'widget_interaction',
            'event_label': 'Payment Submitted',
            'value': totalCost,  // Total amount including GST
            'currency': 'AUD',
            'items': [{
                'item_name': 'Terra Tag Order',
                'price': totalCost,
                'quantity': 1
            }]
        });

        setLoading(true);

        const cardName = widget.querySelector('#card-name').value;
        if (!cardName) {
            showMessage('Please enter the name on your card.');
            setLoading(false);
            return;
        }

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                payment_method_data: {
                    billing_details: {
                        name: cardName,
                    },
                },
            },
            redirect: 'if_required'
        });

        if (error) {
            showMessage(error.message);
            setLoading(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            // Hide payment view and show success view
            const paymentView = widget.querySelector('.payment-view');
            const successView = widget.querySelector('.success-view');
            
            if (paymentView && successView) {
                paymentView.style.display = 'none';
                successView.style.display = 'block';
                // Scroll to top of widget
                widget.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }

    function setLoading(isLoading) {
        const submitButton = widget.querySelector('#submit-payment');
        const spinner = widget.querySelector('#spinner');
        const buttonText = widget.querySelector('#button-text');

        if (submitButton && spinner && buttonText) {
            if (isLoading) {
                submitButton.disabled = true;
                spinner.style.display = 'inline-block';
                buttonText.textContent = 'Processing...';
            } else {
                submitButton.disabled = false;
                spinner.style.display = 'none';
                buttonText.textContent = 'Pay now';
            }
        }
    }

    function showMessage(messageText) {
        const messageContainer = widget.querySelector('#payment-message');
        if (messageContainer) {
            messageContainer.textContent = messageText;
            messageContainer.style.display = 'block';
            setTimeout(() => {
                messageContainer.style.display = 'none';
                messageContainer.textContent = '';
            }, 4000);
        }
    }

    function showPaymentView() {
        const calculatorView = document.querySelector('.calculator-view');
        const paymentView = document.querySelector('.payment-view');
        calculatorView.classList.remove('active');
        paymentView.classList.add('active');
        const widget = document.querySelector('.terra-tag-widget');
        widget.scrollIntoView({ behavior: 'smooth' });
    }

    // Initial display update
    async function handleOrderSubmission(event) {
        event.preventDefault();
        
        // Track the checkout button click
        trackWidgetEvent('checkout_click', {
            'event_category': 'widget_interaction',
            'event_label': 'Checkout Button Clicked'
        });

        // Show spinner and change text
        payNowBtn.classList.add('loading');
        payNowBtn.querySelector('span').textContent = 'Processing';
        
        const totalCost = calculateTotalPrice();
        const gstAmount = calculateGST(totalCost);
        
        const orderData = {
            quantity_with_guests: parseInt(document.querySelector('.terra-tag-widget #quantityWithGuests').value) || 0,
            quantity_without_guests: parseInt(document.querySelector('.terra-tag-widget #quantityWithoutGuests').value) || 0,
            size: getSelectedValue('size'),
            printed_sides: getSelectedValue('printedSides'),
            ink_coverage: getSelectedValue('inkCoverage'),
            lanyards: getSelectedValue('lanyards') === 'yes',
            shipping: getSelectedValue('shipping'),
            paper_type: getSelectedValue('paperType'),
            first_name: document.querySelector('.terra-tag-widget #orderFirstName').value.trim(),
            last_name: document.querySelector('.terra-tag-widget #orderLastName').value.trim(),
            company: document.querySelector('.terra-tag-widget #orderCompany').value.trim(),
            email: document.querySelector('.terra-tag-widget #orderEmail').value.trim(),
            total_quantity: calculateTotalQuantity(),
            total_cost: Number(totalCost.toFixed(2)),
            gst_amount: Number(gstAmount.toFixed(2)),
            co2_savings: calculateCO2Savings(),
            payment_status: 'pending',
            email_sent: false
        };

        try {
            // Create a payment intent
            const response = await fetch(`${BASE_URL}/api/v1/create-payment-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ orderData })
            });

            let result;
            try {
                result = await response.json();
            } catch (parseError) {
                console.error('Error parsing response:', parseError);
                throw new Error('Server error occurred. Please try again.');
            }

            if (!response.ok) {
                throw new Error(result.error || 'Failed to process order. Please try again.');
            }

            console.log('Payment intent created:', result);

            // Initialize payment element with the client secret
            await initializePaymentElement(result.clientSecret, orderData);
            
            // Reset button state after successful initialization
            payNowBtn.classList.remove('loading');
            payNowBtn.innerHTML = `
                <div class="button-content">
                    <div class="spinner"></div>
                    <span>Checkout</span>
                </div>
            `;
            
        } catch (error) {
            console.error('Error processing order:', error);
            alert(error.message || 'Failed to process order. Please try again.');
            // Hide spinner and restore button text
            payNowBtn.classList.remove('loading');
            payNowBtn.querySelector('span').textContent = 'Checkout';
        }
    }

    updateDisplay();
}

// Create widget HTML structure
function createWidgetStructure() {
    // ... existing code ...

    // Payment view (initially hidden)
    const paymentView = document.createElement('div');
    paymentView.className = 'widget-view payment-view';
    paymentView.innerHTML = `
        <div class="payment-container">
            <h2>Complete your payment</h2>
            <form id="payment-form">
                <div id="card-name-container">
                    <label for="card-name">Name on card</label>
                    <input id="card-name" type="text" placeholder="Name on card" required>
                </div>
                <div id="payment-element">
                    <!-- Stripe Elements will be mounted here -->
                </div>
                <button id="submit-payment" class="payment-button">
                    <div class="spinner" id="spinner"></div>
                    <span id="button-text">Pay now</span>
                </button>
                <div id="payment-message"></div>
            </form>
        </div>
    `;

    // ... rest of the existing code ...
}

function injectStyles() {
    const styles = `
        /* Isolated Widget Wrapper */
        .isolated-widget {
            display: inline-block !important;
            vertical-align: top !important;
            flex: none !important;
            contain: layout style paint !important;
            isolation: isolate !important;
            height: auto !important;
            min-height: 0 !important;
            align-self: flex-start !important;
            position: relative !important;
            width: auto !important;
            max-width: 600px !important;
            margin: 0 !important;
            transform: translateZ(0) !important;
            -webkit-transform: translateZ(0) !important;
        }

        /* Base Widget Container Styles */
        html body .terra-tag-widget {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            display: inline-block !important;
            position: relative !important;
            z-index: 1 !important;
            float: none !important;
            flex: 0 0 auto !important;
            align-self: flex-start !important;
            grid-row: auto !important;
            overflow: visible !important;
            box-sizing: content-box !important;
            contain: layout style paint !important;
            isolation: isolate !important;
            width: 100% !important;
            max-width: 600px !important;
            margin: 0 !important;
            transform: translateZ(0) !important;
            -webkit-transform: translateZ(0) !important;
        }

        /* Squarespace-specific overrides */
        html body .sqs-block-content {
            height: auto !important;
            min-height: 0 !important;
            align-items: flex-start !important;
            display: block !important;
            position: relative !important;
            contain: layout style paint !important;
        }

        html body .sqs-block {
            height: auto !important;
            min-height: 0 !important;
            align-items: flex-start !important;
            display: block !important;
            position: relative !important;
            contain: layout style paint !important;
        }

        /* Additional Squarespace overrides */
        html body .sqs-block-content > div {
            height: auto !important;
            min-height: 0 !important;
            display: inline-block !important;
            vertical-align: top !important;
            position: relative !important;
        }

        html body .sqs-layout {
            align-items: flex-start !important;
        }

        /* Payment Form Styles - Kept separate as they're specific to payment */
        html body .terra-tag-widget .payment-container {
            max-width: 500px;
            margin: 0 auto;
            padding: 20px;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        html body .terra-tag-widget .card-name-group {
            margin-bottom: 24px;
            display: flex !important;
            flex-direction: column !important;
            gap: 3px !important;
        }

        html body .terra-tag-widget .card-name-group label {
            display: block !important;
            color: #30313d !important;
            font-family: "Ideal Sans", system-ui, sans-serif !important;
            font-size: 0.9em !important;
            font-weight: normal !important;
            line-height: 1.2 !important;
        }

        html body .terra-tag-widget .card-name-group input {
            width: 100% !important;
            padding: 12px !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 6px !important;
            font-size: 16px !important;
            font-family: "Ideal Sans", system-ui, sans-serif !important;
            background: #ffffff !important;
            transition: border-color 0.15s ease !important;
            box-shadow: 0px 1px 1px rgba(0, 0, 0, 0.03), 0px 3px 6px rgba(0, 0, 0, 0.02) !important;
        }

        /* Hide any duplicate or conflicting elements */
        html body .terra-tag-widget #card-name-container,
        html body .terra-tag-widget .card-name-field,
        html body .terra-tag-widget .card-name-label-wrapper,
        html body .terra-tag-widget .card-name-input-wrapper,
        html body .terra-tag-widget .stripe-label {
            display: none !important;
        }

        .terra-tag-widget .payment-button {
            background: #1b4c57;
            color: #ffffff;
            border: none;
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
            width: 100%;
        }

        .terra-tag-widget .payment-button:hover {
            background: #163f48;
        }

        .terra-tag-widget .payment-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .terra-tag-widget .payment-button .spinner {
            display: none;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s linear infinite;
            margin: 0;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .terra-tag-widget #payment-message {
            color: #dc2626;
            font-size: 14px;
            line-height: 20px;
            padding-top: 12px;
            text-align: center;
        }

        /* Update the styles section */
        .terra-tag-widget .card-name-field {
            margin-bottom: 24px;
            position: relative;
        }

        .terra-tag-widget .card-name-label-wrapper {
            position: relative;
            margin-bottom: 3px;
        }

        .terra-tag-widget .custom-label {
            display: block;
            color: #30313d;
            font-family: "Ideal Sans", system-ui, sans-serif;
            font-size: 14px;
            font-weight: normal;
            line-height: 20px;
            letter-spacing: normal;
            margin: 0;
            padding: 0;
        }

        .terra-tag-widget .card-name-input-wrapper {
            position: relative;
            margin-bottom: 24px;  /* Increased spacing to match Stripe's spacing */
        }

        .terra-tag-widget .custom-input {
            display: block;
            width: 100%;
            padding: 8px 12px;
            color: #30313d;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-family: "Ideal Sans", system-ui, sans-serif;
            font-size: 16px;
            line-height: 24px;
            outline: none;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .terra-tag-widget .custom-input:focus {
            border-color: #1b4c57;
            box-shadow: 0 1px 1px 0 rgba(0, 0, 0, 0.1), 0 0 0 4px rgba(27, 76, 87, 0.1);
        }

        /* Remove any conflicting styles */
        .terra-tag-widget #card-name-container,
        .terra-tag-widget .card-name-group,
        .terra-tag-widget .stripe-label {
            display: none !important;
        }

        .terra-tag-widget .order-summary {
            display: table;
            width: 100%;
            margin-bottom: 24px;
            border-spacing: 16px 8px;
            color: #1b4c57;
            font-family: Verdana, sans-serif;
            font-size: 0.9em;
        }

        .terra-tag-widget .summary-row {
            display: table-row;
            margin-bottom: 4px;
        }

        .terra-tag-widget .summary-row .label {
            display: table-cell;
            color: #666;
            white-space: nowrap;
            padding-right: 16px;
        }

        .terra-tag-widget .summary-row .value {
            display: table-cell;
            text-align: left;
        }

        .terra-tag-widget .total-amount {
            text-align: center;
            font-size: 1.2em;
            font-weight: 600;
            margin-top: 16px;
        }

        /* Remove success view styles and continue with next section */
        .terra-tag-widget .success-container {
            text-align: center;
            padding: 2rem;
            max-width: 600px;
            margin: 2rem auto;
            background-color: #fff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
    `;
}