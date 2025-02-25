import { BaseComponent } from './BaseComponent.js';
import { StateManager } from '../../core/StateManager.js';
import { EventHandler } from '../../core/EventHandler.js';
import { ErrorHandler } from '../../utils/errorHandler.js';
import { UI } from '../../core/constants.js';
import { ButtonGroup, Message } from './UILibrary.js';

export class BaseForm extends BaseComponent {
    constructor(options = {}) {
        super(options);
        
        this.state = options.state || StateManager.getInstance();
        this.eventHandler = options.eventHandler || new EventHandler(this.state);
        this.errorHandler = new ErrorHandler(this.state);
        
        this.container = this.createContainer();
        this.form = this.createElement('form', { className: 'form' });
        this.container.appendChild(this.form);
        
        this.setupErrorBoundary();
    }
    
    setupErrorBoundary() {
        window.addEventListener('error', (event) => {
            this.errorHandler.handleError(event.error, {
                type: ErrorHandler.ERROR_TYPES.RUNTIME,
                component: this
            });
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.errorHandler.handleError(event.reason, {
                type: ErrorHandler.ERROR_TYPES.RUNTIME,
                component: this
            });
        });
    }
    
    showMessage(message, type = 'error') {
        const messageElement = this.createElement('div', {
            className: `message message-${type}`,
            textContent: message
        });
        
        this.container.insertBefore(messageElement, this.form);
        
        setTimeout(() => {
            messageElement.remove();
        }, UI.MESSAGE_TIMEOUT);
    }
    
    validateField(name, value) {
        return this.eventHandler.validateField(name, value, true);
    }
    
    handleInputChange(event) {
        const { name, value } = event.target;
        this.eventHandler.handleInputChange(name, value, {
            validateImmediately: true,
            updateDisplay: true
        });
    }
    
    async handleSubmit(event, options = {}) {
        event.preventDefault();
        
        const formData = this.state.get('formData');
        if (!this.eventHandler.validateFormData(formData, this.getRequiredFields())) {
            return;
        }
        
        await this.eventHandler.handleFormSubmit({
            ...options,
            data: formData,
            component: this
        });
    }
    
    getRequiredFields() {
        return [];
    }
    
    handleBackClick() {
        this.eventHandler.handleNavigation('main');
    }
    
    cleanup() {
        super.cleanup();
        this.eventHandler.cleanup();
    }
    
    injectStyles() {
        super.injectStyles();
        
        this.addStyles(`
            .form {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                max-width: 600px;
                margin: 0 auto;
                padding: 2rem;
            }
            
            .message {
                padding: 1rem;
                margin-bottom: 1rem;
                border-radius: 4px;
                text-align: center;
            }
            
            .message-error {
                background-color: var(--error-bg);
                color: var(--error-text);
                border: 1px solid var(--error-border);
            }
            
            .message-success {
                background-color: var(--success-bg);
                color: var(--success-text);
                border: 1px solid var(--success-border);
            }
        `);
    }

    createElement() {
        const form = this.createElement('form', {
            id: this.formId,
            className: 'terra-tag-form'
        });

        form.addEventListener('submit', (e) => this.handleSubmit(e));
        return form;
    }

    createSubmitButton(label = UI.LABELS.buttons.submit) {
        const submitButton = this.createElement('button', {
            type: 'submit',
            className: 'terra-tag-button primary',
            textContent: label
        });
        this.elements.set('submitButton', submitButton);
        return submitButton;
    }

    createBackButton(label = UI.LABELS.buttons.back) {
        const backButton = this.createElement('button', {
            type: 'button',
            className: 'terra-tag-button secondary',
            textContent: label,
            onclick: () => this.handleBackClick()
        });
        return backButton;
    }

    createButtonGroup(buttons, align = 'space-between') {
        const buttonGroup = new ButtonGroup({ buttons, align });
        return buttonGroup.render();
    }

    validateForm(requiredFields = []) {
        const formData = this.state.get('formData');
        return this.eventHandler.validateFormData(formData, requiredFields);
    }

    resetForm() {
        this.state.reset();
        this.element.reset();
    }
} 