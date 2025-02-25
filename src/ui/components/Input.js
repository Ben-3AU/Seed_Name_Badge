import { UI } from '../../core/constants.js';
import { BaseComponent } from './BaseComponent.js';
import { FormGroup } from './UILibrary.js';

export class Input extends BaseComponent {
    constructor({
        type = 'text',
        name,
        label,
        value = '',
        placeholder = '',
        required = false,
        onChange = null,
        onBlur = null,
        error = null
    }) {
        super();
        this.type = type;
        this.name = name;
        this.label = label;
        this.value = value;
        this.placeholder = placeholder;
        this.required = required;
        this.onChange = onChange;
        this.onBlur = onBlur;
        this.error = error;
        this.element = this.createElement();
    }

    createElement() {
        const input = this.createElement('input', {
            type: this.type,
            name: this.name,
            value: this.value,
            placeholder: this.placeholder,
            className: 'terra-tag-input'
        });

        if (this.onChange) {
            input.addEventListener('input', this.onChange);
        }

        if (this.onBlur) {
            input.addEventListener('blur', this.onBlur);
        }

        const formGroup = new FormGroup({
            label: this.label,
            required: this.required,
            error: this.error,
            children: [input]
        });

        const wrapper = formGroup.render();

        // Add error handling methods to the wrapper
        wrapper.setError = (message) => formGroup.setError(message);
        wrapper.clearError = () => formGroup.setError(null);

        return wrapper;
    }

    injectStyles() {
        this.addStyles(`
            .terra-tag-input {
                font-family: ${UI.FONTS.primary};
                font-size: ${UI.FONTS.sizes.medium};
                padding: ${UI.SPACING.medium};
                border: 1px solid ${UI.COLORS.border};
                border-radius: 4px;
                transition: all 0.2s ease;
                width: 100%;
                box-sizing: border-box;
            }

            .terra-tag-input:focus {
                outline: none;
                border-color: ${UI.COLORS.primary};
                box-shadow: 0 0 0 2px ${UI.COLORS.primary}20;
            }

            .terra-tag-input-wrapper.has-error .terra-tag-input {
                border-color: ${UI.COLORS.error};
            }

            .terra-tag-input-wrapper.has-error .terra-tag-input:focus {
                box-shadow: 0 0 0 2px ${UI.COLORS.error}20;
            }
        `);
    }

    render() {
        return this.element;
    }
} 