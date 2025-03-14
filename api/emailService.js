// Force dynamic behavior and prevent caching
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Log the current directory and available files for debugging
console.log('Current directory:', __dirname);
console.log('Parent directory contents:', fs.readdirSync(path.join(__dirname, '..')));
console.log('Current directory contents:', fs.readdirSync(__dirname));

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
        sender: `${process.env.SMTP2GO_FROM_NAME} <${process.env.SMTP2GO_FROM_EMAIL}>`
    };

    // Log environment variables for debugging
    console.log('Environment variables check:', {
        SMTP2GO_API_KEY: process.env.SMTP2GO_API_KEY,
        SMTP2GO_QUOTE_TEMPLATE_ID: process.env.SMTP2GO_QUOTE_TEMPLATE_ID,
        SMTP2GO_FROM_NAME: process.env.SMTP2GO_FROM_NAME,
        SMTP2GO_FROM_EMAIL: process.env.SMTP2GO_FROM_EMAIL
    });

    // Log the full payload for debugging
    console.log('Full SMTP2GO payload:', JSON.stringify(payload, null, 2));

    if (options.bcc && options.bcc.length > 0) {
        payload.bcc = options.bcc;
    }

    if (options.attachments && options.attachments.length > 0) {
        payload.attachments = options.attachments;
    }

    console.log('SMTP2GO Request payload:', {
        template_id: payload.template_id,
        sender: payload.sender,
        to: payload.to,
        template_data_keys: Object.keys(payload.template_data),
        has_attachments: payload.attachments ? payload.attachments.length > 0 : false
    });

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const responseData = await response.json();
        console.log('SMTP2GO API Raw Response:', responseData);

        if (!response.ok) {
            console.error('SMTP2GO API Response:', responseData);
            console.error('Environment variables:', {
                SMTP2GO_API_KEY: process.env.SMTP2GO_API_KEY ? 'Present' : undefined,
                SMTP2GO_ORDER_TEMPLATE_ID: process.env.SMTP2GO_ORDER_TEMPLATE_ID,
                SMTP2GO_QUOTE_TEMPLATE_ID: process.env.SMTP2GO_QUOTE_TEMPLATE_ID,
                SMTP2GO_FROM_NAME: process.env.SMTP2GO_FROM_NAME,
                SMTP2GO_FROM_EMAIL: process.env.SMTP2GO_FROM_EMAIL
            });
            throw new Error(`SMTP2GO API error: ${JSON.stringify(responseData)}`);
        }

        console.log('SMTP2GO API Success Response:', responseData);
        return responseData;
    } catch (error) {
        console.error('Error sending email via SMTP2GO API:', error);
        throw error;
    }
}

// Function to send quote email
async function sendQuoteEmail(quoteData) {
    try {
        console.log('Starting email send process for quote:', quoteData.id);
        await logEmailAttempt('quote', quoteData);

        const templateData = {
            id: String(quoteData.id),
            created_at: new Date(quoteData.created_at).toLocaleString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
            }),
            first_name: quoteData.first_name,
            quantity_with_guests: quoteData.quantity_with_guests,
            quantity_without_guests: quoteData.quantity_without_guests,
            total_quantity: quoteData.total_quantity,
            size: quoteData.size,
            printed_sides: quoteData.printed_sides === 'double' ? 'Double sided' : 'Single sided',
            ink_coverage: quoteData.ink_coverage === 'over40' ? 'Over 40%' : 'Up to 40%',
            lanyards: quoteData.lanyards ? 'Yes' : 'No',
            shipping: quoteData.shipping === 'express' ? 'Express' : 'Standard',
            total_cost: new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(quoteData.total_cost),
            gst_amount: new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(quoteData.gst_amount),
            co2_savings: quoteData.co2_savings.toFixed(2)
        };

        const response = await sendEmailWithTemplate({
            template_id: process.env.SMTP2GO_QUOTE_TEMPLATE_ID,
            template_data: templateData,
            recipients: [quoteData.email],
            bcc: ['hello@terratag.com.au']
        });

        console.log('Email sent successfully via SMTP2GO API:', response);
        await logEmailAttempt('quote', quoteData, null);
        return response;
    } catch (error) {
        console.error('Error sending quote email:', error);
        await logEmailAttempt('quote', quoteData, error);
        throw error;
    }
}

