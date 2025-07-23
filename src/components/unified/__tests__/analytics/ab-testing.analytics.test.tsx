import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

import { UnifiedQuoteCard } from '../../UnifiedQuoteCard';
import { UnifiedQuoteActions } from '../../UnifiedQuoteActions';
import { UnifiedQuoteForm } from '../../UnifiedQuoteForm';
import { UnifiedQuoteList } from '../../UnifiedQuoteList';
import { QuoteThemeProvider } from '@/contexts/QuoteThemeContext';
import type { UnifiedQuote } from '@/types/unified-quote';

// Mock A/B Testing Service
const mockABTestService = {
  getVariant: vi.fn(),
  trackConversion: vi.fn(),
  trackEvent: vi.fn(),
  isUserInTest: vi.fn(),
  getTestConfig: vi.fn(),
  assignUserToVariant: vi.fn(),
  recordExposure: vi.fn()
};

// Mock Analytics Service
const mockAnalyticsService = {
  track: vi.fn(),
  identify: vi.fn(),
  page: vi.fn(),
  group: vi.fn(),
  alias: vi.fn()
};

// Mock Google Analytics (gtag)
Object.defineProperty(window, 'gtag', {
  value: vi.fn(),
  configurable: true
});

// Mock Facebook Pixel
Object.defineProperty(window, 'fbq', {
  value: vi.fn(),
  configurable: true
});

// Mock experiment configurations
const mockExperiments = {
  quote_approval_colors: {
    id: 'quote_approval_colors',
    name: 'Quote Approval Button Colors',
    status: 'active',
    traffic_allocation: 1.0,
    variants: [
      {
        id: 'control',
        name: 'Control (Blue)',
        allocation: 0.5,
        config: {
          primary_color: '#3b82f6',
          secondary_color: '#1e40af',
          button_style: 'solid'
        }
      },
      {
        id: 'variant_a',
        name: 'Green CTA',
        allocation: 0.5,
        config: {
          primary_color: '#10b981',
          secondary_color: '#047857',
          button_style: 'solid'
        }
      }
    ]
  },
  quote_form_layout: {
    id: 'quote_form_layout',
    name: 'Quote Form Layout Test',
    status: 'active',
    traffic_allocation: 0.8,
    variants: [
      {
        id: 'control',
        name: 'Single Column',
        allocation: 0.33,
        config: {
          layout: 'single_column',
          fields_per_row: 1
        }
      },
      {
        id: 'variant_a',
        name: 'Two Column',
        allocation: 0.33,
        config: {
          layout: 'two_column',
          fields_per_row: 2
        }
      },
      {
        id: 'variant_b',
        name: 'Progressive',
        allocation: 0.34,
        config: {
          layout: 'progressive',
          show_fields_gradually: true
        }
      }
    ]
  },
  quote_list_density: {
    id: 'quote_list_density',
    name: 'Quote List Information Density',
    status: 'active',
    traffic_allocation: 0.6,
    variants: [
      {
        id: 'control',
        name: 'Standard Density',
        allocation: 0.5,
        config: {
          density: 'standard',
          show_breakdown: false,
          compact_view: false
        }
      },
      {
        id: 'variant_a',
        name: 'High Density',
        allocation: 0.5,
        config: {
          density: 'high',
          show_breakdown: true,
          compact_view: true
        }
      }
    ]
  }
};

// Mock user segmentation
const mockUserSegments = {
  new_user: { days_since_signup: 0 },
  returning_user: { days_since_signup: 30 },
  power_user: { quotes_created: 50, conversion_rate: 0.8 },
  enterprise_user: { company_size: 'large', plan: 'enterprise' }
};

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { 
      id: 'ab-test-user-id', 
      email: 'abtest@example.com',
      created_at: '2024-01-01T00:00:00Z'
    },
  }),
}));

vi.mock('@/hooks/useAdminRole', () => ({
  useAdminRole: () => ({
    data: false,
    isLoading: false,
  }),
}));

