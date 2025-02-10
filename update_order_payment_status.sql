-- Drop existing function
DROP FUNCTION IF EXISTS update_order_payment_status(UUID, TEXT);

-- Function to update order payment status
CREATE OR REPLACE FUNCTION update_order_payment_status(order_id UUID, payment_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    rows_affected INTEGER;
BEGIN
    -- Try to update the order with minimal conditions
    UPDATE "seed_name_badge_orders"
    SET 
        payment_status = 'paid',
        stripe_payment_id = payment_id,
        email_sent = false
    WHERE id = order_id;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    
    -- Return true if any rows were affected
    RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql; 