// Function to generate PDF for order confirmation
async function generateOrderPDF(orderData) {
    return new Promise((resolve, reject) => {
        try {
            console.log('Starting PDF generation...');
            console.log('Current directory:', __dirname);
            
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50
            });

            // Use Helvetica as it's a built-in font
            doc.font('Helvetica');
            
            // Create temp directory path using OS temp directory
            const tempDir = require('os').tmpdir();
            const pdfPath = path.join(tempDir, `terra-tag-order-${orderData.id}.pdf`);
            
            console.log('Using OS temp directory:', tempDir);
            console.log('PDF path:', pdfPath);

            // Create write stream
            const writeStream = fs.createWriteStream(pdfPath);
            console.log('Created write stream');

            // Handle stream errors
            writeStream.on('error', (err) => {
                console.error('Write stream error:', err);
                reject(err);
            });

            doc.pipe(writeStream);

            // Add logo centered at the top
            const logoPath = path.join(__dirname, 'terra-tag-assets', 'terra-tag-logo.png');
            console.log('Looking for logo at:', logoPath);
            
            if (fs.existsSync(logoPath)) {
                console.log('Logo file exists, adding to PDF...');
                doc.image(logoPath, {
                    fit: [150, 150],
                    align: 'center',
                    x: (doc.page.width - 150) / 2
                });

                // Move cursor to bottom of logo
                doc.y = doc.y + 150;
            } else {
                console.log('Logo file not found at:', logoPath);
                console.log('Directory contents:', fs.readdirSync(path.dirname(logoPath)));
            }

            // Add extra space after logo (reduced by 2)
            doc.moveDown(2);

            // Title
            doc.fontSize(16)
               .font('Helvetica-Bold')
               .text('Terra Tag Order Tax Receipt', {
                   align: 'center'
               });
            
            doc.moveDown(2);

            // Customer Details Section
            doc.font('Helvetica').fontSize(10);
            
            // Calculate positions
            const leftMargin = 50;
            const lineHeight = 20;
            let currentY = doc.y;
            
            // Format date from Supabase data
            const formattedDate = new Date(orderData.created_at).toLocaleDateString(undefined, {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            // Helper function for text lines
            function addTextLine(label, value) {
                doc.font('Helvetica-Bold')
                   .text(label, leftMargin, currentY, { continued: true });
                doc.font('Helvetica')
                   .text(value || '', { lineGap: 5 });
                currentY += lineHeight;
            }

            // Add customer details with fixed spacing
            addTextLine('Date: ', formattedDate);
            addTextLine('Name: ', `${orderData.first_name} ${orderData.last_name}`);
            addTextLine('Company: ', orderData.company || ' ');  // Space to maintain line
            addTextLine('Email: ', orderData.email);

            // Add order details
            doc.moveDown();
            addTextLine('Order ID: ', String(orderData.id));
            addTextLine('Quantity with guest details: ', String(orderData.quantity_with_guests));
            addTextLine('Quantity without guest details: ', String(orderData.quantity_without_guests));
            addTextLine('Total quantity: ', String(orderData.total_quantity));
            addTextLine('Size: ', orderData.size);
            addTextLine('Printed sides: ', orderData.printed_sides === 'double' ? 'Double sided' : 'Single sided');
            addTextLine('Ink coverage: ', orderData.ink_coverage === 'over40' ? 'Over 40%' : 'Up to 40%');
            addTextLine('Lanyards: ', orderData.lanyards ? 'Yes' : 'No');
            addTextLine('Shipping: ', orderData.shipping === 'express' ? 'Express' : 'Standard');
            addTextLine('Paper type: ', orderData.paper_type === 'mixedHerb' ? 'Mixed herb' : 
                                      orderData.paper_type === 'mixedFlower' ? 'Mixed flower' : 'Random mix');

            // Format currency values with thousands separator
            const formattedTotalCost = new Intl.NumberFormat('en-AU', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            }).format(orderData.total_cost);
            
            const formattedGstAmount = new Intl.NumberFormat('en-AU', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            }).format(orderData.gst_amount);

            // Add total cost and GST with proper formatting
            addTextLine('Total cost (inc. GST): ', `$${formattedTotalCost}`);
            addTextLine('GST amount: ', `$${formattedGstAmount}`);
            addTextLine('CO2 savings: ', `${orderData.co2_savings.toFixed(2)}kg`);

            // Footer
            currentY += 40;
            doc.fontSize(10)
               .text(
                   'www.terratag.com.au | hello@terratag.com.au | ABN: 504 094 57139',
                   50,
                   currentY,
                   {
                       align: 'center',
                       width: doc.page.width - 100,
                       link: 'http://www.terratag.com.au'
                   }
               );

            // Finalize PDF
            doc.end();

            writeStream.on('finish', () => {
                console.log('PDF generation completed:', pdfPath);
                resolve(pdfPath);
            });

        } catch (error) {
            console.error('Error in PDF generation:', error);
            reject(error);
        }
    });
}

