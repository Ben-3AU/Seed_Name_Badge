console.log('Debug: script.js starting to load');

// Business logic - pure calculations
const calculations = {
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

// UI handling
const ui = {
    getSelectedValue(name) {
        const selected = document.querySelector(`.option-button.selected[data-name="${name}"]`);
        return selected ? selected.getAttribute('data-value') : null;
    },

    getFormValues() {
        return {
            withGuests: parseInt(document.getElementById('quantityWithGuests').value) || 0,
            withoutGuests: parseInt(document.getElementById('quantityWithoutGuests').value) || 0,
            size: this.getSelectedValue('size'),
            printedSides: this.getSelectedValue('printedSides'),
            inkCoverage: this.getSelectedValue('inkCoverage'),
            lanyards: this.getSelectedValue('lanyards'),
            shipping: this.getSelectedValue('shipping')
        };
    },

    updateDisplay() {
        const values = this.getFormValues();
        const totalQuantity = calculations.getTotalQuantity(values.withGuests, values.withoutGuests);
        const totalPriceDiv = document.getElementById('totalPrice');
        const actionButtons = document.getElementById('actionButtons');
        const emailQuoteForm = document.getElementById('emailQuoteForm');
        const orderForm = document.getElementById('orderForm');

        if (totalQuantity < 75) {
            totalPriceDiv.style.display = 'none';
            actionButtons.style.display = 'none';
            emailQuoteForm.style.display = 'none';
            orderForm.style.display = 'none';
            return; // Exit early
        }

        // If we get here, quantity is 75 or greater
        const totalPrice = calculations.getTotalPrice(values);
        const gst = calculations.getGST(totalPrice);
        const co2Savings = calculations.getCO2Savings(totalQuantity);

        totalPriceDiv.innerHTML = `
            <div style="background-color: #f7fafc; border-radius: 6px; color: #1b4c57; text-align: center;">
                <div style="font-size: 2em; font-weight: 600;">Total Cost: $${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div style="font-size: 0.9em; margin-top: 0.5rem;">GST Included: $${gst.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div style="font-size: 0.9em;">CO2 emissions saved: ${co2Savings.toFixed(2)} kg</div>
            </div>
        `;
        
        // Explicitly show the elements
        totalPriceDiv.style.display = 'block';
        actionButtons.style.display = 'block';
    },

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    validateEmailQuoteForm() {
        const firstName = document.getElementById('quoteFirstName').value.trim();
        const email = document.getElementById('quoteEmail').value.trim();
        document.getElementById('submitQuoteBtn').disabled = !(firstName && this.isValidEmail(email));
    },

    validateOrderForm() {
        const firstName = document.getElementById('orderFirstName').value.trim();
        const lastName = document.getElementById('orderLastName').value.trim();
        const email = document.getElementById('orderEmail').value.trim();
        const paperType = this.getSelectedValue('paperType');
        document.getElementById('payNowBtn').disabled = !(firstName && lastName && this.isValidEmail(email) && paperType);
    }
};

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // First check if Stripe is already loaded
        if (!window.Stripe) {
            console.error('Debug: Stripe.js not loaded');
            throw new Error('Payment system failed to load. Please refresh the page.');
        }

        if (!window.stripePublicKey) {
            console.error('Debug: Stripe public key not set');
            throw new Error('Payment system configuration missing. Please refresh the page.');
        }

        // Initialize Stripe with the public key
        console.log('Debug: Initializing Stripe with public key');
        window.stripe = Stripe(window.stripePublicKey);
        console.log('Debug: Stripe initialized successfully');

    } catch (error) {
        console.error('Error initializing payment system:', error);
        alert('Failed to initialize payment system. Please try again later.');
    }

    // Prevent form submission
    const form = document.getElementById('calculatorForm');
    form.addEventListener('submit', e => e.preventDefault());

    // Add quantity input listeners
    document.getElementById('quantityWithGuests').addEventListener('input', () => ui.updateDisplay());
    document.getElementById('quantityWithoutGuests').addEventListener('input', () => ui.updateDisplay());

    // Add button click listeners for all option buttons
    document.querySelectorAll('.option-button').forEach(button => {
        button.addEventListener('click', e => {
            e.preventDefault();
            console.log('Button clicked:', e.currentTarget.getAttribute('data-name'), e.currentTarget.getAttribute('data-value'));
            const button = e.currentTarget;
            const buttonGroup = button.closest('.button-group');
            buttonGroup.querySelectorAll('.option-button').forEach(btn => {
                btn.classList.remove('selected');
            });
            button.classList.add('selected');
            console.log('Button selected, updating display');
            ui.updateDisplay();
            // If this is a paper type button, validate the order form
            if (button.getAttribute('data-name') === 'paperType') {
                ui.validateOrderForm();
            }
        });
    });

    // Add email quote button handler
    const emailQuoteBtn = document.getElementById('emailQuoteBtn');
    const orderNowBtn = document.getElementById('orderNowBtn');
    const emailQuoteForm = document.getElementById('emailQuoteForm');
    const orderForm = document.getElementById('orderForm');

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

    // Add form validation listeners
    emailQuoteForm.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => ui.validateEmailQuoteForm());
    });

    orderForm.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => ui.validateOrderForm());
    });

    // Add submit handlers
    document.getElementById('submitQuoteBtn').addEventListener('click', handleQuoteSubmission);
    document.getElementById('payNowBtn').addEventListener('click', handleOrderSubmission);

    // Initial display update
    ui.updateDisplay();
});

