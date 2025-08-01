import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Loader2 
} from 'lucide-react';
import { QuoteExportService } from '@/services/QuoteExportService';
import { toast } from '@/hooks/use-toast';

interface QuoteData {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  status: string;
  items: any[];
  total_usd: number;
  total_customer_currency?: number;
  customer_currency?: string;
  origin_country?: string;
  destination_country?: string;
  created_at: string;
  expires_at?: string;
  notes?: string;
  calculation_data?: any;
  share_token?: string;
}

interface QuoteExportControlsProps {
  quote: QuoteData;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const QuoteExportControls: React.FC<QuoteExportControlsProps> = ({
  quote,
  variant = 'outline',
  size = 'default',
  showLabel = true,
  className = '',
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'excel' | null>(null);

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      setExportType('pdf');
      
      // Debug log the quote data structure
      console.log('Quote data for PDF export:', {
        id: quote.id,
        total_usd: quote.total_usd,
        items: quote.items,
        itemsLength: quote.items?.length
      });
      
      await QuoteExportService.exportToPDF(quote);
      
      toast({
        title: "PDF Export Successful",
        description: "Quote PDF has been downloaded to your device.",
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      console.error('Quote data that caused the error:', quote);
      toast({
        title: "PDF Export Failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      setExportType('excel');
      
      await QuoteExportService.exportToExcel(quote);
      
      toast({
        title: "Excel Export Successful",
        description: "Quote Excel file has been downloaded to your device.",
      });
    } catch (error) {
      console.error('Excel export failed:', error);
      toast({
        title: "Excel Export Failed",
        description: "There was an error generating the Excel file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const getButtonIcon = () => {
    if (isExporting && exportType === 'pdf') {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (isExporting && exportType === 'excel') {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    return <Download className="h-4 w-4" />;
  };

  const getButtonText = () => {
    if (isExporting && exportType === 'pdf') return 'Generating PDF...';
    if (isExporting && exportType === 'excel') return 'Generating Excel...';
    if (showLabel) return 'Export';
    return '';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={isExporting}
          className={className}
        >
          {getButtonIcon()}
          {getButtonText() && <span className="ml-2">{getButtonText()}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem 
          onClick={handleExportPDF}
          disabled={isExporting}
          className="cursor-pointer"
        >
          <FileText className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleExportExcel}
          disabled={isExporting}
          className="cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="text-xs text-muted-foreground">
          Quote #{quote.id.slice(-8).toUpperCase()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Simplified version for inline use
export const QuoteExportButton: React.FC<{
  quote: QuoteData;
  type: 'pdf' | 'excel';
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}> = ({ quote, type, variant = 'outline', size = 'sm' }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      if (type === 'pdf') {
        await QuoteExportService.exportToPDF(quote);
        toast({
          title: "PDF Export Successful",
          description: "Quote PDF has been downloaded.",
        });
      } else {
        await QuoteExportService.exportToExcel(quote);
        toast({
          title: "Excel Export Successful", 
          description: "Quote Excel file has been downloaded.",
        });
      }
    } catch (error) {
      toast({
        title: `${type.toUpperCase()} Export Failed`,
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isExporting}
      className="gap-2"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : type === 'pdf' ? (
        <FileText className="h-4 w-4" />
      ) : (
        <FileSpreadsheet className="h-4 w-4" />
      )}
      {type.toUpperCase()}
    </Button>
  );
};