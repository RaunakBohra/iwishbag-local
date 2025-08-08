/**
 * CSVImportExport - CSV Import/Export for Regional Pricing
 * 
 * Features:
 * - Export pricing data to CSV/Excel
 * - Import bulk pricing changes from CSV
 * - Data validation and error reporting
 * - Preview changes before applying
 * - Support for all pricing levels (continental, regional, country)
 */

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Download,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  Database,
  Eye,
  Save,
  X,
  RefreshCw,
  ArrowRight,
  Package
} from 'lucide-react';

import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface ExportOptions {
  format: 'csv' | 'xlsx';
  includeHistorical: boolean;
  includeInactive: boolean;
  level: 'all' | 'continental' | 'regional' | 'country';
  services: string[];
}

interface ImportValidationResult {
  isValid: boolean;
  errors: ImportError[];
  warnings: ImportWarning[];
  previewData: ImportRow[];
  summary: {
    totalRows: number;
    validRows: number;
    duplicates: number;
    newCountries: number;
    updates: number;
  };
}

interface ImportError {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface ImportWarning {
  row: number;
  field: string;
  message: string;
  suggestion?: string;
}

interface ImportRow {
  row: number;
  service_key: string;
  level: 'continental' | 'regional' | 'country';
  identifier: string; // continent name, region key, or country code
  rate: number;
  min_amount: number;
  max_amount?: number;
  reason?: string;
  isValid: boolean;
  action: 'create' | 'update' | 'skip';
  errors: string[];
}

interface CSVImportExportProps {
  services: any[];
  onDataUpdate?: () => void;
}

// ============================================================================
// CSV TEMPLATES AND VALIDATION
// ============================================================================

const CSV_TEMPLATES = {
  continental: `service_key,continent,rate,min_amount,max_amount,reason
package_protection,Asia,0.020,1.50,200.00,Lower risk profile
package_protection,Europe,0.015,3.00,300.00,Premium market
express_processing,Asia,10.00,5.00,50.00,Cost-efficient operations`,

  regional: `service_key,region_key,region_name,country_codes,rate,min_amount,max_amount,reason
package_protection,south_asia,South Asia,"IN,PK,BD,LK,NP,BT,MV,AF",0.018,1.00,180.00,High volume market
package_protection,east_asia,East Asia,"JP,KR,CN,TW,HK,MO",0.012,4.00,350.00,Premium market`,

  country: `service_key,country_code,rate,min_amount,max_amount,reason
package_protection,IN,0.015,0.75,150.00,Volume market discount
package_protection,US,0.012,5.00,500.00,Premium market
package_protection,JP,0.010,6.00,400.00,Ultra premium market`
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CSVImportExport: React.FC<CSVImportExportProps> = ({
  services,
  onDataUpdate
}) => {
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeHistorical: false,
    includeInactive: false,
    level: 'all',
    services: []
  });
  
  const [importValidation, setImportValidation] = useState<ImportValidationResult | null>(null);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // EXPORT FUNCTIONALITY
  // ============================================================================

