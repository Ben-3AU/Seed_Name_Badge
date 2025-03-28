// Terra Tag Calculator Widget
(function() {
    // Base URL for loading resources and making API calls
    const BASE_URL = 'https://seednamebadge.vercel.app';
    
    // Create and inject widget styles
    function injectStyles() {
        const styles = `
            /* Widget-specific styles */
            .terra-tag-widget {
                font-family: Verdana, sans-serif !important;
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                padding: 0;
                font-size: 16px;
            }

            /* iOS-specific overrides to prevent zoom */
            @supports (-webkit-touch-callout: none) {
                .terra-tag-widget input[type="text"],
                .terra-tag-widget input[type="email"],
                .terra-tag-widget input[type="number"],
                .terra-tag-widget input[type="tel"],
                .terra-tag-widget input[type="url"],
                .terra-tag-widget input[type="password"],
                .terra-tag-widget textarea,
                .terra-tag-widget select {
                    font-size: 16px !important;
                }
            }

            .terra-tag-widget * {
                box-sizing: border-box;
                font-family: Verdana, sans-serif !important;
            }

            .terra-tag-widget .calculator-heading {
                font-family: Verdana, sans-serif;
                font-size: 1.5rem;
                font-weight: normal;
                color: #1b4c57;
                text-align: center;
                margin-top: 0.5rem;
                margin-bottom: 2rem;
            }

            /* Calculator form styles */
            .terra-tag-widget .calculator-heading + .calculator-form {
                display: flex !important;
                flex-direction: column !important;
                gap: 1.5rem !important;  /* Controls spacing between question groups */
            }

            /* Base form group styles */
            .terra-tag-widget .calculator-heading + .calculator-form .form-group {
                display: flex !important;
                flex-direction: column !important;
                gap: 0.5rem !important;  /* Add gap between label and input/buttons */
                margin: 0 !important;
            }

            .terra-tag-widget .calculator-heading + .calculator-form .form-group > label {
                font-family: Verdana, sans-serif !important;
                font-size: 16px !important;
                font-weight: 500 !important;
                color: #1b4c57 !important;
                margin: 0 !important;
                padding: 0 !important;
                display: block !important;
                line-height: 1 !important;
                height: auto !important;
            }

            /* Special handling for paper type form group */
            .terra-tag-widget .form-group[data-type="paper-type"] {
                gap: 0.5rem !important;  /* Consistent gap for paper type group */
                margin: 0 !important;
            }

            /* Additional form group styles */
            .terra-tag-widget .additional-form {
                display: flex !important;
                flex-direction: column !important;
                gap: 1.5rem !important;  /* Controls spacing between form groups */
            }

            .terra-tag-widget .additional-form.hidden {
                display: none !important;
            }

            .terra-tag-widget .additional-form .form-group {
                display: flex !important;
                flex-direction: column !important;
                gap: 0.5rem !important;  /* Consistent gap between label and input/buttons */
                margin: 0 !important;
            }

            .terra-tag-widget .additional-form .form-group:last-child {
                margin-bottom: 0 !important;
            }

            /* Remove redundant label styles since they're now in the form-group > label selector */
            .terra-tag-widget .required {
                color: #e53e3e !important;
                margin-left: 2px !important;
            }

            .terra-tag-widget input[type="text"],
            .terra-tag-widget input[type="email"],
            .terra-tag-widget input[type="number"] {
                height: 40px !important;
                padding: 0 !important;
                text-indent: 1rem !important;
                line-height: normal !important;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                font-size: 16px;
                width: 100%;
                transition: border-color 0.2s ease;
                color: #1b4c57;
                font-family: Verdana, sans-serif !important;
                background-color: #ffffff;
                -webkit-appearance: none;  /* Remove spinner arrows */
                -moz-appearance: textfield;  /* Remove spinner arrows in Firefox */
            }

            .terra-tag-widget input[type="text"]::placeholder,
            .terra-tag-widget input[type="email"]::placeholder,
            .terra-tag-widget input[type="number"]::placeholder {
                color: #a0aec0;
                opacity: 1;
                text-indent: 1rem !important;
                padding: 0 !important;
            }

            /* Remove spinner arrows in Edge */
            .terra-tag-widget input[type="number"]::-webkit-outer-spin-button,
            .terra-tag-widget input[type="number"]::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
            }

            .terra-tag-widget input[type="text"]:focus,
            .terra-tag-widget input[type="email"]:focus,
            .terra-tag-widget input[type="number"]:focus {
                outline: none;
                border-color: #1b4c57;
                box-shadow: 0 0 0 3px rgba(27, 76, 87, 0.1);
            }

            .terra-tag-widget .button-group {
                display: flex;
                gap: 0;
            }

            .terra-tag-widget .option-button {
                flex: 1;
                padding: 0.75rem 1rem;
                font-family: Verdana, sans-serif;
                font-size: 16px;
                font-weight: normal;
                color: #1b4c57;
                background-color: #edf2f7;
                border: 1px solid #e2e8f0;
                border-radius: 0;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .terra-tag-widget .option-button:hover {
                background-color: #e2e8f0;
            }

            .terra-tag-widget .option-button.selected {
                background-color: #1b4c57;
                border-color: #1b4c57;
                color: white;
            }

            .terra-tag-widget .option-button:first-child {
                border-top-left-radius: 6px;
                border-bottom-left-radius: 6px;
            }

            .terra-tag-widget .option-button:last-child {
                border-top-right-radius: 6px;
                border-bottom-right-radius: 6px;
            }

            .terra-tag-widget #totalPrice {
                display: none !important;
                visibility: hidden !important;
            }

            .terra-tag-widget #totalPrice.show {
                display: block !important;
                visibility: visible !important;
            }

            .terra-tag-widget .total-price-container {
                background-color: #f7fafc;
                border-radius: 6px;
                border: 1px solid #e2e8f0;
                color: #1b4c57;
                text-align: center;
                padding: 1rem;
                display: block !important;
                visibility: visible !important;
                margin: 1rem 0 !important; /* Increased margin above and below */
            }

            .terra-tag-widget .total-price-container .total-cost {
                font-size: 2em;
                font-weight: 600;
            }

            .terra-tag-widget .total-price-container .gst-amount {
                display: block !important;
                font-family: Verdana, sans-serif !important;
                font-size: 0.9em !important;
                font-weight: normal !important;
                color: #1b4c57 !important;
                line-height: 1.2 !important;
                margin: 1rem 0 0 0 !important;
                text-align: center !important;
            }

            .terra-tag-widget .total-price-container .co2-savings {
                display: block !important;
                font-family: Verdana, sans-serif !important;
                font-size: 0.9em !important;
                font-weight: normal !important;
                color: #1b4c57 !important;
                line-height: 1.2 !important;
                margin: 3px 0 0 0 !important;
                text-align: center !important;
            }

            /* Views management */
            .terra-tag-widget .widget-view {
                display: none;
            }

            .terra-tag-widget .widget-view.active {
                display: block;
            }

           .terra-tag-widget .action-buttons {
                /* Remove margin-top since calculator-form gap handles spacing */
            }
           
            .terra-tag-widget .action-buttons .button-group {
                display: flex;
                gap: 0;
            }

            .terra-tag-widget .action-button {
                flex: 1;
                padding: 0.75rem 1rem;
                font-family: Verdana, sans-serif !important;
                font-size: 16px;
                font-weight: 600;
                color: #1b4c57;
                background-color: #edf2f7;
                border: 1px solid #e2e8f0;
                border-radius: 0;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .terra-tag-widget .action-button:hover {
                background-color: #e2e8f0;
            }

            .terra-tag-widget .action-button.selected {
                color: white;
                background-color: #1b4c57;
                border-color: #1b4c57;
            }

            .terra-tag-widget .action-button:first-child {
                border-top-left-radius: 6px;
                border-bottom-left-radius: 6px;
            }

            .terra-tag-widget .action-button:last-child {
                border-top-right-radius: 6px;
                border-bottom-right-radius: 6px;
            }

            .terra-tag-widget .submit-button {
                width: 100%;
                padding: 0.75rem 1rem;
                font-size: 16px;
                font-weight: 600;
                color: white;
                background-color: #1b4c57;
                border: 1px solid #1b4c57;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                margin-top: 1rem;
                position: relative;  /* Added for spinner positioning */
            }

            .terra-tag-widget .submit-button:hover:not(:disabled) {
                background-color: #163f48;
                border-color: #163f48;
            }

            .terra-tag-widget .submit-button:disabled {
                background-color: #cbd5e0;
                border-color: #cbd5e0;
                cursor: not-allowed;
            }

            .terra-tag-widget .quote-success-message {
                color: #83A764;
                text-align: center;
                margin-top: -0.5rem;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .terra-tag-widget .quote-success-message.visible {
                opacity: 1;
            }

            /* Paper type button specific styles */
            .terra-tag-widget [data-name="paperType"].option-button {
                flex: 1;
                border-radius: 0;
                margin-right: 0;
            }

            .terra-tag-widget [data-name="paperType"].option-button:first-child {
                border-top-left-radius: 6px;
                border-bottom-left-radius: 6px;
            }

            .terra-tag-widget [data-name="paperType"].option-button:last-child {
                border-top-right-radius: 6px;
                border-bottom-right-radius: 6px;
                margin-right: 0;
            }

            /* Payment view styles */
            .terra-tag-widget .payment-container {
                max-width: 600px;
                margin: 0 auto;
                padding: 0 20px 20px 20px;
            }

            .terra-tag-widget .back-link {
                display: flex;
                align-items: center;
                color: #1b4c57;
                text-decoration: none;
                margin-bottom: 6px;
                font-size: 16px;
                font-family: Verdana, sans-serif;
            }

            .terra-tag-widget .back-link:hover {
                text-decoration: underline;
            }

            /* Base styles for order details container */
            .terra-tag-widget .order-details {
                container-type: inline-size;
                container-name: order-details;
                width: 100%;
                background-color: #f8f9fa;
                padding: 0.5rem 24px 0.5rem 24px;
                border-radius: 6px;
                margin-bottom: 24px;
            }

            .terra-tag-widget .order-details h2 {
                font-family: Verdana, sans-serif;
                font-size: 2em;
                font-weight: 600;
                color: #1b4c57;
                margin: 0 0 24px 16px;
                padding: 0;
                line-height: 1.2;
            }

            /* Base table structure - always maintain table layout by default */
            .terra-tag-widget .order-summary {
                display: table !important;
                width: 100% !important;
                border-spacing: 0 !important;
                margin-bottom: 16px !important;
                color: #1b4c57 !important;
                font-family: Verdana, sans-serif !important;
                font-size: 0.9em !important;
                padding: 0 16px !important;
                table-layout: fixed !important;
            }

            .terra-tag-widget .summary-row {
                display: table-row !important;
            }

            .terra-tag-widget .summary-row .label,
            .terra-tag-widget .summary-row .value {
                display: table-cell !important;
                padding: 4px 0 !important;
                vertical-align: top !important;
                line-height: 1.4 !important;
            }

            .terra-tag-widget .summary-row .label {
                min-width: 240px !important;
                max-width: 240px !important;
                padding-right: 24px !important;
                white-space: nowrap !important;
                color: #1b4c57 !important;
            }

            .terra-tag-widget .summary-row .value {
                min-width: 200px !important;
                color: #1b4c57 !important;
                word-wrap: break-word !important;
                word-break: break-word !important;
            }

            /* Container query for small screens - stack when container can't maintain minimums */
            @container order-details (max-width: 440px) {
                .terra-tag-widget .order-summary {
                    display: block !important;
                    padding: 0 8px !important;
                }

                .terra-tag-widget .order-details h2 {
                    text-align: left !important;
                    margin-left: 8px !important;
                }

                .terra-tag-widget .summary-row {
                    display: block !important;
                    margin-bottom: 12px !important;
                }

                .terra-tag-widget .summary-row .label,
                .terra-tag-widget .summary-row .value {
                    display: block !important;
                    width: 100% !important;
                    min-width: 240px !important;
                    padding: 0 !important;
                }

                .terra-tag-widget .summary-row .label {
                    margin-bottom: 4px !important;
                    font-weight: 500 !important;
                }

                .terra-tag-widget .summary-row .value {
                    min-width: unset !important;
                    word-wrap: break-word !important;
                    word-break: break-word !important;
                }
            }

            /* Media query fallback for browsers without container query support */
            @media screen and (max-width: 440px) {
                .terra-tag-widget .order-summary {
                    display: block !important;
                    padding: 0 8px !important;
                }

                .terra-tag-widget .order-details h2 {
                    text-align: left !important;
                    margin-left: 8px !important;
                }

                .terra-tag-widget .summary-row {
                    display: block !important;
                    margin-bottom: 12px !important;
                }

                .terra-tag-widget .summary-row .label,
                .terra-tag-widget .summary-row .value {
                    display: block !important;
                    width: 100% !important;
                    min-width: 240px !important;
                    padding: 0 !important;
                }

                .terra-tag-widget .summary-row .label {
                    margin-bottom: 4px !important;
                    font-weight: 500 !important;
                }

                .terra-tag-widget .summary-row .value {
                    min-width: unset !important;
                    word-wrap: break-word !important;
                    word-break: break-word !important;
                }
            }

            .terra-tag-widget .total-amount {
                font-size: 1.2em;
                font-weight: bold;
                color: #1b4c57;
                text-align: left;
                margin: 16px 0 0 16px;
                padding-bottom: 0;
            }

            @media screen and (max-width: 600px) {
                .terra-tag-widget .total-amount {
                    padding-left: 8px;
                    text-align: center;
                }
            }

            .terra-tag-widget .card-name-group {
                margin-bottom: 24px;
            }

            .terra-tag-widget .card-name-group label {
                display: block !important;
                margin-bottom: 3px !important;
                color: #30313d !important;
                font-family: "Ideal Sans", system-ui, sans-serif !important;
                font-size: 0.9em !important;
                font-weight: normal !important;
                line-height: 1.2 !important;
            }

            .terra-tag-widget .card-name-group input {
                width: 100% !important;
                padding: 12px !important;
                border: 1px solid #e2e8f0 !important;
                border-radius: 6px !important;
                font-size: 16px !important;
                font-family: "Ideal Sans", system-ui, sans-serif !important;
                color: #1b4c57 !important;
                background-color: #ffffff !important;
                transition: border-color 0.15s ease !important;
                box-shadow: 0px 1px 1px rgba(0, 0, 0, 0.03), 0px 3px 6px rgba(0, 0, 0, 0.02) !important;
                text-indent: 0 !important;  /* Remove text indent to match Stripe Elements */
            }

            .terra-tag-widget .card-name-group input:focus {
                outline: none !important;
                border-color: #1b4c57 !important;
                box-shadow: 0 1px 1px 0 rgba(0, 0, 0, 0.1), 0 0 0 4px rgba(27, 76, 87, 0.1) !important;
            }

            .terra-tag-widget #payment-element {
                margin-bottom: 24px;
                --elements-label-color: #1b4c57;
                --elements-label-spacing: 3px;
                font-family: Verdana, sans-serif;
                --elements-label-font-size: 0.9em;
            }

            .terra-tag-widget .payment-button {
                background: #1b4c57;
                color: #ffffff;
                border: none;
                padding: 0.75rem 1rem;
                border-radius: 6px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                display: block;
                transition: all 0.2s ease;
                width: 100%;
                font-family: Verdana, sans-serif;
            }

            .terra-tag-widget .payment-button:hover {
                background: #163f48;
            }

            .terra-tag-widget .payment-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .terra-tag-widget .spinner {
                display: none;
                width: 20px;
                height: 20px;
                border: 2px solid #ffffff;
                border-radius: 50%;
                border-top-color: transparent;
                animation: spin 1s linear infinite;
                margin-right: 8px;
            }

            .terra-tag-widget .button-content {
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .terra-tag-widget .loading .spinner {
                display: inline-block;
            }

            @keyframes spin {
                to {
                    transform: rotate(360deg);
                }
            }

            /* Autofill Override Styles */
            html body .terra-tag-widget input[type="text"]:-webkit-autofill,
            html body .terra-tag-widget input[type="email"]:-webkit-autofill,
            html body .terra-tag-widget input[type="number"]:-webkit-autofill,
            html body .terra-tag-widget input[type="text"]:-webkit-autofill:hover,
            html body .terra-tag-widget input[type="email"]:-webkit-autofill:hover,
            html body .terra-tag-widget input[type="number"]:-webkit-autofill:hover,
            html body .terra-tag-widget input[type="text"]:-webkit-autofill:focus,
            html body .terra-tag-widget input[type="email"]:-webkit-autofill:focus,
            html body .terra-tag-widget input[type="number"]:-webkit-autofill:focus,
            html body .terra-tag-widget input[type="text"]:-webkit-autofill:active,
            html body .terra-tag-widget input[type="email"]:-webkit-autofill:active,
            html body .terra-tag-widget input[type="number"]:-webkit-autofill:active {
                -webkit-box-shadow: 0 0 0 30px white inset !important;
                box-shadow: 0 0 0 30px white inset !important;
                -webkit-text-fill-color: #1b4c57 !important;
                color: #1b4c57 !important;
                font-family: Verdana, sans-serif !important;
                font-size: 16px !important;
                font-weight: normal !important;
                padding: 0 !important;
                text-indent: 1rem !important;
                transition: background-color 5000s ease-in-out 0s !important;
                background-color: white !important;
            }

            /* Firefox Autofill Override */
            html body .terra-tag-widget input[type="text"]:autofill,
            html body .terra-tag-widget input[type="email"]:autofill,
            html body .terra-tag-widget input[type="number"]:autofill,
            html body .terra-tag-widget input[type="text"]:-moz-autofill,
            html body .terra-tag-widget input[type="email"]:-moz-autofill,
            html body .terra-tag-widget input[type="number"]:-moz-autofill {
                background-color: white !important;
                color: #1b4c57 !important;
                font-family: Verdana, sans-serif !important;
                font-size: 16px !important;
                font-weight: normal !important;
                padding: 0 !important;
                text-indent: 1rem !important;
            }

            /* Success view styles */
            .terra-tag-widget .success-container {
                text-align: center !important;
                padding: 2rem !important;
                max-width: 600px !important;
                margin: 2rem auto !important;
                background-color: #fff !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
            }

            .terra-tag-widget .success-icon {
                color: #83A764 !important;
                font-size: 8rem !important;
                margin-bottom: 1rem !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                width: 100% !important;
                height: auto !important;
                text-align: center !important;
                line-height: 1 !important;
            }

            .terra-tag-widget .success-message {
                font-family: Verdana, sans-serif !important;
                font-size: 2em !important;
                color: #1b4c57 !important;
                margin-bottom: 1rem !important;
                text-align: center !important;
                font-weight: bold !important;
                line-height: 1.2 !important;
                width: 100% !important;
                padding: 0 !important;
            }

            .terra-tag-widget .success-text {
                font-family: Verdana, sans-serif !important;
                font-size: 1em !important;
                color: #1b4c57 !important;
                text-align: center !important;
                line-height: 1.5 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                font-weight: normal !important;
            }

            .terra-tag-widget .button {
                padding: 0.75rem 1rem;
                font-size: 1rem;
                font-weight: 600;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                border: none;
            }

            .terra-tag-widget .button-primary {
                background-color: #1b4c57;
                color: white;
            }

            .terra-tag-widget .button-primary:hover {
                background-color: #163f48;
            }

            .terra-tag-widget .spinner {
                display: none;
                width: 20px;
                height: 20px;
                border: 2px solid #ffffff;
                border-radius: 50%;
                border-top-color: transparent;
                animation: spin 1s linear infinite;
            }

            .terra-tag-widget .loading .spinner {
                display: inline-block;
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    // Create widget HTML structure
    function createWidgetStructure() {
        const widgetContainer = document.createElement('div');
        widgetContainer.className = 'terra-tag-widget';
        
        // Calculator view
        const calculatorView = document.createElement('div');
        calculatorView.className = 'widget-view calculator-view active';
        calculatorView.innerHTML = `
            <h1 class="calculator-heading">Minimum order of 80</h1>
            <form id="calculatorForm" class="calculator-form">
                <div class="form-group">
                    <label for="quantityWithGuests">Enter quantity with guest details printed</label>
                    <input type="number" id="quantityWithGuests" name="quantityWithGuests" min="0" placeholder="0">
                </div>

                <div class="form-group">
                    <label for="quantityWithoutGuests">Enter quantity without guest details printed</label>
                    <input type="number" id="quantityWithoutGuests" name="quantityWithoutGuests" min="0" placeholder="0">
                </div>

                <div class="form-group">
                    <label>Size</label>
                    <div class="button-group">
                        <button type="button" class="option-button selected" data-name="size" data-value="A7">A7</button>
                        <button type="button" class="option-button" data-name="size" data-value="A6">A6</button>
                    </div>
                </div>

                <div class="form-group">
                    <label>Printed sides</label>
                    <div class="button-group">
                        <button type="button" class="option-button selected" data-name="printedSides" data-value="single">Single sided</button>
                        <button type="button" class="option-button" data-name="printedSides" data-value="double">Double sided</button>
                    </div>
                </div>

                <div class="form-group">
                    <label>Ink coverage</label>
                    <div class="button-group">
                        <button type="button" class="option-button selected" data-name="inkCoverage" data-value="upTo40">Up to 40%</button>
                        <button type="button" class="option-button" data-name="inkCoverage" data-value="over40">Over 40%</button>
                    </div>
                </div>

                <div class="form-group">
                    <label>Lanyards included</label>
                    <div class="button-group">
                        <button type="button" class="option-button selected" data-name="lanyards" data-value="yes">Yes</button>
                        <button type="button" class="option-button" data-name="lanyards" data-value="no">No</button>
                    </div>
                </div>

                <div class="form-group">
                    <label>Shipping</label>
                    <div class="button-group">
                        <button type="button" class="option-button selected" data-name="shipping" data-value="standard">Standard</button>
                        <button type="button" class="option-button" data-name="shipping" data-value="express">Express</button>
                    </div>
                </div>

                <div id="totalPrice" class="total-price">
                    <!-- Price content will be displayed here -->
                </div>

                <div id="actionButtons" class="action-buttons" style="display: none;">
                    <div class="button-group">
                        <button type="button" class="action-button" id="orderNowBtn">Order now</button>
                        <button type="button" class="action-button" id="emailQuoteBtn">Email the quote</button>
                    </div>
                </div>

                <!-- Email Quote Form -->
                <div id="emailQuoteForm" class="additional-form" style="display: none;">
                    <div class="form-group">
                        <label for="quoteFirstName">First name</label>
                        <input type="text" id="quoteFirstName" name="quoteFirstName" required>
                    </div>
                    <div class="form-group">
                        <label for="quoteEmail">Email</label>
                        <input type="email" id="quoteEmail" name="quoteEmail" required>
                    </div>
                    <button type="button" class="submit-button" id="submitQuoteBtn" disabled>Submit</button>
                    <div id="quoteSuccessMessage" class="quote-success-message">Quote sent! Please check your inbox.</div>
                </div>

                <!-- Order Form -->
                <div id="orderForm" class="additional-form" style="display: none;">
                    <div class="form-group">
                        <label for="orderFirstName">First name</label>
                        <input type="text" id="orderFirstName" name="orderFirstName" required>
                    </div>
                    <div class="form-group">
                        <label for="orderLastName">Last name</label>
                        <input type="text" id="orderLastName" name="orderLastName" required>
                    </div>
                    <div class="form-group">
                        <label for="orderCompany">Company</label>
                        <input type="text" id="orderCompany" name="orderCompany">
                    </div>
                    <div class="form-group">
                        <label for="orderEmail">Email</label>
                        <input type="email" id="orderEmail" name="orderEmail" required>
                    </div>
                    <div class="form-group" data-type="paper-type">
                        <label>Paper type</label>
                        <div class="button-group">
                            <button type="button" class="option-button" data-name="paperType" data-value="mixedHerb">Mixed herb</button>
                            <button type="button" class="option-button" data-name="paperType" data-value="mixedFlower">Mixed flower</button>
                            <button type="button" class="option-button" data-name="paperType" data-value="randomMix">Random mix</button>
                        </div>
                    </div>
                    <button type="button" class="submit-button" id="payNowBtn" disabled>Checkout</button>
                </div>
            </form>
        `;

        // Payment view (initially hidden)
        const paymentView = document.createElement('div');
        paymentView.className = 'widget-view payment-view';
        paymentView.innerHTML = `
            <div class="payment-container">
                <a href="#" class="back-link">← Back</a>
                <div class="order-details">
                    <h2>Order Summary</h2>
                    <div id="order-summary" class="order-summary">
                        <!-- Order details will be populated here -->
                    </div>
                    <div id="order-amount" class="total-amount"></div>
                </div>
                <form id="payment-form">
                    <div class="form-group card-name-group">
                        <label for="card-name">Name on card</label>
                        <input id="card-name" type="text" required>
                    </div>
                    <div id="payment-element"></div>
                    <button id="submit-payment" class="payment-button">
                        <div class="spinner" id="spinner"></div>
                        <span id="button-text">Pay now</span>
                    </button>
                    <div id="payment-message"></div>
                </form>
            </div>
        `;
        
        // Success view (initially hidden)
        const successView = document.createElement('div');
        successView.className = 'widget-view success-view';
        successView.innerHTML = `
            <div class="success-container">
                <div class="success-icon">✓</div>
                <h2 class="success-message">Payment Successful!</h2>
                <p class="success-text">Thanks for your order - we've emailed your tax receipt.</p>
                <p class="success-text">We'll contact you shortly to discuss your artwork requirements. Thanks for going green with us.</p>
            </div>
        `;

        // Append all views to the widget container
        widgetContainer.appendChild(calculatorView);
        widgetContainer.appendChild(paymentView);
        widgetContainer.appendChild(successView);

        // Find the target element or create one if it doesn't exist
        let targetElement = document.getElementById('terra-tag-calculator');
        if (!targetElement) {
            targetElement = document.createElement('div');
            targetElement.id = 'terra-tag-calculator';
            document.body.appendChild(targetElement);
        }

        // Insert the widget into the target element
        targetElement.appendChild(widgetContainer);
    }

    // Initialize the widget
    function initWidget() {
        return new Promise((resolve, reject) => {
            // First check if Stripe is already loaded
            if (window.Stripe) {
                loadCalculator();
            } else {
                // Load required external scripts sequentially
                loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/umd/supabase.min.js')
                    .then(() => loadScript('https://js.stripe.com/v3/'))
                    .then(() => loadCalculator())
                    .catch(reject);
            }

            function loadCalculator() {
                loadScript(`${BASE_URL}/widget-calculator.js`)
                    .then(() => {
                        // Ensure the calculator is initialized after DOM is ready
                        if (document.readyState === 'loading') {
                            document.addEventListener('DOMContentLoaded', () => {
                                if (typeof initializeCalculator === 'function') {
                                    initializeCalculator(BASE_URL);
                                    resolve();
                                } else {
                                    reject(new Error('Calculator initialization failed'));
                                }
                            });
                        } else {
                            if (typeof initializeCalculator === 'function') {
                                initializeCalculator(BASE_URL);
                                resolve();
                            } else {
                                reject(new Error('Calculator initialization failed'));
                            }
                        }
                    })
                    .catch(reject);
            }
        });
    }

    // Load a script and return a promise
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            // Add version parameter for cache busting
            const timestamp = Date.now();
            script.src = src.includes('widget') ? `${src}?v=${timestamp}` : src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Main initialization
    async function initialize() {
        try {
            // Check if we're on the main application page
            const mainAppForm = document.querySelector('form.calculator-form:not(.terra-tag-widget *)');
            if (mainAppForm) {
                console.log('Widget detected on main application page - not initializing');
                return;
            }

            injectStyles();
            createWidgetStructure();
            await initWidget();
        } catch (error) {
            console.error('Widget initialization error:', error);
        }
    }

    // Start the widget
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();