const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

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
    try {
        const apiUrl = 'https://api.smtp2go.com/v3/email/send';
        
        // Ensure recipients is an array and not empty
        const recipients = Array.isArray(options.recipients) ? options.recipients : [options.recipients];
        if (recipients.length === 0) {
            throw {
                code: 'INVALID_RECIPIENTS',
                message: 'No recipients specified',
                details: 'Email recipients array is empty',
                statusCode: 400
            };
        }

        const payload = {
            api_key: process.env.SMTP2GO_API_KEY,
            template_id: options.template_id,
            template_data: options.template_data,
            to: recipients.map(email => email),
            sender: `${process.env.SMTP2GO_FROM_NAME} <${process.env.SMTP2GO_FROM_EMAIL}>`,
            subject: options.template_id.includes('QUOTE') ? 'Your Terra Tag Quote' : 'Your Terra Tag Order Confirmation'
        };

        if (!process.env.SMTP2GO_API_KEY) {
            throw {
                code: 'MISSING_API_KEY',
                message: 'SMTP2GO API key is missing',
                details: 'Environment variable SMTP2GO_API_KEY is not set',
                statusCode: 500
            };
        }

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
            throw {
                code: 'EMAIL_API_ERROR',
                message: 'Failed to send email via SMTP2GO',
                details: responseData.error || responseData.message || 'Unknown API error',
                statusCode: response.status
            };
        }

        return responseData;
    } catch (error) {
        console.error('Error sending email via SMTP2GO API:', error);
        throw {
            code: error.code || 'EMAIL_SERVICE_ERROR',
            message: error.message || 'Failed to send email',
            details: error.details || error.toString(),
            statusCode: error.statusCode || 500
        };
    }
}

