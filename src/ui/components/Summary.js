import { UI } from '../../core/constants.js';
import { BaseComponent } from './BaseComponent.js';
import { Card } from './UILibrary.js';
import { formatCurrency } from '../../utils/helpers.js';

export class Summary extends BaseComponent {
    constructor(orderData) {
        super();
        this.orderData = orderData;
        this.element = this.createElement();
    }

    createElement() {
        const content = this.createSummaryContent();
        
        const card = new Card({
            title: 'Order Summary',
            content: content
        });

        return card.render();
    }

    createSummaryContent() {
        const content = this.createContainer('terra-tag-summary-content');

        // Order details
        const details = [
            { label: 'Total Quantity', value: this.orderData.total_quantity },
            { label: 'With Guest Names', value: this.orderData.quantity_with_guests || 0 },
            { label: 'Without Guest Names', value: this.orderData.quantity_without_guests || 0 },
            { label: 'Size', value: this.orderData.size },
            { label: 'Printed Sides', value: this.orderData.printed_sides },
            { label: 'Ink Coverage', value: this.orderData.ink_coverage },
            { label: 'Lanyards', value: this.orderData.lanyards ? 'Yes' : 'No' },
            { label: 'Shipping', value: this.orderData.shipping },
            { label: 'CO2 Savings', value: `${this.orderData.co2_savings.toFixed(2)} kg` }
        ];

        details.forEach(({ label, value }) => {
            content.appendChild(this.createSummaryRow(label, value));
        });

        // Total section
        const totalSection = this.createContainer('terra-tag-summary-total');

        const subtotal = this.orderData.total_cost - this.orderData.gst_amount;
        totalSection.appendChild(this.createSummaryRow('Subtotal', formatCurrency(subtotal)));
        totalSection.appendChild(this.createSummaryRow('GST', formatCurrency(this.orderData.gst_amount)));
        totalSection.appendChild(this.createSummaryRow('Total', formatCurrency(this.orderData.total_cost), true));

        content.appendChild(totalSection);
        return content;
    }

    createSummaryRow(label, value, isTotal = false) {
        const rowClass = isTotal ? 'terra-tag-summary-row total' : 'terra-tag-summary-row';
        const row = this.createContainer(rowClass);

        const labelSpan = this.createElement('span', {
            className: 'terra-tag-summary-label',
            textContent: label
        });

        const valueSpan = this.createElement('span', {
            className: 'terra-tag-summary-value',
            textContent: value
        });

        row.appendChild(labelSpan);
        row.appendChild(valueSpan);
        return row;
    }

    injectStyles() {
        this.addStyles(`
            .terra-tag-summary-content {
                display: flex;
                flex-direction: column;
                gap: ${UI.SPACING.medium};
            }

            .terra-tag-summary-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: ${UI.SPACING.small} 0;
                border-bottom: 1px solid ${UI.COLORS.border};
            }

            .terra-tag-summary-row:last-child {
                border-bottom: none;
            }

            .terra-tag-summary-label {
                color: ${UI.COLORS.text.secondary};
                font-size: ${UI.FONTS.sizes.small};
            }

            .terra-tag-summary-value {
                color: ${UI.COLORS.text.primary};
                font-size: ${UI.FONTS.sizes.small};
                font-weight: 500;
            }

            .terra-tag-summary-total {
                margin-top: ${UI.SPACING.medium};
                padding-top: ${UI.SPACING.medium};
                border-top: 2px solid ${UI.COLORS.border};
            }

            .terra-tag-summary-row.total .terra-tag-summary-label,
            .terra-tag-summary-row.total .terra-tag-summary-value {
                font-size: ${UI.FONTS.sizes.medium};
                font-weight: 600;
                color: ${UI.COLORS.text.primary};
            }
        `);
    }
} 