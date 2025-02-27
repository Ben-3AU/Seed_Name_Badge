// Function to format quote data for SMTP2GO template
function formatQuoteData(quoteData) {
    const brisbaneDate = new Date().toLocaleString('en-AU', {
        timeZone: 'Australia/Brisbane',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
    
    return {
        first_name: quoteData.first_name,
        submitted: brisbaneDate.replace(/\s*at\s*/, ' at '),
        submission_id: quoteData.id || '',
        quantity_with_guests: quoteData.quantity_with_guests,
        quantity_without_guests: quoteData.quantity_without_guests,
        total_quantity: quoteData.total_quantity,
        size: quoteData.size,
        printed_sides: quoteData.printed_sides === 'double' ? 'Double sided' : 'Single sided',
        ink_coverage: quoteData.ink_coverage === 'over40' ? 'Over 40%' : 'Up to 40%',
        lanyards: quoteData.lanyards ? 'Yes' : 'No',
        shipping: quoteData.shipping.charAt(0).toUpperCase() + quoteData.shipping.slice(1),
        total_cost: quoteData.total_cost.toFixed(2),
        gst_amount: quoteData.gst_amount.toFixed(2),
        co2_savings: quoteData.co2_savings.toFixed(2)
    };
}

module.exports = {
    formatQuoteData
}; 