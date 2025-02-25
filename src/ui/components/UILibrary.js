import { UI } from '../../core/constants.js';
import { BaseComponent } from './BaseComponent.js';

export class LoadingSpinner extends BaseComponent {
    constructor(size = 'medium') {
        super();
        this.size = size;
        this.element = this.createElement();
    }

    createElement() {
        const spinner = this.createContainer('terra-tag-spinner');
        spinner.dataset.size = this.size;
        return spinner;
    }

    injectStyles() {
        this.addStyles(`
            .terra-tag-spinner {
                border: 2px solid ${UI.COLORS.background.light};
                border-top-color: ${UI.COLORS.primary};
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            }

            .terra-tag-spinner[data-size="small"] {
                width: 16px;
                height: 16px;
            }

            .terra-tag-spinner[data-size="medium"] {
                width: 24px;
                height: 24px;
            }

            .terra-tag-spinner[data-size="large"] {
                width: 32px;
                height: 32px;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `);
    }
}

export class Message extends BaseComponent {
    constructor(text, type = 'info', duration = 5000) {
        super();
        this.text = text;
        this.type = type;
        this.duration = duration;
        this.element = this.createElement();
    }

    createElement() {
        const message = this.createContainer(`terra-tag-message ${this.type}`);
        message.textContent = this.text;

        if (this.duration > 0) {
            setTimeout(() => {
                message.classList.add('fade-out');
                setTimeout(() => message.remove(), 300);
            }, this.duration);
        }

        return message;
    }

    injectStyles() {
        this.addStyles(`
            .terra-tag-message {
                font-family: ${UI.FONTS.primary};
                font-size: ${UI.FONTS.sizes.small};
                padding: ${UI.SPACING.medium};
                margin: ${UI.SPACING.medium} 0;
                border-radius: ${UI.BORDER_RADIUS.small};
                text-align: center;
                animation: slideIn 0.3s ease;
            }

            .terra-tag-message.success {
                background: ${UI.COLORS.success}20;
                color: ${UI.COLORS.success};
            }

            .terra-tag-message.error {
                background: ${UI.COLORS.error}20;
                color: ${UI.COLORS.error};
            }

            .terra-tag-message.info {
                background: ${UI.COLORS.primary}20;
                color: ${UI.COLORS.primary};
            }

            .terra-tag-message.fade-out {
                opacity: 0;
                transform: translateY(-10px);
                transition: all 0.3s ease;
            }

            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `);
    }
}

export class FormGroup extends BaseComponent {
    constructor({ label, required = false, error = null, children = [] }) {
        super();
        this.label = label;
        this.required = required;
        this.error = error;
        this.children = children;
        this.element = this.createElement();
    }

    createElement() {
        const group = this.createContainer('terra-tag-form-group');
        
        if (this.label) {
            const label = this.createLabel(this.label, '', this.required);
            group.appendChild(label);
        }

        const content = this.createContainer('form-group-content');
        this.children.forEach(child => content.appendChild(child));
        group.appendChild(content);

        if (this.error) {
            const errorDiv = this.createElement('div', {
                className: 'form-group-error',
                textContent: this.error
            });
            group.appendChild(errorDiv);
        }

        return group;
    }

    setError(message) {
        const existingError = this.element.querySelector('.form-group-error');
        if (existingError) {
            if (message) {
                existingError.textContent = message;
            } else {
                existingError.remove();
            }
        } else if (message) {
            const errorDiv = this.createElement('div', {
                className: 'form-group-error',
                textContent: message
            });
            this.element.appendChild(errorDiv);
        }
    }

    injectStyles() {
        this.addStyles(`
            .terra-tag-form-group {
                margin-bottom: ${UI.SPACING.medium};
            }

            .terra-tag-form-group label {
                display: block;
                margin-bottom: ${UI.SPACING.small};
            }

            .form-group-content {
                display: flex;
                flex-direction: column;
                gap: ${UI.SPACING.small};
            }

            .form-group-error {
                color: ${UI.COLORS.error};
                font-size: ${UI.FONTS.sizes.small};
                margin-top: ${UI.SPACING.xs};
                animation: fadeIn 0.2s ease;
            }
        `);
    }
}

export class ButtonGroup extends BaseComponent {
    constructor({ buttons = [], align = 'start' }) {
        super();
        this.buttons = buttons;
        this.align = align;
        this.element = this.createElement();
    }

    createElement() {
        const group = this.createContainer('terra-tag-button-group');
        group.dataset.align = this.align;
        this.buttons.forEach(button => group.appendChild(button));
        return group;
    }

    injectStyles() {
        this.addStyles(`
            .terra-tag-button-group {
                display: flex;
                gap: ${UI.SPACING.medium};
                margin: ${UI.SPACING.medium} 0;
            }

            .terra-tag-button-group[data-align="start"] {
                justify-content: flex-start;
            }

            .terra-tag-button-group[data-align="center"] {
                justify-content: center;
            }

            .terra-tag-button-group[data-align="end"] {
                justify-content: flex-end;
            }

            .terra-tag-button-group[data-align="space-between"] {
                justify-content: space-between;
            }
        `);
    }
}

export class Card extends BaseComponent {
    constructor({ title, content, footer = null }) {
        super();
        this.title = title;
        this.content = content;
        this.footer = footer;
        this.element = this.createElement();
    }

    createElement() {
        const card = this.createContainer('terra-tag-card');
        
        if (this.title) {
            const header = this.createElement('div', {
                className: 'card-header',
                textContent: this.title
            });
            card.appendChild(header);
        }

        const body = this.createContainer('card-body');
        if (typeof this.content === 'string') {
            body.textContent = this.content;
        } else {
            body.appendChild(this.content);
        }
        card.appendChild(body);

        if (this.footer) {
            const footer = this.createContainer('card-footer');
            if (typeof this.footer === 'string') {
                footer.textContent = this.footer;
            } else {
                footer.appendChild(this.footer);
            }
            card.appendChild(footer);
        }

        return card;
    }

    injectStyles() {
        this.addStyles(`
            .terra-tag-card {
                background: ${UI.COLORS.background.main};
                border-radius: ${UI.BORDER_RADIUS.medium};
                box-shadow: 0 2px 4px ${UI.COLORS.border}40;
                overflow: hidden;
            }

            .terra-tag-card .card-header {
                padding: ${UI.SPACING.medium};
                background: ${UI.COLORS.background.light};
                border-bottom: 1px solid ${UI.COLORS.border};
                font-weight: 500;
            }

            .terra-tag-card .card-body {
                padding: ${UI.SPACING.medium};
            }

            .terra-tag-card .card-footer {
                padding: ${UI.SPACING.medium};
                background: ${UI.COLORS.background.light};
                border-top: 1px solid ${UI.COLORS.border};
            }
        `);
    }
} 