import { UI } from './constants.js';
import { ErrorHandler } from '../utils/errorHandler.js';

export class EventHandler {
    constructor(state, calculator) {
        this.state = state;
        this.calculator = calculator;
        this.errorHandler = new ErrorHandler(state);
    }

    handleInputChange(name, value, options = {}) {
        const { validateImmediately = false, updateDisplay = false } = options;

        this.state.updateFormData({ [name]: value });

        if (validateImmediately) {
            this.validateField(name, value, true);
        }

        if (updateDisplay) {
            this.state.notifySubscribers();
        }
    }

    validateField(name, value, showError = false) {
        const rules = this.getValidationRules(name);
        return this.errorHandler.validateField(name, value, rules);
    }

    getValidationRules(field) {
        const rules = {
            firstName: { required: true },
            lastName: { required: true },
            email: { required: true, email: true },
            company: {},
            withGuests: { min: 0 },
            withoutGuests: { min: 0 }
        };

        return rules[field] || {};
    }

    validateQuantity() {
        const formData = this.state.get('formData');
        const totalQuantity = this.calculator.getTotalQuantity(
            formData.withGuests,
            formData.withoutGuests
        );

        if (totalQuantity < 75) {
            this.errorHandler.handleError(new Error(UI.MESSAGES.error.validation.minQuantity), {
                type: ErrorHandler.ERROR_TYPES.VALIDATION,
                field: 'quantity'
            });
            return false;
        }

        this.errorHandler.clearError('quantity');
        return true;
    }

    validateFormData(formData, requiredFields = []) {
        this.errorHandler.clearAllErrors();
        let isValid = true;

        requiredFields.forEach(field => {
            if (!this.validateField(field, formData[field], true)) {
                isValid = false;
            }
        });

        return isValid;
    }

    async handleFormSubmit(options) {
        const {
            type,
            data,
            submitButton,
            service,
            successMessage,
            onSuccess,
            component
        } = options;

        if (submitButton) {
            submitButton.setLoading(true);
        }

        try {
            const result = await this.errorHandler.handleAsyncOperation(
                () => service(data),
                {
                    type: ErrorHandler.ERROR_TYPES.API,
                    component,
                    retryable: true
                }
            );

            if (result.error) {
                throw result.error;
            }

            if (successMessage && component) {
                component.showMessage(successMessage, 'success');
            }

            if (onSuccess) {
                await onSuccess(result);
            }

            return result;
        } finally {
            if (submitButton) {
                submitButton.setLoading(false);
            }
        }
    }

    handleNavigation(view, checkUnsaved = true) {
        if (checkUnsaved && this.state.get('isDirty')) {
            if (!confirm(UI.MESSAGES.unsavedChanges)) {
                return;
            }
        }

        this.errorHandler.clearAllErrors();
        this.state.setView(view);
    }

    cleanup() {
        this.errorHandler.clearAllErrors();
        this.errorHandler.resetRetryAttempts(this);
    }
} 