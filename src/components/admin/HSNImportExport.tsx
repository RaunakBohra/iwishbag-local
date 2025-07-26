import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download, Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { unifiedDataEngine } from '@/services/UnifiedDataEngine';
import Papa from 'papaparse';

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

export const HSNImportExport: React.FC = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Export HSN codes to CSV
  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Fetch all HSN codes
      const { data: hsnCodes, error } = await supabase
        .from('hsn_master')
        .select('*')
        .order('hsn_code');

      if (error) throw error;

      // Transform data for export
      const exportData = hsnCodes.map(hsn => ({
        hsn_code: hsn.hsn_code,
        description: hsn.description,
        category: hsn.category,
        subcategory: hsn.subcategory || '',
        keywords: hsn.keywords?.join(', ') || '',
        minimum_valuation_usd: hsn.minimum_valuation_usd || '',
        requires_currency_conversion: hsn.requires_currency_conversion ? 'Yes' : 'No',
        weight_min: hsn.weight_data?.typical_weights?.per_unit?.min || '',
        weight_avg: hsn.weight_data?.typical_weights?.per_unit?.average || '',
        weight_max: hsn.weight_data?.typical_weights?.per_unit?.max || '',
        packaging_weight: hsn.weight_data?.typical_weights?.packaging?.additional_weight || '',
        customs_rate: hsn.tax_data?.typical_rates?.customs?.common || '',
        import_duty_rate: hsn.tax_data?.typical_rates?.import_duty?.standard || '',
        excise_tax_rate: hsn.tax_data?.typical_rates?.excise_tax?.federal || '',
        gst_rate: hsn.tax_data?.typical_rates?.gst?.standard || '',
        vat_rate: hsn.tax_data?.typical_rates?.vat?.common || '',
        state_sales_tax: hsn.tax_data?.typical_rates?.sales_tax?.state || '',
        local_sales_tax: hsn.tax_data?.typical_rates?.sales_tax?.local || '',
        pst_rate: hsn.tax_data?.typical_rates?.pst?.provincial || '',
        service_tax_rate: hsn.tax_data?.typical_rates?.service_tax?.standard || '',
        cess_rate: hsn.tax_data?.typical_rates?.cess?.additional || '',
        display_name: hsn.classification_data?.visual_metadata?.display_name || '',
        icon: hsn.classification_data?.visual_metadata?.icon || '',
        is_active: hsn.is_active ? 'Yes' : 'No'
      }));

      // Convert to CSV
      const csv = Papa.unparse(exportData);
      
      // Create download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hsn_codes_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: `Exported ${hsnCodes.length} HSN codes to CSV`,
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export HSN codes',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Validate HSN code format
  const validateHSNCode = (code: string): boolean => {
    return /^\d{6,8}$/.test(code);
  };

  // Validate row data
  const validateRow = (row: any, rowIndex: number): string | null => {
    if (!row.hsn_code) return `Row ${rowIndex}: HSN code is required`;
    if (!validateHSNCode(row.hsn_code)) return `Row ${rowIndex}: HSN code must be 6-8 digits`;
    if (!row.description) return `Row ${rowIndex}: Description is required`;
    if (!row.category) return `Row ${rowIndex}: Category is required`;
    
    // Validate numeric fields
    const numericFields = [
      'weight_min', 'weight_avg', 'weight_max', 'packaging_weight',
      'customs_rate', 'import_duty_rate', 'excise_tax_rate', 'gst_rate',
      'vat_rate', 'state_sales_tax', 'local_sales_tax', 'pst_rate',
      'service_tax_rate', 'cess_rate', 'minimum_valuation_usd'
    ];
    
    for (const field of numericFields) {
      if (row[field] && isNaN(parseFloat(row[field]))) {
        return `Row ${rowIndex}: ${field} must be a number`;
      }
    }
    
    return null;
  };

  // Import HSN codes from CSV
  const handleImport = async (file: File) => {
    setIsImporting(true);
    setImportProgress(0);
    setImportResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const importResult: ImportResult = {
          total: results.data.length,
          successful: 0,
          failed: 0,
          errors: []
        };

        try {
          for (let i = 0; i < results.data.length; i++) {
            const row: any = results.data[i];
            const rowIndex = i + 2; // Account for header row

            // Update progress
            setImportProgress(Math.floor((i / results.data.length) * 100));

            // Validate row
            const validationError = validateRow(row, rowIndex);
            if (validationError) {
              importResult.failed++;
              importResult.errors.push({ row: rowIndex, error: validationError });
              continue;
            }

            try {
              // Prepare data for insertion
              const hsnData = {
                hsn_code: row.hsn_code,
                description: row.description,
                category: row.category,
                subcategory: row.subcategory || null,
                keywords: row.keywords ? row.keywords.split(',').map((k: string) => k.trim()) : [],
                minimum_valuation_usd: row.minimum_valuation_usd ? parseFloat(row.minimum_valuation_usd) : null,
                requires_currency_conversion: row.requires_currency_conversion?.toLowerCase() === 'yes',
                weight_data: {
                  typical_weights: {
                    per_unit: {
                      min: row.weight_min ? parseFloat(row.weight_min) : 0,
                      max: row.weight_max ? parseFloat(row.weight_max) : 0,
                      average: row.weight_avg ? parseFloat(row.weight_avg) : 0
                    },
                    packaging: row.packaging_weight ? {
                      additional_weight: parseFloat(row.packaging_weight)
                    } : null
                  }
                },
                tax_data: {
                  typical_rates: {
                    customs: { common: row.customs_rate ? parseFloat(row.customs_rate) : 0 },
                    import_duty: { standard: row.import_duty_rate ? parseFloat(row.import_duty_rate) : 0 },
                    excise_tax: { federal: row.excise_tax_rate ? parseFloat(row.excise_tax_rate) : 0 },
                    gst: { standard: row.gst_rate ? parseFloat(row.gst_rate) : 0 },
                    vat: { common: row.vat_rate ? parseFloat(row.vat_rate) : 0 },
                    sales_tax: {
                      state: row.state_sales_tax ? parseFloat(row.state_sales_tax) : 0,
                      local: row.local_sales_tax ? parseFloat(row.local_sales_tax) : 0
                    },
                    pst: { provincial: row.pst_rate ? parseFloat(row.pst_rate) : 0 },
                    service_tax: { standard: row.service_tax_rate ? parseFloat(row.service_tax_rate) : 0 },
                    cess: { additional: row.cess_rate ? parseFloat(row.cess_rate) : 0 }
                  }
                },
                classification_data: {
                  visual_metadata: {
                    display_name: row.display_name || row.description,
                    icon: row.icon || ''
                  },
                  auto_classification: {
                    enabled: true,
                    confidence: 0.8
                  }
                },
                is_active: row.is_active?.toLowerCase() !== 'no'
              };

              // Insert or update HSN code
              const { error } = await supabase
                .from('hsn_master')
                .upsert([hsnData], { onConflict: 'hsn_code' });

              if (error) throw error;
              
              importResult.successful++;
            } catch (error: any) {
              importResult.failed++;
              importResult.errors.push({ 
                row: rowIndex, 
                error: `Failed to import: ${error.message}` 
              });
            }
          }

          // Clear cache after import
          unifiedDataEngine.clearAllCache();

          setImportResult(importResult);
          setImportProgress(100);

          toast({
            title: 'Import Complete',
            description: `Successfully imported ${importResult.successful} of ${importResult.total} HSN codes`,
            variant: importResult.failed > 0 ? 'destructive' : 'default',
          });
        } catch (error: any) {
          console.error('Import error:', error);
          toast({
            title: 'Import Failed',
            description: error.message || 'Failed to import HSN codes',
            variant: 'destructive',
          });
        } finally {
          setIsImporting(false);
        }
      },
      error: (error) => {
        console.error('Parse error:', error);
        toast({
          title: 'Invalid File',
          description: 'Failed to parse CSV file',
          variant: 'destructive',
        });
        setIsImporting(false);
      }
    });
  };

  // Download sample CSV template
  const downloadTemplate = () => {
    const template = [
      {
        hsn_code: '851762',
        description: 'Mobile phones and communication equipment',
        category: 'electronics',
        subcategory: 'communications',
        keywords: 'mobile, phone, smartphone, communication',
        minimum_valuation_usd: '100',
        requires_currency_conversion: 'Yes',
        weight_min: '0.1',
        weight_avg: '0.2',
        weight_max: '0.3',
        packaging_weight: '0.05',
        customs_rate: '20',
        import_duty_rate: '10',
        excise_tax_rate: '0',
        gst_rate: '18',
        vat_rate: '20',
        state_sales_tax: '6.5',
        local_sales_tax: '2.5',
        pst_rate: '0',
        service_tax_rate: '0',
        cess_rate: '0',
        display_name: 'Mobile Phones',
        icon: '📱',
        is_active: 'Yes'
      }
    ];

    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hsn_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export HSN Codes
          </CardTitle>
          <CardDescription>
            Download all HSN codes as a CSV file for backup or external processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleExport} 
            disabled={isExporting}
            className="w-full sm:w-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export to CSV'}
          </Button>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import HSN Codes
          </CardTitle>
          <CardDescription>
            Upload a CSV file to bulk import or update HSN codes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="w-full sm:w-auto"
            >
              <FileText className="w-4 h-4 mr-2" />
              Download Template
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="w-full sm:w-auto"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isImporting ? 'Importing...' : 'Select CSV File'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
              }}
            />
          </div>

          {/* Import Progress */}
          {isImporting && (
            <div className="space-y-2">
              <Progress value={importProgress} />
              <p className="text-sm text-gray-600">
                Importing HSN codes... {importProgress}%
              </p>
            </div>
          )}

          {/* Import Results */}
          {importResult && (
            <Alert className={importResult.failed > 0 ? 'border-red-200' : 'border-green-200'}>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  {importResult.failed > 0 ? (
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold">Import Summary</h4>
                    <div className="flex gap-4 mt-1">
                      <Badge variant="default">Total: {importResult.total}</Badge>
                      <Badge variant="default" className="bg-green-600">
                        Success: {importResult.successful}
                      </Badge>
                      {importResult.failed > 0 && (
                        <Badge variant="destructive">Failed: {importResult.failed}</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setImportResult(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Error Details */}
                {importResult.errors.length > 0 && (
                  <div>
                    <h5 className="font-medium text-sm mb-1">Errors:</h5>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {importResult.errors.map((error, index) => (
                        <p key={index} className="text-sm text-red-600">
                          {error.error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Alert>
          )}

          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              <strong>Import Notes:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1 text-sm">
                <li>HSN codes must be 6-8 digits</li>
                <li>Existing HSN codes will be updated</li>
                <li>Keywords should be comma-separated</li>
                <li>Leave tax rates empty or 0 if not applicable</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};