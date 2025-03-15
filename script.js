console.log('Debug: script.js starting to load');

// Quote submissions are handled through the /api/v1/submit-quote endpoint
// This ensures secure database operations and proper validation on the server side

// Initialize Supabase client
// const supabaseUrl = 'https://pxxqvjxmzmsqunrhegcq.supabase.co';
// const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4eHF2anhtem1zcXVucmhlZ2NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg0NDk0NTcsImV4cCI6MjA1NDAyNTQ1N30.5CUbSb2OR9H4IrGHx_vxmIPZCWN8x7TYoG5RUeYAehM';
// const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Get the base URL from the window location
const BASE_URL = window.location.origin;

console.log('Script initialized successfully');

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
        const paperTypeSection = document.getElementById('paperTypeSection');

        // Always ensure paper type section is after total price div
        if (paperTypeSection && totalPriceDiv) {
            const parent = paperTypeSection.parentElement;
            if (parent) {
                parent.insertBefore(totalPriceDiv, paperTypeSection);
            }
        }

        if (totalQuantity < 75) {
            totalPriceDiv.style.display = 'none';
            actionButtons.style.display = 'none';
            emailQuoteForm.style.display = 'none';
            orderForm.style.display = 'none';
            if (paperTypeSection) {
                paperTypeSection.style.display = 'none';
            }
        } else {
            totalPriceDiv.style.display = 'block';
            const totalPrice = calculations.getTotalPrice(values);
            const gst = calculations.getGST(totalPrice);
            const co2Savings = calculations.getCO2Savings(totalQuantity);

            totalPriceDiv.innerHTML = `
                <div style="background-color: #f7fafc; border-radius: 6px; color: #1b4c57; text-align: center;">
                    <div style="font-size: 2em; font-weight: 600;">Total Cost: $${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }).format(totalPrice)}</div>
                    <div style="font-size: 0.9em; margin-top: 0.5rem;">GST Included: $${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }).format(gst)}</div>
                    <div style="font-size: 0.9em;">CO2 emissions saved: ${co2Savings.toFixed(2)} kg</div>
                </div>
            `;
            actionButtons.style.display = 'block';
            
            // Only show paper type section if order form is visible and quantity is sufficient
            if (paperTypeSection) {
                paperTypeSection.style.display = 
                    orderForm.style.display === 'block' && totalQuantity >= 75 
                    ? 'block' 
                    : 'none';
            }
        }
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
        const company = document.getElementById('orderCompany').value.trim();
        const email = document.getElementById('orderEmail').value.trim();
        const paperType = this.getSelectedValue('paperType');
        document.getElementById('payNowBtn').disabled = !(firstName && lastName && company && this.isValidEmail(email) && paperType);
    }
};

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Prevent form submission
    const form = document.getElementById('calculatorForm');
    form.addEventListener('submit', e => e.preventDefault());

    // Hide paper type section by default
    const paperTypeSection = document.getElementById('paperTypeSection');
    if (paperTypeSection) {
        paperTypeSection.style.display = 'none';
    }

    // Add quantity input listeners
    document.getElementById('quantityWithGuests').addEventListener('input', () => ui.updateDisplay());
    document.getElementById('quantityWithoutGuests').addEventListener('input', () => ui.updateDisplay());

    // Add button click listeners for all option buttons
    document.querySelectorAll('.option-button').forEach(button => {
        button.addEventListener('click', e => {
            e.preventDefault();
            const buttonGroup = e.target.closest('.button-group');
            buttonGroup.querySelectorAll('.option-button').forEach(btn => {
                btn.classList.remove('selected');
            });
            e.target.classList.add('selected');
            ui.updateDisplay();
            // If this is a paper type button, validate the order form
            if (e.target.getAttribute('data-name') === 'paperType') {
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
        ui.updateDisplay();
    });

    orderNowBtn.addEventListener('click', () => {
        orderForm.style.display = 'block';
        emailQuoteForm.style.display = 'none';
        orderNowBtn.classList.add('selected');
        emailQuoteBtn.classList.remove('selected');
        ui.updateDisplay();
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

// Function to handle quote submission
async function handleQuoteSubmission(event) {
    event.preventDefault();
    
    // Show spinner
    const submitButton = document.getElementById('submitQuoteBtn');
    const originalButtonText = submitButton.innerHTML;
    submitButton.innerHTML = '<div class="spinner"></div>';
    submitButton.disabled = true;
    
    const values = ui.getFormValues();
    const totalQuantity = calculations.getTotalQuantity(values.withGuests, values.withoutGuests);
    const totalCost = calculations.getTotalPrice(values);
    const gstAmount = calculations.getGST(totalCost);
    const co2Savings = calculations.getCO2Savings(totalQuantity);
    
    const quoteData = {
        quantity_with_guests: values.withGuests,
        quantity_without_guests: values.withoutGuests,
        size: values.size,
        printed_sides: values.printedSides,
        ink_coverage: values.inkCoverage,
        lanyards: values.lanyards === 'yes',
        shipping: values.shipping,
        first_name: document.getElementById('quoteFirstName').value.trim(),
        email: document.getElementById('quoteEmail').value.trim(),
        total_quantity: totalQuantity,
        total_cost: totalCost,
        gst_amount: gstAmount,
        co2_savings: co2Savings
    };

    try {
        console.log('Submitting quote:', quoteData);
        
        const response = await fetch(`${BASE_URL}/api/v1/submit-quote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(quoteData)
        });

        let result;
        try {
            result = await response.json();
        } catch (parseError) {
            console.error('Error parsing response:', parseError);
            throw new Error('Server error occurred. Please try again.');
        }

        if (!response.ok) {
            throw new Error(result.error || 'Failed to process quote. Please try again.');
        }

        console.log('Quote submission result:', result);

        // Show success message
        const successMessage = document.getElementById('quoteSuccessMessage');
        successMessage.textContent = 'Quote sent successfully! Please check your email.';
        successMessage.style.display = 'block';
        
        // Hide success message after 3 seconds
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 3000);
        
    } catch (error) {
        console.error('Error submitting quote:', error);
        alert(error.message || 'Failed to send quote. Please try again.');
    } finally {
        // Restore button state
        submitButton.innerHTML = originalButtonText;
        submitButton.disabled = false;
    }
}

// Modify the handleOrderSubmission function back to its original form while keeping error handling
async function handleOrderSubmission(event) {
    event.preventDefault();
    
    // Show spinner
    const payNowBtn = document.getElementById('payNowBtn');
    const originalButtonText = payNowBtn.innerHTML;
    payNowBtn.innerHTML = '<div class="spinner"></div>';
    payNowBtn.disabled = true;
    
    const values = ui.getFormValues();
    const totalQuantity = calculations.getTotalQuantity(values.withGuests, values.withoutGuests);
    const totalCost = calculations.getTotalPrice(values);
    const gstAmount = calculations.getGST(totalCost);
    const co2Savings = calculations.getCO2Savings(totalQuantity);
    
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
        total_cost: totalCost,
        gst_amount: gstAmount,
        co2_savings: co2Savings
    };

    try {
        console.log('Creating payment intent for order:', orderData);
        
        const response = await fetch(`${BASE_URL}/api/v1/create-payment-intent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
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

        const { clientSecret, orderId } = result;
        console.log('Payment intent created, proceeding to payment');

        // Initialize payment element and handle payment
        const { error: stripeError } = await stripe.confirmPayment({
            elements,
            clientSecret,
            confirmParams: {
                return_url: `${window.location.origin}/payment-confirmation?order_id=${orderId}`,
            },
        });

        if (stripeError) {
            throw new Error(stripeError.message);
        }
    } catch (error) {
        console.error('Error processing order:', error);
        alert(error.message || 'Failed to process order. Please try again.');
        
        // Restore button state
        payNowBtn.innerHTML = originalButtonText;
        payNowBtn.disabled = false;
    }
}

console.log('Debug: script.js finished loading');