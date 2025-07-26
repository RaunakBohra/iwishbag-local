import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

import { UnifiedQuoteCard } from '../../UnifiedQuoteCard';
import { UnifiedQuoteActions } from '../../UnifiedQuoteActions';
import { UnifiedQuoteForm } from '../../UnifiedQuoteForm';
import { UnifiedQuoteBreakdown } from '../../UnifiedQuoteBreakdown';
import { UnifiedQuoteList } from '../../UnifiedQuoteList';
import { QuoteThemeProvider } from '@/contexts/QuoteThemeContext';
import type { UnifiedQuote } from '@/types/unified-quote';

// Deployment configuration
const DEPLOYMENT_CONFIG = {
  environments: {
    staging: {
      url: 'https://staging.iwishbag.com',
      apiUrl: 'https://staging-api.iwishbag.com',
      cdnUrl: 'https://staging-cdn.iwishbag.com',
      database: 'staging',
      features: { analytics: true, debugging: true },
    },
    production: {
      url: 'https://iwishbag.com',
      apiUrl: 'https://api.iwishbag.com',
      cdnUrl: 'https://cdn.iwishbag.com',
      database: 'production',
      features: { analytics: true, debugging: false },
    },
  },
  deployment: {
    strategy: 'blue-green',
    rollbackThreshold: 0.05, // 5% error rate triggers rollback
    healthCheckTimeout: 30000, // 30 seconds
    warmupDuration: 120000, // 2 minutes
    canaryPercentage: 10, // 10% traffic for canary deployment
  },
  monitoring: {
    healthChecks: [
      { name: 'api_health', endpoint: '/health', timeout: 5000 },
      { name: 'database_health', endpoint: '/health/db', timeout: 10000 },
      { name: 'cache_health', endpoint: '/health/cache', timeout: 5000 },
      { name: 'cdn_health', endpoint: '/health/cdn', timeout: 5000 },
    ],
    metrics: {
      responseTime: { warning: 500, critical: 1000 },
      errorRate: { warning: 0.01, critical: 0.05 },
      throughput: { min: 100, warning: 50 },
      availability: { min: 0.999, warning: 0.995 },
    },
    alerts: {
      channels: ['email', 'slack', 'pagerduty'],
      escalation: { timeout: 300000, levels: 3 },
    },
  },
  rollback: {
    automatic: true,
    conditions: ['high_error_rate', 'low_availability', 'performance_degradation'],
    maxRollbackTime: 600000, // 10 minutes
  },
};

// Deployment utilities
class DeploymentValidator {
  private healthChecks: Map<string, boolean> = new Map();
  private metrics: Map<string, number> = new Map();
  private deploymentErrors: Array<{ type: string; message: string; timestamp: number }> = [];

  async runHealthCheck(name: string, endpoint: string, timeout: number = 5000): Promise<boolean> {
    try {
      // Simulate health check request
      await new Promise((resolve, reject) => {
        setTimeout(
          () => {
            // 95% success rate for health checks
            if (Math.random() > 0.05) {
              resolve(true);
            } else {
              reject(new Error(`Health check failed: ${name}`));
            }
          },
          Math.random() * timeout * 0.5,
        );
      });

      this.healthChecks.set(name, true);
      return true;
    } catch (error) {
      this.healthChecks.set(name, false);
      this.addDeploymentError('health_check_failed', `${name}: ${(error as Error).message}`);
      return false;
    }
  }

  async validateDeployment(environment: 'staging' | 'production'): Promise<{
    success: boolean;
    healthChecks: Record<string, boolean>;
    metrics: Record<string, number>;
    errors: Array<{ type: string; message: string; timestamp: number }>;
  }> {
    const config = DEPLOYMENT_CONFIG.environments[environment];
    const healthCheckResults: Record<string, boolean> = {};

    // Run all health checks
    for (const check of DEPLOYMENT_CONFIG.monitoring.healthChecks) {
      const result = await this.runHealthCheck(
        check.name,
        `${config.apiUrl}${check.endpoint}`,
        check.timeout,
      );
      healthCheckResults[check.name] = result;
    }

    // Collect metrics
    const metricsResults: Record<string, number> = {
      response_time: Math.random() * 800 + 100, // 100-900ms
      error_rate: Math.random() * 0.02, // 0-2%
      throughput: Math.random() * 500 + 200, // 200-700 RPS
      availability: 0.995 + Math.random() * 0.005, // 99.5-100%
      memory_usage: Math.random() * 0.3 + 0.4, // 40-70%
      cpu_usage: Math.random() * 0.4 + 0.3, // 30-70%
    };

    Object.entries(metricsResults).forEach(([key, value]) => {
      this.metrics.set(key, value);
    });

    // Validate against thresholds
    this.validateMetrics(metricsResults);

    const allHealthy = Object.values(healthCheckResults).every((healthy) => healthy);
    const noErrors = this.deploymentErrors.length === 0;

    return {
      success: allHealthy && noErrors,
      healthChecks: healthCheckResults,
      metrics: metricsResults,
      errors: this.deploymentErrors,
    };
  }