// Function to send quote email
async function sendQuoteEmail(quoteData) {
    try {
        if (!quoteData) {
            throw {
                code: 'INVALID_QUOTE_DATA',
                message: 'Quote data is required',
                details: 'No quote data provided to email service',
                statusCode: 400
            };
        }

        console.log('Starting email send process for quote:', quoteData);
        console.log('Raw timestamp from Supabase:', quoteData.created_at);
        
        const templateData = {
            id: String(quoteData.id),
            created_at: new Date(quoteData.created_at).toLocaleString('en-AU', {
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
            shipping: quoteData.shipping,
            total_cost: new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(quoteData.total_cost),
            gst_amount: new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(quoteData.gst_amount),
            co2_savings: quoteData.co2_savings.toFixed(2)
        };

        return await sendEmailWithTemplate({
            template_id: process.env.SMTP2GO_QUOTE_TEMPLATE_ID,
            template_data: templateData,
            recipients: [quoteData.email],
            bcc: ['hello@terratag.com.au']
        });
    } catch (error) {
        console.error('Error sending quote email:', error);
        throw {
            code: error.code || 'QUOTE_EMAIL_ERROR',
            message: error.message || 'Failed to send quote email',
            details: error.details || error.toString(),
            statusCode: error.statusCode || 500
        };
    }
}

// Function to generate PDF for order confirmation
async function generateOrderPDF(orderData) {
    return new Promise((resolve, reject) => {
        try {
            console.log('Starting PDF generation...');
            
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50
            });

            // Use Helvetica as it's a built-in font
            doc.font('Helvetica');
            
            // Create temp directory path using OS temp directory
            const tempDir = require('os').tmpdir();
            const pdfPath = path.join(tempDir, `order-${orderData.id}.pdf`);
            
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
            const logoPath = path.join(__dirname, 'assets', 'terra-tag-logo.png');
            console.log('Logo path:', logoPath);
            
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
                console.log('Logo file not found');
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
            
            // Name with bold label
            doc.font('Helvetica-Bold').text('Name: ', {continued: true})
               .font('Helvetica').text(`${orderData.first_name} ${orderData.last_name}`);

            // Company with bold label
            doc.font('Helvetica-Bold').text('Company: ', {continued: true})
               .font('Helvetica').text(orderData.company);

            // Email with bold label
            doc.font('Helvetica-Bold').text('Email: ', {continued: true})
               .font('Helvetica').text(orderData.email);

            doc.moveDown(1.5);
            
            // Order label
            doc.font('Helvetica-Bold').text('Order:');
            doc.moveDown(0.5);

            // Create order details table
            const tableTop = doc.y;
            const tableLeft = 50;
            const colWidth = (doc.page.width - 100) / 2;
            const rowHeight = 25;
            let currentY = tableTop;

            // Function to add a table row with vertical line
            function addTableRow(label, value) {
                // Draw horizontal lines
                doc.rect(tableLeft, currentY, doc.page.width - 100, rowHeight)
                   .stroke('#E5E5E5');
                
                // Draw vertical line
                doc.moveTo(tableLeft + colWidth, currentY)
                   .lineTo(tableLeft + colWidth, currentY + rowHeight)
                   .stroke('#E5E5E5');
                
                doc.font('Helvetica')
                   .fontSize(10)
                   .text(label, tableLeft + 5, currentY + 7, { width: colWidth - 10 })
                   .text(value, tableLeft + colWidth + 5, currentY + 7, { width: colWidth - 10 });
                
                currentY += rowHeight;
            }

            // Capitalize first letter of paper type
            const paperType = orderData.paper_type.replace(/([A-Z])/g, ' $1').toLowerCase();
            const formattedPaperType = paperType.charAt(0).toUpperCase() + paperType.slice(1);

            // Add all order details rows
            addTableRow('Date', new Date(orderData.created_at).toLocaleString('en-AU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }));
            addTableRow('Receipt ID', orderData.id);
            addTableRow('Quantity with guest details printed', orderData.quantity_with_guests.toString());
            addTableRow('Quantity without guest details printed', orderData.quantity_without_guests.toString());
            addTableRow('Total number of name badges', orderData.total_quantity.toString());
            addTableRow('Size', orderData.size);
            addTableRow('Printed sides', orderData.printed_sides === 'double' ? 'Double sided' : 'Single sided');
            addTableRow('Ink coverage', orderData.ink_coverage === 'over40' ? 'Over 40%' : 'Up to 40%');
            addTableRow('Lanyards included', orderData.lanyards ? 'Yes' : 'No');
            addTableRow('Shipping', orderData.shipping.charAt(0).toUpperCase() + orderData.shipping.slice(1));
            addTableRow('Paper type', formattedPaperType);

            // Cost Summary - Left aligned with table and more spacing
            doc.moveDown(2);
            doc.fontSize(10)
               .font('Helvetica-Bold')
               .text('Total Cost: ', tableLeft, doc.y, {continued: true})
               .font('Helvetica')
               .text(`$${orderData.total_cost.toFixed(2)}`, {
                   continued: false
               });
            
            doc.moveDown(0.5);
            doc.text(`Includes $${orderData.gst_amount.toFixed(2)} GST`, tableLeft);

            // Footer - positioned closer to the content
            doc.moveDown(3);
            doc.fontSize(10)
               .text(
                   'www.terratag.com.au | hello@terratag.com.au | ABN: 504 094 57139',
                   50,
                   doc.y,
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
        if (!orderData) {
            throw {
                code: 'INVALID_ORDER_DATA',
                message: 'Order data is required',
                details: 'No order data provided to email service',
                statusCode: 400
            };
        }

        // Generate PDF first
        const pdfPath = await generateOrderPDF(orderData);
        const pdfBuffer = fs.readFileSync(pdfPath);
        const pdfBase64 = pdfBuffer.toString('base64');

        const templateData = {
            id: String(orderData.id),
            created_at: new Date(orderData.created_at).toLocaleString('en-AU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
            }),
            first_name: orderData.first_name,
            last_name: orderData.last_name,
            company: orderData.company || 'N/A',
            quantity_with_guests: orderData.quantity_with_guests,
            quantity_without_guests: orderData.quantity_without_guests,
            total_quantity: orderData.total_quantity,
            size: orderData.size,
            printed_sides: orderData.printed_sides === 'double' ? 'Double sided' : 'Single sided',
            ink_coverage: orderData.ink_coverage === 'over40' ? 'Over 40%' : 'Up to 40%',
            lanyards: orderData.lanyards ? 'Yes' : 'No',
            shipping: orderData.shipping,
            paper_type: orderData.paper_type,
            total_cost: new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(orderData.total_cost),
            gst_amount: new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(orderData.gst_amount),
            co2_savings: orderData.co2_savings.toFixed(2)
        };

        const result = await sendEmailWithTemplate({
            template_id: process.env.SMTP2GO_ORDER_TEMPLATE_ID,
            template_data: templateData,
            recipients: [orderData.email],
            bcc: ['hello@terratag.com.au'],
            attachments: [{
                filename: `TerraTags-Order-${orderData.id}.pdf`,
                content: pdfBase64,
                content_type: 'application/pdf'
            }]
        });

        // Clean up the PDF file
        try {
            fs.unlinkSync(pdfPath);
        } catch (cleanupError) {
            console.error('Error cleaning up PDF file:', cleanupError);
        }

        return result;
    } catch (error) {
        console.error('Error sending order confirmation email:', error);
        throw {
            code: error.code || 'ORDER_EMAIL_ERROR',
            message: error.message || 'Failed to send order confirmation email',
            details: error.details || error.toString(),
            statusCode: error.statusCode || 500
        };
    }
}

// Helper function to log email attempts
async function logEmailAttempt(type, data, error = null) {
    console.log(`Email ${type} attempt:`, {
        timestamp: data.created_at || new Date().toISOString(), // Use data timestamp if available
        success: !error,
        error: error ? {
            message: error.message,
            code: error.code,
            command: error.command
        } : null,
        data: data
    });
}

// Function to format quote data for SMTP2GO template
function formatQuoteData(quoteData) {
    // Format the timestamp without timezone adjustment since it's already from Supabase
    const formattedTime = new Date(quoteData.created_at).toLocaleString('en-AU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    });

    return {
        first_name: quoteData.first_name,
        created_at: formattedTime,
        id: quoteData.id || '',  // Use id instead of submission_id
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
    sendQuoteEmail,
    sendOrderConfirmationEmail,
    generateOrderPDF
};