// Function to save quote to Supabase
async function saveQuote(quoteData) {
    try {
        console.log('Attempting to save quote:', quoteData);
        
        const { created_at, ...quoteDataWithoutTimestamp } = quoteData;
        
        // Use the Supabase instance from widget-calculator.js
        const { data, error } = await window.widgetSupabase
            .from('seed_name_badge_quotes')
            .insert([quoteDataWithoutTimestamp]);

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        
        console.log('Quote saved to Supabase:', data);
        return data;
    } catch (error) {
        console.error('Error saving quote:', error);
        throw error;
    }
}

// Function to save order to Supabase
async function saveOrder(orderData) {
    try {
        console.log('Attempting to save order to Supabase:', orderData);
        
        // Use the Supabase instance from widget-calculator.js
        const { data, error } = await window.widgetSupabase
            .from('orders')
            .insert([orderData])
            .select();

        if (error) {
            console.error('Supabase error details:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            throw error;
        }
        
        console.log('Order saved successfully:', data);
        return { data, error };
    } catch (error) {
        console.error('Detailed error saving order:', {
            message: error.message,
            name: error.name,
            code: error.code,
            details: error.details
        });
        throw error;
    }
}

// Function to handle quote submission
async function handleQuoteSubmission(event) {
    event.preventDefault();
    
    // Show spinner
    const submitButton = document.getElementById('submitQuoteBtn');
    const originalButtonText = submitButton.innerHTML;
    submitButton.innerHTML = '<div class="button-content"><div class="spinner"></div><span>Sending...</span></div>';
    submitButton.classList.add('loading');
    
    const totalCost = calculations.getTotalPrice(ui.getFormValues());
    const gstAmount = calculations.getGST(totalCost);
    
    const quoteData = {
        quantity_with_guests: parseInt(document.getElementById('quantityWithGuests').value) || 0,
        quantity_without_guests: parseInt(document.getElementById('quantityWithoutGuests').value) || 0,
        size: ui.getSelectedValue('size'),
        printed_sides: ui.getSelectedValue('printedSides'),
        ink_coverage: ui.getSelectedValue('inkCoverage'),
        lanyards: ui.getSelectedValue('lanyards') === 'yes',
        shipping: ui.getSelectedValue('shipping'),
        first_name: document.getElementById('quoteFirstName').value.trim(),
        email: document.getElementById('quoteEmail').value.trim(),
        total_quantity: calculations.getTotalQuantity(parseInt(document.getElementById('quantityWithGuests').value) || 0, parseInt(document.getElementById('quantityWithoutGuests').value) || 0),
        total_cost: Number(totalCost.toFixed(2)),
        gst_amount: Number(gstAmount.toFixed(2)),
        co2_savings: calculations.getCO2Savings(calculations.getTotalQuantity(parseInt(document.getElementById('quantityWithGuests').value) || 0, parseInt(document.getElementById('quantityWithoutGuests').value) || 0)),
        email_sent: false
    };

    try {
        console.log('Attempting to save quote with data:', quoteData);
        
        // Remove created_at from quoteData
        const { created_at, ...quoteDataWithoutTimestamp } = quoteData;
        
        // Try to insert the quote without created_at
        let { data: savedQuote, error: insertError } = await window.widgetSupabase
            .from('seed_name_badge_quotes')
            .insert([quoteDataWithoutTimestamp])
            .select()
            .single();

        // If we get a duplicate key error, try to update instead
        if (insertError && insertError.code === '23505') {
            console.log('Quote exists, attempting update...');
            const { data: existingQuotes, error: fetchError } = await window.widgetSupabase
                .from('seed_name_badge_quotes')
                .select('id')
                .eq('email', quoteData.email)
                .eq('first_name', quoteData.first_name)
                .order('created_at', { ascending: false })
                .limit(1);

            if (fetchError) throw fetchError;
            
            if (existingQuotes && existingQuotes.length > 0) {
                const { data: updatedQuote, error: updateError } = await window.widgetSupabase
                    .from('seed_name_badge_quotes')
                    .update(quoteDataWithoutTimestamp)
                    .eq('id', existingQuotes[0].id)
                    .select()
                    .single();
                
                if (updateError) throw updateError;
                savedQuote = updatedQuote;
            }
        } else if (insertError) {
            throw insertError;
        }

        if (!savedQuote) {
            throw new Error('No data returned after saving quote');
        }

        console.log('Quote saved to Supabase:', savedQuote);

        // Submit for email processing
        const response = await fetch('/api/submit-quote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(savedQuote)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to process quote');
        }

        const emailResult = await response.json();
        console.log('Email processing result:', emailResult);

        // Show success message
        const successMessage = document.getElementById('quoteSuccessMessage');
        successMessage.classList.add('visible');
        setTimeout(() => {
            successMessage.style.transition = 'opacity 0.5s ease';
            successMessage.classList.remove('visible');
        }, 5000);
        
    } catch (error) {
        console.error('Detailed error processing quote:', error);
        alert('Error sending quote. Please try again.');
    } finally {
        // Hide spinner and restore button text
        submitButton.innerHTML = originalButtonText;
        submitButton.classList.remove('loading');
    }
}

