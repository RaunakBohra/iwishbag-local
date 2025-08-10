/**
 * Production-ready logging service for NCM operations
 * Replaces console.log statements with structured logging
 */

interface NCMLogEvent {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  component: 'SmartMapper' | 'BranchMapping' | 'UI' | 'RealTime';
  action: string;
  data?: any;
  duration?: number;
  error?: Error | string;
}

class NCMLogger {
  private static instance: NCMLogger;
  private logs: NCMLogEvent[] = [];
  private readonly MAX_LOGS = 1000; // Keep last 1000 logs
  private isDevelopment = import.meta.env.DEV;

  private constructor() {}

  static getInstance(): NCMLogger {
    if (!NCMLogger.instance) {
      NCMLogger.instance = new NCMLogger();
    }
    return NCMLogger.instance;
  }

  private log(level: NCMLogEvent['level'], component: NCMLogEvent['component'], action: string, data?: any, error?: Error | string, duration?: number) {
    const event: NCMLogEvent = {
      timestamp: Date.now(),
      level,
      component,
      action,
      data,
      duration,
      error
    };

    // Add to internal log store
    this.logs.push(event);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift(); // Remove oldest log
    }

    // Console output in development
    if (this.isDevelopment) {
      const icon = this.getLogIcon(component, level);
      const message = `${icon} [${component}] ${action}`;
      
      switch (level) {
        case 'debug':
          console.debug(message, data || '');
          break;
        case 'info':
          console.info(message, data || '');
          break;
        case 'warn':
          console.warn(message, data || '');
          break;
        case 'error':
          console.error(message, error || data || '');
          break;
      }
    }

    // Send to monitoring service in production (future enhancement)
    if (!this.isDevelopment && level === 'error') {
      this.sendToMonitoring(event);
    }
  }

  private getLogIcon(component: NCMLogEvent['component'], level: NCMLogEvent['level']): string {
    const componentIcons = {
      'SmartMapper': '🧠',
      'BranchMapping': '🏢',
      'UI': '🖥️',
      'RealTime': '⏱️'
    };

    const levelIcons = {
      'debug': '🔍',
      'info': 'ℹ️',
      'warn': '⚠️',
      'error': '❌'
    };

    return componentIcons[component] || levelIcons[level] || '📝';
  }

  private async sendToMonitoring(event: NCMLogEvent) {
    // Future: Send to Sentry, DataDog, or other monitoring service
    try {
      // Example: await monitoring.send(event);
    } catch (error) {
      // Silent failure for monitoring
    }
  }

  // Public logging methods
  debug(component: NCMLogEvent['component'], action: string, data?: any) {
    this.log('debug', component, action, data);
  }

  info(component: NCMLogEvent['component'], action: string, data?: any, duration?: number) {
    this.log('info', component, action, data, undefined, duration);
  }

  warn(component: NCMLogEvent['component'], action: string, data?: any) {
    this.log('warn', component, action, data);
  }

  error(component: NCMLogEvent['component'], action: string, error: Error | string, data?: any) {
    this.log('error', component, action, data, error);
  }

  // Performance tracking
  startTimer(component: NCMLogEvent['component'], action: string) {
    return {
      component,
      action,
      startTime: performance.now(),
      end: (data?: any) => {
        const duration = performance.now() - performance.now();
        this.info(component, `${action} completed`, data, duration);
      }
    };
  }

  // Analytics and debugging methods
  getRecentLogs(count: number = 50): NCMLogEvent[] {
    return this.logs.slice(-count);
  }

  getErrorLogs(): NCMLogEvent[] {
    return this.logs.filter(log => log.level === 'error');
  }

  getPerformanceMetrics(): { avgDuration: number; totalRequests: number } {
    const timedLogs = this.logs.filter(log => log.duration !== undefined);
    const avgDuration = timedLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / timedLogs.length;
    return {
      avgDuration: avgDuration || 0,
      totalRequests: timedLogs.length
    };
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  clearLogs() {
    this.logs = [];
  }
}

// Export singleton instance
export const ncmLogger = NCMLogger.getInstance();
export default ncmLogger;