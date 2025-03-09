// Force dynamic to ensure logs are captured
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Handler for the test-logs endpoint
export default function handler(req, res) {
    // Log that we hit the endpoint
    console.log('Test logs endpoint hit');
    
    // Send a simple response
    res.status(200).json({ 
        message: 'Hello from test-logs endpoint',
        timestamp: new Date().toISOString()
    });
} 