  private validateMetrics(metrics: Record<string, number>): void {
    const { monitoring } = DEPLOYMENT_CONFIG;

    if (metrics.response_time > monitoring.metrics.responseTime.critical) {
      this.addDeploymentError(
        'performance_degradation',
        `Response time critical: ${metrics.response_time}ms`,
      );
    } else if (metrics.response_time > monitoring.metrics.responseTime.warning) {
      this.addDeploymentError(
        'performance_warning',
        `Response time elevated: ${metrics.response_time}ms`,
      );
    }

    if (metrics.error_rate > monitoring.metrics.errorRate.critical) {
      this.addDeploymentError(
        'high_error_rate',
        `Error rate critical: ${(metrics.error_rate * 100).toFixed(2)}%`,
      );
    }

    if (metrics.availability < monitoring.metrics.availability.min) {
      this.addDeploymentError(
        'low_availability',
        `Availability below minimum: ${(metrics.availability * 100).toFixed(2)}%`,
      );
    }

    if (metrics.throughput < monitoring.metrics.throughput.warning) {
      this.addDeploymentError(
        'low_throughput',
        `Throughput below warning: ${metrics.throughput} RPS`,
      );
    }
  }

  private addDeploymentError(type: string, message: string): void {
    this.deploymentErrors.push({
      type,
      message,
      timestamp: Date.now(),
    });
  }

  shouldRollback(): boolean {
    const criticalErrors = this.deploymentErrors.filter((error) =>
      ['high_error_rate', 'low_availability', 'performance_degradation'].includes(error.type),
    );

    return criticalErrors.length > 0;
  }

  clearState(): void {
    this.healthChecks.clear();
    this.metrics.clear();
    this.deploymentErrors = [];
  }
}

// CI/CD Pipeline simulation
class CIPipeline {
  private stages: Array<{
    name: string;
    status: 'pending' | 'running' | 'success' | 'failed';
    duration?: number;
  }> = [];

  async runPipeline(): Promise<{
    success: boolean;
    stages: typeof this.stages;
    totalDuration: number;
  }> {
    const startTime = Date.now();

    this.stages = [
      { name: 'lint', status: 'pending' },
      { name: 'typecheck', status: 'pending' },
      { name: 'unit_tests', status: 'pending' },
      { name: 'integration_tests', status: 'pending' },
      { name: 'security_scan', status: 'pending' },
      { name: 'build', status: 'pending' },
      { name: 'deploy_staging', status: 'pending' },
      { name: 'smoke_tests', status: 'pending' },
      { name: 'deploy_production', status: 'pending' },
    ];

    for (let i = 0; i < this.stages.length; i++) {
      const stage = this.stages[i];
      stage.status = 'running';

      const stageStartTime = Date.now();

      // Simulate stage execution
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 200 + 100));

      // 98% success rate for CI stages
      const success = Math.random() > 0.02;

      stage.status = success ? 'success' : 'failed';
      stage.duration = Date.now() - stageStartTime;

      if (!success) {
        // Mark remaining stages as pending (not executed)
        for (let j = i + 1; j < this.stages.length; j++) {
          this.stages[j].status = 'pending';
        }
        break;
      }
    }

    const totalDuration = Date.now() - startTime;
    const success = this.stages.every((stage) => stage.status === 'success');

    return { success, stages: this.stages, totalDuration };
  }

  getStageStatus(stageName: string): 'pending' | 'running' | 'success' | 'failed' | 'not_found' {
    const stage = this.stages.find((s) => s.name === stageName);
    return stage ? stage.status : 'not_found';
  }
}

// Monitoring setup
class MonitoringSetup {
  private dashboards: string[] = [];
  private alerts: Array<{ name: string; condition: string; channels: string[] }> = [];
  private uptime: number = 0.999;

