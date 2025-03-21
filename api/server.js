// Force dynamic to ensure logs are captured
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const path = require('path');
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { sendQuoteEmail, sendOrderConfirmationEmail, generateOrderPDF } = require('./emailService.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');
const nodemailer = require('nodemailer');
const Stripe = require('stripe');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration');
    process.exit(1);
}

// Initialize Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

if (!process.env.STRIPE_SECRET_KEY) {
    console.error('Missing Stripe secret key');
    process.exit(1);
}

// Log environment variables (without exposing full keys)
console.log('Environment variables loaded:', {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'Present' : 'Missing',
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY ? 'Present' : 'Missing',
    CLIENT_URL: process.env.CLIENT_URL
});

const app = express();

// Global error handlers
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Add logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Test endpoint for verifying logs
app.get('/api/v1/test-logs', (req, res) => {
    console.log('Standard log message');
    console.info('Info level message');
    console.warn('Warning level message');
    console.error('Error level message');
    
    // Test error handling
    try {
        throw new Error('Test error for logging');
    } catch (error) {
        console.error('Caught test error:', error);
    }
    
    res.json({ 
        message: 'Test logs generated',
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
    });
});

// Middleware
app.use(express.json({
    verify: (req, res, buf) => {
        if (req.originalUrl === '/webhook') {
            req.rawBody = buf.toString();
        }
    },
    limit: '10mb'
}));