// Function to send order confirmation email
async function sendOrderConfirmationEmail(orderData) {
    try {
        console.log('Starting email send process for order:', orderData.id);
        console.log('Order data:', JSON.stringify(orderData, null, 2));
        
        // Generate PDF
        console.log('Generating PDF...');
        const pdfPath = await generateOrderPDF(orderData);
        console.log('PDF generated successfully at:', pdfPath);

        // Parse and format the numbers
        const totalCost = typeof orderData.total_cost === 'string' ? 
            parseFloat(orderData.total_cost.replace(/,/g, '')) : 
            orderData.total_cost;
            
        const gstAmount = typeof orderData.gst_amount === 'string' ? 
            parseFloat(orderData.gst_amount.replace(/,/g, '')) : 
            orderData.gst_amount;

        console.log('Preparing email template data...');
        const templateData = {
            id: String(orderData.id),
            first_name: orderData.first_name,
            last_name: orderData.last_name,
            company: orderData.company,
            quantity_with_guests: orderData.quantity_with_guests,
            quantity_without_guests: orderData.quantity_without_guests,
            total_quantity: orderData.total_quantity,
            size: orderData.size,
            printed_sides: orderData.printed_sides === 'double' ? 'Double sided' : 'Single sided',
            ink_coverage: orderData.ink_coverage === 'over40' ? 'Over 40%' : 'Up to 40%',
            lanyards: orderData.lanyards ? 'Yes' : 'No',
            shipping: orderData.shipping,
            paper_type: orderData.paper_type.replace(/([A-Z])/g, ' $1').toLowerCase(),
            total_cost: new Intl.NumberFormat('en-AU', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            }).format(totalCost),
            gst_amount: new Intl.NumberFormat('en-AU', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            }).format(gstAmount),
            co2_savings: orderData.co2_savings.toFixed(2),
            created_at: new Date(orderData.created_at).toLocaleString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
            })
        };
        console.log('Template data prepared:', JSON.stringify(templateData, null, 2));

        // Read the PDF file and convert to base64
        console.log('Reading PDF file...');
        const pdfContent = fs.readFileSync(pdfPath);
        const base64Content = pdfContent.toString('base64');
        console.log('PDF file read and converted to base64');

        console.log('Sending email via SMTP2GO...');
        const response = await sendEmailWithTemplate({
            template_id: process.env.SMTP2GO_ORDER_TEMPLATE_ID,
            template_data: templateData,
            recipients: [orderData.email],
            bcc: ['hello@terratag.com.au'],
            attachments: [{
                filename: 'order-confirmation.pdf',
                fileblob: base64Content,
                mimetype: 'application/pdf'
            }]
        });

        console.log('Order confirmation email sent successfully via SMTP2GO API:', response);

        // Clean up: delete the temporary PDF file
        console.log('Cleaning up temporary PDF file...');
        fs.unlinkSync(pdfPath);
        console.log('Temporary PDF file deleted');

        return response;
    } catch (error) {
        console.error('Error sending order confirmation email:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            details: error.details || null
        });
        throw error;
    }
}

// Helper function to log email attempts
async function logEmailAttempt(type, data, error = null) {
    console.log(`Email ${type} attempt:`, {
        timestamp: new Date().toISOString(),
        success: !error,
        error: error ? {
            message: error.message,
            code: error.code,
            command: error.command
        } : null,
        data: data
    });
}

module.exports = {
    sendQuoteEmail,
    sendOrderConfirmationEmail,
    generateOrderPDF
};