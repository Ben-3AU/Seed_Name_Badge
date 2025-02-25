const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { sendQuoteEmail, sendOrderConfirmationEmail, generateOrderPDF } = require('./emailService');
const { APIError, asyncHandler, errorHandler, validateRequest, rateLimit } = require('./src/utils/serverUtils');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');

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

// Middleware
app.use(express.json({
    verify: (req, res, buf) => {
        if (req.originalUrl === '/webhook') {
            req.rawBody = buf.toString();
        }
    }
}));

// CORS configuration
const corsOptions = {
    origin: [
        'https://seed-name-badge.vercel.app',
        'https://www.terratag.com.au',
        'https://terratag.com.au',
        process.env.CLIENT_URL
    ].filter(Boolean).map(url => url.startsWith('http') ? url : `https://${url}`),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Serve static files
app.use(express.static(path.join(__dirname)));
app.use('/src', express.static(path.join(__dirname, 'src')));

// Rate limiting
app.use(rateLimit());

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

// API Routes
app.get('/api/config', asyncHandler(async (req, res) => {
    if (!process.env.STRIPE_PUBLISHABLE_KEY) {
        throw new APIError('Missing Stripe configuration', 500);
    }
    res.json({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
}));

app.post('/api/submit-quote', asyncHandler(async (req, res) => {
    const quoteData = req.body;
    
    // Try to find existing quote
    const { data: existingQuotes, error: fetchError } = await supabase
        .from('seed_name_badge_quotes')
        .select('*')
        .eq('email', quoteData.email)
        .eq('first_name', quoteData.first_name)
        .order('created_at', { ascending: false })
        .limit(1);

    if (fetchError) {
        throw new APIError('Error fetching existing quote', 500, fetchError);
    }

    let savedQuote;
    if (existingQuotes && existingQuotes.length > 0) {
        // Update existing quote
        const { data, error: updateError } = await supabase
            .from('seed_name_badge_quotes')
            .update({
                ...quoteData,
                email_sent: false
            })
            .eq('id', existingQuotes[0].id)
            .select()
            .single();

        if (updateError) throw new APIError('Error updating quote', 500, updateError);
        savedQuote = data;
    } else {
        // Insert new quote
        const { data, error: insertError } = await supabase
            .from('seed_name_badge_quotes')
            .insert([{
                ...quoteData,
                email_sent: false
            }])
            .select()
            .single();

        if (insertError) throw new APIError('Error creating quote', 500, insertError);
        savedQuote = data;
    }

    // Send quote email
    await sendQuoteEmail(savedQuote);
    res.json({ success: true, quote: savedQuote });
}));

app.post('/api/create-payment-intent', asyncHandler(async (req, res) => {
    const { orderData } = req.body;
    
    if (!orderData || !orderData.total_cost) {
        throw new APIError('Invalid order data: missing total_cost', 400);
    }

    // Create order in Supabase
    const { data: order, error: orderError } = await supabase
        .from('seed_name_badge_orders')
        .insert([{
            ...orderData,
            payment_status: 'pending',
            email_sent: false,
            stripe_payment_id: null,
            pdf_url: null
        }])
        .select()
        .single();

    if (orderError) {
        throw new APIError('Error creating order', 500, orderError);
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(orderData.total_cost * 100),
        currency: 'aud',
        payment_method_types: ['card'],
        metadata: {
            order_id: order.id,
            email: orderData.email,
        }
    });

    // Update order with payment intent ID
    const { error: updateError } = await supabase
        .from('seed_name_badge_orders')
        .update({ stripe_payment_id: paymentIntent.id })
        .eq('id', order.id);

    if (updateError) {
        throw new APIError('Error updating order with payment intent ID', 500, updateError);
    }

    res.json({ 
        clientSecret: paymentIntent.client_secret,
        orderId: order.id
    });
}));

app.post('/api/verify-payment', asyncHandler(async (req, res) => {
    const { paymentIntentId, orderId } = req.body;

    // Retrieve payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
        // Verify order exists
        const { data: order, error: fetchError } = await supabase
            .from('seed_name_badge_orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (fetchError) {
            throw new APIError('Error fetching order', 500, fetchError);
        }

        if (!order) {
            throw new APIError('Order not found', 404);
        }

        // Generate PDF
        const pdfPath = await generateOrderPDF(order);
        
        // Send confirmation email
        await sendOrderConfirmationEmail(order);

        // Update order status
        const { error: updateError } = await supabase
            .from('seed_name_badge_orders')
            .update({
                payment_status: 'completed',
                email_sent: true,
                pdf_url: `${orderId}.pdf`
            })
            .eq('id', orderId);

        if (updateError) {
            throw new APIError('Error updating order status', 500, updateError);
        }

        // Clean up PDF file
        fs.unlink(pdfPath, (err) => {
            if (err) console.error('Error cleaning up PDF file:', err);
        });

        res.json({ 
            success: true, 
            order,
            message: 'Payment processed and email sent successfully'
        });
    } else {
        throw new APIError('Payment not succeeded', 400, { status: paymentIntent.status });
    }
}));

app.get('/api/order/:orderId', asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    
    const { data: order, error } = await supabase
        .from('seed_name_badge_orders')
        .select('*')
        .eq('id', orderId)
        .single();

    if (error) {
        throw new APIError('Error fetching order', 500, error);
    }

    if (!order) {
        throw new APIError('Order not found', 404);
    }

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
}));

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
                
                // Generate and send confirmation email
                try {
                    console.log('Sending confirmation email...');
                    await sendOrderConfirmationEmail(order);
                    
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
                    }
                    
                    console.log('Confirmation email sent and status updated');
                } catch (emailError) {
                    console.error('Error sending confirmation email:', emailError);
                }
            } catch (error) {
                console.error('Error processing payment success:', error);
                return res.status(500).send(`Webhook processing error: ${error.message}`);
            }
        }
        
        res.json({received: true});
    } catch (err) {
        console.error('Webhook error:', err);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Export the Express API
module.exports = app; 