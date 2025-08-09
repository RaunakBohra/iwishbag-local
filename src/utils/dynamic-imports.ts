/**
 * Dynamic Import Utilities for Performance Optimization
 * 
 * This module provides lazy loading utilities for heavy dependencies
 * to prevent them from being included in the initial bundle.
 * 
 * CRITICAL: These imports prevent 1.5MB+ from loading on page load
 */

// ============================================================================
// PDF GENERATION (Only load when generating PDFs)
// ============================================================================

export const lazyPdfGenerator = {
  async generatePDF(content: any, filename: string) {
    const [{ default: jsPDF }] = await Promise.all([
      import('jspdf'),
      // Add small delay to show loading state
      new Promise(resolve => setTimeout(resolve, 100))
    ]);
    
    const pdf = new jsPDF();
    // PDF generation logic here
    pdf.save(filename);
  }
};

// ============================================================================
// EXCEL GENERATION (Only load when generating Excel files)
// ============================================================================

export const lazyExcelGenerator = {
  async generateExcel(data: any[], filename: string) {
    const [ExcelJS] = await Promise.all([
      import('exceljs'),
      new Promise(resolve => setTimeout(resolve, 100))
    ]);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');
    
    // Excel generation logic here
    worksheet.addRows(data);
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
};

// ============================================================================
// IMAGE COMPRESSION (Only load when compressing images)
// ============================================================================

export const lazyImageProcessor = {
  async compressImage(file: File, options: any = {}) {
    const { default: imageCompression } = await import('browser-image-compression');
    
    const defaultOptions = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      ...options
    };
    
    return await imageCompression(file, defaultOptions);
  }
};

// ============================================================================
// EMAIL PROCESSING (Only load for admin email features)
// ============================================================================

export const lazyEmailProcessor = {
  async parseEmail(emailSource: string) {
    const { simpleParser } = await import('mailparser');
    return await simpleParser(emailSource);
  }
};

// ============================================================================
// CHARTS & VISUALIZATION (Only load for dashboard/analytics)
// ============================================================================

export const lazyChartComponents = {
  async getRechartsComponents() {
    const recharts = await import('recharts');
    return {
      LineChart: recharts.LineChart,
      BarChart: recharts.BarChart,
      PieChart: recharts.PieChart,
      XAxis: recharts.XAxis,
      YAxis: recharts.YAxis,
      CartesianGrid: recharts.CartesianGrid,
      Tooltip: recharts.Tooltip,
      Legend: recharts.Legend,
      Line: recharts.Line,
      Bar: recharts.Bar,
      Pie: recharts.Pie,
      Cell: recharts.Cell,
      ResponsiveContainer: recharts.ResponsiveContainer
    };
  }
};

// ============================================================================
// ANIMATIONS (Only load for enhanced interactions)
// ============================================================================

export const lazyAnimations = {
  async getFramerMotion() {
    const framerMotion = await import('framer-motion');
    return {
      motion: framerMotion.motion,
      AnimatePresence: framerMotion.AnimatePresence,
      useAnimation: framerMotion.useAnimation,
      useMotionValue: framerMotion.useMotionValue,
      useSpring: framerMotion.useSpring
    };
  }
};

// ============================================================================
// QR CODE GENERATION (Only load when generating QR codes)  
// ============================================================================

export const lazyQRGenerator = {
  async generateQR(text: string, options: any = {}) {
    const QRCode = await import('qrcode');
    return await QRCode.toDataURL(text, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      ...options
    });
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generic dynamic import with loading state
 */
export async function dynamicImport<T>(
  importFn: () => Promise<T>,
  loadingCallback?: (loading: boolean) => void
): Promise<T> {
  try {
    loadingCallback?.(true);
    const module = await importFn();
    return module;
  } finally {
    loadingCallback?.(false);
  }
}

/**
 * Preload heavy modules based on user interaction patterns
 */
export const preloadStrategies = {
  /**
   * Preload modules when user hovers over related buttons
   */
  onHover: {
    pdf: () => import('jspdf'),
    excel: () => import('exceljs'),
    charts: () => import('recharts'),
    images: () => import('browser-image-compression')
  },
  
  /**
   * Preload modules when entering specific routes
   */
  onRoute: {
    adminDashboard: () => Promise.all([
      import('recharts'),
      import('exceljs')
    ]),
    userProfile: () => import('browser-image-compression'),
    reports: () => Promise.all([
      import('jspdf'), 
      import('exceljs'),
      import('recharts')
    ])
  }
};