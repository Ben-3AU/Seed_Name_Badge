import { UI } from '../../core/constants.js';

export class BaseComponent {
    constructor() {
        this.styleId = `terra-tag-${this.constructor.name.toLowerCase()}-styles`;
    }

    createElement(tagName, props = {}) {
        const element = document.createElement(tagName);
        
        Object.entries(props).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else {
                element[key] = value;
            }
        });
        
        return element;
    }

    createContainer(className) {
        return this.createElement('div', { className });
    }

    createLabel(text, forId, required = false) {
        const label = this.createElement('label', {
            htmlFor: forId,
            className: 'terra-tag-label',
            textContent: text
        });

        if (required) {
            const requiredSpan = this.createElement('span', {
                className: 'required',
                textContent: '*'
            });
            label.appendChild(requiredSpan);
        }

        return label;
    }

    addStyles(cssText) {
        if (document.querySelector(`#${this.styleId}`)) {
            return;
        }

        const styles = this.createElement('style', {
            id: this.styleId,
            textContent: cssText
        });

        document.head.appendChild(styles);
    }

    showError(message) {
        const errorDiv = this.createElement('div', {
            className: 'error-message',
            textContent: message
        });
        
        const existingError = this.element?.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        this.element?.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }

    showSuccess(message) {
        const successDiv = this.createElement('div', {
            className: 'success-message',
            textContent: message
        });
        
        const existingSuccess = this.element?.querySelector('.success-message');
        if (existingSuccess) {
            existingSuccess.remove();
        }
        
        this.element?.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 5000);
    }

    cleanup() {
        // Remove styles when component is destroyed
        const styles = document.querySelector(`#${this.styleId}`);
        if (styles) {
            styles.remove();
        }
    }

    render() {
        if (!this.element) {
            this.element = this.createElement();
        }
        this.injectStyles();
        return this.element;
    }

    injectStyles() {
        this.addStyles(`
            .terra-tag-label {
                font-family: ${UI.FONTS.primary};
                font-size: ${UI.FONTS.sizes.small};
                color: ${UI.COLORS.text.primary};
                font-weight: 500;
            }

            .terra-tag-label .required {
                color: ${UI.COLORS.error};
                margin-left: ${UI.SPACING.xs};
            }

            .error-message {
                font-family: ${UI.FONTS.primary};
                font-size: ${UI.FONTS.sizes.small};
                color: ${UI.COLORS.error};
                padding: ${UI.SPACING.medium};
                margin-top: ${UI.SPACING.medium};
                text-align: center;
                animation: fadeIn 0.3s ease;
            }

            .success-message {
                font-family: ${UI.FONTS.primary};
                font-size: ${UI.FONTS.sizes.small};
                color: ${UI.COLORS.success};
                padding: ${UI.SPACING.medium};
                margin-top: ${UI.SPACING.medium};
                text-align: center;
                animation: fadeIn 0.3s ease;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-10px); }
                75% { transform: translateX(10px); }
            }

            .shake {
                animation: shake 0.5s ease-in-out;
            }
        `);
    }
} 