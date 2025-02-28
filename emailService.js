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
                SMTP2GO_API_KEY: process.env.SMTP2GO_API_KEY ? 'Present' : 'Missing',
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
            created_at: new Date(quoteData.created_at || Date.now()).toLocaleString('en-AU', {
                timeZone: 'Australia/Brisbane',
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
            
            // Format date without time
            const formattedDate = new Date().toLocaleDateString('en-AU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            // Date with bold label
            doc.font('Helvetica-Bold').text('Date: ', {continued: true})
               .font('Helvetica').text(formattedDate);

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
            addTableRow('Quantity with guest details printed', orderData.quantity_with_guests.toString());
            addTableRow('Quantity without guest details printed', orderData.quantity_without_guests.toString());
            addTableRow('Total number of name badges', orderData.total_quantity.toString());
            addTableRow('Size', orderData.size);
            addTableRow('Printed sides', orderData.printed_sides === 'double' ? 'Double sided' : 'Single sided');
            addTableRow('Ink coverage', orderData.ink_coverage === 'over40' ? 'Over 40%' : 'Up to 40%');
            addTableRow('Lanyards included', orderData.lanyards ? 'Yes' : 'No');
            addTableRow('Shipping', orderData.shipping.charAt(0).toUpperCase() + orderData.shipping.slice(1));
            addTableRow('Paper type', formattedPaperType);
            addTableRow('Receipt ID', orderData.id);

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
        console.log('Starting email send process for order:', orderData.id);
        console.log('Order data:', JSON.stringify(orderData, null, 2));
        
        // Generate PDF
        console.log('Generating PDF...');
        const pdfPath = await generateOrderPDF(orderData);
        console.log('PDF generated successfully at:', pdfPath);

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
            total_cost: orderData.total_cost.toFixed(2),
            gst_amount: orderData.gst_amount.toFixed(2),
            co2_savings: orderData.co2_savings.toFixed(2),
            created_at: new Date().toLocaleString('en-AU', {
                timeZone: 'Australia/Brisbane',
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