// CORS middleware
app.use(cors({
    origin: [
        'https://seed-name-badge-calculator-bens-projects-4af3578a.vercel.app',
        'https://seed-name-badge-calculator-git-master-bens-projects-4af3578a.vercel.app',
        'https://seed-name-badge-calculator.vercel.app',
        'https://www.terratag.com.au',
        'https://terratag.com.au',
        process.env.CLIENT_URL
    ].filter(Boolean).map(url => url.startsWith('http') ? url : `https://${url}`),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add CORS headers to all responses
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', true);
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Stripe configuration endpoint
app.get('/config', (req, res) => {
    if (!process.env.STRIPE_PUBLISHABLE_KEY) {
        console.error('Missing Stripe publishable key');
        return res.status(500).json({ error: 'Missing Stripe configuration' });
    }
    res.json({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
});

// Test endpoint to verify Stripe connection
app.get('/test-stripe', async (req, res) => {
    try {
        const paymentMethods = await stripe.paymentMethods.list({
            limit: 1,
            type: 'card'
        });
        res.json({ status: 'Stripe connection successful' });
    } catch (error) {
        console.error('Stripe connection test failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Handle quote email submission
app.post('/api/v1/submit-quote', async (req, res) => {
    try {
        // Handle both nested and non-nested structures
        const quoteData = req.body.quoteData || req.body;
        console.log('Received quote data:', { quoteData });
        
        // Insert new quote
        console.log('Creating new quote');
        const { data: savedQuote, error: insertError } = await supabase
            .from('seed_name_badge_quotes')
            .insert([{
                quantity_with_guests: quoteData.quantity_with_guests,
                quantity_without_guests: quoteData.quantity_without_guests,
                size: quoteData.size,
                printed_sides: quoteData.printed_sides,
                ink_coverage: quoteData.ink_coverage,
                lanyards: quoteData.lanyards,
                shipping: quoteData.shipping,
                first_name: quoteData.first_name,
                email: quoteData.email,
                total_quantity: quoteData.total_quantity,
                total_cost: quoteData.total_cost,
                gst_amount: quoteData.gst_amount,
                co2_savings: parseFloat(Number(quoteData.co2_savings).toFixed(2)),  // Ensure 2 decimal places
                email_sent: false
            }])
            .select()
            .single();

        if (insertError) throw insertError;
        console.log('Quote saved successfully:', savedQuote);

        // Send quote email
        try {
            console.log('Attempting to send email...');
            await sendQuoteEmail(savedQuote);
            console.log('Email sent successfully');

            // Update quote record to mark email as sent
            const { error: updateError } = await supabase
                .from('seed_name_badge_quotes')
                .update({ email_sent: true })
                .eq('id', savedQuote.id);

            if (updateError) {
                console.error('Error updating quote email status:', updateError);
            }

            res.json({ 
                success: true, 
                message: 'Quote submitted and email sent',
                quote: savedQuote
            });
        } catch (emailError) {
            console.error('Error sending email:', emailError);
            // Even if email fails, we still return success for the quote submission
            res.json({ 
                success: true, 
                message: 'Quote submitted but email failed to send',
                quote: savedQuote,
                emailError: emailError.message
            });
        }
    } catch (error) {
        console.error('Error processing quote:', error);
        res.status(500).json({ 
            error: error.message,
            details: error.details || null
        });
    }
});

// Create a Payment Intent
app.post('/api/v1/create-payment-intent', async (req, res) => {
    try {
        const { orderData } = req.body;
        console.log('Received order data:', orderData);
        
        if (!orderData || !orderData.total_cost) {
            throw new Error('Invalid order data: missing total_cost');
        }

        // Log the Stripe key being used (first 8 characters only for security)
        const keyPrefix = process.env.STRIPE_SECRET_KEY.substring(0, 8);
        console.log('Using Stripe key with prefix:', keyPrefix);

        // First create the order in Supabase
        const { data: order, error: orderError } = await supabase
            .from('seed_name_badge_orders')
            .insert([{
                quantity_with_guests: orderData.quantity_with_guests,
                quantity_without_guests: orderData.quantity_without_guests,
                size: orderData.size,
                printed_sides: orderData.printed_sides,
                ink_coverage: orderData.ink_coverage,
                lanyards: orderData.lanyards,
                shipping: orderData.shipping,
                paper_type: orderData.paper_type,
                first_name: orderData.first_name,
                last_name: orderData.last_name,
                company: orderData.company,
                email: orderData.email,
                total_quantity: orderData.total_quantity,
                total_cost: orderData.total_cost,
                gst_amount: orderData.gst_amount,
                co2_savings: parseFloat(Number(orderData.co2_savings).toFixed(2)),
                payment_status: 'pending',
                email_sent: false,
                stripe_payment_id: null,
                pdf_url: null
            }])
            .select()
            .single();

        if (orderError) {
            throw orderError;
        }

        console.log('Created order:', order);
        console.log('Creating payment intent with amount:', Math.round(orderData.total_cost * 100));
        
        // Create the payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(orderData.total_cost * 100),
            currency: 'aud',
            metadata: {
                order_id: order.id,
                email: orderData.email,
                project_id: process.env.PROJECT_ID
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        console.log('Payment intent created:', {
            id: paymentIntent.id,
            client_secret: 'present',
            livemode: paymentIntent.livemode,
            account: paymentIntent.account,
            project_id: paymentIntent.metadata.project_id
        });

        // Update order with payment intent ID
        const { error: updateError } = await supabase
            .from('seed_name_badge_orders')
            .update({ stripe_payment_id: paymentIntent.id })
            .eq('id', order.id);

        if (updateError) {
            console.error('Error updating order with payment intent:', updateError);
        }

        // Return the client secret directly
        res.json({ 
            clientSecret: paymentIntent.client_secret,
            orderId: order.id
        });
    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ error: error.message });
    }
});

// Verify the payment status and send confirmation
app.post('/api/v1/verify-payment', async (req, res) => {
    try {
        const { paymentIntentId, orderId } = req.body;
        console.log('Verifying payment for order:', orderId, 'with payment intent:', paymentIntentId);
        
        // Verify payment status with Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        console.log('Payment intent status:', paymentIntent.status);
        
        if (paymentIntent.status === 'succeeded') {
            console.log('Payment succeeded, updating order status...');
            
            try {
                // Step 1: First verify the order exists
                console.log('Verifying order exists...');
                const { data: existingOrder, error: fetchError } = await supabase
                    .from('seed_name_badge_orders')
                    .select('*')
                    .eq('id', orderId)
                    .single();

                if (fetchError) {
                    console.error('Error fetching order:', fetchError);
                    throw new Error(`Order ${orderId} not found`);
                }

                // Step 2: Update payment status
                console.log('Updating payment status...');
                
                // Log the update we're attempting
                const updateData = {
                    payment_status: 'completed',
                    stripe_payment_id: paymentIntentId,
                    email_sent: false
                };
                console.log('Attempting to update order with:', updateData);

                // Perform simple update
                const { data: updateResult, error: updateError } = await supabase
                    .from('seed_name_badge_orders')
                    .update(updateData)
                    .eq('id', orderId)
                    .eq('payment_status', 'pending')  // Only update if status is pending
                    .select();

                if (updateError) {
                    console.error('Update failed:', updateError);
                    throw new Error('Failed to update payment status: ' + updateError.message);
                }

                console.log('Raw update response:', { data: updateResult, error: updateError });

                if (!updateResult || updateResult.length === 0) {
                    console.error('No rows were updated');
                    
                    // Check current permissions
                    const { data: roleData, error: roleError } = await supabase.rpc('get_my_claims');
                    console.log('Current role/claims:', roleData, roleError);
                    
                    // Double check if order exists and its current state
                    const { data: checkOrder, error: checkError } = await supabase
                        .from('seed_name_badge_orders')
                        .select('*')
                        .eq('id', orderId)
                        .single();
                        
                    if (checkError) {
                        console.error('Error checking order:', checkError);
                        throw new Error('Failed to verify order state: ' + checkError.message);
                    } else {
                        console.log('Current order state:', checkOrder);
                        // Try one more time with a different approach
                        const { data: retryResult, error: retryError } = await supabase
                            .from('seed_name_badge_orders')
                            .update(updateData)
                            .match({ id: orderId })
                            .select();
                            
                        if (retryError || !retryResult || retryResult.length === 0) {
                            console.error('Retry update failed:', retryError);
                            throw new Error('Failed to update payment status after retry');
                        } else {
                            console.log('Retry update succeeded:', retryResult);
                            updateResult = retryResult;
                        }
                    }
                }

                // Use the updated order data
                const orderData = updateResult[0];
                console.log('Order updated successfully:', orderData);

                // Step 4: Send confirmation email
                console.log('Skipping email send - will be handled by webhook');
                
                // Return success response
                res.json({ 
                    success: true, 
                    order: orderData,
                    message: 'Payment processed successfully'
                });

            } catch (error) {
                console.error('Error in payment verification process:', error);
                res.status(500).json({ 
                    error: error.message,
                    details: error.details || null
                });
            }
        } else {
            console.log('Payment not succeeded:', paymentIntent.status);
            res.json({ success: false, status: paymentIntent.status });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get order details
app.get('/api/v1/get-order/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const { data: order, error } = await supabase
            .from('seed_name_badge_orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (error) {
            throw error;
        }

        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test endpoint to generate and view a PDF
app.get('/test-pdf', async (req, res) => {
    try {
        console.log('Starting test PDF generation...');
        
        const sampleOrderData = {
            id: 'TEST-123',
            first_name: 'John',
            last_name: 'Doe',
            company: 'Test Company',
            email: 'test@example.com',
            quantity_with_guests: 50,
            quantity_without_guests: 25,
            total_quantity: 75,
            size: 'A7',
            printed_sides: 'double',
            ink_coverage: 'over40',
            lanyards: true,
            shipping: 'standard',
            paper_type: 'mixedHerb',
            total_cost: 499.99,
            gst_amount: 45.45,
            co2_savings: 8.25,
            created_at: new Date().toISOString()
        };

        console.log('Generating PDF...');
        const pdfPath = await generateOrderPDF(sampleOrderData);
        console.log('PDF generated at:', pdfPath);

        if (!fs.existsSync(pdfPath)) {
            console.error('Generated PDF file not found at:', pdfPath);
            throw new Error('Generated PDF file not found');
        }

        // Set the content type to PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=test-order.pdf');
        
        // Read the file and send it directly
        const fileStream = fs.createReadStream(pdfPath);
        fileStream.on('error', (error) => {
            console.error('Error reading PDF file:', error);
            res.status(500).send('Error reading PDF file');
        });

        fileStream.pipe(res);

        // Clean up the file after it's sent
        res.on('finish', () => {
            fs.unlink(pdfPath, (err) => {
                if (err) console.error('Error cleaning up PDF file:', err);
                else console.log('PDF file cleaned up successfully');
            });
        });
    } catch (error) {
        console.error('Error in test-pdf endpoint:', error);
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
});

// Add endpoint to get order details
app.get('/api/v1/order/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        console.log('Fetching order details for:', orderId);
        
        const { data: order, error } = await supabase
            .from('seed_name_badge_orders')
            .select('*')
            .eq('id', orderId)
            .single();
            
        if (error) throw error;
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        // Format the amount with currency symbol and thousands separators
        const formattedAmount = new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD'
        }).format(order.total_cost);
        
        res.json({
            amount: formattedAmount,
            order_details: {
                first_name: order.first_name,
                last_name: order.last_name,
                company: order.company,
                email: order.email,
                quantity_with_guests: order.quantity_with_guests,
                quantity_without_guests: order.quantity_without_guests,
                size: order.size,
                printed_sides: order.printed_sides === 'double' ? 'Double sided' : 'Single sided',
                ink_coverage: order.ink_coverage === 'over40' ? 'Over 40%' : 'Up to 40%',
                lanyards: order.lanyards,
                shipping: order.shipping.charAt(0).toUpperCase() + order.shipping.slice(1),
                paper_type: order.paper_type.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, str => str.toUpperCase())
            }
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: error.message });
    }
});

// Stripe webhook endpoint
app.post('/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const rawBody = req.rawBody;

    try {
        const event = stripe.webhooks.constructEvent(
            rawBody,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        console.log('Received Stripe webhook event:', event.type);

        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            
            // Check if this payment is for this project
            if (paymentIntent.metadata.project_id !== process.env.PROJECT_ID) {
                console.log(`Payment for different project (${paymentIntent.metadata.project_id}), ignoring...`);
                return res.status(200).json({ received: true });
            }

            console.log('Payment succeeded:', paymentIntent.id);
            
            try {
                // Get the order ID from the payment intent metadata
                const orderId = paymentIntent.metadata.order_id;
                if (!orderId) {
                    throw new Error('No order ID in payment intent metadata');
                }
                
                console.log('Updating order status for order:', orderId);
                
                // Update the order status
                const { data: order, error: updateError } = await supabase
                    .from('seed_name_badge_orders')
                    .update({
                        payment_status: 'completed',
                        stripe_payment_id: paymentIntent.id
                    })
                    .eq('id', orderId)
                    .select()
                    .single();
                
                if (updateError) {
                    throw new Error(`Failed to update order status: ${updateError.message}`);
                }
                
                console.log('Order status updated:', order);
                
                // Check if email has already been sent
                if (order.email_sent) {
                    console.log('Email already sent for this order, skipping...');
                    return;
                }
                
                // Generate and send confirmation email
                try {
                    console.log('Sending confirmation email...');
                    await sendOrderConfirmationEmail(order);
                    
                    console.log('Updating email sent status and PDF URL in Supabase...');
                    // Update email sent status
                    const { error: emailUpdateError } = await supabase
                        .from('seed_name_badge_orders')
                        .update({
                            email_sent: true,
                            pdf_url: `${orderId}.pdf`
                        })
                        .eq('id', orderId);
                    
                    if (emailUpdateError) {
                        console.error('Failed to update email status:', emailUpdateError);
                        // Log error but don't throw, allow process to continue
                    }
                    
                    console.log('Email confirmation process completed');
                } catch (emailError) {
                    console.error('Error in email process:', {
                        message: emailError.message,
                        stack: emailError.stack,
                        orderId: orderId
                    });
                    // Log error but don't throw, allow webhook to complete
                }
            } catch (error) {
                console.error('Error processing payment success:', error);
                return res.status(500).send(`Webhook processing error: ${error.message}`);
            }
        } else {
            console.log('Received unknown webhook event:', event.type);
            res.status(200).json({ received: true });
        }
    } catch (err) {
        console.error('Webhook error:', err);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

// Error handler - must be after all other middleware
app.use((err, req, res, next) => {
    console.error('Express Error Handler:', err);
    
    // Ensure we're sending JSON
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        code: err.code || 'INTERNAL_SERVER_ERROR',
        details: err.details || null
    });
});

// Instead of starting the server, export the request handler
module.exports = app;

// Remove the listen call since Vercel will handle this
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// }); 