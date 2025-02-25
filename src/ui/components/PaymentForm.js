import { UI } from '../../core/constants.js';
import { BaseForm } from './BaseForm.js';
import { createElement, retryOperation } from '../../utils/helpers.js';

export class PaymentForm extends BaseForm {
    constructor(state, calculator) {
        super({
            state,
            calculator,
            storageKey: 'paymentFormData'
        });
        this.paymentElement = null;
        this.initializeForm();
    }

    createElement() {
        const form = this.createFormStructure({
            formId: 'paymentForm',
            formClass: 'payment-form',
            inputs: []
        });

        // Payment element container
        const paymentContainer = createElement('div', {
            id: 'payment-element'
        });
        form.appendChild(paymentContainer);

        // Order summary
        const summary = this.createOrderSummary();
        form.appendChild(summary);

        // Submit button
        const submitButton = this.createSubmitButton(UI.LABELS.buttons.confirmPayment);
        form.appendChild(submitButton);

        this.injectStyles();
        this.initializePaymentElement();
        return form;
    }

    createOrderSummary() {
        const summary = createElement('div', {
            className: 'order-summary'
        });

        const values = this.state.getValues();
        const { totalQuantity, totalPrice, gstAmount, co2Savings } = this.calculator.calculateOrderSummary(values);

        summary.innerHTML = `
            <h3>${UI.LABELS.payment.summary}</h3>
            <div class="summary-item">
                <span>${UI.LABELS.payment.quantity}</span>
                <span>${totalQuantity}</span>
            </div>
            <div class="summary-item">
                <span>${UI.LABELS.payment.subtotal}</span>
                <span>$${(totalPrice - gstAmount).toFixed(2)}</span>
            </div>
            <div class="summary-item">
                <span>${UI.LABELS.payment.gst}</span>
                <span>$${gstAmount.toFixed(2)}</span>
            </div>
            <div class="summary-item total">
                <span>${UI.LABELS.payment.total}</span>
                <span>$${totalPrice.toFixed(2)}</span>
            </div>
            <div class="co2-savings">
                <span>${UI.LABELS.payment.co2Savings}</span>
                <span>${co2Savings.toFixed(2)} kg</span>
            </div>
        `;

        return summary;
    }

    async initializePaymentElement() {
        const clientSecret = this.state.getClientSecret();
        if (!clientSecret) {
            this.showError(UI.MESSAGES.error.payment.noClientSecret);
            return;
        }

        try {
            await retryOperation(async () => {
                const { stripe, elements } = await this.state.getStripeElements();
                const paymentElement = elements.create('payment');
                await paymentElement.mount('#payment-element');
                this.paymentElement = paymentElement;
            });
        } catch (error) {
            this.showError(error.message);
        }
    }

    async handleSubmit(event) {
        event?.preventDefault();

        const submitButton = this.elements.get('submitButton');
        submitButton.setLoading(true);
        this.clearError();

        try {
            const { stripe } = await this.state.getStripeElements();
            const { error } = await retryOperation(() => 
                stripe.confirmPayment({
                    elements: this.paymentElement,
                    confirmParams: {
                        return_url: window.location.origin + '/payment-success'
                    }
                })
            );

            if (error) {
                throw error;
            }
        } catch (error) {
            this.showError(error.message);
            submitButton.setLoading(false);
        }
    }

    handleNavigateBack() {
        this.state.setView('order');
    }

    cleanup() {
        if (this.paymentElement) {
            this.paymentElement.destroy();
            this.paymentElement = null;
        }
        super.cleanup();
    }

    injectStyles() {
        this.injectBaseStyles();
        
        injectStyles('terra-tag-payment-form-styles', `
            .order-summary {
                background: ${UI.COLORS.background.light};
                border-radius: 4px;
                padding: ${UI.SPACING.large};
                margin: ${UI.SPACING.large} 0;
            }

            .order-summary h3 {
                margin: 0 0 ${UI.SPACING.medium};
                color: ${UI.COLORS.text.primary};
                font-size: ${UI.FONTS.sizes.medium};
            }

            .summary-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: ${UI.SPACING.small};
                color: ${UI.COLORS.text.secondary};
                font-size: ${UI.FONTS.sizes.small};
            }

            .summary-item.total {
                margin-top: ${UI.SPACING.medium};
                padding-top: ${UI.SPACING.medium};
                border-top: 1px solid ${UI.COLORS.border};
                color: ${UI.COLORS.text.primary};
                font-weight: 600;
            }

            .co2-savings {
                margin-top: ${UI.SPACING.medium};
                padding-top: ${UI.SPACING.medium};
                border-top: 1px dashed ${UI.COLORS.border};
                display: flex;
                justify-content: space-between;
                color: ${UI.COLORS.success};
                font-size: ${UI.FONTS.sizes.small};
            }

            #payment-element {
                margin: ${UI.SPACING.large} 0;
            }
        `);
    }
} 