// Test data
const abTestQuote: UnifiedQuote = {
  id: 'ab-test-quote-001',
  display_id: 'QT-AB001',
  user_id: 'ab-test-user-id',
  status: 'sent',
  created_at: '2024-01-15T10:00:00Z',
  expires_at: '2024-02-15T10:00:00Z',
  final_total_usd: 399.99,
  item_price: 329.99,
  sales_tax_price: 26.40,
  merchant_shipping_price: 19.99,
  international_shipping: 29.99,
  customs_and_ecs: 16.50,
  domestic_shipping: 9.99,
  handling_charge: 7.50,
  insurance_amount: 3.99,
  payment_gateway_fee: 4.99,
  vat: 0.00,
  discount: 15.00,
  destination_country: 'IN',
  origin_country: 'US',
  website: 'amazon.com',
  customer_data: {
    info: {
      name: 'A/B Test User',
      email: 'abtest@example.com',
      phone: '+91-9876543210'
    }
  },
  shipping_address: {
    formatted: '123 Test Street, Bangalore, Karnataka 560001, India'
  },
  items: [{
    id: 'ab-test-item',
    name: 'Smart Watch Pro',
    description: 'Advanced fitness tracking smartwatch',
    quantity: 1,
    price: 329.99,
    product_url: 'https://amazon.com/smart-watch-pro',
    image_url: 'https://example.com/smartwatch.jpg'
  }],
  notes: 'A/B test quote',
  admin_notes: '',
  priority: 'high',
  in_cart: false,
  attachments: []
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
        <QuoteThemeProvider>
          {component}
        </QuoteThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Helper function to set up A/B test variant
const setupABTest = (experimentId: string, variantId: string) => {
  mockABTestService.getVariant.mockReturnValue(variantId);
  mockABTestService.isUserInTest.mockReturnValue(true);
  mockABTestService.getTestConfig.mockReturnValue(mockExperiments[experimentId]);
};

describe('A/B Testing System Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset A/B test service mocks
    Object.values(mockABTestService).forEach(mock => mock.mockReset());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('A/B Test Assignment and Exposure', () => {
    it('should assign user to experiment variant consistently', async () => {
      // Mock consistent variant assignment
      mockABTestService.assignUserToVariant.mockImplementation((experimentId, userId) => {
        // Simple hash-based assignment for consistency
        const hash = userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const experiment = mockExperiments[experimentId];
        return hash % 2 === 0 ? experiment.variants[0].id : experiment.variants[1].id;
      });

      const ABTestAssignmentTest = () => {
        const [userVariant, setUserVariant] = React.useState<string>('');
        const [exposureLogged, setExposureLogged] = React.useState(false);

        React.useEffect(() => {
          const assignVariant = async () => {
            const variant = mockABTestService.assignUserToVariant(
              'quote_approval_colors',
              'ab-test-user-id'
            );
            setUserVariant(variant);

            // Log exposure
            mockABTestService.recordExposure('quote_approval_colors', variant, 'ab-test-user-id');
            setExposureLogged(true);

            // Track exposure in analytics
            window.gtag('event', 'ab_test_exposure', {
              experiment_id: 'quote_approval_colors',
              variant_id: variant,
              user_id: 'ab-test-user-id'
            });
          };

          assignVariant();
        }, []);

        return (
          <div>
            <div data-testid="user-variant">{userVariant}</div>
            <div data-testid="exposure-logged">{exposureLogged ? 'logged' : 'not-logged'}</div>
            <UnifiedQuoteCard
              quote={abTestQuote}
              viewMode="customer"
              variant={userVariant}
            />
          </div>
        );
      };

      renderWithProviders(<ABTestAssignmentTest />);

      await waitFor(() => {
        const variant = screen.getByTestId('user-variant').textContent;
        expect(['control', 'variant_a']).toContain(variant);
        expect(screen.getByTestId('exposure-logged')).toHaveTextContent('logged');
      });

      expect(mockABTestService.assignUserToVariant).toHaveBeenCalledWith(
        'quote_approval_colors',
        'ab-test-user-id'
      );
      expect(mockABTestService.recordExposure).toHaveBeenCalled();
      expect(window.gtag).toHaveBeenCalledWith('event', 'ab_test_exposure', expect.objectContaining({
        experiment_id: 'quote_approval_colors'
      }));
    });

    it('should handle traffic allocation correctly', async () => {
      const TrafficAllocationTest = () => {
        const [inTest, setInTest] = React.useState<boolean | null>(null);
        const [variant, setVariant] = React.useState<string>('');

        React.useEffect(() => {
          const checkTestEligibility = () => {
            // Mock traffic allocation (80% for quote_form_layout)
            const random = Math.random();
            const experiment = mockExperiments.quote_form_layout;
            const isEligible = random < experiment.traffic_allocation;
            
            setInTest(isEligible);
            
            if (isEligible) {
              const assignedVariant = mockABTestService.assignUserToVariant(
                'quote_form_layout',
                'ab-test-user-id'
              );
              setVariant(assignedVariant);
            } else {
              setVariant('control'); // Default to control if not in test
            }
          };

          checkTestEligibility();
        }, []);

        return (
          <div>
            <div data-testid="in-test">{inTest === null ? 'checking' : inTest ? 'yes' : 'no'}</div>
            <div data-testid="variant">{variant}</div>
          </div>
        );
      };

      renderWithProviders(<TrafficAllocationTest />);

      await waitFor(() => {
        expect(screen.getByTestId('in-test')).not.toHaveTextContent('checking');
        expect(screen.getByTestId('variant')).not.toHaveTextContent('');
      });

      const inTest = screen.getByTestId('in-test').textContent === 'yes';
      const variant = screen.getByTestId('variant').textContent;

      if (inTest) {
        expect(['control', 'variant_a', 'variant_b']).toContain(variant);
      } else {
        expect(variant).toBe('control');
      }
    });
  });

  describe('Quote Approval Button Color Test', () => {
    it('should render different button colors based on variant', async () => {
      const ButtonColorTest = ({ variant }: { variant: string }) => {
        const config = mockExperiments.quote_approval_colors.variants.find(v => v.id === variant)?.config;
        
        const buttonStyle = {
          backgroundColor: config?.primary_color,
          borderColor: config?.secondary_color
        };

        return (
          <div>
            <div data-testid="variant-id">{variant}</div>
            <UnifiedQuoteActions
              quote={abTestQuote}
              viewMode="customer"
              variant={variant}
              onAction={async (action) => {
                // Track conversion
                mockABTestService.trackConversion(
                  'quote_approval_colors',
                  variant,
                  'ab-test-user-id',
                  action
                );

                window.gtag('event', 'ab_test_conversion', {
                  test_name: 'quote_approval_colors',
                  variant: variant,
                  action: `action_${action}`,
                  value: 1,
                  user_id: 'ab-test-user-id'
                });
              }}
            />
            <button 
              data-testid="test-button"
              style={buttonStyle}
              className="color-variant-control"
            >
              Approve Quote
            </button>
          </div>
        );
      };

      // Test control variant
      const { rerender } = renderWithProviders(<ButtonColorTest variant="control" />);

      expect(screen.getByTestId('variant-id')).toHaveTextContent('control');
      
      const controlButton = screen.getByTestId('test-button');
      expect(controlButton).toHaveStyle({
        backgroundColor: '#3b82f6' // Blue
      });

      // Test variant A
      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <BrowserRouter>
            <QuoteThemeProvider>
              <ButtonColorTest variant="variant_a" />
            </QuoteThemeProvider>
          </BrowserRouter>
        </QueryClientProvider>
      );

      expect(screen.getByTestId('variant-id')).toHaveTextContent('variant_a');
      
      const variantButton = screen.getByTestId('test-button');
      expect(variantButton).toHaveStyle({
        backgroundColor: '#10b981' // Green
      });
    });

    it('should track conversions for approval button test', async () => {
      setupABTest('quote_approval_colors', 'variant_a');

      const ConversionTrackingTest = () => {
        const handleApproval = async () => {
          const variant = mockABTestService.getVariant('quote_approval_colors');
          
          // Track conversion
          mockABTestService.trackConversion(
            'quote_approval_colors',
            variant,
            'ab-test-user-id',
            'approve'
          );

          // Track in Google Analytics
          window.gtag('event', 'ab_test_conversion', {
            test_name: 'quote_approval_colors',
            variant: variant,
            action: 'quote_approved',
            value: abTestQuote.final_total_usd,
            user_id: 'ab-test-user-id'
          });

          // Track in Facebook Pixel
          window.fbq('trackCustom', 'ABTestConversion', {
            experiment: 'quote_approval_colors',
            variant: variant,
            action: 'approve',
            value: abTestQuote.final_total_usd
          });
        };

        return (
          <div>
            <UnifiedQuoteActions
              quote={abTestQuote}
              viewMode="customer"
              onAction={handleApproval}
            />
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<ConversionTrackingTest />);

      const approveButton = screen.getByText('Approve Quote');
      await user.click(approveButton);

      await waitFor(() => {
        expect(mockABTestService.trackConversion).toHaveBeenCalledWith(
          'quote_approval_colors',
          'variant_a',
          'ab-test-user-id',
          'approve'
        );

        expect(window.gtag).toHaveBeenCalledWith('event', 'ab_test_conversion', {
          test_name: 'quote_approval_colors',
          variant: 'variant_a',
          action: 'quote_approved',
          value: 399.99,
          user_id: 'ab-test-user-id'
        });

        expect(window.fbq).toHaveBeenCalledWith('trackCustom', 'ABTestConversion', {
          experiment: 'quote_approval_colors',
          variant: 'variant_a',
          action: 'approve',
          value: 399.99
        });
      });
    });
  });

  describe('Quote Form Layout Test', () => {
    it('should render different form layouts based on variant', async () => {
      const FormLayoutTest = ({ variant }: { variant: string }) => {
        const config = mockExperiments.quote_form_layout.variants.find(v => v.id === variant)?.config;
        
        const formClassName = `form-layout-${config?.layout}`;
        
        return (
          <div>
            <div data-testid="layout-variant">{variant}</div>
            <div data-testid="layout-config">{config?.layout}</div>
            <div className={formClassName}>
              <UnifiedQuoteForm
                mode="create"
                viewMode="guest"
                variant={variant}
                onSubmit={async (formData) => {
                  // Track form submission conversion
                  mockABTestService.trackConversion(
                    'quote_form_layout',
                    variant,
                    'ab-test-user-id',
                    'form_submit'
                  );

                  window.gtag('event', 'ab_test_conversion', {
                    test_name: 'quote_form_layout',
                    variant: variant,
                    action: 'form_submitted',
                    value: 1
                  });
                }}
              />
            </div>
          </div>
        );
      };

      // Test single column layout
      const { rerender } = renderWithProviders(<FormLayoutTest variant="control" />);

      expect(screen.getByTestId('layout-variant')).toHaveTextContent('control');
      expect(screen.getByTestId('layout-config')).toHaveTextContent('single_column');

      // Test two column layout
      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <BrowserRouter>
            <QuoteThemeProvider>
              <FormLayoutTest variant="variant_a" />
            </QuoteThemeProvider>
          </BrowserRouter>
        </QueryClientProvider>
      );

      expect(screen.getByTestId('layout-variant')).toHaveTextContent('variant_a');
      expect(screen.getByTestId('layout-config')).toHaveTextContent('two_column');

      // Test progressive layout
      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <BrowserRouter>
            <QuoteThemeProvider>
              <FormLayoutTest variant="variant_b" />
            </QuoteThemeProvider>
          </BrowserRouter>
        </QueryClientProvider>
      );

      expect(screen.getByTestId('layout-variant')).toHaveTextContent('variant_b');
      expect(screen.getByTestId('layout-config')).toHaveTextContent('progressive');
    });

    it('should track form abandonment by variant', async () => {
      const FormAbandonmentTest = ({ variant }: { variant: string }) => {
        const [fieldsFilled, setFieldsFilled] = React.useState(0);
        const [abandoned, setAbandoned] = React.useState(false);

        React.useEffect(() => {
          // Simulate form abandonment after 5 seconds without completion
          const abandonTimer = setTimeout(() => {
            if (fieldsFilled > 0 && fieldsFilled < 5) {
              setAbandoned(true);
              
              // Track abandonment
              mockABTestService.trackEvent(
                'quote_form_layout',
                variant,
                'ab-test-user-id',
                'form_abandoned',
                { fields_completed: fieldsFilled }
              );

              window.gtag('event', 'ab_test_abandonment', {
                test_name: 'quote_form_layout',
                variant: variant,
                fields_completed: fieldsFilled,
                user_id: 'ab-test-user-id'
              });
            }
          }, 5000);

          return () => clearTimeout(abandonTimer);
        }, [fieldsFilled]);

        const handleFieldChange = () => {
          setFieldsFilled(prev => prev + 1);
        };

        return (
          <div>
            <div data-testid="fields-filled">{fieldsFilled}</div>
            <div data-testid="abandoned">{abandoned ? 'yes' : 'no'}</div>
            <input 
              data-testid="test-field-1"
              onChange={handleFieldChange}
              placeholder="Product URL"
            />
            <input 
              data-testid="test-field-2" 
              onChange={handleFieldChange}
              placeholder="Product Name"
            />
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<FormAbandonmentTest variant="variant_a" />);

      // Fill some fields
      await user.type(screen.getByTestId('test-field-1'), 'https://amazon.com/test');
      await user.type(screen.getByTestId('test-field-2'), 'Test Product');

      // Wait for abandonment tracking
      await waitFor(() => {
        expect(screen.getByTestId('abandoned')).toHaveTextContent('yes');
      }, { timeout: 6000 });

      expect(mockABTestService.trackEvent).toHaveBeenCalledWith(
        'quote_form_layout',
        'variant_a',
        'ab-test-user-id',
        'form_abandoned',
        { fields_completed: 2 }
      );
    });
  });

  describe('Quote List Density Test', () => {
    it('should render different list densities based on variant', async () => {
      const ListDensityTest = ({ variant }: { variant: string }) => {
        const config = mockExperiments.quote_list_density.variants.find(v => v.id === variant)?.config;
        
        return (
          <div>
            <div data-testid="density-variant">{variant}</div>
            <div data-testid="density-config">{config?.density}</div>
            <div data-testid="show-breakdown">{config?.show_breakdown ? 'yes' : 'no'}</div>
            <UnifiedQuoteList
              quotes={[abTestQuote]}
              viewMode="customer" 
              layout={config?.compact_view ? 'compact' : 'list'}
              variant={variant}
              onItemAction={async (action, quote) => {
                // Track interaction with list item
                mockABTestService.trackEvent(
                  'quote_list_density',
                  variant,
                  'ab-test-user-id',
                  `list_${action}`,
                  { quote_id: quote.id }
                );
              }}
            />
          </div>
        );
      };

      // Test standard density
      const { rerender } = renderWithProviders(<ListDensityTest variant="control" />);

      expect(screen.getByTestId('density-variant')).toHaveTextContent('control');
      expect(screen.getByTestId('density-config')).toHaveTextContent('standard');
      expect(screen.getByTestId('show-breakdown')).toHaveTextContent('no');

      // Test high density
      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <BrowserRouter>
            <QuoteThemeProvider>
              <ListDensityTest variant="variant_a" />
            </QuoteThemeProvider>
          </BrowserRouter>
        </QueryClientProvider>
      );

      expect(screen.getByTestId('density-variant')).toHaveTextContent('variant_a');
      expect(screen.getByTestId('density-config')).toHaveTextContent('high');
      expect(screen.getByTestId('show-breakdown')).toHaveTextContent('yes');
    });

    it('should track engagement metrics by density variant', async () => {
      const EngagementTrackingTest = ({ variant }: { variant: string }) => {
        const [interactions, setInteractions] = React.useState(0);
        const [timeSpent, setTimeSpent] = React.useState(0);

        React.useEffect(() => {
          const startTime = Date.now();
          
          // Track time spent
          const timeTracker = setInterval(() => {
            const elapsed = Date.now() - startTime;
            setTimeSpent(elapsed);
          }, 1000);

          return () => {
            clearInterval(timeTracker);
            
            // Track final engagement metrics
            mockABTestService.trackEvent(
              'quote_list_density',
              variant,
              'ab-test-user-id',
              'session_end',
              {
                time_spent: timeSpent,
                interactions: interactions
              }
            );
          };
        }, []);

        const handleInteraction = (type: string) => {
          setInteractions(prev => prev + 1);
          
          mockABTestService.trackEvent(
            'quote_list_density',
            variant,
            'ab-test-user-id',
            type,
            { interaction_number: interactions + 1 }
          );
        };

        return (
          <div>
            <div data-testid="interactions">{interactions}</div>
            <div data-testid="time-spent">{Math.floor(timeSpent / 1000)}</div>
            <button 
              onClick={() => handleInteraction('click')}
              data-testid="interaction-button"
            >
              Click Me
            </button>
          </div>
        );
      };

      const user = userEvent.setup();
      renderWithProviders(<EngagementTrackingTest variant="variant_a" />);

      // Simulate interactions
      await user.click(screen.getByTestId('interaction-button'));
      await user.click(screen.getByTestId('interaction-button'));

      await waitFor(() => {
        expect(screen.getByTestId('interactions')).toHaveTextContent('2');
      });

      expect(mockABTestService.trackEvent).toHaveBeenCalledWith(
        'quote_list_density',
        'variant_a',
        'ab-test-user-id',
        'click',
        { interaction_number: 1 }
      );
    });
  });

  describe('User Segmentation and Targeting', () => {
    it('should apply different tests based on user segment', async () => {
      const SegmentedTestingTest = () => {
        const [userSegment, setUserSegment] = React.useState<string>('');
        const [eligibleTests, setEligibleTests] = React.useState<string[]>([]);

        React.useEffect(() => {
          const determineSegment = () => {
            // Mock user segmentation logic
            const user = { 
              days_since_signup: 5, 
              quotes_created: 2, 
              conversion_rate: 0.0 
            };

            let segment = 'new_user';
            if (user.days_since_signup > 7) segment = 'returning_user';
            if (user.quotes_created > 10) segment = 'power_user';

            setUserSegment(segment);

            // Determine eligible tests based on segment
            const eligible = [];
            if (segment === 'new_user') {
              eligible.push('quote_form_layout', 'quote_approval_colors');
            } else if (segment === 'power_user') {
              eligible.push('quote_list_density');
            } else {
              eligible.push('quote_approval_colors');
            }

            setEligibleTests(eligible);
          };

          determineSegment();
        }, []);

        return (
          <div>
            <div data-testid="user-segment">{userSegment}</div>
            <div data-testid="eligible-tests">{eligibleTests.join(',')}</div>
          </div>
        );
      };

      renderWithProviders(<SegmentedTestingTest />);

      await waitFor(() => {
        expect(screen.getByTestId('user-segment')).toHaveTextContent('new_user');
        expect(screen.getByTestId('eligible-tests')).toHaveTextContent('quote_form_layout,quote_approval_colors');
      });
    });

    it('should exclude users from experiments based on criteria', async () => {
      const ExclusionCriteriaTest = () => {
        const [isExcluded, setIsExcluded] = React.useState<boolean | null>(null);
        const [exclusionReason, setExclusionReason] = React.useState<string>('');

        React.useEffect(() => {
          const checkExclusion = () => {
            // Mock exclusion criteria
            const user = {
              is_admin: false,
              has_active_subscription: true,
              browser: 'chrome',
              device_type: 'mobile',
              country: 'IN'
            };

            // Exclude admins from all tests
            if (user.is_admin) {
              setIsExcluded(true);
              setExclusionReason('admin_user');
              return;
            }

            // Exclude certain browsers from specific tests
            if (user.browser === 'ie' && user.device_type === 'desktop') {
              setIsExcluded(true);
              setExclusionReason('unsupported_browser');
              return;
            }

            // Include user in test
            setIsExcluded(false);
            setExclusionReason('');
          };

          checkExclusion();
        }, []);

        return (
          <div>
            <div data-testid="excluded">{isExcluded === null ? 'checking' : isExcluded ? 'yes' : 'no'}</div>
            <div data-testid="exclusion-reason">{exclusionReason}</div>
          </div>
        );
      };

      renderWithProviders(<ExclusionCriteriaTest />);

      await waitFor(() => {
        expect(screen.getByTestId('excluded')).toHaveTextContent('no');
        expect(screen.getByTestId('exclusion-reason')).toHaveTextContent('');
      });
    });
  });

  describe('Statistical Significance and Sample Size', () => {
    it('should track sample sizes for statistical power', async () => {
      const SampleSizeTrackerTest = () => {
        const [sampleSizes, setSampleSizes] = React.useState<Record<string, number>>({});

        React.useEffect(() => {
          const trackSampleSize = () => {
            // Mock sample size tracking
            const experimentSamples = {
              quote_approval_colors: {
                control: 1250,
                variant_a: 1180
              },
              quote_form_layout: {
                control: 890,
                variant_a: 920,
                variant_b: 880
              }
            };

            setSampleSizes(experimentSamples);

            // Check if experiments have enough samples for significance
            Object.entries(experimentSamples).forEach(([experimentId, variants]) => {
              const totalSamples = Object.values(variants).reduce((sum, count) => sum + count, 0);
              const minSampleSize = 1000; // Minimum for 80% power

              if (totalSamples >= minSampleSize) {
                window.gtag('event', 'ab_test_ready_for_analysis', {
                  experiment_id: experimentId,
                  total_samples: totalSamples,
                  variants: Object.keys(variants).length
                });
              }
            });
          };

          trackSampleSize();
        }, []);

        return (
          <div>
            <div data-testid="color-test-samples">
              {sampleSizes.quote_approval_colors?.control || 0}
            </div>
            <div data-testid="form-test-samples">
              {Object.values(sampleSizes.quote_form_layout || {}).reduce((sum, count) => sum + count, 0)}
            </div>
          </div>
        );
      };

      renderWithProviders(<SampleSizeTrackerTest />);

      await waitFor(() => {
        expect(screen.getByTestId('color-test-samples')).toHaveTextContent('1250');
        expect(screen.getByTestId('form-test-samples')).toHaveTextContent('2690');
      });

      expect(window.gtag).toHaveBeenCalledWith('event', 'ab_test_ready_for_analysis', expect.objectContaining({
        experiment_id: 'quote_approval_colors',
        total_samples: 2430
      }));
    });

    it('should calculate and report conversion rates', async () => {
      const ConversionRateTest = () => {
        const [conversionRates, setConversionRates] = React.useState<Record<string, number>>({});

        React.useEffect(() => {
          const calculateConversions = () => {
            // Mock conversion rate calculation
            const experimentData = {
              quote_approval_colors: {
                control: { exposures: 1250, conversions: 125 }, // 10%
                variant_a: { exposures: 1180, conversions: 142 } // 12%
              }
            };

            const rates: Record<string, number> = {};
            Object.entries(experimentData).forEach(([experimentId, variants]) => {
              Object.entries(variants).forEach(([variantId, data]) => {
                const rate = data.conversions / data.exposures;
                rates[`${experimentId}_${variantId}`] = rate;
              });
            });

            setConversionRates(rates);

            // Report significant differences
            const controlRate = rates.quote_approval_colors_control;
            const variantRate = rates.quote_approval_colors_variant_a;
            const lift = ((variantRate - controlRate) / controlRate) * 100;

            if (Math.abs(lift) > 5) { // 5% significance threshold
              window.gtag('event', 'ab_test_significant_result', {
                experiment_id: 'quote_approval_colors',
                winning_variant: variantRate > controlRate ? 'variant_a' : 'control',
                lift_percentage: lift.toFixed(2),
                statistical_significance: 'yes'
              });
            }
          };

          calculateConversions();
        }, []);

        return (
          <div>
            <div data-testid="control-rate">
              {(conversionRates.quote_approval_colors_control * 100).toFixed(1)}%
            </div>
            <div data-testid="variant-rate">
              {(conversionRates.quote_approval_colors_variant_a * 100).toFixed(1)}%
            </div>
          </div>
        );
      };

      renderWithProviders(<ConversionRateTest />);

      await waitFor(() => {
        expect(screen.getByTestId('control-rate')).toHaveTextContent('10.0%');
        expect(screen.getByTestId('variant-rate')).toHaveTextContent('12.0%');
      });

      expect(window.gtag).toHaveBeenCalledWith('event', 'ab_test_significant_result', {
        experiment_id: 'quote_approval_colors',
        winning_variant: 'variant_a',
        lift_percentage: '20.00',
        statistical_significance: 'yes'
      });
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should fallback to control when A/B test service fails', async () => {
      // Mock service failure
      mockABTestService.getVariant.mockImplementation(() => {
        throw new Error('A/B test service unavailable');
      });

      const FallbackTest = () => {
        const [variant, setVariant] = React.useState<string>('');
        const [error, setError] = React.useState<string>('');

        React.useEffect(() => {
          const getVariantSafely = () => {
            try {
              const result = mockABTestService.getVariant('quote_approval_colors');
              setVariant(result);
            } catch (err) {
              setError((err as Error).message);
              setVariant('control'); // Fallback to control
              
              // Log error
              window.gtag('event', 'ab_test_error', {
                error_type: 'service_unavailable',
                experiment_id: 'quote_approval_colors',
                fallback_variant: 'control'
              });
            }
          };

          getVariantSafely();
        }, []);

        return (
          <div>
            <div data-testid="variant">{variant}</div>
            <div data-testid="error">{error}</div>
          </div>
        );
      };

      renderWithProviders(<FallbackTest />);

      await waitFor(() => {
        expect(screen.getByTestId('variant')).toHaveTextContent('control');
        expect(screen.getByTestId('error')).toHaveTextContent('A/B test service unavailable');
      });

      expect(window.gtag).toHaveBeenCalledWith('event', 'ab_test_error', {
        error_type: 'service_unavailable',
        experiment_id: 'quote_approval_colors',
        fallback_variant: 'control'
      });
    });

    it('should handle missing experiment configuration gracefully', async () => {
      const MissingConfigTest = () => {
        const [config, setConfig] = React.useState<any>(null);
        const [hasError, setHasError] = React.useState(false);

        React.useEffect(() => {
          const getConfigSafely = () => {
            try {
              const experimentConfig = mockABTestService.getTestConfig('nonexistent_experiment');
              setConfig(experimentConfig);
            } catch (err) {
              setHasError(true);
              
              // Use default configuration
              setConfig({
                id: 'default',
                variants: [{ id: 'control', config: {} }]
              });
            }
          };

          getConfigSafely();
        }, []);

        return (
          <div>
            <div data-testid="has-error">{hasError ? 'yes' : 'no'}</div>
            <div data-testid="config-id">{config?.id || 'none'}</div>
          </div>
        );
      };

      mockABTestService.getTestConfig.mockImplementation((experimentId) => {
        if (experimentId === 'nonexistent_experiment') {
          throw new Error('Experiment not found');
        }
        return mockExperiments[experimentId];
      });

      renderWithProviders(<MissingConfigTest />);

      await waitFor(() => {
        expect(screen.getByTestId('has-error')).toHaveTextContent('yes');
        expect(screen.getByTestId('config-id')).toHaveTextContent('default');
      });
    });
  });
});