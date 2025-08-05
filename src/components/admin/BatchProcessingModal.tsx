/**
 * Batch Processing Modal
 * Real-time progress tracking for batch quote processing operations
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Pause, 
  X, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { BatchProcessingProgress, BatchProcessingResult } from '@/services/BatchQuoteProcessingService';

interface BatchProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isProcessing: boolean;
  progress: BatchProcessingProgress | null;
  results: BatchProcessingResult[];
  onStart: () => void;
  onCancel: () => void;
  canStart: boolean;
}

export const BatchProcessingModal: React.FC<BatchProcessingModalProps> = ({
  isOpen,
  onClose,
  isProcessing,
  progress,
  results,
  onStart,
  onCancel,
  canStart
}) => {
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatSpeed = (quotesPerMinute: number): string => {
    if (quotesPerMinute < 1) return `${(quotesPerMinute * 60).toFixed(1)}/min`;
    return `${quotesPerMinute.toFixed(1)}/min`;
  };

  const getProgressPercentage = (): number => {
    if (!progress || progress.totalQuotes === 0) return 0;
    return (progress.processedQuotes / progress.totalQuotes) * 100;
  };

  const getSuccessRate = (): number => {
    if (!progress || progress.processedQuotes === 0) return 0;
    return (progress.successfulQuotes / progress.processedQuotes) * 100;
  };

  const isComplete = progress && progress.processedQuotes === progress.totalQuotes;
  const hasErrors = results.some(r => !r.success);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            Batch Quote Processing
          </DialogTitle>
          <DialogDescription>
            {isProcessing 
              ? "Processing all draft and pending quotes..." 
              : isComplete
              ? "Batch processing completed"
              : "Process all draft and pending quotes with product URL scraping"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Overview */}
          {progress && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  Progress Overview
                  {isProcessing && (
                    <Badge variant="secondary" className="animate-pulse">
                      <Clock className="w-3 h-3 mr-1" />
                      Processing...
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Main Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Progress</span>
                    <span>{progress.processedQuotes} / {progress.totalQuotes} quotes</span>
                  </div>
                  <Progress value={getProgressPercentage()} className="h-3" />
                  <div className="text-xs text-muted-foreground text-center">
                    {getProgressPercentage().toFixed(1)}% complete
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {progress.successfulQuotes}
                    </div>
                    <div className="text-xs text-green-700">Successful</div>
                  </div>
                  
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {progress.failedQuotes}
                    </div>
                    <div className="text-xs text-red-700">Failed</div>
                  </div>
                  
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatSpeed(progress.processingSpeed)}
                    </div>
                    <div className="text-xs text-blue-700">Processing Speed</div>
                  </div>
                  
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {formatTime(progress.estimatedTimeRemaining)}
                    </div>
                    <div className="text-xs text-purple-700">Time Remaining</div>
                  </div>
                </div>

                {/* Success Rate */}
                {progress.processedQuotes > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Success Rate</span>
                      <span>{getSuccessRate().toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={getSuccessRate()} 
                      className="h-2"
                    />
                  </div>
                )}

                {/* Current Processing */}
                {isProcessing && progress.currentQuoteId && (
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <div className="text-sm font-medium text-yellow-800">
                      Currently Processing
                    </div>
                    <div className="text-xs text-yellow-700">
                      Quote ID: {progress.currentQuoteId}
                    </div>
                  </div>
                )}

                {/* Time Stats */}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Elapsed: {formatTime(progress.timeElapsed)}</span>
                  {isProcessing && (
                    <span>ETA: {formatTime(progress.estimatedTimeRemaining)}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Summary */}
          {results.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Processing Results
                  {hasErrors && (
                    <Badge variant="destructive" className="ml-2">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Issues Found
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {results.map((result) => (
                      <div 
                        key={result.quoteId}
                        className={`p-3 rounded-lg border ${
                          result.success 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {result.success ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className="font-medium text-sm">
                              Quote {result.quoteId.slice(-8)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatTime(result.processingTime / 1000)}
                          </div>
                        </div>
                        
                        <div className="mt-2 text-xs">
                          <span className="text-green-600">
                            {result.itemsSuccessful} successful
                          </span>
                          {result.itemsFailed > 0 && (
                            <>
                              <span className="mx-2">•</span>
                              <span className="text-red-600">
                                {result.itemsFailed} failed
                              </span>
                            </>
                          )}
                          <span className="mx-2">•</span>
                          <span className="text-muted-foreground">
                            {result.itemsProcessed} total items
                          </span>
                        </div>

                        {result.errors && result.errors.length > 0 && (
                          <div className="mt-2 p-2 bg-red-100 rounded text-xs">
                            <div className="font-medium text-red-800 mb-1">Errors:</div>
                            {result.errors.map((error, index) => (
                              <div key={index} className="text-red-700">
                                • {error}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {!progress 
                ? "Ready to process all draft and pending quotes"
                : isComplete
                ? `Completed processing ${progress.totalQuotes} quotes in ${formatTime(progress.timeElapsed)}`
                : `Processing ${progress.totalQuotes} quotes...`
              }
            </div>

            <div className="flex gap-2">
              {!isProcessing && !isComplete && (
                <Button 
                  onClick={onStart}
                  disabled={!canStart}
                  className="flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Start Processing
                </Button>
              )}

              {isProcessing && (
                <Button 
                  onClick={onCancel}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <Pause className="w-4 h-4" />
                  Cancel
                </Button>
              )}

              <Button 
                onClick={onClose}
                variant={isProcessing ? "outline" : "default"}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                {isProcessing ? "Minimize" : "Close"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};