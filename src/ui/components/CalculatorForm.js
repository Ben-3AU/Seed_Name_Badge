import { UI } from '../../core/constants.js';
import { BaseForm } from './BaseForm.js';
import { Input } from './Input.js';
import { FormGroup, ButtonGroup, Card } from './UILibrary.js';
import { Calculator } from '../../core/calculator.js';
import { ErrorHandler } from '../../core/ErrorHandler.js';

export class CalculatorForm extends BaseForm {
    constructor({ state, calculator, stripe }) {
        super({
            state,
            calculator,
            formId: 'calculator-form'
        });
        this.stripe = stripe;
        this.preloadStripe();
        this.calculator = new Calculator();
        this.render();
    }

    async preloadStripe() {
        try {
            await this.stripe.initialize();
            console.log('Stripe preloaded successfully');
        } catch (error) {
            console.error('Failed to preload Stripe:', error);
        }
    }

    getRequiredFields() {
        return ['withGuests', 'withoutGuests'];
    }

    handleQuantityChange(event) {
        const { name, value } = event.target;
        this.eventHandler.handleInputChange(name, value, {
            validateImmediately: true,
            updateDisplay: true
        });
        
        if (this.eventHandler.validateQuantity()) {
            this.updateDisplay();
        }
    }

    createElement() {
        const form = super.createElement();
        
        // Create form content
        const content = this.createContainer('calculator-form-content');

        // Add form sections
        const sections = [
            this.createQuantityInputs(),
            this.createOptionsContainer(),
            this.createPriceDisplay(),
            this.createActionButtons()
        ];

        sections.forEach(section => content.appendChild(section));
        form.appendChild(content);

        return form;
    }

    createQuantityInputs() {
        const formGroup = new FormGroup();
        
        formGroup.addInput(new Input({
            name: 'withGuests',
            label: 'Quantity with Guest Names',
            type: 'number',
            min: 0,
            required: true,
            onChange: (e) => this.handleQuantityChange(e)
        }));
        
        formGroup.addInput(new Input({
            name: 'withoutGuests',
            label: 'Quantity without Guest Names',
            type: 'number',
            min: 0,
            required: true,
            onChange: (e) => this.handleQuantityChange(e)
        }));

        return formGroup.render();
    }

    createOptionsContainer() {
        const container = this.createContainer('options-container');

        const optionGroups = [
            { name: 'size', label: UI.LABELS.forms.size, options: UI.OPTIONS.size },
            { name: 'printedSides', label: UI.LABELS.forms.printedSides, options: UI.OPTIONS.printedSides },
            { name: 'inkCoverage', label: UI.LABELS.forms.inkCoverage, options: UI.OPTIONS.inkCoverage },
            { name: 'lanyards', label: UI.LABELS.forms.lanyards, options: UI.OPTIONS.lanyards },
            { name: 'shipping', label: UI.LABELS.forms.shipping, options: UI.OPTIONS.shipping }
        ];

        optionGroups.forEach(group => {
            container.appendChild(
                this.createOptionsGroup(group.name, group.label, group.options)
            );
        });

        return container;
    }

    createOptionsGroup(name, label, options) {
        const buttons = options.map(value => {
            const button = this.createElement('button', {
                type: 'button',
                className: `option-button ${this.state.get(`formData.${name}`) === value ? 'selected' : ''}`,
                textContent: UI.DISPLAY_VALUES[name]?.[value] || value,
                onclick: () => this.handleInputChange(name, value, { updateDisplay: true })
            });
            button.dataset.name = name;
            button.dataset.value = value;
            return button;
        });

        const buttonGroup = new ButtonGroup({ buttons, align: 'start' });

        const group = new FormGroup({
            label,
            children: [buttonGroup.render()]
        });

        return group.render();
    }

    createPriceDisplay() {
        const display = this.createContainer('price-display');
        display.id = 'priceDisplay';
        this.elements.set('priceDisplay', display);
        this.updateDisplay();
        return display;
    }

