import { UI } from '../../core/constants.js';
import { BaseComponent } from './BaseComponent.js';
import { LoadingSpinner } from './UILibrary.js';

export class Button extends BaseComponent {
    constructor({ type = 'primary', label, onClick, disabled = false }) {
        super();
        this.type = type;
        this.label = label;
        this.onClick = onClick;
        this.disabled = disabled;
        this.element = this.createElement();
    }

    createElement() {
        const button = this.createElement('button', {
            className: `terra-tag-button ${this.type}`,
            textContent: this.label,
            disabled: this.disabled
        });

        if (this.onClick) {
            button.addEventListener('click', this.onClick);
        }

        // Add loading state methods
        button.setLoading = (loading) => {
            button.disabled = loading;
            if (loading) {
                button.dataset.originalText = button.textContent;
                button.innerHTML = '';
                button.appendChild(new LoadingSpinner('small').render());
                const span = this.createElement('span', { textContent: UI.LABELS.buttons.loading });
                button.appendChild(span);
            } else if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
                delete button.dataset.originalText;
            }
        };

        return button;
    }

    injectStyles() {
        this.addStyles(`
            .terra-tag-button {
                font-family: ${UI.FONTS.primary};
                font-size: ${UI.FONTS.sizes.medium};
                padding: ${UI.SPACING.medium} ${UI.SPACING.large};
                border-radius: ${UI.BORDER_RADIUS.small};
                border: none;
                cursor: pointer;
                transition: all 0.2s ease;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: ${UI.SPACING.small};
                min-width: 120px;
                position: relative;
            }

            .terra-tag-button.primary {
                background: ${UI.COLORS.primary};
                color: ${UI.COLORS.text.light};
            }

            .terra-tag-button.secondary {
                background: ${UI.COLORS.secondary};
                color: ${UI.COLORS.text.light};
            }

            .terra-tag-button:hover:not(:disabled) {
                opacity: 0.9;
                transform: translateY(-1px);
            }

            .terra-tag-button:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
        `);
    }

    render() {
        return this.element;
    }
} 