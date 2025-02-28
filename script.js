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
        const warningDiv = document.getElementById('minimumQuantityWarning');
        const totalPriceDiv = document.getElementById('totalPrice');
        const actionButtons = document.getElementById('actionButtons');
        const emailQuoteForm = document.getElementById('emailQuoteForm');
        const orderForm = document.getElementById('orderForm');

        if (totalQuantity < 75) {
            warningDiv.style.display = 'none';
            totalPriceDiv.style.display = 'none';
            actionButtons.style.display = 'none';
            emailQuoteForm.style.display = 'none';
            orderForm.style.display = 'none';
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
            successMessage.classList.remove('visible');
        }, 3000);
        
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
        const response = await fetch('/api/create-payment-intent', {
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