// Function to handle order submission
async function handleOrderSubmission(event) {
    event.preventDefault();
    
    const payNowBtn = document.getElementById('payNowBtn');
    const originalButtonText = payNowBtn.innerHTML;
    payNowBtn.innerHTML = '<div class="button-content"><div class="spinner"></div><span>Processing...</span></div>';
    payNowBtn.classList.add('loading');
    
    try {
        console.log('Debug: Starting order submission...');
        if (!window.stripe) {
            console.error('Debug: Stripe not initialized');
            throw new Error('Payment system not properly initialized. Please refresh the page and try again.');
        }

        const values = ui.getFormValues();
        const totalPrice = calculations.getTotalPrice(values);
        const gstAmount = calculations.getGST(totalPrice);
        const totalQuantity = calculations.getTotalQuantity(values.withGuests, values.withoutGuests);
        
        const orderData = {
            quantity_with_guests: values.withGuests,
            quantity_without_guests: values.withoutGuests,
            size: values.size,
            printed_sides: values.printedSides,
            ink_coverage: values.inkCoverage,
            lanyards: values.lanyards === 'yes',
            shipping: values.shipping,
            paper_type: ui.getSelectedValue('paperType'),
            first_name: document.getElementById('orderFirstName').value.trim(),
            last_name: document.getElementById('orderLastName').value.trim(),
            company: document.getElementById('orderCompany').value.trim(),
            email: document.getElementById('orderEmail').value.trim(),
            total_quantity: totalQuantity,
            total_cost: Number(totalPrice.toFixed(2)),
            gst_amount: Number(gstAmount.toFixed(2)),
            co2_savings: calculations.getCO2Savings(totalQuantity)
        };

        console.log('Debug: Creating payment intent...');
        const response = await fetch('https://seednamebadge.vercel.app/api/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderData })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create payment intent');
        }

        const { clientSecret, orderId } = await response.json();
        console.log('Debug: Received client secret and order ID');
        
        // Hide calculator form and show payment form
        const calculatorForm = document.getElementById('calculatorForm');
        calculatorForm.style.display = 'none';
        
        // Create and show payment form
        const paymentContainer = document.createElement('div');
        paymentContainer.id = 'payment-container';
        paymentContainer.innerHTML = `
            <div class="payment-form">
                <button class="back-button" onclick="window.location.reload()">← Back to Calculator</button>
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
                    <div id="payment-element"></div>
                    <button id="submit-payment" class="submit-button">
                        <span id="button-text">Pay Now</span>
                        <div class="spinner" id="payment-spinner" style="display: none;"></div>
                    </button>
                    <div id="payment-message" class="payment-message"></div>
                </form>
            </div>
        `;
        
        document.querySelector('.container').appendChild(paymentContainer);

        // Create payment element
        const elements = window.stripe.elements({
            clientSecret,
            appearance: {
                theme: 'stripe',
                variables: {
                    colorPrimary: '#1b4c57',
                    colorBackground: '#ffffff',
                    colorText: '#1b4c57',
                    colorDanger: '#df1b41',
                    fontFamily: 'Verdana, system-ui, sans-serif',
                    spacingUnit: '4px',
                    borderRadius: '6px'
                }
            }
        });

        const paymentElement = elements.create('payment');
        await paymentElement.mount('#payment-element');
        console.log('Debug: Payment element mounted');

        // Handle payment submission
        const form = document.getElementById('payment-form');
        let submitted = false;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (submitted) {
                console.log('Debug: Payment already submitted');
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
                console.log('Debug: Confirming payment...');
                const { error } = await window.stripe.confirmPayment({
                    elements,
                    confirmParams: {
                        return_url: `${window.location.origin}/payment/success?order_id=${orderId}`,
                    },
                });

                if (error) {
                    console.error('Debug: Payment error:', error);
                    messageDiv.textContent = error.message;
                    submitted = false;
                    submitButton.disabled = false;
                    spinner.style.display = 'none';
                    buttonText.textContent = 'Pay Now';
                }
            } catch (error) {
                console.error('Debug: Unexpected payment error:', error);
                messageDiv.textContent = 'An unexpected error occurred. Please try again.';
                submitted = false;
                submitButton.disabled = false;
                spinner.style.display = 'none';
                buttonText.textContent = 'Pay Now';
            }
        });

        // Remove loading state from original button
        payNowBtn.innerHTML = originalButtonText;
        payNowBtn.classList.remove('loading');

    } catch (error) {
        console.error('Debug: Error processing order:', error);
        alert('Error processing order: ' + (error.message || 'Unknown error'));
        payNowBtn.innerHTML = originalButtonText;
        payNowBtn.classList.remove('loading');
    }
}

console.log('Debug: script.js finished loading');