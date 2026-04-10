// Centralized Error Handling Service for TypeScript
// Provides consistent error handling across the application

export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface EnhancedError extends Error {
  originalError?: any;
  type: ErrorType;
  context?: string;
  timestamp: string;
  status?: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

class ErrorHandlingService {
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
  };

  // Classify error type based on error details
  classifyError(error: any): ErrorType {
    if (!error) return ErrorType.UNKNOWN_ERROR;

    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return ErrorType.NETWORK_ERROR;
    }

    // Timeout errors
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return ErrorType.TIMEOUT_ERROR;
    }

    // HTTP status errors
    if (error.status) {
      if (error.status === 401) {
        return ErrorType.AUTHENTICATION_ERROR;
      }
      if (error.status === 403) {
        return ErrorType.PERMISSION_ERROR;
      }
      if (error.status >= 400 && error.status < 500) {
        return ErrorType.VALIDATION_ERROR;
      }
      if (error.status >= 500) {
        return ErrorType.SERVER_ERROR;
      }
    }

    // Supabase specific errors
    if (error.message?.includes('JWT') || error.message?.includes('auth')) {
      return ErrorType.AUTHENTICATION_ERROR;
    }

    return ErrorType.UNKNOWN_ERROR;
  }

  // Get user-friendly error message
  getErrorMessage(error: any, context = ''): string {
    const errorType = this.classifyError(error);
    const baseMessage = context ? `${context}: ` : '';

    switch (errorType) {
      case ErrorType.NETWORK_ERROR:
        return `${baseMessage}Network connection failed. Please check your internet connection and try again.`;
      
      case ErrorType.AUTHENTICATION_ERROR:
        return `${baseMessage}Authentication failed. Please log in again.`;
      
      case ErrorType.PERMISSION_ERROR:
        return `${baseMessage}You don't have permission to perform this action.`;
      
      case ErrorType.VALIDATION_ERROR:
        return `${baseMessage}Invalid data provided. Please check your input and try again.`;
      
      case ErrorType.SERVER_ERROR:
        return `${baseMessage}Server error occurred. Please try again later.`;
      
      case ErrorType.TIMEOUT_ERROR:
        return `${baseMessage}Request timed out. Please try again.`;
      
      default:
        return `${baseMessage}An unexpected error occurred. Please try again.`;
    }
  }

  // Calculate retry delay with exponential backoff
  private calculateRetryDelay(attempt: number): number {
    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt),
      this.retryConfig.maxDelay
    );
    return delay + Math.random() * 1000; // Add jitter
  }

  // Retry function with exponential backoff
  async retryWithBackoff<T>(fn: () => Promise<T>, context = ''): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Don't retry on authentication or permission errors
        const errorType = this.classifyError(error);
        if (errorType === ErrorType.AUTHENTICATION_ERROR || 
            errorType === ErrorType.PERMISSION_ERROR) {
          throw this.enhanceError(error, context);
        }

        // Don't retry on last attempt
        if (attempt === this.retryConfig.maxRetries) {
          break;
        }

        // Wait before retry
        const delay = this.calculateRetryDelay(attempt);
        console.warn(`Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${this.retryConfig.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries failed, throw the enhanced last error
    throw this.enhanceError(lastError, context);
  }

  // Enhance error with additional context
  enhanceError(error: any, context = ''): EnhancedError {
    if (error && (error as EnhancedError).type) return error as EnhancedError;

    const enhancedError = new Error(this.getErrorMessage(error, context)) as EnhancedError;
    enhancedError.originalError = error;
    enhancedError.type = this.classifyError(error);
    enhancedError.context = context;
    enhancedError.timestamp = new Date().toISOString();
    enhancedError.status = error?.status;
    return enhancedError;
  }

  // Handle API response errors
  handleApiResponse(response: Response, context = ''): Response {
    if (!response.ok) {
      const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status;
      error.statusText = response.statusText;
      throw this.enhanceError(error, context);
    }
    return response;
  }

  // Handle fetch with comprehensive error handling
  async handleFetch(url: string, options: RequestInit = {}, context = ''): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return this.handleApiResponse(response, context);
    } catch (error) {
      clearTimeout(timeoutId);
      throw this.enhanceError(error, context);
    }
  }

  // Log error for debugging
  logError(error: any, additionalInfo = {}): void {
    const errorInfo = {
      message: error.message,
      type: error.type || this.classifyError(error),
      context: error.context,
      timestamp: error.timestamp || new Date().toISOString(),
      stack: error.stack,
      ...additionalInfo
    };

    console.error('Application Error:', errorInfo);
  }

  // Show user-friendly notification (to be integrated with a UI notification system)
  showErrorNotification(error: any, context = ''): void {
    const message = this.getErrorMessage(error, context);
    // This should ideally trigger a Toast/Modal in the UI
    console.error('User Notification Error:', message);
  }
}

// Create singleton instance
export const errorHandlingService = new ErrorHandlingService();

// Export convenience functions
export const handleApiCall = async <T>(apiCall: () => Promise<T>, context = ''): Promise<T> => {
  return errorHandlingService.retryWithBackoff(apiCall, context);
};

export const handleFetch = async (url: string, options?: RequestInit, context = ''): Promise<Response> => {
  return errorHandlingService.handleFetch(url, options, context);
};

export const showError = (error: any, context = ''): void => {
  errorHandlingService.showErrorNotification(error, context);
  errorHandlingService.logError(error);
};
