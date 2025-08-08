import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';
import { currencyService } from './CurrencyService';

interface QuoteItem {
  id: string;
  name: string;
  url?: string;
  quantity: number;
  unit_price_origin: number;
  weight_kg?: number;
  category?: string;
  notes?: string;
  discount_percentage?: number;
  hsn_code?: string;
}

interface QuoteData {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  status: string;
  items: QuoteItem[];
  final_total_origin: number;
  total_origin_currency?: number;
  total_quote_origincurrency?: number; // Kept for backward compatibility
  total_customer_display_currency?: number;
  customer_currency?: string;
  origin_country?: string;
  destination_country?: string;
  created_at: string;
  expires_at?: string;
  notes?: string;
  calculation_data?: any;
  share_token?: string;
}

export class QuoteExportService {
  /**
   * Export quote as PDF
   */
  static async exportToPDF(quote: QuoteData, filename?: string): Promise<void> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    let currentY = 20;

    // Helper function to add text with word wrap
    const addText = (text: string, x: number, y: number, maxWidth?: number, fontSize = 12) => {
      doc.setFontSize(fontSize);
      if (maxWidth) {
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return y + (lines.length * fontSize * 0.4);
      } else {
        doc.text(text, x, y);
        return y + (fontSize * 0.4);
      }
    };

    // Company Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('iwishBag', margin, currentY);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('International Shopping Made Easy', margin, currentY + 8);
    currentY += 25;

    // Quote Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Quote #${quote.id.slice(-8).toUpperCase()}`, margin, currentY);
    
    // Status Badge
    doc.setFontSize(10);
    const statusColor = this.getStatusColor(quote.status);
    doc.setTextColor(statusColor.r, statusColor.g, statusColor.b);
    doc.text(quote.status.toUpperCase(), pageWidth - margin - 30, currentY);
    doc.setTextColor(0, 0, 0); // Reset to black
    currentY += 20;

    // Customer Information
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Customer Information', margin, currentY);
    currentY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    currentY = addText(`Name: ${quote.customer_name}`, margin, currentY);
    currentY = addText(`Email: ${quote.customer_email}`, margin, currentY + 2);
    if (quote.customer_phone) {
      currentY = addText(`Phone: ${quote.customer_phone}`, margin, currentY + 2);
    }
    currentY += 10;

    // Quote Details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Quote Details', margin, currentY);
    currentY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    currentY = addText(`Created: ${new Date(quote.created_at).toLocaleDateString()}`, margin, currentY);
    if (quote.expires_at) {
      currentY = addText(`Expires: ${new Date(quote.expires_at).toLocaleDateString()}`, margin, currentY + 2);
    }
    if (quote.origin_country && quote.destination_country) {
      currentY = addText(`Route: ${quote.origin_country} → ${quote.destination_country}`, margin, currentY + 2);
    }
    currentY += 15;

    // Items Table Header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Items', margin, currentY);
    currentY += 10;

