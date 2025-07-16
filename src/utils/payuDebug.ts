// PayU Debug Utilities
// This helps debug PayU payment issues by storing data in localStorage

export interface PayUDebugData {
  timestamp: string;
  event: 'response' | 'submission' | 'error';
  data: any;
}

export class PayUDebugger {
  private static STORAGE_KEY = 'payu_debug_log';
  private static MAX_ENTRIES = 10;

  static log(event: 'response' | 'submission' | 'error', data: any) {
    try {
      // Get existing logs
      const existingLogs = this.getLogs();
      
      // Add new entry
      const newEntry: PayUDebugData = {
        timestamp: new Date().toISOString(),
        event,
        data
      };
      
      existingLogs.unshift(newEntry);
      
      // Keep only last MAX_ENTRIES
      if (existingLogs.length > this.MAX_ENTRIES) {
        existingLogs.length = this.MAX_ENTRIES;
      }
      
      // Save back to localStorage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingLogs));
      
      // Also log to console
      console.log(`[PayU Debug] ${event}:`, data);
    } catch (error) {
      console.error('Failed to save PayU debug data:', error);
    }
  }

  static getLogs(): PayUDebugData[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static getLastLog(): PayUDebugData | null {
    const logs = this.getLogs();
    return logs.length > 0 ? logs[0] : null;
  }

  static clear() {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  static displayInConsole() {
    const logs = this.getLogs();
    console.group('📋 PayU Debug Logs');
    logs.forEach((log, index) => {
      console.group(`Entry ${index + 1} - ${log.event} at ${log.timestamp}`);
      console.log(log.data);
      console.groupEnd();
    });
    console.groupEnd();
    console.log('💡 To view logs in browser console, run: PayUDebugger.displayInConsole()');
  }
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).PayUDebugger = PayUDebugger;
}

// Helper to check PayU form data
export function validatePayUFormData(formData: Record<string, string>): {
  isValid: boolean;
  missingFields: string[];
  presentFields: string[];
} {
  const requiredFields = ['key', 'txnid', 'amount', 'productinfo', 'firstname', 'email', 'phone', 'surl', 'furl', 'hash'];
  const presentFields = Object.keys(formData);
  const missingFields = requiredFields.filter(field => !formData[field]);
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
    presentFields
  };
}