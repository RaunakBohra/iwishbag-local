import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Download,
  RefreshCw,
  Search,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
  Trash2,
  FileText,
} from 'lucide-react';
import { logger, LogLevel, LogCategory } from '@/services/LoggingService';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface LogViewerProps {
  embedded?: boolean;
  maxHeight?: string;
}

export function LogViewer({ embedded = false, maxHeight = '600px' }: LogViewerProps) {
  const [logs, setLogs] = useState<unknown[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<unknown[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<LogCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  // Fetch logs from local storage
  const fetchLogs = () => {
    setIsRefreshing(true);
    try {
      const storedLogs = logger.getStoredLogs();
      setLogs(storedLogs);
      filterLogs(storedLogs);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter logs based on criteria
  const filterLogs = (logsToFilter = logs) => {
    let filtered = [...logsToFilter];

    // Filter by level
    if (selectedLevel !== 'all') {
      filtered = filtered.filter((log) => log.level >= selectedLevel);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((log) => log.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(query) ||
          JSON.stringify(log.context).toLowerCase().includes(query) ||
          (log.error?.message || '').toLowerCase().includes(query),
      );
    }

    // Filter by date range
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      filtered = filtered.filter((log) => new Date(log.timestamp) >= startDate);
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((log) => new Date(log.timestamp) <= endDate);
    }

    setFilteredLogs(filtered);
  };

  // Initial fetch
  useEffect(() => {
    fetchLogs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-filter when criteria change
  useEffect(() => {
    filterLogs();
  }, [selectedLevel, selectedCategory, searchQuery, dateRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get log level icon and color
  const getLogLevelInfo = (level: LogLevel) => {
    switch (level) {
      case LogLevel.DEBUG:
        return {
          icon: Info,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50 dark:bg-gray-900',
        };
      case LogLevel.INFO:
        return {
          icon: Info,
          color: 'text-teal-500',
          bgColor: 'bg-teal-50 dark:bg-teal-900/20',
        };
      case LogLevel.WARN:
        return {
          icon: AlertTriangle,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        };
      case LogLevel.ERROR:
        return {
          icon: XCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
        };
      case LogLevel.CRITICAL:
        return {
          icon: AlertCircle,
          color: 'text-red-700',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
        };
    }
  };

  const getLevelName = (level: LogLevel) => {
    const names = {
      [LogLevel.DEBUG]: 'DEBUG',
      [LogLevel.INFO]: 'INFO',
      [LogLevel.WARN]: 'WARN',
      [LogLevel.ERROR]: 'ERROR',
      [LogLevel.CRITICAL]: 'CRITICAL',
    };
    return names[level];
  };

  const handleExport = () => {
    const filename = `iwishbag-logs-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.json`;
    logger.downloadLogs(filename, {
      level: selectedLevel !== 'all' ? selectedLevel : undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      startTime: dateRange.start ? new Date(dateRange.start) : undefined,
      endTime: dateRange.end ? new Date(dateRange.end) : undefined,
    });
  };

  const handleClearLogs = () => {
    if (confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
      logger.clearStoredLogs();
      fetchLogs();
    }
  };

  const containerClass = embedded ? 'h-full' : 'space-y-6';

  return (
    <div className={containerClass}>
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">System Logs</h2>
            <p className="text-muted-foreground">View and analyze application logs for debugging</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchLogs} disabled={isRefreshing} variant="outline">
              <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
              Refresh
            </Button>
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={handleClearLogs} variant="destructive" size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Card className={embedded ? 'h-full flex flex-col' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Log Entries
          </CardTitle>
          <CardDescription>
            {filteredLogs.length} of {logs.length} logs shown
          </CardDescription>
        </CardHeader>
        <CardContent className={embedded ? 'flex-1 flex flex-col overflow-hidden' : ''}>
          {/* Filters */}
          <div className="space-y-4 mb-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label htmlFor="level">Log Level</Label>
                <Select
                  value={selectedLevel}
                  onValueChange={(value: string) => setSelectedLevel(value)}
                >
                  <SelectTrigger id="level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value={LogLevel.DEBUG.toString()}>Debug</SelectItem>
                    <SelectItem value={LogLevel.INFO.toString()}>Info</SelectItem>
                    <SelectItem value={LogLevel.WARN.toString()}>Warning</SelectItem>
                    <SelectItem value={LogLevel.ERROR.toString()}>Error</SelectItem>
                    <SelectItem value={LogLevel.CRITICAL.toString()}>Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={(value: string) => setSelectedCategory(value)}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Object.values(LogCategory).map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.replace(/\./g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="start">Start Date</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="end">End Date</Label>
                <Input
                  id="end"
                  type="datetime-local"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Logs */}
          <div
            className={cn('space-y-2 overflow-y-auto', embedded && 'flex-1')}
            style={{ maxHeight: embedded ? undefined : maxHeight }}
          >
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No logs found matching the selected criteria
              </div>
            ) : (
              filteredLogs.map((log, index) => {
                const levelInfo = getLogLevelInfo(log.level);
                const LevelIcon = levelInfo.icon;
                const isExpanded = showDetails === log.timestamp + index;

                return (
                  <div
                    key={log.timestamp + index}
                    className={cn(
                      'p-3 rounded-lg border cursor-pointer transition-colors',
                      levelInfo.bgColor,
                      isExpanded && 'ring-2 ring-primary',
                    )}
                    onClick={() => setShowDetails(isExpanded ? null : log.timestamp + index)}
                  >
                    <div className="flex items-start gap-3">
                      <LevelIcon className={cn('h-4 w-4 mt-0.5', levelInfo.color)} />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {getLevelName(log.level)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs font-mono">
                            {log.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss.SSS')}
                          </span>
                          {log.context?.userId && (
                            <Badge variant="outline" className="text-xs">
                              User: {log.context.userId.substring(0, 8)}...
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm">{log.message}</p>

                        {log.error && (
                          <p className="text-sm text-red-600 dark:text-red-400">
                            Error: {log.error.message}
                          </p>
                        )}

                        {isExpanded && (
                          <div className="mt-3 space-y-2">
                            {log.context && Object.keys(log.context).length > 0 && (
                              <div>
                                <p className="text-xs font-medium mb-1">Context:</p>
                                <pre className="text-xs bg-black/5 dark:bg-white/5 p-2 rounded overflow-x-auto">
                                  {JSON.stringify(log.context, null, 2)}
                                </pre>
                              </div>
                            )}

                            {log.stackTrace && (
                              <div>
                                <p className="text-xs font-medium mb-1">Stack Trace:</p>
                                <pre className="text-xs bg-black/5 dark:bg-white/5 p-2 rounded overflow-x-auto">
                                  {log.stackTrace}
                                </pre>
                              </div>
                            )}

                            {log.functionName && (
                              <div className="text-xs text-muted-foreground">
                                {log.functionName} ({log.fileName}:{log.lineNumber})
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
