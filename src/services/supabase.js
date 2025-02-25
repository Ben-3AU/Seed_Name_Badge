export class SupabaseService {
    constructor() {
        this.supabase = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            const response = await fetch('/api/config');
            if (!response.ok) {
                throw new Error('Failed to fetch Supabase configuration');
            }

            const { supabaseUrl, supabaseKey } = await response.json();
            if (!supabaseUrl || !supabaseKey) {
                throw new Error('Missing Supabase configuration');
            }

            this.supabase = createClient(supabaseUrl, supabaseKey);
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize Supabase:', error);
            this.initialized = false;
            throw error;
        }
    }

    isInitialized() {
        return this.initialized && this.supabase !== null;
    }

    async saveQuote(quoteData) {
        if (!this.isInitialized()) {
            throw new Error('Supabase not initialized');
        }

        try {
            const { data, error } = await this.supabase
                .from('quotes')
                .insert([{
                    first_name: quoteData.firstName,
                    email: quoteData.email,
                    quantity_with_guests: quoteData.withGuests,
                    quantity_without_guests: quoteData.withoutGuests,
                    total_quantity: quoteData.totalQuantity,
                    size: quoteData.size,
                    printed_sides: quoteData.printedSides,
                    ink_coverage: quoteData.inkCoverage,
                    lanyards: quoteData.lanyards,
                    shipping: quoteData.shipping,
                    total_cost: quoteData.totalCost,
                    gst_amount: quoteData.gstAmount,
                    co2_savings: quoteData.co2Savings,
                    created_at: new Date().toISOString()
                }])
                .select();

            if (error) throw error;
            return { data: data[0], error: null };
        } catch (error) {
            console.error('Failed to save quote:', error);
            return { data: null, error };
        }
    }

    async saveOrder(orderData) {
        if (!this.isInitialized()) {
            throw new Error('Supabase not initialized');
        }

        try {
            const { data, error } = await this.supabase
                .from('orders')
                .insert([{
                    first_name: orderData.firstName,
                    last_name: orderData.lastName,
                    email: orderData.email,
                    company: orderData.company,
                    quantity_with_guests: orderData.withGuests,
                    quantity_without_guests: orderData.withoutGuests,
                    total_quantity: orderData.totalQuantity,
                    size: orderData.size,
                    printed_sides: orderData.printedSides,
                    ink_coverage: orderData.inkCoverage,
                    lanyards: orderData.lanyards,
                    shipping: orderData.shipping,
                    paper_type: orderData.paperType,
                    total_cost: orderData.totalCost,
                    gst_amount: orderData.gstAmount,
                    co2_savings: orderData.co2Savings,
                    payment_status: 'pending',
                    created_at: new Date().toISOString()
                }])
                .select();

            if (error) throw error;
            return { data: data[0], error: null };
        } catch (error) {
            console.error('Failed to save order:', error);
            return { data: null, error };
        }
    }

    async updateOrderPaymentStatus(orderId, status) {
        if (!this.isInitialized()) {
            throw new Error('Supabase not initialized');
        }

        try {
            const { data, error } = await this.supabase
                .from('orders')
                .update({ payment_status: status })
                .eq('id', orderId)
                .select();

            if (error) throw error;
            return { data: data[0], error: null };
        } catch (error) {
            console.error('Failed to update order status:', error);
            return { data: null, error };
        }
    }

    async getOrder(orderId) {
        if (!this.isInitialized()) {
            throw new Error('Supabase not initialized');
        }

        try {
            const { data, error } = await this.supabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Failed to fetch order:', error);
            return { data: null, error };
        }
    }
} 