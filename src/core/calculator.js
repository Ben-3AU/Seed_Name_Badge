import { UI } from './constants.js';

export class Calculator {
    static PRICING = {
        GUEST_TAG: 6.00,
        STANDARD_TAG: 5.00,
        BULK_DISCOUNT_THRESHOLD: 300,
        BULK_DISCOUNT_AMOUNT: 0.50,
        GST_RATE: 1/11,
        CO2_PER_TAG: 0.11,
        MARKUP: 1.10,
        ADDITIONAL_MARKUP: 1.017,
        SIZE_MODIFIERS: {
            'A7': 0,
            'A6': 3.00
        },
        SIDES_MODIFIERS: {
            'A7': { 'single': 0, 'double': 0.50 },
            'A6': { 'single': 0, 'double': 1.00 }
        },
        INK_COVERAGE_MODIFIERS: {
            'A7': { 'upTo40': 0, 'over40': 0.50 },
            'A6': { 'upTo40': 0, 'over40': 1.00 }
        },
        SHIPPING_COSTS: {
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
        }
    };

    constructor() {
        this.cache = new Map();
    }

    getTotalQuantity(withGuests, withoutGuests) {
        const key = `quantity-${withGuests}-${withoutGuests}`;
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        const total = (parseInt(withGuests) || 0) + (parseInt(withoutGuests) || 0);
        this.cache.set(key, total);
        return total;
    }

    calculateShippingCost(size, shipping, totalQuantity) {
        const key = `shipping-${size}-${shipping}-${totalQuantity}`;
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        const costs = Calculator.PRICING.SHIPPING_COSTS[size][shipping];
        const { cost } = costs.find(({ threshold }) => totalQuantity < threshold);
        this.cache.set(key, cost);
        return cost;
    }

    getTotalPrice(values) {
        const key = `price-${JSON.stringify(values)}`;
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        const { withGuests, withoutGuests, size, printedSides, inkCoverage, lanyards, shipping } = values;
        const totalQuantity = this.getTotalQuantity(withGuests, withoutGuests);
        
        // Base price calculation
        let totalPrice = (withGuests * Calculator.PRICING.GUEST_TAG) + 
                        (withoutGuests * Calculator.PRICING.STANDARD_TAG);
        
        // Apply bulk discount
        if (totalQuantity > Calculator.PRICING.BULK_DISCOUNT_THRESHOLD) {
            totalPrice -= Calculator.PRICING.BULK_DISCOUNT_AMOUNT * totalQuantity;
        }
        
        // Apply size and options modifiers
        totalPrice += (
            Calculator.PRICING.SIZE_MODIFIERS[size] +
            Calculator.PRICING.SIDES_MODIFIERS[size][printedSides] +
            Calculator.PRICING.INK_COVERAGE_MODIFIERS[size][inkCoverage]
        ) * totalQuantity;
        
        // Apply shipping cost
        totalPrice += this.calculateShippingCost(size, shipping, totalQuantity);
        
        // Apply markups
        totalPrice *= Calculator.PRICING.MARKUP * Calculator.PRICING.ADDITIONAL_MARKUP;
        
        const finalPrice = Number(totalPrice.toFixed(2));
        this.cache.set(key, finalPrice);
        return finalPrice;
    }

    getGST(totalPrice) {
        const key = `gst-${totalPrice}`;
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        const gst = Number((totalPrice * Calculator.PRICING.GST_RATE).toFixed(2));
        this.cache.set(key, gst);
        return gst;
    }

    getCO2Savings(totalQuantity) {
        const key = `co2-${totalQuantity}`;
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        const savings = Number((totalQuantity * Calculator.PRICING.CO2_PER_TAG).toFixed(2));
        this.cache.set(key, savings);
        return savings;
    }

    calculateOrderSummary(values) {
        const cacheKey = `summary-${JSON.stringify(values)}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
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

        this.cache.set(cacheKey, summary);
        return summary;
    }

    clearCache() {
        this.cache.clear();
    }
} 