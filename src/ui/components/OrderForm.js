import { UI } from '../../core/constants.js';
import { BaseForm } from './BaseForm.js';
import { createElement, retryOperation } from '../../utils/helpers.js';

export class OrderForm extends BaseForm {
    constructor(state, calculator) {
        super({
            state,
            calculator,
            storageKey: 'orderFormData'
        });
        this.initializeForm();
    }

    createElement() {
        const form = this.createFormStructure({
            formId: 'orderForm',
            formClass: 'order-form',
            inputs: [
                { name: 'firstName', label: UI.LABELS.order.firstName, type: 'text' },
                { name: 'lastName', label: UI.LABELS.order.lastName, type: 'text' },
                { name: 'email', label: UI.LABELS.order.email, type: 'email' }
            ]
        });

        // Paper type selection
        const paperTypeGroup = this.createPaperTypeButtons();
        form.appendChild(paperTypeGroup);

        // Submit button
        const submitButton = this.createSubmitButton(UI.LABELS.buttons.payNow);
        form.appendChild(submitButton);

        this.injectStyles();
        return form;
    }

    createPaperTypeButtons() {
        const group = createElement('div', {
            className: 'paper-type-group'
        });

        const label = createElement('label', {
            innerHTML: `${UI.LABELS.order.paperType}<span class="required">*</span>`
        });
        group.appendChild(label);

        const buttonGroup = createElement('div', {
            className: 'button-group'
        });

        UI.PAPER_TYPES.forEach(({ value, label, description }) => {
            const button = createElement('button', {
                type: 'button',
                className: 'option-button paper-type-button',
                'data-value': value,
                onclick: () => this.handlePaperTypeSelect(value),
                innerHTML: `
                    <strong>${label}</strong>
                    <span>${description}</span>
                `
            });
            buttonGroup.appendChild(button);
        });

        group.appendChild(buttonGroup);
        return group;
    }

    handlePaperTypeSelect(value) {
        const buttons = this.element.querySelectorAll('.paper-type-button');
        buttons.forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.value === value);
        });
        this.formManager.handleChange('paperType', value);
    }

    async handleSubmit(event) {
        event?.preventDefault();
        
        if (!this.formManager.isValid()) {
            return;
        }

        const submitButton = this.elements.get('submitButton');
        submitButton.setLoading(true);
        this.clearError();

        try {
            const formData = this.formManager.getValues();
            const orderData = {
                ...formData,
                ...this.calculator.calculateOrderSummary(this.state.getValues())
            };

            await retryOperation(async () => {
                const { orderId } = await this.state.saveOrder(orderData);
                const { clientSecret } = await this.state.createPaymentIntent(orderId);
                this.state.setOrderId(orderId);
                this.state.setClientSecret(clientSecret);
                this.state.setView('payment');
            });
        } catch (error) {
            this.showError(error.message);
        } finally {
            submitButton.setLoading(false);
        }
    }

    handleNavigateBack() {
        if (this.formManager.isDirty()) {
            if (confirm(UI.MESSAGES.unsavedChanges)) {
                this.state.setView('calculator');
            }
        } else {
            this.state.setView('calculator');
        }
    }

    injectStyles() {
        this.injectBaseStyles();
        
        injectStyles('terra-tag-order-form-styles', `
            .paper-type-group {
                margin-bottom: ${UI.SPACING.large};
            }

            .paper-type-group label {
                display: block;
                color: ${UI.COLORS.text.primary};
                font-size: ${UI.FONTS.sizes.small};
                margin-bottom: ${UI.SPACING.small};
            }

            .button-group {
                display: grid;
                gap: ${UI.SPACING.medium};
            }

            .paper-type-button {
                width: 100%;
                padding: ${UI.SPACING.medium};
                background: ${UI.COLORS.background.light};
                border: 1px solid ${UI.COLORS.border};
                border-radius: 4px;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s ease;
            }

            .paper-type-button strong {
                display: block;
                margin-bottom: ${UI.SPACING.xs};
                color: ${UI.COLORS.text.primary};
            }

            .paper-type-button span {
                display: block;
                font-size: ${UI.FONTS.sizes.small};
                color: ${UI.COLORS.text.secondary};
            }

            .paper-type-button:hover {
                border-color: ${UI.COLORS.primary};
            }

            .paper-type-button.selected {
                background: ${UI.COLORS.primary}10;
                border-color: ${UI.COLORS.primary};
            }
        `);
    }
} 