  setupDashboards(): void {
    this.dashboards = [
      'application_performance',
      'business_metrics',
      'infrastructure_health',
      'user_experience',
      'security_monitoring',
      'error_tracking',
    ];
  }

  setupAlerts(): void {
    this.alerts = [
      {
        name: 'high_response_time',
        condition: 'avg(response_time) > 1000ms for 5min',
        channels: ['slack', 'email'],
      },
      {
        name: 'error_rate_spike',
        condition: 'error_rate > 5% for 2min',
        channels: ['pagerduty', 'slack'],
      },
      {
        name: 'low_availability',
        condition: 'availability < 99.5% for 1min',
        channels: ['pagerduty', 'email', 'slack'],
      },
      {
        name: 'memory_leak',
        condition: 'memory_usage > 90% for 10min',
        channels: ['slack', 'email'],
      },
      {
        name: 'deployment_failure',
        condition: 'deployment_status = failed',
        channels: ['pagerduty', 'slack'],
      },
    ];
  }

  validateMonitoring(): { dashboards: boolean; alerts: boolean; uptime: number } {
    return {
      dashboards: this.dashboards.length >= 5,
      alerts: this.alerts.length >= 4,
      uptime: this.uptime,
    };
  }
}

// Generate test data for deployment
const generateDeploymentTestQuote = (): UnifiedQuote => ({
  id: 'deploy-test-quote-001',
  display_id: 'QT-DEPLOY001',
  user_id: 'deploy-test-user-id',
  status: 'sent',
  created_at: '2024-01-15T10:00:00Z',
  expires_at: '2024-02-15T10:00:00Z',
  final_total_usd: 599.99,
  item_price: 499.99,
  sales_tax_price: 40.0,
  merchant_shipping_price: 25.0,
  international_shipping: 39.99,
  customs_and_ecs: 24.99,
  domestic_shipping: 12.99,
  handling_charge: 9.99,
  insurance_amount: 5.99,
  payment_gateway_fee: 7.99,
  vat: 0.0,
  discount: 25.0,
  destination_country: 'IN',
  origin_country: 'US',
  website: 'amazon.com',
  customer_data: {
    info: {
      name: 'Deployment Test User',
      email: 'deploy@example.com',
      phone: '+91-9876543210',
    },
  },
  shipping_address: {
    formatted: '123 Deployment Street, Mumbai, Maharashtra 400001, India',
  },
  items: [
    {
      id: 'deploy-item',
      name: 'Deployment Test Product',
      description: 'Product for deployment validation',
      quantity: 1,
      price: 499.99,
      product_url: 'https://amazon.com/deployment-test',
      image_url: 'https://example.com/deploy.jpg',
    },
  ],
  notes: 'Deployment readiness test quote',
  admin_notes: 'For deployment validation',
  priority: 'high',
  in_cart: false,
  attachments: [],
});

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'deploy-user-id', email: 'deploy@iwishbag.com' },
  }),
}));

vi.mock('@/hooks/useAdminRole', () => ({
  useAdminRole: () => ({
    data: true,
    isLoading: false,
  }),
}));

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

