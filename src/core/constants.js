export const UI = {
    FONTS: {
        primary: "Verdana, system-ui, sans-serif",
        sizes: {
            small: '14px',
            medium: '16px',
            large: '18px',
            xlarge: '24px'
        }
    },
    COLORS: {
        primary: '#1b4c57',
        secondary: '#4a5568',
        text: {
            primary: '#1b4c57',
            secondary: '#4a5568',
            light: '#ffffff'
        },
        background: {
            main: '#ffffff',
            light: '#f7fafc',
            dark: '#e2e8f0'
        },
        success: '#48bb78',
        error: '#e53e3e',
        border: '#e2e8f0'
    },
    SPACING: {
        xs: '4px',
        small: '8px',
        medium: '16px',
        large: '24px',
        xlarge: '32px'
    },
    LABELS: {
        title: 'Tag Calculator',
        forms: {
            withGuests: 'Enter quantity with guest details printed',
            withoutGuests: 'Enter quantity without guest details printed',
            size: 'Size',
            printedSides: 'Printed sides',
            inkCoverage: 'Ink coverage',
            lanyards: 'Lanyards included',
            shipping: 'Shipping',
            firstName: 'First name',
            lastName: 'Last name',
            email: 'Email',
            company: 'Company',
            paperType: 'Paper type',
            cardName: 'Name on card'
        },
        buttons: {
            getQuote: 'Email the quote',
            payNow: 'Order Now',
            back: '← Back to Calculator',
            submit: 'Submit',
            checkout: 'Checkout'
        }
    },
    MESSAGES: {
        success: {
            quote: 'Quote sent! Please check your inbox.',
            payment: 'Payment successful! You will receive a confirmation email shortly.'
        },
        error: {
            quote: 'Failed to send quote. Please try again.',
            payment: 'Payment failed. Please check your details and try again.',
            validation: {
                minQuantity: 'Enter a minimum of 75 above',
                required: 'This field is required',
                email: 'Please enter a valid email address'
            },
            system: {
                stripe: 'Payment system not properly initialized. Please refresh the page.',
                general: 'An unexpected error occurred. Please try again.'
            }
        }
    },
    OPTIONS: {
        size: ['A7', 'A6'],
        printedSides: ['single', 'double'],
        inkCoverage: ['upTo40', 'over40'],
        lanyards: ['yes', 'no'],
        shipping: ['standard', 'express'],
        paperType: ['mixedHerb', 'mixedFlower', 'randomMix']
    },
    DISPLAY_VALUES: {
        inkCoverage: {
            upTo40: 'Up to 40%',
            over40: 'Over 40%'
        },
        printedSides: {
            single: 'Single sided',
            double: 'Double sided'
        },
        shipping: {
            standard: 'Standard',
            express: 'Express'
        },
        paperType: {
            mixedHerb: 'Mixed herb',
            mixedFlower: 'Mixed flower',
            randomMix: 'Random mix'
        }
    }
}; 