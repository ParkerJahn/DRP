// Security middleware for API calls
import { SecurityHeaders, SecurityAudit, CSRFProtection } from './security';

// Enhanced fetch with security features
export class SecureFetch {
  private static baseUrl: string = '';
  private static defaultHeaders: Record<string, string> = {};

  // Initialize the secure fetch with base configuration
  static initialize(baseUrl: string, defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders
    };
  }

  // Make a secure API call
  static async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requireCsrf: boolean = true
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Prepare headers
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...SecurityHeaders.getSecurityHeaders(),
      ...(options.headers as Record<string, string> || {})
    };

    // Add CSRF token if required
    if (requireCsrf) {
      const csrfToken = CSRFProtection.getToken();
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      } else {
        throw new Error('CSRF token not available');
      }
    }

    // Log the request
    SecurityAudit.logSecurityEvent('info', `API request to ${endpoint}`, undefined, 'api_request');

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Include cookies for session management
      });

      // Check for security-related response headers
      this.validateSecurityHeaders(response);

      // Handle different response statuses
      if (response.ok) {
        const data = await response.json();
        
        // Log successful request
        SecurityAudit.logSecurityEvent('info', `API request successful: ${endpoint}`, undefined, 'api_success');
        
        return data;
      } else if (response.status === 401) {
        // Unauthorized - redirect to login
        SecurityAudit.logSecurityEvent('warn', `API request unauthorized: ${endpoint}`, undefined, 'api_unauthorized');
        window.location.href = '/auth?expired=true';
        throw new Error('Unauthorized - please sign in again');
      } else if (response.status === 403) {
        // Forbidden - CSRF or permission issue
        SecurityAudit.logSecurityEvent('security', `API request forbidden: ${endpoint}`, undefined, 'api_forbidden');
        throw new Error('Access denied - security validation failed');
      } else if (response.status === 429) {
        // Rate limited
        SecurityAudit.logSecurityEvent('warn', `API request rate limited: ${endpoint}`, undefined, 'api_rate_limited');
        throw new Error('Too many requests - please try again later');
      } else {
        // Other error
        SecurityAudit.logSecurityEvent('error', `API request failed: ${endpoint} - ${response.status}`, undefined, 'api_error');
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      // Log the error
      SecurityAudit.logSecurityEvent('error', `API request error: ${endpoint} - ${error}`, undefined, 'api_error');
      throw error;
    }
  }

  // Validate security headers in response
  private static validateSecurityHeaders(response: Response): void {
    const securityHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Content-Security-Policy'
    ];

    const missingHeaders = securityHeaders.filter(header => !response.headers.get(header));
    
    if (missingHeaders.length > 0) {
      SecurityAudit.logSecurityEvent('warn', `Missing security headers: ${missingHeaders.join(', ')}`, undefined, 'missing_security_headers');
    }
  }

  // GET request
  static async get<T>(endpoint: string, requireCsrf: boolean = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, requireCsrf);
  }

  // POST request
  static async post<T>(endpoint: string, data: unknown, requireCsrf: boolean = true): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    }, requireCsrf);
  }

  // PUT request
  static async put<T>(endpoint: string, data: unknown, requireCsrf: boolean = true): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    }, requireCsrf);
  }

  // DELETE request
  static async delete<T>(endpoint: string, requireCsrf: boolean = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, requireCsrf);
  }

  // PATCH request
  static async patch<T>(endpoint: string, data: unknown, requireCsrf: boolean = true): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }, requireCsrf);
  }
}

// File upload with security validation
export class SecureFileUpload {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain'
  ];

  // Upload a file securely
  static async upload(
    endpoint: string,
    file: File,
    additionalData: Record<string, unknown> = {}
  ): Promise<unknown> {
    // Validate file
    const validation = this.validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    
    // Add additional data
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    // Add CSRF token
    const csrfToken = CSRFProtection.getToken();
    if (csrfToken) {
      formData.append('csrf_token', csrfToken);
    }

    // Log file upload
    SecurityAudit.logSecurityEvent('info', `File upload initiated: ${file.name}`, undefined, 'file_upload');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRF-Token': csrfToken || '',
          ...SecurityHeaders.getSecurityHeaders()
        },
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        SecurityAudit.logSecurityEvent('info', `File upload successful: ${file.name}`, undefined, 'file_upload_success');
        return result;
      } else {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      SecurityAudit.logSecurityEvent('error', `File upload failed: ${file.name} - ${error}`, undefined, 'file_upload_failed');
      throw error;
    }
  }

  // Validate file before upload
  private static validateFile(file: File): { isValid: boolean; error?: string } {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File size exceeds maximum allowed size of ${Math.round(this.MAX_FILE_SIZE / 1024 / 1024)}MB`
      };
    }

    // Check file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} is not allowed. Allowed types: ${this.ALLOWED_TYPES.join(', ')}`
      };
    }

    // Check file name for suspicious patterns
    const fileName = file.name.toLowerCase();
    const suspiciousPatterns = [
      /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|msi|dll|sys|bin|sh|bash|zsh|fish|ps1|psm1|psd1|psc1|psc2)$/i,
      /\.(php|asp|aspx|jsp|jspx|cgi|pl|py|rb|sh|bash|zsh|fish|ps1|psm1|psd1|psc1|psc2)$/i
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(fileName))) {
      return {
        isValid: false,
        error: 'File type not allowed for security reasons'
      };
    }

    return { isValid: true };
  }
} 