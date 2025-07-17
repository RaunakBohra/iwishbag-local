/**
 * Edge Function compatible logging service
 * Adapted from LoggingService.ts for Deno environment
 */

// Log levels
export enum EdgeLogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

// Log categories
export enum EdgeLogCategory {
  PAYMENT_PROCESSING = 'payment.processing',
  WEBHOOK_PROCESSING = 'webhook.processing',
  DATABASE_OPERATION = 'database.operation',
  SECURITY_EVENT = 'security.event',
  PERFORMANCE = 'performance',
  API_REQUEST = 'api.request',
  EDGE_FUNCTION = 'edge.function',
}

// Log context interface
export interface EdgeLogContext {
  requestId?: string;
  userId?: string;
  paymentId?: string;
  orderId?: string;
  quoteId?: string;
  sessionId?: string;
  functionName?: string;
  metadata?: Record<string, unknown>;
}

// Log entry interface
export interface EdgeLogEntry {
  timestamp: string;
  level: EdgeLogLevel;
  category: EdgeLogCategory;
  message: string;
  context?: EdgeLogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  functionName?: string;
  fileName?: string;
  lineNumber?: number;
  performance?: {
    operation: string;
    duration: number;
    startTime: number;
    endTime: number;
  };
}

/**
 * Edge Function compatible logger
 */
export class EdgeLogger {
  private requestId: string;
  private functionName: string;
  private startTime: number;
  private performanceTracker = new Map<string, number>();

  constructor(functionName: string, requestId?: string) {
    this.functionName = functionName;
    this.requestId = requestId || this.generateRequestId();
    this.startTime = performance.now();
  }

  private generateRequestId(): string {
    return `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createLogEntry(
    level: EdgeLogLevel,
    category: EdgeLogCategory,
    message: string,
    context?: EdgeLogContext,
    error?: Error,
  ): EdgeLogEntry {
    const entry: EdgeLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      context: {
        requestId: this.requestId,
        functionName: this.functionName,
        ...context,
      },
      functionName: this.functionName,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  private formatLogOutput(entry: EdgeLogEntry): string {
    const levelName = EdgeLogLevel[entry.level];
    const timestamp = new Date(entry.timestamp).toISOString();

    let output = `[${timestamp}] ${levelName} [${entry.category}] ${entry.message}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      output += ` | Context: ${JSON.stringify(entry.context)}`;
    }