    // Table headers
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const colWidths = [60, 20, 30, 30, 40];
    const colPositions = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1], 
                         margin + colWidths[0] + colWidths[1] + colWidths[2], 
                         margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]];
    
    doc.text('Item', colPositions[0], currentY);
    doc.text('Qty', colPositions[1], currentY);
    doc.text('Unit Price', colPositions[2], currentY);
    doc.text('Weight (kg)', colPositions[3], currentY);
    doc.text('Subtotal', colPositions[4], currentY);
    currentY += 6;

    // Draw line under headers
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 5;

    // Items
    doc.setFont('helvetica', 'normal');
    for (const item of quote.items || []) {
      const quantity = item.quantity || 0;
      const unitPrice = item.unit_price_origin || 0;
      const subtotal = quantity * unitPrice;
      const discountAmount = item.discount_percentage ? (subtotal * item.discount_percentage / 100) : 0;
      const finalSubtotal = subtotal - discountAmount;

      // Check if we need a new page
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.text((item.name || 'Unknown Item').substring(0, 35), colPositions[0], currentY);
      doc.text(quantity.toString(), colPositions[1], currentY);
      doc.text(`$${unitPrice.toFixed(2)}`, colPositions[2], currentY);
      doc.text((item.weight_kg || item.weight)?.toFixed(2) || 'N/A', colPositions[3], currentY);
      doc.text(`$${finalSubtotal.toFixed(2)}`, colPositions[4], currentY);
      
      currentY += 6;

      // Add item notes if any
      if (item.notes) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        currentY = addText(`Notes: ${item.notes}`, colPositions[0], currentY, colWidths[0] + colWidths[1]);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        currentY += 2;
      }
    }

    currentY += 10;

    // Totals Section
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    
    const totalOrigin = quote.final_total_origin || quote.total_origin_currency || quote.total_quote_origincurrency || quote.total || 0;
    const totalText = quote.customer_currency && quote.total_customer_display_currency 
      ? `Total: ${await currencyService.formatAmount(quote.total_customer_display_currency, quote.customer_currency)}`
      : `Total: ${totalOrigin.toFixed(2)} ${quote.origin_country || 'USD'}`;
    
    doc.text(totalText, pageWidth - margin - 60, currentY);
    currentY += 15;

    // Notes section
    if (quote.notes) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Notes', margin, currentY);
      currentY += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      addText(quote.notes, margin, currentY, pageWidth - 2 * margin);
      currentY += 20;
    }

    // Footer
    const footerY = doc.internal.pageSize.height - 20;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Generated by iwishBag Quote System', margin, footerY);
    doc.text(new Date().toLocaleString(), pageWidth - margin - 40, footerY);

    // Save the PDF
    const defaultFilename = `iwishBag-Quote-${quote.id.slice(-8).toUpperCase()}.pdf`;
    doc.save(filename || defaultFilename);
  }

  /**
   * Export quote as Excel
   */
  static async exportToExcel(quote: QuoteData, filename?: string): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'iwishBag Quote System';
    workbook.created = new Date();

    // Quote Summary Sheet
    const summarySheet = workbook.addWorksheet('Quote Summary');
    
    // Add summary data
    summarySheet.addRow(['iwishBag Quote System']);
    summarySheet.addRow([]);
    summarySheet.addRow(['Quote ID', quote.id.slice(-8).toUpperCase()]);
    summarySheet.addRow(['Status', quote.status.toUpperCase()]);
    summarySheet.addRow(['Customer Name', quote.customer_name]);
    summarySheet.addRow(['Customer Email', quote.customer_email]);
    summarySheet.addRow(['Customer Phone', quote.customer_phone || 'N/A']);
    summarySheet.addRow(['Created Date', new Date(quote.created_at).toLocaleDateString()]);
    summarySheet.addRow(['Expires Date', quote.expires_at ? new Date(quote.expires_at).toLocaleDateString() : 'N/A']);
    summarySheet.addRow(['Origin Country', quote.origin_country || 'N/A']);
    summarySheet.addRow(['Destination Country', quote.destination_country || 'N/A']);
    summarySheet.addRow([]);
    const totalAmount = quote.final_total_origin || quote.total_origin_currency || quote.total_quote_origincurrency || quote.total || 0;
    summarySheet.addRow(['Total (Origin Currency)', `${totalAmount.toFixed(2)} ${quote.origin_country || 'USD'}`]);

    if (quote.customer_currency && quote.total_customer_display_currency) {
      summarySheet.addRow(['Total (Customer Currency)', 
        `${await currencyService.formatAmount(quote.total_customer_display_currency, quote.customer_currency)}`]);
    }

    if (quote.notes) {
      summarySheet.addRow([]);
      summarySheet.addRow(['Notes', quote.notes]);
    }

    // Style the header
    summarySheet.getCell('A1').font = { bold: true, size: 14 };
    summarySheet.getColumn('A').width = 20;
    summarySheet.getColumn('B').width = 30;

    // Items Detail Sheet
    const itemsSheet = workbook.addWorksheet('Items Detail');
    
    // Add headers
    const itemsHeaders = [
      'Item Name', 'URL', 'Quantity', 'Unit Price (Origin)', 'Weight (kg)', 
      'Category', 'HSN Code', 'Discount %', 'Subtotal (Origin)', 'Notes'
    ];
    itemsSheet.addRow(itemsHeaders);

    // Style headers
    const headerRow = itemsSheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Add items data
    (quote.items || []).forEach(item => {
      const quantity = item.quantity || 0;
      const unitPrice = item.unit_price_origin || 0;
      const subtotal = quantity * unitPrice;
      const discountAmount = item.discount_percentage ? (subtotal * item.discount_percentage / 100) : 0;
      const finalSubtotal = subtotal - discountAmount;

      itemsSheet.addRow([
        item.name || 'Unknown Item',
        item.url || 'N/A',
        quantity,
        unitPrice,
        (item.weight_kg || item.weight) || 'N/A',
        item.category || 'N/A',
        item.hsn_code || 'N/A',
        item.discount_percentage || 0,
        finalSubtotal,
        item.notes || 'N/A'
      ]);
    });

    // Auto-size columns
    itemsSheet.columns.forEach(column => {
      let maxLength = 10;
      column.eachCell!({ includeEmpty: false }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    // Calculation Breakdown Sheet (if available)
    if (quote.calculation_data) {
      const calcSheet = workbook.addWorksheet('Calculation');
      
      calcSheet.addRow(['Calculation Breakdown']);
      calcSheet.addRow([]);
      calcSheet.addRow(['Component', `Amount (${quote.origin_country || 'USD'})`]);

      const calc = quote.calculation_data;
      if (calc.subtotal) calcSheet.addRow(['Subtotal', calc.subtotal]);
      if (calc.shipping) calcSheet.addRow(['Shipping', calc.shipping]);
      if (calc.insurance) calcSheet.addRow(['Insurance', calc.insurance]);
      if (calc.customs) calcSheet.addRow(['Customs & Duties', calc.customs]);
      if (calc.service_fee) calcSheet.addRow(['Service Fee', calc.service_fee]);
      if (calc.total) calcSheet.addRow(['Total', calc.total]);

      // Style calculation sheet
      calcSheet.getCell('A1').font = { bold: true, size: 14 };
      calcSheet.getRow(3).font = { bold: true };
      calcSheet.getColumn('A').width = 20;
      calcSheet.getColumn('B').width = 15;
    }

    // Generate filename and save
    const defaultFilename = `iwishBag-Quote-${quote.id.slice(-8).toUpperCase()}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Create download link
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || defaultFilename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Get color for status badge
   */
  private static getStatusColor(status: string): { r: number; g: number; b: number } {
    switch (status.toLowerCase()) {
      case 'pending':
        return { r: 255, g: 193, b: 7 }; // yellow
      case 'sent':
        return { r: 13, g: 202, b: 240 }; // blue
      case 'approved':
        return { r: 34, g: 197, b: 94 }; // green
      case 'rejected':
        return { r: 239, g: 68, b: 68 }; // red
      case 'expired':
        return { r: 107, g: 114, b: 128 }; // gray
      default:
        return { r: 0, g: 0, b: 0 }; // black
    }
  }

  /**
   * Export multiple quotes as Excel with summary
   */
  static async exportMultipleQuotesToExcel(quotes: QuoteData[], filename?: string): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'iwishBag Quote System';
    workbook.created = new Date();

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    
    summarySheet.addRow(['iwishBag Quotes Export']);
    summarySheet.addRow(['Generated on', new Date().toLocaleString()]);
    summarySheet.addRow(['Total Quotes', quotes.length]);
    summarySheet.addRow([]);
    summarySheet.addRow(['Quote ID', 'Customer', 'Status', 'Total (USD)', 'Created Date']);

    // Style header
    summarySheet.getCell('A1').font = { bold: true, size: 14 };
    const headerRow = summarySheet.getRow(5);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Add quotes data
    quotes.forEach(quote => {
      summarySheet.addRow([
        quote.id?.slice(-8).toUpperCase() || 'Unknown',
        quote.customer_name || 'Unknown Customer',
        quote.status?.toUpperCase() || 'Unknown',
        quote.final_total_origin || quote.total_origin_currency || quote.total_quote_origincurrency || quote.total || 0,
        quote.created_at ? new Date(quote.created_at).toLocaleDateString() : 'Unknown'
      ]);
    });

    // Auto-size columns
    summarySheet.columns.forEach(column => {
      let maxLength = 10;
      column.eachCell!({ includeEmpty: false }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 2, 30);
    });

    // Individual quote sheets (limit to first 10 for performance)
    const quotesToExport = quotes.slice(0, 10);
    for (let i = 0; i < quotesToExport.length; i++) {
      const quote = quotesToExport[i];
      const sheetName = `Quote-${quote.id?.slice(-6) || 'Unknown'}`.substring(0, 31); // Excel sheet name limit
      const quoteSheet = workbook.addWorksheet(sheetName);
      
      // Add headers
      quoteSheet.addRow(['Item Name', 'Quantity', 'Unit Price', 'Subtotal']);
      const headerRow = quoteSheet.getRow(1);
      headerRow.font = { bold: true };
      
      // Add items
      (quote.items || []).forEach(item => {
        const quantity = item.quantity || 0;
        const unitPrice = item.unit_price_origin || 0;
        quoteSheet.addRow([
          item.name || 'Unknown Item',
          quantity,
          unitPrice,
          quantity * unitPrice
        ]);
      });

      // Auto-size columns
      quoteSheet.columns.forEach(column => {
        let maxLength = 10;
        column.eachCell!({ includeEmpty: false }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(maxLength + 2, 40);
      });
    }

    // Generate filename and save
    const defaultFilename = `iwishBag-Quotes-Export-${new Date().toISOString().split('T')[0]}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Create download link
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || defaultFilename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}