// Force dynamic to ensure logs are captured
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Handler for the test-logs endpoint
export default async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
        return;
    }

    console.log('Standard log message from test-logs endpoint');
    console.info('Info level message from test-logs endpoint');
    console.warn('Warning level message from test-logs endpoint');
    console.error('Error level message from test-logs endpoint');
    
    // Test error handling
    try {
        throw new Error('Test error for logging');
    } catch (error) {
        console.error('Caught test error:', error);
    }
    
    // Log request details
    console.log('Request details:', {
        method: req.method,
        url: req.url,
        headers: req.headers,
        timestamp: new Date().toISOString()
    });
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Send response
    res.status(200).json({ 
        message: 'Test logs generated',
        timestamp: new Date().toISOString(),
        path: req.url,
        method: req.method,
        success: true
    });
} 