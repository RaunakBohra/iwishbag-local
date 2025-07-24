/**
 * HSN Migration Dashboard
 * Comprehensive admin interface for managing HSN data migration and validation
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CalendarDays,
  Database,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Download,
  Upload,
  RotateCcw,
  Settings,
  BarChart3,
  Shield,
  Clock,
  Users,
  Zap,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  hsnDataMigrationService,
  type MigrationOptions,
  type MigrationBatch,
} from '@/services/HSNDataMigrationService';
import {
  hsnDataValidationService,
  type ValidationOptions,
  type ValidationReport,
} from '@/services/HSNDataValidationService';
import { format } from 'date-fns';

interface MigrationFormData {
  startDate: string;
  endDate: string;
  batchSize: number;
  dryRun: boolean;
  preserveOriginalData: boolean;
  confidenceThreshold: number;
  validateTaxCalculations: boolean;
  enableRollbackSnapshots: boolean;
  continueOnErrors: boolean;
  classificationMethods: string[];
}

interface ValidationFormData {
  includeCategories: string[];
  severityThreshold: string;
  sampleSize: number;
  deepValidation: boolean;
  validateGovernmentAPIs: boolean;
  generateRecommendations: boolean;
}

export function HSNMigrationDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Migration form state
  const [migrationForm, setMigrationForm] = useState<MigrationFormData>({
    startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    batchSize: 50,
    dryRun: true,
    preserveOriginalData: true,
    confidenceThreshold: 0.7,
    validateTaxCalculations: true,
    enableRollbackSnapshots: true,
    continueOnErrors: true,
    classificationMethods: ['keyword', 'category', 'ml'],
  });

  // Validation form state
  const [validationForm, setValidationForm] = useState<ValidationFormData>({
    includeCategories: ['integrity', 'business', 'tax', 'hsn', 'migration'],
    severityThreshold: 'low',
    sampleSize: 1000,
    deepValidation: true,
    validateGovernmentAPIs: false,
    generateRecommendations: true,
  });

  // Active migration/validation states
  const [activeMigrationBatch, setActiveMigrationBatch] = useState<string | null>(null);
  const [activeValidationId, setActiveValidationId] = useState<string | null>(null);

  // Get migration statistics
  const { data: migrationStats } = useQuery({
    queryKey: ['hsn-migration-stats'],
    queryFn: () => hsnDataMigrationService.getMigrationStats(),
    refetchInterval: 30000,
  });

  // Get data quality metrics
  const { data: dataQualityMetrics } = useQuery({
    queryKey: ['hsn-data-quality'],
    queryFn: () => hsnDataValidationService.getDataQualityMetrics(),
    refetchInterval: 60000,
  });

  // Get validation history
  const { data: validationHistory } = useQuery({
    queryKey: ['hsn-validation-history'],
    queryFn: () => hsnDataValidationService.getValidationHistory(),
    refetchInterval: 60000,
  });

  // Migration mutation
  const migrationMutation = useMutation({
    mutationFn: async (options: Partial<MigrationOptions>) => {
      const dateRange = {
        start: migrationForm.startDate + 'T00:00:00Z',
        end: migrationForm.endDate + 'T23:59:59Z',
      };

      return hsnDataMigrationService.startMigration(dateRange, options);
    },
    onSuccess: (result) => {
      setActiveMigrationBatch(result.batch_id);
      toast({
        title: 'Migration Started',
        description: `Processing ${result.total_quotes} quotes. ${result.migration_summary ? 'Dry run completed.' : 'Migration in progress...'}`,
      });
      queryClient.invalidateQueries({ queryKey: ['hsn-migration-stats'] });
    },
    onError: (error) => {
      toast({
        title: 'Migration Failed',
        description: `Failed to start migration: ${error}`,
        variant: 'destructive',
      });
    },
  });

  // Validation mutation
  const validationMutation = useMutation({
    mutationFn: async (options: Partial<ValidationOptions>) => {
      return hsnDataValidationService.runValidation(options);
    },
    onSuccess: (result) => {
      setActiveValidationId(result.validation_id);
      toast({
        title: 'Validation Completed',
        description: `Checked ${result.total_rules_checked} rules. Overall score: ${(result.overall_score * 100).toFixed(1)}%`,
      });
      queryClient.invalidateQueries({ queryKey: ['hsn-validation-history'] });
      queryClient.invalidateQueries({ queryKey: ['hsn-data-quality'] });
    },
    onError: (error) => {
      toast({
        title: 'Validation Failed',
        description: `Failed to run validation: ${error}`,
        variant: 'destructive',
      });
    },
  });

  // Rollback mutation
  const rollbackMutation = useMutation({
    mutationFn: async (batchId: string) => {
      return hsnDataMigrationService.rollbackMigration(batchId);
    },
    onSuccess: (result) => {
      toast({
        title: 'Rollback Completed',
        description: `Rolled back ${result.quotes_rolled_back} quotes successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['hsn-migration-stats'] });
    },
    onError: (error) => {
      toast({
        title: 'Rollback Failed',
        description: `Failed to rollback migration: ${error}`,
        variant: 'destructive',
      });
    },
  });

  const handleStartMigration = () => {
    const options: Partial<MigrationOptions> = {
      batch_size: migrationForm.batchSize,
      dry_run: migrationForm.dryRun,
      preserve_original_data: migrationForm.preserveOriginalData,
      auto_classify_confidence_threshold: migrationForm.confidenceThreshold,
      validate_tax_calculations: migrationForm.validateTaxCalculations,
      enable_rollback_snapshots: migrationForm.enableRollbackSnapshots,
      continue_on_errors: migrationForm.continueOnErrors,
      classification_methods: migrationForm.classificationMethods as any[],
    };

    migrationMutation.mutate(options);
  };

  const handleRunValidation = () => {
    const options: Partial<ValidationOptions> = {
      include_categories: validationForm.includeCategories as any[],
      severity_threshold: validationForm.severityThreshold as any,
      sample_size: validationForm.sampleSize,
      deep_validation: validationForm.deepValidation,
      validate_government_apis: validationForm.validateGovernmentAPIs,
      generate_recommendations: validationForm.generateRecommendations,
    };

    validationMutation.mutate(options);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      completed: 'bg-green-500 text-white',
      processing: 'bg-blue-500 text-white',
      failed: 'bg-red-500 text-white',
      pending: 'bg-yellow-500 text-black',
      rolled_back: 'bg-gray-500 text-white',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500 text-white';
  };

  const getHealthColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">HSN Migration & Validation</h1>
          <p className="text-muted-foreground">
            Manage data migration to HSN-based tax system and validate data integrity
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          <Shield className="h-4 w-4 mr-2" />
          Admin Dashboard
        </Badge>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Health</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className={getHealthColor(dataQualityMetrics?.overall_health || 0)}>
                {((dataQualityMetrics?.overall_health || 0) * 100).toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Overall system health</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Migrations</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{migrationStats?.totalMigrations || 0}</div>
            <p className="text-xs text-muted-foreground">Total migrations completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {migrationStats?.totalMigrations
                ? (
                    (migrationStats.successfulMigrations / migrationStats.totalMigrations) *
                    100
                  ).toFixed(1)
                : '0'}
              %
            </div>
            <p className="text-xs text-muted-foreground">Migration success rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {dataQualityMetrics?.critical_issues_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="migration" className="space-y-4">
        <TabsList>
          <TabsTrigger value="migration">Migration</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Migration Tab */}
        <TabsContent value="migration" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Migration Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Start Migration
                </CardTitle>
                <CardDescription>
                  Configure and start HSN data migration for selected date range
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={migrationForm.startDate}
                      onChange={(e) =>
                        setMigrationForm((prev) => ({ ...prev, startDate: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={migrationForm.endDate}
                      onChange={(e) =>
                        setMigrationForm((prev) => ({ ...prev, endDate: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="batch-size">Batch Size</Label>
                  <Input
                    id="batch-size"
                    type="number"
                    min="1"
                    max="200"
                    value={migrationForm.batchSize}
                    onChange={(e) =>
                      setMigrationForm((prev) => ({ ...prev, batchSize: parseInt(e.target.value) }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="confidence-threshold">Classification Confidence Threshold</Label>
                  <Input
                    id="confidence-threshold"
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={migrationForm.confidenceThreshold}
                    onChange={(e) =>
                      setMigrationForm((prev) => ({
                        ...prev,
                        confidenceThreshold: parseFloat(e.target.value),
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Options</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="dry-run"
                        checked={migrationForm.dryRun}
                        onCheckedChange={(checked) =>
                          setMigrationForm((prev) => ({ ...prev, dryRun: checked as boolean }))
                        }
                      />
                      <Label htmlFor="dry-run">Dry Run (Analysis Only)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="preserve-data"
                        checked={migrationForm.preserveOriginalData}
                        onCheckedChange={(checked) =>
                          setMigrationForm((prev) => ({
                            ...prev,
                            preserveOriginalData: checked as boolean,
                          }))
                        }
                      />
                      <Label htmlFor="preserve-data">Preserve Original Data</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="validate-tax"
                        checked={migrationForm.validateTaxCalculations}
                        onCheckedChange={(checked) =>
                          setMigrationForm((prev) => ({
                            ...prev,
                            validateTaxCalculations: checked as boolean,
                          }))
                        }
                      />
                      <Label htmlFor="validate-tax">Validate Tax Calculations</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="rollback-snapshots"
                        checked={migrationForm.enableRollbackSnapshots}
                        onCheckedChange={(checked) =>
                          setMigrationForm((prev) => ({
                            ...prev,
                            enableRollbackSnapshots: checked as boolean,
                          }))
                        }
                      />
                      <Label htmlFor="rollback-snapshots">Enable Rollback Snapshots</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="continue-on-errors"
                        checked={migrationForm.continueOnErrors}
                        onCheckedChange={(checked) =>
                          setMigrationForm((prev) => ({
                            ...prev,
                            continueOnErrors: checked as boolean,
                          }))
                        }
                      />
                      <Label htmlFor="continue-on-errors">Continue on Errors</Label>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleStartMigration}
                  disabled={migrationMutation.isPending}
                >
                  {migrationMutation.isPending ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Starting Migration...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      {migrationForm.dryRun ? 'Analyze Impact' : 'Start Migration'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Migration Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Migration Status
                </CardTitle>
                <CardDescription>Current migration progress and statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {migrationStats ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Total Migrations</div>
                        <div className="text-2xl font-bold">{migrationStats.totalMigrations}</div>
                      </div>
                      <div>
                        <div className="font-medium">Success Rate</div>
                        <div className="text-2xl font-bold text-green-600">
                          {migrationStats.totalMigrations
                            ? (
                                (migrationStats.successfulMigrations /
                                  migrationStats.totalMigrations) *
                                100
                              ).toFixed(1)
                            : '0'}
                          %
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">Average Time</div>
                        <div className="text-2xl font-bold">
                          {Math.round(migrationStats.averageProcessingTime / 1000)}s
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">Failed Migrations</div>
                        <div className="text-2xl font-bold text-red-600">
                          {migrationStats.failedMigrations}
                        </div>
                      </div>
                    </div>

                    {activeMigrationBatch && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">Active Migration</div>
                          <Badge className="bg-blue-500 text-white">In Progress</Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          Batch ID: {activeMigrationBatch}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => rollbackMutation.mutate(activeMigrationBatch)}
                          disabled={rollbackMutation.isPending}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Rollback
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No migration statistics available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validation" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Validation Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Run Validation
                </CardTitle>
                <CardDescription>Configure and run comprehensive data validation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Validation Categories</Label>
                  <div className="space-y-2 mt-2">
                    {['integrity', 'business', 'tax', 'hsn', 'migration'].map((category) => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          id={category}
                          checked={validationForm.includeCategories.includes(category)}
                          onCheckedChange={(checked) => {
                            setValidationForm((prev) => ({
                              ...prev,
                              includeCategories: checked
                                ? [...prev.includeCategories, category]
                                : prev.includeCategories.filter((c) => c !== category),
                            }));
                          }}
                        />
                        <Label htmlFor={category} className="capitalize">
                          {category}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="severity-threshold">Severity Threshold</Label>
                  <Select
                    value={validationForm.severityThreshold}
                    onValueChange={(value) =>
                      setValidationForm((prev) => ({ ...prev, severityThreshold: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sample-size">Sample Size</Label>
                  <Input
                    id="sample-size"
                    type="number"
                    min="10"
                    max="10000"
                    value={validationForm.sampleSize}
                    onChange={(e) =>
                      setValidationForm((prev) => ({
                        ...prev,
                        sampleSize: parseInt(e.target.value),
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Options</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="deep-validation"
                        checked={validationForm.deepValidation}
                        onCheckedChange={(checked) =>
                          setValidationForm((prev) => ({
                            ...prev,
                            deepValidation: checked as boolean,
                          }))
                        }
                      />
                      <Label htmlFor="deep-validation">Deep Validation</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="validate-apis"
                        checked={validationForm.validateGovernmentAPIs}
                        onCheckedChange={(checked) =>
                          setValidationForm((prev) => ({
                            ...prev,
                            validateGovernmentAPIs: checked as boolean,
                          }))
                        }
                      />
                      <Label htmlFor="validate-apis">Validate Government APIs</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="generate-recommendations"
                        checked={validationForm.generateRecommendations}
                        onCheckedChange={(checked) =>
                          setValidationForm((prev) => ({
                            ...prev,
                            generateRecommendations: checked as boolean,
                          }))
                        }
                      />
                      <Label htmlFor="generate-recommendations">Generate Recommendations</Label>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleRunValidation}
                  disabled={validationMutation.isPending}
                >
                  {validationMutation.isPending ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Running Validation...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Run Validation
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Validation Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Validation Results
                </CardTitle>
                <CardDescription>Latest validation report and data quality metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dataQualityMetrics ? (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Overall Health</span>
                        <span
                          className={`text-lg font-bold ${getHealthColor(dataQualityMetrics.overall_health)}`}
                        >
                          {(dataQualityMetrics.overall_health * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={dataQualityMetrics.overall_health * 100} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-red-600">Critical Issues</div>
                        <div className="text-2xl font-bold">
                          {dataQualityMetrics.critical_issues_count}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-blue-600">Recommendations</div>
                        <div className="text-2xl font-bold">
                          {dataQualityMetrics.recommendations_count}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Last validation:{' '}
                      {dataQualityMetrics.last_validation
                        ? format(new Date(dataQualityMetrics.last_validation), 'PPp')
                        : 'Never'}
                    </div>

                    {dataQualityMetrics.critical_issues_count > 0 && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Critical Issues Detected</AlertTitle>
                        <AlertDescription>
                          {dataQualityMetrics.critical_issues_count} critical data integrity issues
                          require immediate attention.
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No validation results available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Validation History
              </CardTitle>
              <CardDescription>
                Previous validation reports and migration activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {validationHistory && validationHistory.length > 0 ? (
                <div className="space-y-4">
                  {validationHistory
                    .slice(-10)
                    .reverse()
                    .map((report) => (
                      <div key={report.validation_id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">
                            Validation {report.validation_id.split('_')[2]}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={getHealthColor(report.overall_score) + ' border-none'}
                            >
                              {(report.overall_score * 100).toFixed(1)}%
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(report.run_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Rules Checked</div>
                            <div className="font-medium">{report.total_rules_checked}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Passed</div>
                            <div className="font-medium text-green-600">{report.rules_passed}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Failed</div>
                            <div className="font-medium text-red-600">{report.rules_failed}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Critical Issues</div>
                            <div className="font-medium text-red-600">
                              {report.critical_issues.length}
                            </div>
                          </div>
                        </div>

                        {report.critical_issues.length > 0 && (
                          <Alert variant="destructive" className="mt-3">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Critical Issues Found</AlertTitle>
                            <AlertDescription>
                              {report.critical_issues.map((issue) => issue.message).join(', ')}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No validation history available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Settings
              </CardTitle>
              <CardDescription>
                Configure HSN migration and validation system settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertTitle>System Configuration</AlertTitle>
                  <AlertDescription>
                    Advanced system settings are managed through environment variables and database
                    configuration. Contact system administrator for changes to core system
                    parameters.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Default Migration Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div>Batch Size: 50 quotes</div>
                      <div>Confidence Threshold: 70%</div>
                      <div>Rollback Snapshots: Enabled</div>
                      <div>Error Handling: Continue on errors</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Default Validation Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div>Sample Size: 1,000 records</div>
                      <div>Severity Threshold: Low</div>
                      <div>Deep Validation: Enabled</div>
                      <div>API Validation: Disabled</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