    createActionButtons() {
        const buttons = [
            {
                label: UI.LABELS.buttons.getQuote,
                type: 'secondary',
                onClick: () => this.handleQuoteClick()
            },
            {
                label: UI.LABELS.buttons.payNow,
                type: 'primary',
                onClick: () => this.handleOrderClick(),
                id: 'orderNowBtn'
            }
        ].map(({ label, type, onClick, id }) => {
            const button = this.createElement('button', {
                type: 'button',
                className: `terra-tag-button ${type}`,
                textContent: label,
                onclick: onClick,
                id
            });
            if (id) {
                this.elements.set('orderButton', button);
            }
            return button;
        });

        return new ButtonGroup({ buttons, align: 'space-between' }).render();
    }

    handleQuoteClick() {
        if (this.eventHandler.validateQuantity()) {
            this.eventHandler.handleNavigation('quote', false);
        }
    }

    async handleOrderClick() {
        if (!this.eventHandler.validateQuantity()) return;

        const orderButton = this.elements.get('orderButton');

        if (!this.stripe.isInitialized()) {
            await this.eventHandler.handleFormSubmit({
                type: 'stripe-init',
                submitButton: orderButton,
                service: async () => {
                    await this.stripe.initialize();
                    return { error: null };
                },
                onSuccess: () => this.eventHandler.handleNavigation('order', false)
            });
        } else {
            this.eventHandler.handleNavigation('order', false);
        }
    }

    updateDisplay() {
        const priceDisplay = this.elements.get('priceDisplay');
        if (!priceDisplay) return;

        const formData = this.state.get('formData');
        const { withGuests, withoutGuests } = formData;
        
        try {
            const result = this.calculator.calculate(withGuests, withoutGuests);
            
            const priceCard = new Card({
                title: 'Price Summary',
                content: `
                    <div class="price-summary">
                        <p>Total Quantity: ${result.totalQuantity}</p>
                        <p>Base Price: ${result.basePrice}</p>
                        <p>Discount: ${result.discount}%</p>
                        <p class="total-price">Total Price: ${result.totalPrice}</p>
                    </div>
                `
            });
            
            const existingCard = priceDisplay.querySelector('.card');
            if (existingCard) {
                existingCard.replaceWith(priceCard.render());
            } else {
                priceDisplay.appendChild(priceCard.render());
            }
        } catch (error) {
            this.errorHandler.handleError(error, {
                type: ErrorHandler.ERROR_TYPES.CALCULATION,
                component: this
            });
        }
    }

    updateUI(state) {
        super.updateUI(state);
        this.updateDisplay();
        
        // Update option buttons
        const formData = state.formData;
        Object.entries(formData).forEach(([name, value]) => {
            const buttons = this.element.querySelectorAll(`[data-name="${name}"]`);
            buttons.forEach(button => {
                button.classList.toggle('selected', button.dataset.value === value);
            });
        });
    }

    injectStyles() {
        this.addStyles(`
            .calculator-form-content {
                display: flex;
                flex-direction: column;
                gap: ${UI.SPACING.large};
            }

            .option-button {
                flex: 1;
                min-width: 120px;
                padding: ${UI.SPACING.medium};
                background: ${UI.COLORS.background.light};
                border: 1px solid ${UI.COLORS.border};
                border-radius: ${UI.BORDER_RADIUS.small};
                color: ${UI.COLORS.text.primary};
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .option-button:hover {
                border-color: ${UI.COLORS.primary};
            }

            .option-button.selected {
                background: ${UI.COLORS.primary}10;
                border-color: ${UI.COLORS.primary};
                color: ${UI.COLORS.primary};
            }

            .price-content {
                text-align: center;
            }

            .total-price {
                font-size: ${UI.FONTS.sizes.large};
                font-weight: bold;
                margin-bottom: ${UI.SPACING.small};
            }

            .price-breakdown {
                font-size: ${UI.FONTS.sizes.small};
                color: ${UI.COLORS.text.secondary};
            }

            .co2-savings {
                color: ${UI.COLORS.success};
                margin-top: ${UI.SPACING.small};
            }

            .warning-message {
                color: ${UI.COLORS.warning};
                text-align: center;
                padding: ${UI.SPACING.medium};
            }

            .price-summary {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
        `);
    }
} 