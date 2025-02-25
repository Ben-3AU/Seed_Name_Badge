class ErrorBoundary {
  constructor() {
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      retryCount: 0,
      MAX_RETRIES: 3
    };
    this.fallbackUI = null;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to error tracking service
    if (window.Sentry) {
      window.Sentry.captureException(error, { extra: errorInfo });
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    // Store error info for potential retry
    this.setState({ errorInfo });

    // Attempt recovery for certain errors
    this.attemptRecovery(error);
  }

  attemptRecovery(error) {
    // Only attempt recovery if we haven't exceeded max retries
    if (this.state.retryCount >= this.state.MAX_RETRIES) {
      return;
    }

    // Check if error is recoverable
    if (this.isRecoverableError(error)) {
      setTimeout(() => {
        this.setState(state => ({
          retryCount: state.retryCount + 1,
          hasError: false,
          error: null
        }));
      }, Math.pow(2, this.state.retryCount) * 1000); // Exponential backoff
    }
  }

  isRecoverableError(error) {
    // Network errors are often recoverable
    if (error instanceof TypeError && error.message.includes('network')) {
      return true;
    }

    // API timeouts might be recoverable
    if (error.name === 'TimeoutError') {
      return true;
    }

    // State synchronization errors might be recoverable
    if (error.message.includes('state') || error.message.includes('prop')) {
      return true;
    }

    return false;
  }

  setFallbackUI(element) {
    this.fallbackUI = element;
  }

  wrap(component) {
    if (this.state.hasError) {
      return this.fallbackUI || this.createDefaultFallbackUI();
    }

    try {
      return component;
    } catch (error) {
      this.state = { hasError: true, error };
      return this.fallbackUI || this.createDefaultFallbackUI();
    }
  }

  createDefaultFallbackUI() {
    const container = document.createElement('div');
    container.className = 'error-boundary';
    
    const content = document.createElement('div');
    content.className = 'error-content';

    const title = document.createElement('h2');
    title.textContent = 'Something went wrong';

    const message = document.createElement('p');
    message.textContent = this.getErrorMessage();

    const retryButton = document.createElement('button');
    retryButton.textContent = 'Try Again';
    retryButton.onclick = () => this.handleRetry();

    const refreshButton = document.createElement('button');
    refreshButton.textContent = 'Refresh Page';
    refreshButton.onclick = () => window.location.reload();

    content.appendChild(title);
    content.appendChild(message);
    
    if (this.state.retryCount < this.state.MAX_RETRIES) {
      content.appendChild(retryButton);
    }
    content.appendChild(refreshButton);
    
    container.appendChild(content);

    this.injectStyles();
    return container;
  }

  getErrorMessage() {
    if (this.state.retryCount > 0) {
      return `Retry attempt ${this.state.retryCount} of ${this.state.MAX_RETRIES}. Please wait...`;
    }

    if (this.state.error?.message?.includes('network')) {
      return 'Network error occurred. Please check your connection and try again.';
    }

    if (this.state.error?.message?.includes('timeout')) {
      return 'The request timed out. Please try again.';
    }

    return 'We\'re sorry, but something went wrong. Please try again or contact support if the problem persists.';
  }

  handleRetry() {
    this.setState({
      hasError: false,
      error: null,
      retryCount: this.state.retryCount + 1
    });
  }

  injectStyles() {
    if (document.querySelector('#error-boundary-styles')) {
      return;
    }

    const styles = document.createElement('style');
    styles.id = 'error-boundary-styles';
    styles.textContent = `
      .error-boundary {
        padding: 2rem;
        text-align: center;
        background-color: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        margin: 2rem auto;
        max-width: 600px;
      }

      .error-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
      }

      .error-boundary h2 {
        color: #e53e3e;
        margin: 0;
        font-size: 1.5rem;
      }

      .error-boundary p {
        color: #4a5568;
        margin: 0;
        font-size: 1rem;
        line-height: 1.5;
      }

      .error-boundary button {
        background-color: #3182ce;
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
        font-size: 1rem;
        margin: 0.5rem;
      }

      .error-boundary button:hover {
        background-color: #2c5282;
      }

      .error-boundary button:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.5);
      }

      @media (max-width: 640px) {
        .error-boundary {
          margin: 1rem;
          padding: 1rem;
        }

        .error-boundary h2 {
          font-size: 1.25rem;
        }

        .error-boundary p {
          font-size: 0.875rem;
        }

        .error-boundary button {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  reset() {
    this.state = { hasError: false, error: null };
  }
}

module.exports = ErrorBoundary; 