  const generateExportData = useCallback(async () => {
    try {
      const exportData: any[] = [];

      // Export Continental Pricing
      if (exportOptions.level === 'all' || exportOptions.level === 'continental') {
        const { data: continentalData } = await supabase
          .from('continental_pricing')
          .select(`
            continent,
            rate,
            min_amount,
            max_amount,
            notes,
            is_active,
            created_at,
            addon_services!inner(service_key, service_name)
          `)
          .eq('is_active', exportOptions.includeInactive ? undefined : true);

        continentalData?.forEach(row => {
          if (exportOptions.services.length === 0 || exportOptions.services.includes(row.addon_services.service_key)) {
            exportData.push({
              level: 'continental',
              service_key: row.addon_services.service_key,
              service_name: row.addon_services.service_name,
              identifier: row.continent,
              rate: row.rate,
              min_amount: row.min_amount,
              max_amount: row.max_amount,
              reason: row.notes,
              is_active: row.is_active,
              created_at: row.created_at
            });
          }
        });
      }

      // Export Regional Pricing  
      if (exportOptions.level === 'all' || exportOptions.level === 'regional') {
        const { data: regionalData } = await supabase
          .from('regional_pricing')
          .select(`
            region_key,
            region_name,
            country_codes,
            rate,
            min_amount,
            max_amount,
            notes,
            is_active,
            created_at,
            addon_services!inner(service_key, service_name)
          `)
          .eq('is_active', exportOptions.includeInactive ? undefined : true);

        regionalData?.forEach(row => {
          if (exportOptions.services.length === 0 || exportOptions.services.includes(row.addon_services.service_key)) {
            exportData.push({
              level: 'regional',
              service_key: row.addon_services.service_key,
              service_name: row.addon_services.service_name,
              identifier: row.region_key,
              region_name: row.region_name,
              country_codes: Array.isArray(row.country_codes) ? row.country_codes.join(',') : row.country_codes,
              rate: row.rate,
              min_amount: row.min_amount,
              max_amount: row.max_amount,
              reason: row.notes,
              is_active: row.is_active,
              created_at: row.created_at
            });
          }
        });
      }

      // Export Country Pricing
      if (exportOptions.level === 'all' || exportOptions.level === 'country') {
        const { data: countryData } = await supabase
          .from('country_pricing_overrides')
          .select(`
            country_code,
            rate,
            min_amount,
            max_amount,
            reason,
            notes,
            is_active,
            created_at,
            addon_services!inner(service_key, service_name)
          `)
          .eq('is_active', exportOptions.includeInactive ? undefined : true);

        countryData?.forEach(row => {
          if (exportOptions.services.length === 0 || exportOptions.services.includes(row.addon_services.service_key)) {
            exportData.push({
              level: 'country',
              service_key: row.addon_services.service_key,
              service_name: row.addon_services.service_name,
              identifier: row.country_code,
              rate: row.rate,
              min_amount: row.min_amount,
              max_amount: row.max_amount,
              reason: row.reason,
              notes: row.notes,
              is_active: row.is_active,
              created_at: row.created_at
            });
          }
        });
      }

      return exportData;
    } catch (error) {
      console.error('Export data generation failed:', error);
      throw error;
    }
  }, [exportOptions]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    
    try {
      const data = await generateExportData();
      
      if (data.length === 0) {
        toast({
          title: 'No data to export',
          description: 'No pricing data found matching your export criteria.',
          variant: 'destructive'
        });
        return;
      }

      // Convert to CSV
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value || '';
          }).join(',')
        )
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `regional-pricing-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export completed',
        description: `Successfully exported ${data.length} pricing records.`
      });

    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export failed',
        description: 'Unable to export pricing data. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  }, [generateExportData]);

  // ============================================================================
  // IMPORT FUNCTIONALITY
  // ============================================================================

  const validateImportData = useCallback((csvText: string): ImportValidationResult => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];
    const previewData: ImportRow[] = [];
    
    let validRows = 0;
    const seenKeys = new Set<string>();
    let duplicates = 0;

    // Validate headers
    const requiredHeaders = ['service_key', 'rate'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      errors.push({
        row: 1,
        field: 'headers',
        message: `Missing required headers: ${missingHeaders.join(', ')}`,
        severity: 'error'
      });
    }

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const rowData: any = {};
      
      headers.forEach((header, index) => {
        rowData[header] = values[index] || '';
      });

      // Determine level and identifier
      let level: 'continental' | 'regional' | 'country';
      let identifier: string;
      
      if (rowData.continent) {
        level = 'continental';
        identifier = rowData.continent;
      } else if (rowData.region_key) {
        level = 'regional';
        identifier = rowData.region_key;
      } else if (rowData.country_code) {
        level = 'country';
        identifier = rowData.country_code;
      } else {
        errors.push({
          row: i + 1,
          field: 'identifier',
          message: 'Missing continent, region_key, or country_code',
          severity: 'error'
        });
        continue;
      }

      // Validate required fields
      const rowErrors: string[] = [];
      
      if (!rowData.service_key) {
        rowErrors.push('Missing service_key');
      } else if (!services.find(s => s.service_key === rowData.service_key)) {
        rowErrors.push(`Unknown service: ${rowData.service_key}`);
      }

      const rate = parseFloat(rowData.rate);
      if (!rowData.rate || isNaN(rate) || rate < 0) {
        rowErrors.push('Invalid rate');
      }

      const minAmount = parseFloat(rowData.min_amount);
      if (rowData.min_amount && (isNaN(minAmount) || minAmount < 0)) {
        rowErrors.push('Invalid min_amount');
      }

      const maxAmount = parseFloat(rowData.max_amount);
      if (rowData.max_amount && (isNaN(maxAmount) || maxAmount < 0)) {
        rowErrors.push('Invalid max_amount');
      }

      // Check for duplicates
      const uniqueKey = `${rowData.service_key}-${level}-${identifier}`;
      if (seenKeys.has(uniqueKey)) {
        duplicates++;
        rowErrors.push('Duplicate entry');
      } else {
        seenKeys.add(uniqueKey);
      }

      const isValid = rowErrors.length === 0;
      if (isValid) validRows++;

      previewData.push({
        row: i + 1,
        service_key: rowData.service_key,
        level,
        identifier,
        rate,
        min_amount: minAmount || 0,
        max_amount: maxAmount,
        reason: rowData.reason,
        isValid,
        action: 'update', // Would be determined by checking existing data
        errors: rowErrors
      });
    }

    return {
      isValid: errors.length === 0 && validRows > 0,
      errors,
      warnings,
      previewData,
      summary: {
        totalRows: lines.length - 1,
        validRows,
        duplicates,
        newCountries: 0, // Would be calculated by checking existing data
        updates: validRows
      }
    };
  }, [services]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      const validation = validateImportData(csvText);
      setImportValidation(validation);
      setShowPreviewDialog(true);
    };
    reader.readAsText(file);
  }, [validateImportData]);

  const handleImport = useCallback(async () => {
    if (!importValidation?.isValid || !importValidation.previewData) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      const validRows = importValidation.previewData.filter(row => row.isValid);
      
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        
        // Update progress
        setImportProgress(((i + 1) / validRows.length) * 100);

        const service = services.find(s => s.service_key === row.service_key);
        if (!service) continue;

        // Apply the import based on level
        switch (row.level) {
          case 'continental':
            await supabase
              .from('continental_pricing')
              .upsert({
                service_id: service.id,
                continent: row.identifier,
                rate: row.rate,
                min_amount: row.min_amount,
                max_amount: row.max_amount,
                notes: row.reason,
                is_active: true
              });
            break;

          case 'regional':
            await supabase
              .from('regional_pricing')  
              .upsert({
                service_id: service.id,
                region_key: row.identifier,
                rate: row.rate,
                min_amount: row.min_amount,
                max_amount: row.max_amount,
                notes: row.reason,
                is_active: true
              });
            break;

          case 'country':
            await supabase
              .from('country_pricing_overrides')
              .upsert({
                service_id: service.id,
                country_code: row.identifier,
                rate: row.rate,
                min_amount: row.min_amount,
                max_amount: row.max_amount,
                reason: row.reason || `CSV Import - ${new Date().toLocaleDateString()}`,
                is_active: true,
                effective_from: new Date().toISOString()
              }, {
                onConflict: 'service_id,country_code'
              });
            break;
        }
      }

      toast({
        title: 'Import completed',
        description: `Successfully imported ${validRows.length} pricing records.`
      });

      setShowPreviewDialog(false);
      setImportValidation(null);
      onDataUpdate?.();

    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: 'Import failed',
        description: 'Unable to import pricing data. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  }, [importValidation, services, onDataUpdate]);

  // ============================================================================
  // RENDER METHODS
  // ============================================================================

  const renderExportTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Options
          </CardTitle>
          <CardDescription>
            Configure export settings and download pricing data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="export-format">Export Format</Label>
              <Select
                value={exportOptions.format}
                onValueChange={(value: 'csv' | 'xlsx') => 
                  setExportOptions(prev => ({ ...prev, format: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (Comma-separated)</SelectItem>
                  <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="export-level">Pricing Level</Label>
              <Select
                value={exportOptions.level}
                onValueChange={(value: any) => 
                  setExportOptions(prev => ({ ...prev, level: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="continental">Continental Only</SelectItem>
                  <SelectItem value="regional">Regional Only</SelectItem>
                  <SelectItem value="country">Country Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="include-historical"
                checked={exportOptions.includeHistorical}
                onChange={(e) => 
                  setExportOptions(prev => ({ ...prev, includeHistorical: e.target.checked }))
                }
              />
              <Label htmlFor="include-historical">Include historical data</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="include-inactive"
                checked={exportOptions.includeInactive}
                onChange={(e) => 
                  setExportOptions(prev => ({ ...prev, includeInactive: e.target.checked }))
                }
              />
              <Label htmlFor="include-inactive">Include inactive services</Label>
            </div>
          </div>

          <Button 
            onClick={handleExport}
            disabled={isExporting}
            className="w-full"
          >
            {isExporting ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isExporting ? 'Exporting...' : 'Export Pricing Data'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderImportTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Pricing Data
          </CardTitle>
          <CardDescription>
            Upload CSV file to bulk update pricing configurations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              style={{ display: 'none' }}
            />
            <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">Upload CSV File</p>
            <p className="text-sm text-gray-600 mb-4">
              Select a CSV file with pricing data to import
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Choose File
            </Button>
          </div>

          {/* CSV Templates */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">CSV Templates:</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {Object.entries(CSV_TEMPLATES).map(([level, template]) => (
                <Button
                  key={level}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([template], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${level}-pricing-template.csv`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {level.charAt(0).toUpperCase() + level.slice(1)} Template
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPreviewDialog = () => (
    <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-6 h-6" />
            Import Preview
          </DialogTitle>
          <DialogDescription>
            Review the data before importing to your pricing system
          </DialogDescription>
        </DialogHeader>

        {importValidation && (
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Import Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{importValidation.summary.totalRows}</div>
                    <div className="text-xs text-gray-500">Total Rows</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{importValidation.summary.validRows}</div>
                    <div className="text-xs text-gray-500">Valid Rows</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{importValidation.summary.duplicates}</div>
                    <div className="text-xs text-gray-500">Duplicates</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{importValidation.summary.updates}</div>
                    <div className="text-xs text-gray-500">Updates</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Errors */}
            {importValidation.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{importValidation.errors.length} errors found:</strong>
                  <ul className="list-disc list-inside mt-2 text-sm">
                    {importValidation.errors.slice(0, 5).map((error, index) => (
                      <li key={index}>
                        Row {error.row}: {error.message}
                      </li>
                    ))}
                    {importValidation.errors.length > 5 && (
                      <li>... and {importValidation.errors.length - 5} more</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Preview Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Data Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Identifier</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importValidation.previewData.slice(0, 20).map((row) => (
                        <TableRow key={row.row} className={!row.isValid ? 'bg-red-50' : ''}>
                          <TableCell>{row.row}</TableCell>
                          <TableCell>{row.service_key}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {row.level}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">{row.identifier}</TableCell>
                          <TableCell>{(row.rate * 100).toFixed(2)}%</TableCell>
                          <TableCell>
                            {row.isValid ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Valid
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Error
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {importValidation.previewData.length > 20 && (
                    <div className="text-center text-sm text-gray-500 mt-2">
                      ... and {importValidation.previewData.length - 20} more rows
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Import Progress */}
            {isImporting && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Importing data...</span>
                      <span>{Math.round(importProgress)}%</span>
                    </div>
                    <Progress value={importProgress} className="w-full" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowPreviewDialog(false)} disabled={isImporting}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!importValidation?.isValid || isImporting}
          >
            {isImporting ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isImporting ? 'Importing...' : `Import ${importValidation?.summary.validRows || 0} Records`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-6 h-6" />
            CSV Import/Export
          </CardTitle>
          <CardDescription>
            Bulk manage pricing data through CSV import and export
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="export">Export Data</TabsTrigger>
              <TabsTrigger value="import">Import Data</TabsTrigger>
            </TabsList>

            <TabsContent value="export" className="mt-6">
              {renderExportTab()}
            </TabsContent>

            <TabsContent value="import" className="mt-6">
              {renderImportTab()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {renderPreviewDialog()}
    </div>
  );
};