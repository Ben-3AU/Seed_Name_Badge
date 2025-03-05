console.log('Debug: script.js starting to load');

// Quote submissions are handled through the /api/submit-quote endpoint
// This ensures secure database operations and proper validation on the server side


console.log('Supabase client initialized successfully');

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
        const warningDiv = document.getElementById('minimumQuantityWarning');
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
            warningDiv.style.display = 'none';
            totalPriceDiv.style.display = 'none';
            actionButtons.style.display = 'none';
            emailQuoteForm.style.display = 'none';
            orderForm.style.display = 'none';
            if (paperTypeSection) {
                paperTypeSection.style.display = 'none';
            }
        } else {
            warningDiv.style.display = 'none';
            totalPriceDiv.style.display = 'block';
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
// Handles the entire quote submission process:
// 1. Shows loading spinner during submission
// 2. Collects and validates form data
// 3. Sends data to server API endpoint
// 4. Displays success/error messages to user
async function handleQuoteSubmission(event) {
    event.preventDefault();
    
    // Show spinner
    const submitButton = document.getElementById('submitQuoteBtn');
    const originalButtonText = submitButton.innerHTML;
    submitButton.innerHTML = '<div class="button-content"><div class="spinner"></div><span>Sending...</span></div>';
    submitButton.classList.add('loading');
    
    const totalCost = calculations.getTotalPrice(ui.getFormValues());
    const gstAmount = calculations.getGST(totalCost);
    const totalQuantity = calculations.getTotalQuantity(
        parseInt(document.getElementById('quantityWithGuests').value) || 0,
        parseInt(document.getElementById('quantityWithoutGuests').value) || 0
    );
    
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
        total_quantity: totalQuantity,
        total_cost: Number(totalCost.toFixed(2)),
        gst_amount: Number(gstAmount.toFixed(2)),
        co2_savings: Number(calculations.getCO2Savings(totalQuantity).toFixed(2)),
        email_sent: false
    };

    try {
        console.log('Attempting to submit quote with data:', quoteData);
        
        // Get the base URL from the widget or fallback to window location
        const baseUrl = window.BASE_URL || window.location.origin;
        
        // Submit quote to the API
        const response = await fetch(`${baseUrl}/api/submit-quote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(quoteData)
        });

        // Handle response
        if (!response.ok) {
            let errorMessage = 'Failed to process quote';
            
            if (response.status === 405) {
                console.error('API endpoint not found or method not allowed');
                errorMessage = 'Quote submission service is currently unavailable. Please try again later.';
            } else {
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    console.error('Error parsing error response:', e);
                }
            }
            throw new Error(errorMessage);
        }

        // Parse successful response
        const result = await response.json();
        console.log('Quote submitted successfully:', result);

        // Show success message
        const successMessage = document.getElementById('quoteSuccessMessage');
        successMessage.classList.add('visible');
        setTimeout(() => {
            successMessage.classList.remove('visible');
        }, 3000);
        
    } catch (error) {
        console.error('Error processing quote:', error);
        alert(error.message || 'Error sending quote. Please try again.');
    } finally {
        // Hide spinner and restore button text
        submitButton.innerHTML = originalButtonText;
        submitButton.classList.remove('loading');
    }
}

// Function to handle order submission
async function handleOrderSubmission(event) {
    event.preventDefault();
    
    // Show spinner
    const payNowBtn = document.getElementById('payNowBtn');
    const originalButtonText = payNowBtn.innerHTML;
    payNowBtn.innerHTML = '<div class="button-content"><div class="spinner"></div><span>Processing...</span></div>';
    payNowBtn.classList.add('loading');
    
    const totalCost = calculations.getTotalPrice(ui.getFormValues());
    const gstAmount = calculations.getGST(totalCost);
    
    const orderData = {
        quantity_with_guests: parseInt(document.getElementById('quantityWithGuests').value) || 0,
        quantity_without_guests: parseInt(document.getElementById('quantityWithoutGuests').value) || 0,
        size: ui.getSelectedValue('size'),
        printed_sides: ui.getSelectedValue('printedSides'),
        ink_coverage: ui.getSelectedValue('inkCoverage'),
        lanyards: ui.getSelectedValue('lanyards') === 'yes',
        shipping: ui.getSelectedValue('shipping'),
        paper_type: ui.getSelectedValue('paperType'),
        first_name: document.getElementById('orderFirstName').value.trim(),
        last_name: document.getElementById('orderLastName').value.trim(),
        company: document.getElementById('orderCompany').value.trim(),
        email: document.getElementById('orderEmail').value.trim(),
        total_quantity: calculations.getTotalQuantity(parseInt(document.getElementById('quantityWithGuests').value) || 0, parseInt(document.getElementById('quantityWithoutGuests').value) || 0),
        total_cost: Number(totalCost.toFixed(2)),
        gst_amount: Number(gstAmount.toFixed(2)),
        co2_savings: calculations.getCO2Savings(calculations.getTotalQuantity(parseInt(document.getElementById('quantityWithGuests').value) || 0, parseInt(document.getElementById('quantityWithoutGuests').value) || 0)),
        payment_status: 'pending',
        email_sent: false
    };

    try {
        // Create a payment intent
        const response = await fetch(`${window.BASE_URL}/api/create-payment-intent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orderData })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create payment intent');
        }

        const result = await response.json();
        console.log('Payment intent created:', result);

        // Redirect to payment page
        window.location.href = result.url;
    } catch (error) {
        console.error('Error processing order:', error);
        alert('Error processing order: ' + (error.message || 'Unknown error'));
    } finally {
        // Hide spinner and restore button text if there's an error
        // (If successful, the page will redirect)
        if (error) {
            payNowBtn.innerHTML = originalButtonText;
            payNowBtn.classList.remove('loading');
        }
    }
}

console.log('Debug: script.js finished loading');