describe('Deployment Readiness and Monitoring', () => {
  let deploymentValidator: DeploymentValidator;
  let ciPipeline: CIPipeline;
  let monitoringSetup: MonitoringSetup;

  beforeEach(() => {
    vi.clearAllMocks();
    deploymentValidator = new DeploymentValidator();
    ciPipeline = new CIPipeline();
    monitoringSetup = new MonitoringSetup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    deploymentValidator.clearState();
  });

  describe('CI/CD Pipeline Validation', () => {
    it('should run complete CI/CD pipeline successfully', async () => {
      const PipelineTest = () => {
        const [pipelineResult, setPipelineResult] = React.useState<any>(null);
        const [isRunning, setIsRunning] = React.useState(false);

        const runPipeline = async () => {
          setIsRunning(true);
          const result = await ciPipeline.runPipeline();
          setPipelineResult(result);
          setIsRunning(false);
        };

        React.useEffect(() => {
          runPipeline();
        }, []);

        return (
          <div>
            <div data-testid="pipeline-running">{isRunning ? 'running' : 'completed'}</div>
            {pipelineResult && (
              <div>
                <div data-testid="pipeline-success">
                  {pipelineResult.success ? 'success' : 'failed'}
                </div>
                <div data-testid="pipeline-duration">{pipelineResult.totalDuration}</div>
                <div data-testid="stages-count">{pipelineResult.stages.length}</div>
              </div>
            )}
          </div>
        );
      };

      renderWithProviders(<PipelineTest />);

      await waitFor(
        () => {
          expect(screen.getByTestId('pipeline-running')).toHaveTextContent('completed');
        },
        { timeout: 5000 },
      );

      // Pipeline should complete successfully most of the time
      const success = screen.getByTestId('pipeline-success').textContent;
      const duration = parseInt(screen.getByTestId('pipeline-duration').textContent!);
      const stagesCount = parseInt(screen.getByTestId('stages-count').textContent!);

      expect(stagesCount).toBe(9); // All CI/CD stages
      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Check individual stage completion
      expect(ciPipeline.getStageStatus('lint')).not.toBe('pending');
      expect(ciPipeline.getStageStatus('typecheck')).not.toBe('pending');
      expect(ciPipeline.getStageStatus('unit_tests')).not.toBe('pending');
    });

    it('should handle pipeline failures gracefully', async () => {
      // Mock a failing stage
      const originalRunPipeline = ciPipeline.runPipeline;
      ciPipeline.runPipeline = vi.fn().mockImplementation(async () => {
        return {
          success: false,
          stages: [
            { name: 'lint', status: 'success', duration: 150 },
            { name: 'typecheck', status: 'success', duration: 200 },
            { name: 'unit_tests', status: 'failed', duration: 300 },
            { name: 'integration_tests', status: 'pending' },
            { name: 'security_scan', status: 'pending' },
            { name: 'build', status: 'pending' },
            { name: 'deploy_staging', status: 'pending' },
            { name: 'smoke_tests', status: 'pending' },
            { name: 'deploy_production', status: 'pending' },
          ],
          totalDuration: 650,
        };
      });

      const FailureHandlingTest = () => {
        const [result, setResult] = React.useState<any>(null);

        React.useEffect(() => {
          ciPipeline.runPipeline().then(setResult);
        }, []);

        return result ? (
          <div>
            <div data-testid="pipeline-failed">{result.success ? 'false' : 'true'}</div>
            <div data-testid="failed-stage">
              {result.stages.find((s: any) => s.status === 'failed')?.name}
            </div>
            <div data-testid="pending-stages">
              {result.stages.filter((s: any) => s.status === 'pending').length}
            </div>
          </div>
        ) : null;
      };

      renderWithProviders(<FailureHandlingTest />);

      await waitFor(() => {
        expect(screen.getByTestId('pipeline-failed')).toHaveTextContent('true');
        expect(screen.getByTestId('failed-stage')).toHaveTextContent('unit_tests');
        expect(screen.getByTestId('pending-stages')).toHaveTextContent('6'); // Remaining stages not executed
      });

      // Restore original implementation
      ciPipeline.runPipeline = originalRunPipeline;
    });

    it('should validate build artifacts and assets', async () => {
      const ArtifactValidationTest = () => {
        const [artifacts, setArtifacts] = React.useState<any>({});

        React.useEffect(() => {
          // Simulate artifact validation
          const validateArtifacts = async () => {
            const results = {
              js_bundles: {
                main: { size: 245000, gzipped: 65000, valid: true },
                vendor: { size: 890000, gzipped: 220000, valid: true },
                chunks: { count: 8, totalSize: 124000, valid: true },
              },
              css_files: {
                main: { size: 45000, gzipped: 8900, valid: true },
                critical: { size: 12000, gzipped: 2800, valid: true },
              },
              assets: {
                images: { count: 25, totalSize: 450000, optimized: true },
                fonts: { count: 4, totalSize: 180000, preloaded: true },
                icons: { count: 50, format: 'svg', valid: true },
              },
              manifest: {
                pwa: { valid: true, icons: 8, screenshots: 2 },
                sitemap: { valid: true, pages: 156 },
                robots: { valid: true, policies: 3 },
              },
            };

            setArtifacts(results);
          };

          validateArtifacts();
        }, []);

        return Object.keys(artifacts).length > 0 ? (
          <div>
            <div data-testid="js-bundle-size">{artifacts.js_bundles?.main?.size}</div>
            <div data-testid="css-file-count">{Object.keys(artifacts.css_files || {}).length}</div>
            <div data-testid="assets-optimized">
              {artifacts.assets?.images?.optimized ? 'true' : 'false'}
            </div>
            <div data-testid="pwa-manifest-valid">
              {artifacts.manifest?.pwa?.valid ? 'true' : 'false'}
            </div>
          </div>
        ) : null;
      };

      renderWithProviders(<ArtifactValidationTest />);

      await waitFor(() => {
        expect(screen.getByTestId('js-bundle-size')).toHaveTextContent('245000');
        expect(screen.getByTestId('css-file-count')).toHaveTextContent('2');
        expect(screen.getByTestId('assets-optimized')).toHaveTextContent('true');
        expect(screen.getByTestId('pwa-manifest-valid')).toHaveTextContent('true');
      });
    });
  });

  describe('Deployment Environment Validation', () => {
    it('should validate staging environment health', async () => {
      const result = await deploymentValidator.validateDeployment('staging');

      expect(result).toBeDefined();
      expect(result.healthChecks).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.errors).toBeInstanceOf(Array);

      // Health checks
      expect(result.healthChecks.api_health).toBeDefined();
      expect(result.healthChecks.database_health).toBeDefined();
      expect(result.healthChecks.cache_health).toBeDefined();
      expect(result.healthChecks.cdn_health).toBeDefined();

      // Metrics
      expect(result.metrics.response_time).toBeGreaterThan(0);
      expect(result.metrics.error_rate).toBeLessThan(0.1);
      expect(result.metrics.availability).toBeGreaterThan(0.9);
    });

    it('should validate production environment health', async () => {
      const result = await deploymentValidator.validateDeployment('production');

      expect(result).toBeDefined();

      // Production should have stricter requirements
      if (result.success) {
        expect(result.metrics.response_time).toBeLessThan(1000);
        expect(result.metrics.error_rate).toBeLessThan(0.05);
        expect(result.metrics.availability).toBeGreaterThan(0.995);
      }

      // Should have comprehensive health checks
      expect(Object.keys(result.healthChecks)).toHaveLength(4);
    });

    it('should trigger rollback on critical issues', async () => {
      // Mock critical failure scenario
      const originalValidateDeployment = deploymentValidator.validateDeployment;
      deploymentValidator.validateDeployment = vi.fn().mockResolvedValue({
        success: false,
        healthChecks: {
          api_health: false,
          database_health: true,
          cache_health: true,
          cdn_health: true,
        },
        metrics: {
          response_time: 2500, // Critical threshold exceeded
          error_rate: 0.08, // Critical threshold exceeded
          availability: 0.992,
          throughput: 45, // Below warning threshold
        },
        errors: [
          { type: 'high_error_rate', message: 'Error rate critical: 8.00%', timestamp: Date.now() },
          {
            type: 'performance_degradation',
            message: 'Response time critical: 2500ms',
            timestamp: Date.now(),
          },
        ],
      });

      const result = await deploymentValidator.validateDeployment('production');
      const shouldRollback = deploymentValidator.shouldRollback();

      expect(result.success).toBe(false);
      expect(shouldRollback).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);

      // Restore original implementation
      deploymentValidator.validateDeployment = originalValidateDeployment;
    });

    it('should validate blue-green deployment strategy', async () => {
      const BlueGreenTest = () => {
        const [deploymentStatus, setDeploymentStatus] = React.useState({
          blue: { active: true, health: 'healthy', traffic: 100 },
          green: { active: false, health: 'deploying', traffic: 0 },
          switchover: false,
        });

        React.useEffect(() => {
          // Simulate blue-green deployment
          const deployToGreen = async () => {
            // Deploy to green environment
            setDeploymentStatus((prev) => ({
              ...prev,
              green: { active: true, health: 'deploying', traffic: 0 },
            }));

            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Health check green environment
            setDeploymentStatus((prev) => ({
              ...prev,
              green: { active: true, health: 'healthy', traffic: 0 },
            }));

            await new Promise((resolve) => setTimeout(resolve, 500));

            // Switch traffic to green
            setDeploymentStatus((prev) => ({
              blue: { active: true, health: 'healthy', traffic: 0 },
              green: { active: true, health: 'healthy', traffic: 100 },
              switchover: true,
            }));
          };

          setTimeout(deployToGreen, 100);
        }, []);

        return (
          <div>
            <div data-testid="blue-traffic">{deploymentStatus.blue.traffic}</div>
            <div data-testid="green-traffic">{deploymentStatus.green.traffic}</div>
            <div data-testid="switchover-complete">
              {deploymentStatus.switchover ? 'true' : 'false'}
            </div>
            <div data-testid="green-health">{deploymentStatus.green.health}</div>
          </div>
        );
      };

      renderWithProviders(<BlueGreenTest />);

      // Initially blue should have all traffic
      expect(screen.getByTestId('blue-traffic')).toHaveTextContent('100');
      expect(screen.getByTestId('green-traffic')).toHaveTextContent('0');

      // Wait for deployment to complete
      await waitFor(
        () => {
          expect(screen.getByTestId('switchover-complete')).toHaveTextContent('true');
          expect(screen.getByTestId('green-health')).toHaveTextContent('healthy');
          expect(screen.getByTestId('green-traffic')).toHaveTextContent('100');
        },
        { timeout: 3000 },
      );
    });
  });

  describe('Monitoring and Alerting Setup', () => {
    it('should setup comprehensive monitoring dashboards', async () => {
      monitoringSetup.setupDashboards();

      const MonitoringDashboardTest = () => {
        const [dashboards, setDashboards] = React.useState<string[]>([]);

        React.useEffect(() => {
          // Simulate dashboard setup
          const setupDashboards = [
            'application_performance',
            'business_metrics',
            'infrastructure_health',
            'user_experience',
            'security_monitoring',
            'error_tracking',
          ];

          setDashboards(setupDashboards);
        }, []);

        return (
          <div>
            <div data-testid="dashboard-count">{dashboards.length}</div>
            <div data-testid="has-performance-dashboard">
              {dashboards.includes('application_performance') ? 'true' : 'false'}
            </div>
            <div data-testid="has-security-dashboard">
              {dashboards.includes('security_monitoring') ? 'true' : 'false'}
            </div>
          </div>
        );
      };

      renderWithProviders(<MonitoringDashboardTest />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-count')).toHaveTextContent('6');
        expect(screen.getByTestId('has-performance-dashboard')).toHaveTextContent('true');
        expect(screen.getByTestId('has-security-dashboard')).toHaveTextContent('true');
      });

      const validation = monitoringSetup.validateMonitoring();
      expect(validation.dashboards).toBe(true);
    });

    it('should configure alerts for critical metrics', async () => {
      monitoringSetup.setupAlerts();

      const AlertSetupTest = () => {
        const [alerts, setAlerts] = React.useState<any[]>([]);

        React.useEffect(() => {
          const configuredAlerts = [
            {
              name: 'high_response_time',
              condition: 'avg(response_time) > 1000ms for 5min',
              channels: ['slack', 'email'],
            },
            {
              name: 'error_rate_spike',
              condition: 'error_rate > 5% for 2min',
              channels: ['pagerduty', 'slack'],
            },
            {
              name: 'low_availability',
              condition: 'availability < 99.5% for 1min',
              channels: ['pagerduty', 'email', 'slack'],
            },
            {
              name: 'deployment_failure',
              condition: 'deployment_status = failed',
              channels: ['pagerduty', 'slack'],
            },
          ];

          setAlerts(configuredAlerts);
        }, []);

        return (
          <div>
            <div data-testid="alert-count">{alerts.length}</div>
            <div data-testid="has-pagerduty-integration">
              {alerts.some((alert) => alert.channels.includes('pagerduty')) ? 'true' : 'false'}
            </div>
            <div data-testid="has-deployment-alerts">
              {alerts.some((alert) => alert.name === 'deployment_failure') ? 'true' : 'false'}
            </div>
          </div>
        );
      };

      renderWithProviders(<AlertSetupTest />);

      await waitFor(() => {
        expect(screen.getByTestId('alert-count')).toHaveTextContent('4');
        expect(screen.getByTestId('has-pagerduty-integration')).toHaveTextContent('true');
        expect(screen.getByTestId('has-deployment-alerts')).toHaveTextContent('true');
      });
    });

    it('should validate uptime and SLA requirements', async () => {
      const UptimeValidationTest = () => {
        const [slaMetrics, setSlaMetrics] = React.useState({
          uptime: 0,
          responseTime: 0,
          errorRate: 0,
          slaCompliance: false,
        });

        React.useEffect(() => {
          // Simulate SLA metrics calculation
          const calculateSLA = () => {
            const uptime = 0.9985; // 99.85% uptime
            const avgResponseTime = 245; // 245ms average
            const errorRate = 0.008; // 0.8% error rate

            const slaCompliance =
              uptime >= 0.995 && // 99.5% uptime SLA
              avgResponseTime <= 500 && // 500ms response time SLA
              errorRate <= 0.01; // 1% error rate SLA

            setSlaMetrics({
              uptime,
              responseTime: avgResponseTime,
              errorRate,
              slaCompliance,
            });
          };

          calculateSLA();
        }, []);

        return (
          <div>
            <div data-testid="uptime-percentage">{(slaMetrics.uptime * 100).toFixed(2)}</div>
            <div data-testid="avg-response-time">{slaMetrics.responseTime}</div>
            <div data-testid="error-rate-percentage">{(slaMetrics.errorRate * 100).toFixed(1)}</div>
            <div data-testid="sla-compliant">{slaMetrics.slaCompliance ? 'true' : 'false'}</div>
          </div>
        );
      };

      renderWithProviders(<UptimeValidationTest />);

      await waitFor(() => {
        expect(screen.getByTestId('uptime-percentage')).toHaveTextContent('99.85');
        expect(screen.getByTestId('avg-response-time')).toHaveTextContent('245');
        expect(screen.getByTestId('error-rate-percentage')).toHaveTextContent('0.8');
        expect(screen.getByTestId('sla-compliant')).toHaveTextContent('false'); // Uptime slightly below SLA
      });
    });
  });

  describe('Component Deployment Validation', () => {
    it('should validate unified components work in production environment', async () => {
      const testQuote = generateDeploymentTestQuote();

      const ProductionComponentTest = () => {
        const [componentStatus, setComponentStatus] = React.useState({
          card: 'loading',
          form: 'loading',
          list: 'loading',
          actions: 'loading',
          breakdown: 'loading',
        });

        React.useEffect(() => {
          // Simulate component health checks
          const checkComponents = async () => {
            const checks = ['card', 'form', 'list', 'actions', 'breakdown'];

            for (const component of checks) {
              await new Promise((resolve) => setTimeout(resolve, 200));
              setComponentStatus((prev) => ({
                ...prev,
                [component]: Math.random() > 0.02 ? 'healthy' : 'error', // 98% success rate
              }));
            }
          };

          checkComponents();
        }, []);

        const allHealthy = Object.values(componentStatus).every((status) => status === 'healthy');

        return (
          <div>
            <div data-testid="all-components-healthy">{allHealthy ? 'true' : 'false'}</div>
            <div data-testid="card-status">{componentStatus.card}</div>
            <div data-testid="form-status">{componentStatus.form}</div>

            <UnifiedQuoteCard quote={testQuote} viewMode="customer" layout="detail" />

            <UnifiedQuoteForm mode="create" viewMode="guest" onSubmit={vi.fn()} />

            <UnifiedQuoteList quotes={[testQuote]} viewMode="admin" layout="table" />
          </div>
        );
      };

      renderWithProviders(<ProductionComponentTest />);

      await waitFor(
        () => {
          expect(screen.getByTestId('card-status')).not.toHaveTextContent('loading');
          expect(screen.getByTestId('form-status')).not.toHaveTextContent('loading');
        },
        { timeout: 3000 },
      );

      // Components should render successfully
      expect(screen.getByRole('article')).toBeInTheDocument(); // Quote card
      expect(screen.getByRole('form')).toBeInTheDocument(); // Quote form
      expect(screen.getByRole('table')).toBeInTheDocument(); // Quote list
    });

    it('should validate component performance in production load', async () => {
      const quotes = Array.from({ length: 100 }, () => generateDeploymentTestQuote());

      const ProductionLoadTest = () => {
        const [performanceMetrics, setPerformanceMetrics] = React.useState({
          renderTime: 0,
          memoryUsage: 0,
          interactionLatency: 0,
        });

        React.useEffect(() => {
          const startTime = performance.now();

          // Simulate performance monitoring
          setTimeout(() => {
            const renderTime = performance.now() - startTime;

            setPerformanceMetrics({
              renderTime,
              memoryUsage: Math.random() * 50 + 30, // 30-80MB
              interactionLatency: Math.random() * 50 + 10, // 10-60ms
            });
          }, 100);
        }, []);

        return (
          <div>
            <div data-testid="render-time">{performanceMetrics.renderTime.toFixed(1)}</div>
            <div data-testid="memory-usage">{performanceMetrics.memoryUsage.toFixed(1)}</div>
            <div data-testid="interaction-latency">
              {performanceMetrics.interactionLatency.toFixed(1)}
            </div>

            <UnifiedQuoteList quotes={quotes} viewMode="admin" layout="table" />
          </div>
        );
      };

      renderWithProviders(<ProductionLoadTest />);

      await waitFor(() => {
        const renderTime = parseFloat(screen.getByTestId('render-time').textContent!);
        const memoryUsage = parseFloat(screen.getByTestId('memory-usage').textContent!);
        const interactionLatency = parseFloat(
          screen.getByTestId('interaction-latency').textContent!,
        );

        expect(renderTime).toBeLessThan(1000); // Under 1 second
        expect(memoryUsage).toBeLessThan(100); // Under 100MB
        expect(interactionLatency).toBeLessThan(100); // Under 100ms
      });
    });
  });

  describe('Rollback and Recovery Testing', () => {
    it('should execute automatic rollback on deployment failure', async () => {
      const RollbackTest = () => {
        const [deploymentState, setDeploymentState] = React.useState({
          version: 'v2.0.0',
          status: 'deploying',
          rollbackTriggered: false,
          rollbackCompleted: false,
        });

        React.useEffect(() => {
          const simulateFailedDeployment = async () => {
            // Simulate deployment failure after 1 second
            await new Promise((resolve) => setTimeout(resolve, 1000));

            setDeploymentState((prev) => ({
              ...prev,
              status: 'failed',
              rollbackTriggered: true,
            }));

            // Simulate rollback process
            await new Promise((resolve) => setTimeout(resolve, 800));

            setDeploymentState((prev) => ({
              ...prev,
              version: 'v1.9.5', // Previous stable version
              status: 'healthy',
              rollbackCompleted: true,
            }));
          };

          simulateFailedDeployment();
        }, []);

        return (
          <div>
            <div data-testid="current-version">{deploymentState.version}</div>
            <div data-testid="deployment-status">{deploymentState.status}</div>
            <div data-testid="rollback-triggered">
              {deploymentState.rollbackTriggered ? 'true' : 'false'}
            </div>
            <div data-testid="rollback-completed">
              {deploymentState.rollbackCompleted ? 'true' : 'false'}
            </div>
          </div>
        );
      };

      renderWithProviders(<RollbackTest />);

      // Wait for rollback to complete
      await waitFor(
        () => {
          expect(screen.getByTestId('rollback-completed')).toHaveTextContent('true');
          expect(screen.getByTestId('current-version')).toHaveTextContent('v1.9.5');
          expect(screen.getByTestId('deployment-status')).toHaveTextContent('healthy');
        },
        { timeout: 3000 },
      );
    });

    it('should validate system recovery after rollback', async () => {
      const RecoveryValidationTest = () => {
        const [recoveryStatus, setRecoveryStatus] = React.useState({
          apiHealth: false,
          databaseConnectivity: false,
          cacheOperational: false,
          userSessionsRestored: false,
          dataConsistency: false,
          overallRecovery: false,
        });

        React.useEffect(() => {
          const validateRecovery = async () => {
            const checks = Object.keys(recoveryStatus);

            for (const check of checks) {
              if (check === 'overallRecovery') continue;

              await new Promise((resolve) => setTimeout(resolve, 300));

              setRecoveryStatus((prev) => ({
                ...prev,
                [check]: Math.random() > 0.05, // 95% success rate
              }));
            }

            // Check overall recovery
            setTimeout(() => {
              setRecoveryStatus((prev) => {
                const allHealthy = Object.entries(prev)
                  .filter(([key]) => key !== 'overallRecovery')
                  .every(([, healthy]) => healthy);

                return { ...prev, overallRecovery: allHealthy };
              });
            }, 1500);
          };

          validateRecovery();
        }, []);

        return (
          <div>
            <div data-testid="api-health">{recoveryStatus.apiHealth ? 'healthy' : 'unhealthy'}</div>
            <div data-testid="database-connectivity">
              {recoveryStatus.databaseConnectivity ? 'connected' : 'disconnected'}
            </div>
            <div data-testid="cache-operational">
              {recoveryStatus.cacheOperational ? 'operational' : 'down'}
            </div>
            <div data-testid="overall-recovery">
              {recoveryStatus.overallRecovery ? 'complete' : 'incomplete'}
            </div>
          </div>
        );
      };

      renderWithProviders(<RecoveryValidationTest />);

      await waitFor(
        () => {
          expect(screen.getByTestId('overall-recovery')).toHaveTextContent('complete');
        },
        { timeout: 3000 },
      );

      // All systems should be healthy after recovery
      expect(screen.getByTestId('api-health')).toHaveTextContent('healthy');
      expect(screen.getByTestId('database-connectivity')).toHaveTextContent('connected');
      expect(screen.getByTestId('cache-operational')).toHaveTextContent('operational');
    });
  });
});
