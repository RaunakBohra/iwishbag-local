import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Upload, 
  Download,
  Database,
  FileText,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Trash2,
  Eye,
  Archive,
  FileDown,
  FileUp,
  Check,
  X,
  Clock
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { smartManagementService, BulkImportResult } from '@/services/SmartManagementService';

interface ImportProgress {
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress: number;
  processed: number;
  total: number;
  errors: Array<{ row: number; field: string; message: string }>;
  imported: number;
  skipped: number;
}

const DataManagement: React.FC = () => {
  const [countries, setCountries] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    status: 'idle',
    progress: 0,
    processed: 0,
    total: 0,
    errors: [],
    imported: 0,
    skipped: 0
  });
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    try {
      const countriesData = await smartManagementService.getCountryConfigs();
      setCountries(countriesData);
    } catch (error) {
      console.error('Error loading countries:', error);
      toast({
        title: "Error Loading Countries",
        description: "Failed to load country configurations",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setCsvFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      const data = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });

      setCsvData(data);
      setPreviewData(data.slice(0, 10)); // Show first 10 rows for preview
      setShowPreview(true);
    };
    
    reader.readAsText(file);
  };

  const validateImportData = () => {
    if (!selectedCountry) {
      toast({
        title: "Country Required",
        description: "Please select a country for import",
        variant: "destructive",
      });
      return false;
    }

    if (csvData.length === 0) {
      toast({
        title: "No Data",
        description: "Please upload a CSV file with data",
        variant: "destructive",
      });
      return false;
    }

    // Check required columns
    const requiredColumns = ['classification_code', 'product_name', 'category'];
    const headers = Object.keys(csvData[0] || {});
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      toast({
        title: "Missing Required Columns",
        description: `Required columns: ${missingColumns.join(', ')}`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const processImport = async () => {
    if (!validateImportData()) return;

    try {
      setImportProgress({
        status: 'processing',
        progress: 0,
        processed: 0,
        total: csvData.length,
        errors: [],
        imported: 0,
        skipped: 0
      });

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setImportProgress(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }));
      }, 200);

      const result: BulkImportResult = await smartManagementService.importClassificationsFromCSV(
        csvData, 
        selectedCountry
      );

      clearInterval(progressInterval);

      setImportProgress({
        status: result.success ? 'completed' : 'error',
        progress: 100,
        processed: csvData.length,
        total: csvData.length,
        errors: result.errors,
        imported: result.imported,
        skipped: result.skipped
      });

      if (result.success) {
        toast({
          title: "Import Successful",
          description: `Imported ${result.imported} classifications successfully`,
        });
      } else {
        toast({
          title: "Import Completed with Errors",
          description: `Imported ${result.imported}, failed ${result.errors.length}`,
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('Import error:', error);
      setImportProgress(prev => ({
        ...prev,
        status: 'error'
      }));
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import data",
        variant: "destructive",
      });
    }
  };

  const downloadTemplate = () => {
    const template = `classification_code,product_name,category,subcategory,description,typical_weight_kg,customs_rate,minimum_valuation_usd,confidence_score,search_keywords
8517,"Mobile Phone / Smartphone",electronics,telecommunications,"Smartphones and mobile communication devices",0.180,15.00,25.00,0.90,"mobile,phone,smartphone"
8471,"Laptop Computer",electronics,computers,"Portable computers and laptops",2.100,15.00,100.00,0.85,"laptop,computer,notebook"
6109,"T-shirt / Cotton Shirt",clothing,casual_wear,"Cotton t-shirts and casual shirts",0.200,15.00,5.00,0.80,"tshirt,shirt,cotton"`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `classification_template_${selectedCountry || 'sample'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const downloadExport = async (countryCode?: string) => {
    try {
      const csvContent = await smartManagementService.exportClassifications(countryCode);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `classifications_export_${countryCode || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Classifications exported successfully`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export classifications",
        variant: "destructive",
      });
    }
  };

  const resetImport = () => {
    setCsvFile(null);
    setCsvData([]);
    setPreviewData([]);
    setShowPreview(false);
    setImportProgress({
      status: 'idle',
      progress: 0,
      processed: 0,
      total: 0,
      errors: [],
      imported: 0,
      skipped: 0
    });
    // Reset file input
    const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="h-8 w-8 text-orange-600" />
            Data Management
          </h1>
          <p className="text-gray-600 mt-1">
            Import, export, and manage product classification data
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              Import Classifications
            </CardTitle>
            <CardDescription>
              Upload CSV files to bulk import product classifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Country Selection */}
            <div>
              <Label htmlFor="import-country">Target Country *</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select Country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map(country => (
                    <SelectItem key={country.country_code} value={country.country_code}>
                      {country.country_code} - {country.country_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File Upload */}
            <div>
              <Label htmlFor="csv-upload">CSV File</Label>
              <Input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="mt-1"
              />
              {csvFile && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-gray-50 rounded">
                  <FileText className="h-4 w-4 text-gray-600" />
                  <span className="text-sm">{csvFile.name}</span>
                  <Badge variant="secondary">{csvData.length} rows</Badge>
                </div>
              )}
            </div>

            {/* Download Template */}
            <div className="flex gap-2">
              <Button
                onClick={downloadTemplate}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              
              {csvFile && (
                <Button
                  onClick={resetImport}
                  variant="outline"
                  size="sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>

            {/* Import Progress */}
            {importProgress.status !== 'idle' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Import Progress</span>
                  <span>{importProgress.progress}%</span>
                </div>
                <Progress value={importProgress.progress} className="h-2" />
                
                {importProgress.status === 'processing' && (
                  <p className="text-sm text-gray-600">
                    Processing {importProgress.processed} of {importProgress.total} rows...
                  </p>
                )}
                
                {importProgress.status === 'completed' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Import completed: {importProgress.imported} imported, {importProgress.skipped} skipped
                    </AlertDescription>
                  </Alert>
                )}
                
                {importProgress.status === 'error' && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Import failed with {importProgress.errors.length} errors
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Import Errors */}
            {importProgress.errors.length > 0 && (
              <div className="mt-4">
                <Label>Import Errors ({importProgress.errors.length})</Label>
                <div className="mt-2 max-h-40 overflow-y-auto border rounded p-2 text-sm">
                  {importProgress.errors.slice(0, 10).map((error, index) => (
                    <div key={index} className="text-red-600 mb-1">
                      Row {error.row}: {error.field} - {error.message}
                    </div>
                  ))}
                  {importProgress.errors.length > 10 && (
                    <div className="text-gray-500">
                      ... and {importProgress.errors.length - 10} more errors
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Import Button */}
            <Button
              onClick={processImport}
              disabled={!csvFile || !selectedCountry || importProgress.status === 'processing'}
              className="w-full"
            >
              {importProgress.status === 'processing' ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-green-600" />
              Export Classifications
            </CardTitle>
            <CardDescription>
              Download product classifications as CSV files
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Export Options */}
            <div>
              <Label>Export Options</Label>
              <div className="grid grid-cols-1 gap-2 mt-2">
                <Button
                  onClick={() => downloadExport()}
                  variant="outline"
                  className="justify-start"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Export All Classifications
                </Button>
                
                {countries.map(country => (
                  <Button
                    key={country.country_code}
                    onClick={() => downloadExport(country.country_code)}
                    variant="outline"
                    className="justify-start"
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Export {country.country_name} ({country.country_code})
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Backup Information */}
            <div>
              <Label>Backup Information</Label>
              <div className="mt-2 text-sm text-gray-600 space-y-1">
                <p>• CSV exports include all classification data</p>
                <p>• Files are dated for version tracking</p>
                <p>• Use exports for backup and migration</p>
                <p>• Templates help maintain data consistency</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Preview */}
      {showPreview && previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-600" />
              Import Preview
            </CardTitle>
            <CardDescription>
              Preview of data to be imported (showing first 10 rows)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Classification Code</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Weight (kg)</TableHead>
                    <TableHead>Customs Rate</TableHead>
                    <TableHead>Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {row.classification_code || '-'}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium">
                        {row.product_name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {row.category || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.typical_weight_kg || '-'}</TableCell>
                      <TableCell>{row.customs_rate ? `${row.customs_rate}%` : '-'}</TableCell>
                      <TableCell>
                        {row.confidence_score ? 
                          <Badge variant={parseFloat(row.confidence_score) >= 0.8 ? "default" : "secondary"}>
                            {(parseFloat(row.confidence_score) * 100).toFixed(0)}%
                          </Badge>
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {csvData.length > 10 && (
              <p className="text-sm text-gray-600 mt-2">
                ... and {csvData.length - 10} more rows
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Data Validation Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Data Quality Tools
          </CardTitle>
          <CardDescription>
            Tools for maintaining data quality and consistency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-start">
              <CheckCircle className="h-4 w-4 mr-2" />
              Validate All Data
            </Button>
            
            <Button variant="outline" className="justify-start">
              <RefreshCw className="h-4 w-4 mr-2" />
              Update Confidence Scores
            </Button>
            
            <Button variant="outline" className="justify-start">
              <Archive className="h-4 w-4 mr-2" />
              Archive Old Data
            </Button>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p>Data quality tools help maintain accuracy and consistency across your product classifications.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataManagement;