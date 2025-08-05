/**
 * useBatchProcessing Hook
 * React hook for managing batch quote processing state and operations
 */

import { useState, useCallback, useRef } from 'react';
import { 
  batchQuoteProcessingService,
  BatchProcessingProgress,
  BatchProcessingResult,
  BatchProcessingOptions
} from '@/services/BatchQuoteProcessingService';
import { useToast } from '@/hooks/use-toast';

interface UseBatchProcessingResult {
  // State
  isProcessing: boolean;
  progress: BatchProcessingProgress | null;
  results: BatchProcessingResult[];
  error: string | null;
  
  // Actions
  startProcessing: (options?: Partial<BatchProcessingOptions>) => Promise<void>;
  cancelProcessing: () => void;
  clearResults: () => void;
  
  // Computed values
  isComplete: boolean;
  hasErrors: boolean;
  successRate: number;
  totalProcessingTime: number;
}

export const useBatchProcessing = (): UseBatchProcessingResult => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProcessingProgress | null>(null);
  const [results, setResults] = useState<BatchProcessingResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const processingStartTime = useRef<number>(0);

  /**
   * Start batch processing with optional configuration
   */
  const startProcessing = useCallback(async (options: Partial<BatchProcessingOptions> = {}) => {
    if (isProcessing) {
      toast({
        title: "Processing In Progress",
        description: "Batch processing is already running. Please wait for it to complete.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResults([]);
    setProgress(null);
    processingStartTime.current = Date.now();

    console.log('🚀 Starting batch processing...');

    try {
      const processingOptions: BatchProcessingOptions = {
        concurrency: 50, // High concurrency by default
        retryAttempts: 2,
        retryDelay: 1000,
        ...options,
        
        // Progress callback
        onProgress: (progressData) => {
          setProgress(progressData);
          
          // Show periodic progress toasts for long-running operations
          if (progressData.processedQuotes > 0 && progressData.processedQuotes % 25 === 0) {
            toast({
              title: "Processing Update",
              description: `Processed ${progressData.processedQuotes}/${progressData.totalQuotes} quotes (${progressData.successfulQuotes} successful)`,
            });
          }
        },
        
        // Individual quote completion callback
        onQuoteComplete: (result) => {
          setResults(prev => [...prev, result]);
          
          // Log significant milestones
          if (result.itemsSuccessful > 0) {
            console.log(`✅ Quote ${result.quoteId}: ${result.itemsSuccessful}/${result.itemsProcessed} items successful`);
          }
        },
        
        // Error callback
        onError: (errorMessage) => {
          console.error('❌ Batch processing error:', errorMessage);
          setError(errorMessage);
          toast({
            title: "Processing Error",
            description: errorMessage,
            variant: "destructive"
          });
        }
      };

      const finalResults = await batchQuoteProcessingService.processBatchQuotes(processingOptions);
      
      // Final completion toast
      const successfulQuotes = finalResults.filter(r => r.success).length;
      const totalQuotes = finalResults.length;
      const processingTime = (Date.now() - processingStartTime.current) / 1000;

      if (successfulQuotes === totalQuotes) {
        toast({
          title: "Batch Processing Complete! 🎉",
          description: `Successfully processed all ${totalQuotes} quotes in ${Math.round(processingTime)}s`,
        });
      } else if (successfulQuotes > 0) {
        toast({
          title: "Batch Processing Complete",
          description: `Processed ${successfulQuotes}/${totalQuotes} quotes successfully in ${Math.round(processingTime)}s`,
          variant: "default"
        });
      } else {
        toast({
          title: "Batch Processing Failed",
          description: `Unable to process any quotes. Check the results for details.`,
          variant: "destructive"
        });
      }

      console.log(`🏁 Batch processing completed: ${successfulQuotes}/${totalQuotes} quotes successful in ${processingTime.toFixed(1)}s`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Batch processing failed:', err);
      setError(errorMessage);
      
      toast({
        title: "Batch Processing Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, toast]);

  /**
   * Cancel ongoing batch processing
   */
  const cancelProcessing = useCallback(() => {
    if (!isProcessing) return;

    console.log('🛑 Cancelling batch processing...');
    batchQuoteProcessingService.cancelProcessing();
    
    toast({
      title: "Processing Cancelled",
      description: "Batch processing has been cancelled. Some quotes may have been partially processed.",
      variant: "default"
    });
  }, [isProcessing, toast]);

  /**
   * Clear all results and reset state
   */
  const clearResults = useCallback(() => {
    setResults([]);
    setProgress(null);
    setError(null);
    console.log('🧹 Cleared batch processing results');
  }, []);

  // Computed values
  const isComplete = Boolean(
    progress && 
    progress.totalQuotes > 0 && 
    progress.processedQuotes === progress.totalQuotes && 
    !isProcessing
  );

  const hasErrors = results.some(result => !result.success) || Boolean(error);

  const successRate = results.length > 0 
    ? (results.filter(r => r.success).length / results.length) * 100 
    : 0;

  const totalProcessingTime = progress ? progress.timeElapsed : 0;

  return {
    // State
    isProcessing,
    progress,
    results,
    error,
    
    // Actions
    startProcessing,
    cancelProcessing,
    clearResults,
    
    // Computed values
    isComplete,
    hasErrors,
    successRate,
    totalProcessingTime
  };
};

/**
 * Hook variant with simplified interface for basic use cases
 */
export const useSimpleBatchProcessing = () => {
  const batchProcessing = useBatchProcessing();
  
  const processingStatus = batchProcessing.isProcessing 
    ? 'processing' 
    : batchProcessing.isComplete 
    ? 'complete' 
    : 'idle';

  const summary = batchProcessing.progress 
    ? `${batchProcessing.progress.processedQuotes}/${batchProcessing.progress.totalQuotes} processed (${batchProcessing.progress.successfulQuotes} successful)`
    : batchProcessing.results.length > 0
    ? `${batchProcessing.results.filter(r => r.success).length}/${batchProcessing.results.length} successful`
    : 'Ready to process';

  return {
    ...batchProcessing,
    processingStatus,
    summary
  };
};