const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Create a transporter using SMTP2GO credentials
const transporter = nodemailer.createTransport({
    host: 'mail.smtp2go.com',
    port: 2525,
    secure: false,
    auth: {
        user: process.env.SMTP2GO_USERNAME,
        pass: process.env.SMTP2GO_PASSWORD
    },
    debug: true,
    logger: true,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000
});

// Function to send email using SMTP2GO REST API
async function sendEmailWithTemplate(options) {
    const apiUrl = 'https://api.smtp2go.com/v3/email/send';
    
    // Ensure recipients is an array and not empty
    const recipients = Array.isArray(options.recipients) ? options.recipients : [options.recipients];
    if (recipients.length === 0) {
        throw new Error('No recipients specified');
    }

    const payload = {
        api_key: process.env.SMTP2GO_API_KEY,
        template_id: options.template_id,
        template_data: options.template_data,
        to: recipients.map(email => email),
        sender: `${process.env.SMTP2GO_FROM_NAME} <${process.env.SMTP2GO_FROM_EMAIL}>`,
        subject: options.template_id.includes('QUOTE') ? 'Your Terra Tag Quote' : 'Your Terra Tag Order Confirmation'
    };

    if (options.bcc && options.bcc.length > 0) {
        payload.bcc = options.bcc;
    }

    if (options.attachments && options.attachments.length > 0) {
        payload.attachments = options.attachments;
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`SMTP2GO API error: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        await logEmailAttempt(options.template_id, { recipients, ...options.template_data });
        return data;
    } catch (error) {
        await logEmailAttempt(options.template_id, { recipients, ...options.template_data }, error);
        throw error;
    }
}

// Function to send quote email
async function sendQuoteEmail(quoteData) {
    try {
        const brisbaneDate = new Date().toLocaleString('en-AU', {
            timeZone: 'Australia/Brisbane',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        
        const templateData = {
            first_name: quoteData.first_name,
            submitted: brisbaneDate.replace(/\s*at\s*/, ' at '),
            submission_id: quoteData.id || '',
            quantity_with_guest_details_printed: quoteData.quantity_with_guests,
            quantity_without_guest_details_printed: quoteData.quantity_without_guests,
            total_quantity: quoteData.total_quantity,
            size: quoteData.size,
            printed_sides: quoteData.printed_sides === 'double' ? 'Double sided' : 'Single sided',
            ink_coverage: quoteData.ink_coverage === 'over40' ? 'Over 40%' : 'Up to 40%',
            lanyards_included: quoteData.lanyards ? 'Yes' : 'No',
            shipping: quoteData.shipping.charAt(0).toUpperCase() + quoteData.shipping.slice(1),
            total_cost: quoteData.total_cost.toFixed(2),
            gst_amount: quoteData.gst_amount.toFixed(2),
            co2_savings: quoteData.co2_savings.toFixed(2)
        };

        const emailResult = await sendEmailWithTemplate({
            template_id: process.env.SMTP2GO_QUOTE_TEMPLATE_ID,
            template_data: templateData,
            recipients: quoteData.email,
            bcc: [process.env.ADMIN_EMAIL]
        });

        // After successful email send, update Supabase
        if (quoteData.id && window.widgetSupabase) {
            const { error } = await window.widgetSupabase
                .from('seed_name_badge_quotes')
                .update({ email_sent: true })
                .eq('id', quoteData.id);

            if (error) {
                console.error('Error updating email_sent status in Supabase:', error);
            }
        }

        return emailResult;
    } catch (error) {
        console.error('Error sending quote email:', error);
        throw error;
    }
}

// Function to generate PDF for order
async function generateOrderPDF(orderData) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50
            });

            const fileName = `${orderData.id}.pdf`;
            const filePath = path.join(process.cwd(), 'tmp', fileName);

            // Ensure tmp directory exists
            if (!fs.existsSync(path.join(process.cwd(), 'tmp'))) {
                fs.mkdirSync(path.join(process.cwd(), 'tmp'));
            }

            // Pipe PDF to file
            doc.pipe(fs.createWriteStream(filePath));

            // Add header
            doc.fontSize(20)
               .text('Terra Tag Order Confirmation', { align: 'center' })
               .moveDown();

            // Add order details
            doc.fontSize(12);

            // Customer details section
            doc.font('Helvetica-Bold').text('Customer Details')
               .moveDown(0.5);
            
            function addTableRow(label, value) {
                doc.font('Helvetica-Bold')
                   .text(label + ': ', { continued: true })
                   .font('Helvetica')
                   .text(value)
                   .moveDown(0.5);
            }

            addTableRow('Name', `${orderData.first_name} ${orderData.last_name}`);
            addTableRow('Company', orderData.company || 'N/A');
            addTableRow('Email', orderData.email);
            
            doc.moveDown();

            // Order details section
            doc.font('Helvetica-Bold').text('Order Details')
               .moveDown(0.5);

            addTableRow('Order ID', orderData.id);
            addTableRow('Quantity with Guests', orderData.quantity_with_guests);
            addTableRow('Quantity without Guests', orderData.quantity_without_guests);
            addTableRow('Total Quantity', orderData.total_quantity);
            addTableRow('Size', orderData.size);
            addTableRow('Printed Sides', orderData.printed_sides === 'double' ? 'Double sided' : 'Single sided');
            addTableRow('Ink Coverage', orderData.ink_coverage === 'over40' ? 'Over 40%' : 'Up to 40%');
            addTableRow('Lanyards', orderData.lanyards ? 'Yes' : 'No');
            addTableRow('Shipping', orderData.shipping.charAt(0).toUpperCase() + orderData.shipping.slice(1));
            addTableRow('Paper Type', orderData.paper_type.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, str => str.toUpperCase()));
            
            doc.moveDown();

            // Cost details section
            doc.font('Helvetica-Bold').text('Cost Details')
               .moveDown(0.5);

            addTableRow('Total Cost', new Intl.NumberFormat('en-AU', {
                style: 'currency',
                currency: 'AUD'
            }).format(orderData.total_cost));
            
            addTableRow('GST Amount', new Intl.NumberFormat('en-AU', {
                style: 'currency',
                currency: 'AUD'
            }).format(orderData.gst_amount));
            
            addTableRow('CO2 Savings', `${orderData.co2_savings.toFixed(2)} kg`);

            // Add footer
            doc.moveDown(2)
               .fontSize(10)
               .text('Thank you for choosing Terra Tag!', { align: 'center' })
               .moveDown(0.5)
               .text('For any questions, please contact support@terratag.com.au', { align: 'center' });

            // Finalize PDF
            doc.end();

            // Return the file path once the PDF is created
            doc.on('end', () => resolve(filePath));
            doc.on('error', reject);
        } catch (error) {
            reject(error);
        }
    });
}

// Function to send order confirmation email
async function sendOrderConfirmationEmail(orderData) {
    try {
        // Generate PDF
        const pdfPath = await generateOrderPDF(orderData);
        const pdfContent = fs.readFileSync(pdfPath);
        const pdfBase64 = pdfContent.toString('base64');

        const templateData = {
            first_name: orderData.first_name,
            order_id: orderData.id,
            total_cost: new Intl.NumberFormat('en-AU', {
                style: 'currency',
                currency: 'AUD'
            }).format(orderData.total_cost),
            order_details: {
                quantity_with_guests: orderData.quantity_with_guests,
                quantity_without_guests: orderData.quantity_without_guests,
                size: orderData.size,
                printed_sides: orderData.printed_sides === 'double' ? 'Double sided' : 'Single sided',
                ink_coverage: orderData.ink_coverage === 'over40' ? 'Over 40%' : 'Up to 40%',
                lanyards: orderData.lanyards ? 'Yes' : 'No',
                shipping: orderData.shipping.charAt(0).toUpperCase() + orderData.shipping.slice(1),
                paper_type: orderData.paper_type.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, str => str.toUpperCase())
            }
        };

        const result = await sendEmailWithTemplate({
            template_id: 'TERRA_TAG_ORDER',
            template_data: templateData,
            recipients: orderData.email,
            bcc: [process.env.ADMIN_EMAIL],
            attachments: [{
                filename: `Terra_Tag_Order_${orderData.id}.pdf`,
                content: pdfBase64,
                type: 'application/pdf',
                disposition: 'attachment'
            }]
        });

        // Clean up PDF file
        fs.unlink(pdfPath, (err) => {
            if (err) console.error('Error cleaning up PDF file:', err);
        });

        return result;
    } catch (error) {
        console.error('Error sending order confirmation email:', error);
        throw error;
    }
}

// Function to log email attempts
async function logEmailAttempt(type, data, error = null) {
    try {
        const logData = {
            type,
            data: JSON.stringify(data),
            error: error ? error.message : null,
            timestamp: new Date().toISOString()
        };

        // Log to console for development/debugging
        console.log('Email attempt log:', logData);

        // In production, you might want to log to a file or database
        if (process.env.NODE_ENV === 'production') {
            const logDir = path.join(process.cwd(), 'logs');
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir);
            }

            const logFile = path.join(logDir, 'email-logs.txt');
            fs.appendFileSync(logFile, JSON.stringify(logData) + '\n');
        }
    } catch (logError) {
        console.error('Error logging email attempt:', logError);
    }
}

module.exports = {
    sendQuoteEmail,
    sendOrderConfirmationEmail,
    generateOrderPDF
};