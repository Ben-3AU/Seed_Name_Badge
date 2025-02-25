export class Calculator {
    // Static constants for better performance and memory usage
    static GUEST_TAG_PRICE = 6.00;
    static STANDARD_TAG_PRICE = 5.00;
    static BULK_DISCOUNT_THRESHOLD = 300;
    static BULK_DISCOUNT_AMOUNT = 0.50;
    static GST_RATE = 0.10;
    static CO2_PER_TAG = 0.11;
    static LANYARD_MODIFIER = 0.50;
    static MARKUP_RATE = 1.10;
    static ADDITIONAL_MARKUP = 1.017;

    // Cached lookup tables for better performance
    static SIZE_MODIFIERS = {
        'A7': 0,
        'A6': 3.00
    };

    static SIDES_MODIFIERS = {
        'A7': { 'single': 0, 'double': 0.50 },
        'A6': { 'single': 0, 'double': 1.00 }
    };

    static INK_COVERAGE_MODIFIERS = {
        'A7': { 'upTo40': 0, 'over40': 0.50 },
        'A6': { 'upTo40': 0, 'over40': 1.00 }
    };

    static SHIPPING_COSTS = {
        'A7': {
            'standard': [
                { threshold: 200, cost: 20 },
                { threshold: 500, cost: 30 },
                { threshold: Infinity, cost: 50 }
            ],
            'express': [
                { threshold: 200, cost: 40 },
                { threshold: 500, cost: 60 },
                { threshold: Infinity, cost: 100 }
            ]
        },
        'A6': {
            'standard': [
                { threshold: 200, cost: 30 },
                { threshold: 500, cost: 45 },
                { threshold: Infinity, cost: 75 }
            ],
            'express': [
                { threshold: 200, cost: 60 },
                { threshold: 500, cost: 90 },
                { threshold: Infinity, cost: 150 }
            ]
        }
    };

    // Memoization cache for expensive calculations
    #cache = new Map();

    getTotalQuantity(withGuests, withoutGuests) {
        const key = `${withGuests}-${withoutGuests}`;
        if (this.#cache.has(key)) {
            return this.#cache.get(key);
        }
        const total = (parseInt(withGuests) || 0) + (parseInt(withoutGuests) || 0);
        this.#cache.set(key, total);
        return total;
    }

    calculateShippingCost(size, shipping, totalQuantity) {
        const key = `shipping-${size}-${shipping}-${totalQuantity}`;
        if (this.#cache.has(key)) {
            return this.#cache.get(key);
        }

        const costs = Calculator.SHIPPING_COSTS[size][shipping];
        const cost = costs.find(({ threshold }) => totalQuantity < threshold).cost;
        this.#cache.set(key, cost);
        return cost;
    }

    getTotalPrice(values) {
        const cacheKey = JSON.stringify(values);
        if (this.#cache.has(cacheKey)) {
            return this.#cache.get(cacheKey);
        }

        const { withGuests, withoutGuests, size, printedSides, inkCoverage, lanyards, shipping } = values;
        const totalQuantity = this.getTotalQuantity(withGuests, withoutGuests);
        
        // Base calculation with optimized operations
        let totalPrice = (withGuests * Calculator.GUEST_TAG_PRICE) + 
                        (withoutGuests * Calculator.STANDARD_TAG_PRICE);
        
        // Bulk discount
        if (totalQuantity > Calculator.BULK_DISCOUNT_THRESHOLD) {
            totalPrice -= Calculator.BULK_DISCOUNT_AMOUNT * totalQuantity;
        }
        
        // Apply modifiers in a single calculation
        totalPrice += (
            (Calculator.SIZE_MODIFIERS[size] +
            Calculator.SIDES_MODIFIERS[size][printedSides] +
            Calculator.INK_COVERAGE_MODIFIERS[size][inkCoverage]) * totalQuantity
        );
        
        // Lanyard modifier
        if (lanyards === 'no') {
            totalPrice -= Calculator.LANYARD_MODIFIER * totalQuantity;
        }
        
        // Add shipping and apply markups
        totalPrice = (totalPrice + this.calculateShippingCost(size, shipping, totalQuantity)) *
                    Calculator.MARKUP_RATE * Calculator.ADDITIONAL_MARKUP;
        
        const finalPrice = Number(totalPrice.toFixed(2));
        this.#cache.set(cacheKey, finalPrice);
        return finalPrice;
    }

    getGST(totalPrice) {
        const key = `gst-${totalPrice}`;
        if (this.#cache.has(key)) {
            return this.#cache.get(key);
        }
        const gst = Number((totalPrice * Calculator.GST_RATE / (1 + Calculator.GST_RATE)).toFixed(2));
        this.#cache.set(key, gst);
        return gst;
    }

    getCO2Savings(totalQuantity) {
        const key = `co2-${totalQuantity}`;
        if (this.#cache.has(key)) {
            return this.#cache.get(key);
        }
        const savings = Number((totalQuantity * Calculator.CO2_PER_TAG).toFixed(2));
        this.#cache.set(key, savings);
        return savings;
    }

    calculateOrderSummary(values) {
        const cacheKey = `summary-${JSON.stringify(values)}`;
        if (this.#cache.has(cacheKey)) {
            return this.#cache.get(cacheKey);
        }

        const totalQuantity = this.getTotalQuantity(values.withGuests, values.withoutGuests);
        const totalPrice = this.getTotalPrice(values);
        const gstAmount = this.getGST(totalPrice);
        const co2Savings = this.getCO2Savings(totalQuantity);

        const summary = {
            totalQuantity,
            totalPrice,
            gstAmount,
            co2Savings,
            subtotal: totalPrice - gstAmount
        };

        this.#cache.set(cacheKey, summary);
        return summary;
    }

    clearCache() {
        this.#cache.clear();
    }
} 