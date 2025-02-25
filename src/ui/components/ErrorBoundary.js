import { BaseComponent } from './BaseComponent.js';
import { ErrorHandler } from '../../utils/errorHandler.js';
import { UI } from '../../core/constants.js';

export class ErrorBoundary extends BaseComponent {
    constructor(options = {}) {
        super(options);
        this.errorHandler = new ErrorHandler();
        this.setupGlobalErrorHandling();
    }
    
    setupGlobalErrorHandling() {
        window.addEventListener('error', (event) => {
            this.handleError(event.error);
            event.preventDefault();
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason);
            event.preventDefault();
        });
        
        window.onerror = (message, source, line, column, error) => {
            this.handleError(error || new Error(message));
            return true;
        };
    }
    
    handleError(error) {
        this.errorHandler.handleError(error, {
            type: ErrorHandler.ERROR_TYPES.RUNTIME,
            component: this,
            retryable: false
        });
        
        this.showErrorUI(error);
    }
    
    showErrorUI(error) {
        const errorContainer = this.createElement('div', {
            className: 'error-boundary'
        });
        
        const icon = this.createElement('div', {
            className: 'error-icon',
            innerHTML: '⚠️'
        });
        
        const content = this.createElement('div', {
            className: 'error-content'
        });
        
        const title = this.createElement('h2', {
            className: 'error-title',
            textContent: 'Something went wrong'
        });
        
        const message = this.createElement('p', {
            className: 'error-message',
            textContent: error.message || UI.MESSAGES.error.generic
        });
        
        const refreshButton = this.createElement('button', {
            className: 'refresh-button',
            textContent: 'Refresh Page',
            onclick: () => window.location.reload()
        });
        
        content.appendChild(title);
        content.appendChild(message);
        content.appendChild(refreshButton);
        
        errorContainer.appendChild(icon);
        errorContainer.appendChild(content);
        
        document.body.innerHTML = '';
        document.body.appendChild(errorContainer);
    }
    
    injectStyles() {
        this.addStyles(`
            .error-boundary {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 2rem;
                background-color: var(--error-bg);
                color: var(--error-text);
                text-align: center;
            }
            
            .error-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
            }
            
            .error-content {
                max-width: 500px;
            }
            
            .error-title {
                font-size: 1.5rem;
                margin-bottom: 1rem;
            }
            
            .error-message {
                margin-bottom: 2rem;
                line-height: 1.5;
            }
            
            .refresh-button {
                padding: 0.75rem 1.5rem;
                font-size: 1rem;
                color: white;
                background-color: var(--primary-color);
                border: none;
                border-radius: var(--border-radius);
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .refresh-button:hover {
                background-color: var(--primary-color-dark);
            }
        `);
    }
} 