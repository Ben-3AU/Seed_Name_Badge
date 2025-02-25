import { BaseForm } from './BaseForm.js';
import { FormGroup, Input, ButtonGroup } from './UILibrary.js';
import { UI } from '../../core/constants.js';
import { QuoteService } from '../../services/QuoteService.js';

export class QuoteForm extends BaseForm {
    constructor(options = {}) {
        super({
            ...options,
            formId: 'quoteForm'
        });
        
        this.quoteService = new QuoteService();
        this.render();
    }
    
    getRequiredFields() {
        return ['firstName', 'lastName', 'email', 'company'];
    }
    
    async handleSubmit(event) {
        await super.handleSubmit(event, {
            service: (data) => this.quoteService.submitQuote(data),
            successMessage: UI.MESSAGES.success.quoteSubmitted,
            onSuccess: () => {
                this.resetForm();
                this.eventHandler.handleNavigation('main');
            }
        });
    }
    
    render() {
        const formGroup = new FormGroup();
        
        formGroup.addInput(new Input({
            name: 'firstName',
            label: 'First Name',
            required: true,
            onChange: (e) => this.handleInputChange(e)
        }));
        
        formGroup.addInput(new Input({
            name: 'lastName',
            label: 'Last Name',
            required: true,
            onChange: (e) => this.handleInputChange(e)
        }));
        
        formGroup.addInput(new Input({
            name: 'email',
            label: 'Email',
            type: 'email',
            required: true,
            onChange: (e) => this.handleInputChange(e)
        }));
        
        formGroup.addInput(new Input({
            name: 'company',
            label: 'Company',
            onChange: (e) => this.handleInputChange(e)
        }));
        
        const buttonGroup = new ButtonGroup([
            {
                text: 'Back',
                variant: 'secondary',
                onClick: () => this.handleBackClick()
            },
            {
                text: 'Submit Quote',
                variant: 'primary',
                type: 'submit'
            }
        ]);
        
        this.form.appendChild(formGroup.render());
        this.form.appendChild(buttonGroup.render());
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        return this.container;
    }
    
    injectStyles() {
        super.injectStyles();
        
        this.addStyles(`
            .quote-form {
                background-color: var(--form-bg);
                border-radius: var(--border-radius);
                box-shadow: var(--box-shadow);
            }
        `);
    }
} 