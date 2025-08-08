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

interface BulkQuoteExportProps {
  quotes: any[];
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export const BulkQuoteExport: React.FC<BulkQuoteExportProps> = ({
  quotes,
  disabled = false,
  variant = 'outline',
  size = 'default',
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'summary' | 'individual' | null>(null);

  const handleBulkExport = async () => {
    if (!quotes.length) {
      toast({
        title: "No Quotes Selected",
        description: "Please select quotes to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsExporting(true);
      setExportType('summary');
      
      // Convert quotes to the expected format
      const formattedQuotes = quotes.map(quote => ({
        id: quote.id,
        customer_name: quote.customer_name,
        customer_email: quote.customer_email,
        customer_phone: quote.customer_phone,
        status: quote.status,
        items: quote.items || [],
        total_quote_origincurrency: quote.total_quote_origincurrency,
        total_customer_display_currency: quote.total_customer_display_currency,
        customer_currency: quote.customer_currency,
        origin_country: quote.origin_country,
        destination_country: quote.destination_country,
        created_at: quote.created_at,
        expires_at: quote.expires_at,
        notes: quote.notes,
        calculation_data: quote.calculation_data,
        share_token: quote.share_token,
      }));

      await QuoteExportService.exportMultipleQuotesToExcel(formattedQuotes);
      
      toast({
        title: "Bulk Export Successful",
        description: `${quotes.length} quotes exported to Excel.`,
      });
    } catch (error) {
      console.error('Bulk export failed:', error);
      toast({
        title: "Bulk Export Failed",
        description: "There was an error exporting the quotes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const handleIndividualExports = async () => {
    if (!quotes.length) {
      toast({
        title: "No Quotes Selected",
        description: "Please select quotes to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsExporting(true);
      setExportType('individual');
      
      // Export each quote individually
      for (let i = 0; i < Math.min(quotes.length, 5); i++) { // Limit to 5 for performance
        const quote = quotes[i];
        const formattedQuote = {
          id: quote.id,
          customer_name: quote.customer_name,
          customer_email: quote.customer_email,
          customer_phone: quote.customer_phone,
          status: quote.status,
          items: quote.items || [],
          total_quote_origincurrency: quote.total_quote_origincurrency,
          total_customer_display_currency: quote.total_customer_display_currency,
          customer_currency: quote.customer_currency,
          origin_country: quote.origin_country,
          destination_country: quote.destination_country,
          created_at: quote.created_at,
          expires_at: quote.expires_at,
          notes: quote.notes,
          calculation_data: quote.calculation_data,
          share_token: quote.share_token,
        };

        await QuoteExportService.exportToPDF(formattedQuote);
        
        // Small delay between exports
        if (i < quotes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      const exportedCount = Math.min(quotes.length, 5);
      toast({
        title: "Individual Export Successful",
        description: `${exportedCount} PDF files downloaded.${quotes.length > 5 ? ' Limited to first 5 quotes.' : ''}`,
      });
    } catch (error) {
      console.error('Individual export failed:', error);
      toast({
        title: "Individual Export Failed",
        description: "There was an error exporting the quotes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const getButtonIcon = () => {
    if (isExporting) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    return <Download className="h-4 w-4" />;
  };

  const getButtonText = () => {
    if (isExporting && exportType === 'summary') return 'Exporting Summary...';
    if (isExporting && exportType === 'individual') return 'Exporting PDFs...';
    return `Export ${quotes.length} Quote${quotes.length !== 1 ? 's' : ''}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isExporting || !quotes.length}
        >
          {getButtonIcon()}
          <span className="ml-2">{getButtonText()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem 
          onClick={handleBulkExport}
          disabled={isExporting}
          className="cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export Summary (Excel)
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleIndividualExports}
          disabled={isExporting || quotes.length > 5}
          className="cursor-pointer"
        >
          <FileText className="h-4 w-4 mr-2" />
          Export Individual PDFs
          {quotes.length > 5 && (
            <span className="text-xs text-muted-foreground ml-1">(Max 5)</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="text-xs text-muted-foreground">
          {quotes.length} quote{quotes.length !== 1 ? 's' : ''} selected
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};