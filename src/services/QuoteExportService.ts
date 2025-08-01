import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { currencyService } from './CurrencyService';

interface QuoteItem {
  id: string;
  name: string;
  url?: string;
  quantity: number;
  unit_price_usd: number;
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
      const unitPrice = item.unit_price_usd || item.costprice_origin || 0;
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
    
    const totalUsd = quote.total_usd || quote.total || 0;
    const totalText = quote.customer_currency && quote.total_customer_currency 
      ? `Total: ${await currencyService.formatAmount(quote.total_customer_currency, quote.customer_currency)}`
      : `Total: $${totalUsd.toFixed(2)} USD`;
    
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
    const workbook = XLSX.utils.book_new();

    // Quote Summary Sheet
    const summaryData = [
      ['iwishBag Quote System'],
      [''],
      ['Quote ID', quote.id.slice(-8).toUpperCase()],
      ['Status', quote.status.toUpperCase()],
      ['Customer Name', quote.customer_name],
      ['Customer Email', quote.customer_email],
      ['Customer Phone', quote.customer_phone || 'N/A'],
      ['Created Date', new Date(quote.created_at).toLocaleDateString()],
      ['Expires Date', quote.expires_at ? new Date(quote.expires_at).toLocaleDateString() : 'N/A'],
      ['Origin Country', quote.origin_country || 'N/A'],
      ['Destination Country', quote.destination_country || 'N/A'],
      [''],
      ['Total (USD)', `$${(quote.total_usd || quote.total || 0).toFixed(2)}`],
    ];

    if (quote.customer_currency && quote.total_customer_currency) {
      summaryData.push(['Total (Customer Currency)', 
        `${await currencyService.formatAmount(quote.total_customer_currency, quote.customer_currency)}`]);
    }

    if (quote.notes) {
      summaryData.push([''], ['Notes', quote.notes]);
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Quote Summary');

    // Items Detail Sheet
    const itemsHeader = [
      'Item Name', 'URL', 'Quantity', 'Unit Price (USD)', 'Weight (kg)', 
      'Category', 'HSN Code', 'Discount %', 'Subtotal (USD)', 'Notes'
    ];

    const itemsData = (quote.items || []).map(item => {
      const quantity = item.quantity || 0;
      const unitPrice = item.unit_price_usd || item.costprice_origin || 0;
      const subtotal = quantity * unitPrice;
      const discountAmount = item.discount_percentage ? (subtotal * item.discount_percentage / 100) : 0;
      const finalSubtotal = subtotal - discountAmount;

      return [
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
      ];
    });

    const itemsSheet = XLSX.utils.aoa_to_sheet([itemsHeader, ...itemsData]);
    
    // Auto-size columns
    const itemsRange = XLSX.utils.decode_range(itemsSheet['!ref'] || 'A1');
    const colWidths = [];
    for (let col = itemsRange.s.c; col <= itemsRange.e.c; col++) {
      let maxWidth = 10;
      for (let row = itemsRange.s.r; row <= itemsRange.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = itemsSheet[cellAddress];
        if (cell && cell.v) {
          const cellValue = cell.v.toString();
          maxWidth = Math.max(maxWidth, cellValue.length);
        }
      }
      colWidths.push({ wch: Math.min(maxWidth + 2, 50) });
    }
    itemsSheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Items Detail');

    // Calculation Breakdown Sheet (if available)
    if (quote.calculation_data) {
      const calcData = [
        ['Calculation Breakdown'],
        [''],
        ['Component', 'Amount (USD)'],
      ];

      const calc = quote.calculation_data;
      if (calc.subtotal) calcData.push(['Subtotal', calc.subtotal]);
      if (calc.shipping) calcData.push(['Shipping', calc.shipping]);
      if (calc.insurance) calcData.push(['Insurance', calc.insurance]);
      if (calc.customs) calcData.push(['Customs & Duties', calc.customs]);
      if (calc.service_fee) calcData.push(['Service Fee', calc.service_fee]);
      if (calc.total) calcData.push(['Total', calc.total]);

      const calcSheet = XLSX.utils.aoa_to_sheet(calcData);
      XLSX.utils.book_append_sheet(workbook, calcSheet, 'Calculation');
    }

    // Generate filename and save
    const defaultFilename = `iwishBag-Quote-${quote.id.slice(-8).toUpperCase()}.xlsx`;
    XLSX.writeFile(workbook, filename || defaultFilename);
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
    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['iwishBag Quotes Export'],
      ['Generated on', new Date().toLocaleString()],
      ['Total Quotes', quotes.length],
      [''],
      ['Quote ID', 'Customer', 'Status', 'Total (USD)', 'Created Date']
    ];

    quotes.forEach(quote => {
      summaryData.push([
        quote.id?.slice(-8).toUpperCase() || 'Unknown',
        quote.customer_name || 'Unknown Customer',
        quote.status?.toUpperCase() || 'Unknown',
        quote.total_usd || quote.total || 0,
        quote.created_at ? new Date(quote.created_at).toLocaleDateString() : 'Unknown'
      ]);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Individual quote sheets (limit to first 10 for performance)
    const quotesToExport = quotes.slice(0, 10);
    for (let i = 0; i < quotesToExport.length; i++) {
      const quote = quotesToExport[i];
      const itemsData = [
        ['Item Name', 'Quantity', 'Unit Price', 'Subtotal'],
        ...(quote.items || []).map(item => {
          const quantity = item.quantity || 0;
          const unitPrice = item.unit_price_usd || item.costprice_origin || 0;
          return [
            item.name || 'Unknown Item',
            quantity,
            unitPrice,
            quantity * unitPrice
          ];
        })
      ];

      const quoteSheet = XLSX.utils.aoa_to_sheet(itemsData);
      const sheetName = `Quote-${quote.id?.slice(-6) || 'Unknown'}`.substring(0, 31); // Excel sheet name limit
      XLSX.utils.book_append_sheet(workbook, quoteSheet, sheetName);
    }

    const defaultFilename = `iwishBag-Quotes-Export-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename || defaultFilename);
  }
}