    if (entry.error) {
      output += ` | Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        output += `\nStack: ${entry.error.stack}`;
      }
    }

    return output;
  }

  private writeLog(entry: EdgeLogEntry): void {
    const output = this.formatLogOutput(entry);

    // Use appropriate console method based on log level
    switch (entry.level) {
      case EdgeLogLevel.DEBUG:
        console.debug(output);
        break;
      case EdgeLogLevel.INFO:
        console.info(output);
        break;
      case EdgeLogLevel.WARN:
        console.warn(output);
        break;
      case EdgeLogLevel.ERROR:
      case EdgeLogLevel.CRITICAL:
        console.error(output);
        break;
      default:
        console.log(output);
    }
  }

  // Core logging methods
  debug(category: EdgeLogCategory, message: string, context?: EdgeLogContext): void {
    const entry = this.createLogEntry(EdgeLogLevel.DEBUG, category, message, context);
    this.writeLog(entry);
  }

  info(category: EdgeLogCategory, message: string, context?: EdgeLogContext): void {
    const entry = this.createLogEntry(EdgeLogLevel.INFO, category, message, context);
    this.writeLog(entry);
  }

  warn(category: EdgeLogCategory, message: string, context?: EdgeLogContext): void {
    const entry = this.createLogEntry(EdgeLogLevel.WARN, category, message, context);
    this.writeLog(entry);
  }

  error(category: EdgeLogCategory, message: string, error?: Error, context?: EdgeLogContext): void {
    const entry = this.createLogEntry(EdgeLogLevel.ERROR, category, message, context, error);
    this.writeLog(entry);
  }

  critical(
    category: EdgeLogCategory,
    message: string,
    error?: Error,
    context?: EdgeLogContext,
  ): void {
    const entry = this.createLogEntry(EdgeLogLevel.CRITICAL, category, message, context, error);
    this.writeLog(entry);
  }

  // Performance tracking
  startPerformance(operation: string): void {
    this.performanceTracker.set(operation, performance.now());
    this.debug(EdgeLogCategory.PERFORMANCE, `Performance tracking started: ${operation}`, {
      metadata: { operation, startTime: performance.now() },
    });
  }

  endPerformance(
    operation: string,
    category: EdgeLogCategory = EdgeLogCategory.PERFORMANCE,
    context?: EdgeLogContext,
  ): void {
    const startTime = this.performanceTracker.get(operation);
    if (!startTime) {
      this.warn(
        EdgeLogCategory.PERFORMANCE,
        `Performance tracking not found for operation: ${operation}`,
      );
      return;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    this.performanceTracker.delete(operation);

    const entry = this.createLogEntry(
      EdgeLogLevel.INFO,
      category,
      `Performance: ${operation}`,
      context,
    );
    entry.performance = {
      operation,
      duration,
      startTime,
      endTime,
    };

    this.writeLog(entry);
  }

  // API request/response logging
  logApiRequest(
    method: string,
    url: string,
    context?: EdgeLogContext,
    requestBody?: unknown,
  ): string {
    const requestId = this.generateRequestId();
    this.info(EdgeLogCategory.API_REQUEST, `API Request: ${method} ${url}`, {
      ...context,
      metadata: {
        ...context?.metadata,
        method,
        url,
        requestId,
        hasBody: !!requestBody,
      },
    });
    return requestId;
  }

  logApiResponse(
    requestId: string,
    status: number,
    duration: number,
    context?: EdgeLogContext,
    responseBody?: unknown,
  ): void {
    this.info(EdgeLogCategory.API_REQUEST, `API Response: ${status}`, {
      ...context,
      metadata: {
        ...context?.metadata,
        requestId,
        status,
        duration,
        hasBody: !!responseBody,
      },
    });
  }

  // Function lifecycle
  logFunctionStart(context?: EdgeLogContext): void {
    this.info(EdgeLogCategory.EDGE_FUNCTION, `Function started: ${this.functionName}`, {
      ...context,
      metadata: {
        ...context?.metadata,
        startTime: this.startTime,
      },
    });
  }

  logFunctionEnd(success: boolean, context?: EdgeLogContext): void {
    const duration = performance.now() - this.startTime;
    this.info(EdgeLogCategory.EDGE_FUNCTION, `Function completed: ${this.functionName}`, {
      ...context,
      metadata: {
        ...context?.metadata,
        success,
        duration,
        totalTime: duration,
      },
    });
  }

  // Getters
  get id(): string {
    return this.requestId;
  }

  get function(): string {
    return this.functionName;
  }
}

// Convenience functions for quick logging
export const logEdgeInfo = (
  category: EdgeLogCategory,
  message: string,
  context?: EdgeLogContext,
): void => {
  const entry = {
    timestamp: new Date().toISOString(),
    level: EdgeLogLevel.INFO,
    category,
    message,
    context,
  };
  console.info(
    `[${entry.timestamp}] INFO [${category}] ${message}${context ? ` | Context: ${JSON.stringify(context)}` : ''}`,
  );
};

export const logEdgeError = (
  category: EdgeLogCategory,
  message: string,
  error?: Error,
  context?: EdgeLogContext,
): void => {
  const entry = {
    timestamp: new Date().toISOString(),
    level: EdgeLogLevel.ERROR,
    category,
    message,
    context,
    error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined,
  };

  let output = `[${entry.timestamp}] ERROR [${category}] ${message}`;
  if (context) output += ` | Context: ${JSON.stringify(context)}`;
  if (error) output += ` | Error: ${error.name}: ${error.message}`;

  console.error(output);
  if (error?.stack) console.error(`Stack: ${error.stack}`);
};

export const logEdgeWarn = (
  category: EdgeLogCategory,
  message: string,
  context?: EdgeLogContext,
): void => {
  const entry = {
    timestamp: new Date().toISOString(),
    level: EdgeLogLevel.WARN,
    category,
    message,
    context,
  };
  console.warn(
    `[${entry.timestamp}] WARN [${category}] ${message}${context ? ` | Context: ${JSON.stringify(context)}` : ''}`,
  );
};
