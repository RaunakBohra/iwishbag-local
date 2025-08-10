/**
 * Product Scraping Engine
 * Core orchestration for product scraping jobs and status tracking
 * Decomposed from BrightDataProductService for better separation of concerns
 */

import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/react';
import { FetchResult, ProductData } from '../ProductDataFetchService';
import { PlatformDetectionService, SupportedPlatform } from './PlatformDetectionService';

export interface ScrapeJob {
  id: string;
  url: string;
  platform: SupportedPlatform;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  options: ScrapeOptions;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: FetchResult;
  error?: string;
  retryCount: number;
  maxRetries: number;
  progress: {
    stage: string;
    percentage: number;
    message: string;
  };
}

export interface ScrapeOptions {
  includeReviews?: boolean;
  includeImages?: boolean;
  includeVariants?: boolean;
  enhanceWithAI?: boolean;
  deliveryCountry?: string;
  priority?: 'low' | 'normal' | 'high';
  timeout?: number;
}

export interface JobMetrics {
  totalJobs: number;
  queuedJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  successRate: number;
}

export interface PlatformStats {
  platform: SupportedPlatform;
  totalJobs: number;
  successCount: number;
  failureCount: number;
  averageTime: number;
  estimatedTime: string;
  pollingInterval: string;
}

export class ProductScrapingEngine {
  private jobs = new Map<string, ScrapeJob>();
  private runningJobs = new Set<string>();
  private jobQueue: string[] = [];
  private maxConcurrentJobs = 3;
  private platformDetection: PlatformDetectionService;
  
  // Performance tracking
  private performanceMetrics = new Map<SupportedPlatform, {
    totalJobs: number;
    successCount: number;
    failureCount: number;
    totalProcessingTime: number;
  }>();

  constructor() {
    this.platformDetection = new PlatformDetectionService();
    logger.info('ProductScrapingEngine initialized');
  }

  /**
   * Create and queue a scraping job
   */
  async createJob(url: string, options: ScrapeOptions = {}): Promise<string> {
    try {
      const detection = this.platformDetection.detectPlatform(url);
      
      if (!detection.platform) {
        throw new Error('Unsupported platform detected');
      }

      const jobId = this.generateJobId();
      const job: ScrapeJob = {
        id: jobId,
        url,
        platform: detection.platform,
        status: 'queued',
        options: {
          priority: 'normal',
          timeout: 300000, // 5 minutes default
          ...options,
        },
        createdAt: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        progress: {
          stage: 'Queued',
          percentage: 0,
          message: 'Job queued for processing',
        },
      };

      this.jobs.set(jobId, job);
      this.queueJob(jobId);

      logger.info(`Scraping job created: ${jobId} for ${detection.platform}`);
      return jobId;

    } catch (error) {
      logger.error('Job creation failed:', error);
      Sentry.captureException(error);
      throw error;
    }
  }

  /**
   * Get job status and result
   */
  getJob(jobId: string): ScrapeJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs with optional filtering
   */
  getJobs(filters?: {
    status?: ScrapeJob['status'];
    platform?: SupportedPlatform;
    limit?: number;
  }): ScrapeJob[] {
    let jobs = Array.from(this.jobs.values());

    if (filters?.status) {
      jobs = jobs.filter(job => job.status === filters.status);
    }

    if (filters?.platform) {
      jobs = jobs.filter(job => job.platform === filters.platform);
    }

    if (filters?.limit) {
      jobs = jobs.slice(-filters.limit);
    }

    return jobs.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.status === 'queued') {
      job.status = 'cancelled';
      job.completedAt = Date.now();
      this.removeFromQueue(jobId);
      return true;
    }

    if (job.status === 'running') {
      job.status = 'cancelled';
      job.completedAt = Date.now();
      this.runningJobs.delete(jobId);
      return true;
    }

    return false;
  }

  /**
   * Get current job metrics
   */
  getMetrics(): JobMetrics {
    const jobs = Array.from(this.jobs.values());
    const completedJobs = jobs.filter(j => j.status === 'completed');
    const processingTimes = completedJobs
      .filter(j => j.startedAt && j.completedAt)
      .map(j => j.completedAt! - j.startedAt!);

    return {
      totalJobs: jobs.length,
      queuedJobs: jobs.filter(j => j.status === 'queued').length,
      runningJobs: jobs.filter(j => j.status === 'running').length,
      completedJobs: completedJobs.length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      averageProcessingTime: processingTimes.length > 0 
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length 
        : 0,
      successRate: jobs.length > 0 
        ? (completedJobs.length / jobs.filter(j => j.status !== 'queued').length) * 100 
        : 0,
    };
  }

  /**
   * Get platform-specific statistics
   */
  getPlatformStats(): PlatformStats[] {
    const stats: PlatformStats[] = [];
    
    for (const [platform, metrics] of this.performanceMetrics.entries()) {
      const platformInfo = this.platformDetection.getPlatformInfo(platform);
      const timing = this.platformDetection.getPlatformTiming(platform);
      
      stats.push({
        platform,
        totalJobs: metrics.totalJobs,
        successCount: metrics.successCount,
        failureCount: metrics.failureCount,
        averageTime: metrics.totalJobs > 0 
          ? metrics.totalProcessingTime / metrics.totalJobs 
          : 0,
        estimatedTime: timing.estimatedTime,
        pollingInterval: timing.pollingInterval,
      });
    }

    return stats.sort((a, b) => b.totalJobs - a.totalJobs);
  }

  /**
   * Process the job queue
   */
  async processQueue(): Promise<void> {
    while (this.runningJobs.size < this.maxConcurrentJobs && this.jobQueue.length > 0) {
      const jobId = this.jobQueue.shift();
      if (jobId && this.jobs.has(jobId)) {
        await this.processJob(jobId);
      }
    }
  }

  /**
   * Get user-friendly status message for a job
   */
  getStatusMessage(jobId: string): string {
    const job = this.jobs.get(jobId);
    if (!job) return 'Job not found';

    const platformName = this.platformDetection.getPlatformInfo(job.platform).displayName;
    
    switch (job.status) {
      case 'queued':
        return `Queued for ${platformName} data collection...`;
      case 'running':
        return `${job.progress.message} (${job.progress.percentage}%)`;
      case 'completed':
        return `Successfully collected ${platformName} product data!`;
      case 'failed':
        return `Failed to collect ${platformName} data: ${job.error}`;
      case 'cancelled':
        return 'Job was cancelled';
      default:
        return `Processing ${platformName} product data...`;
    }
  }

  /**
   * Clean up old completed jobs to prevent memory leaks
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    let cleanedCount = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if ((job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') 
          && job.createdAt < cutoff) {
        this.jobs.delete(jobId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} old scraping jobs`);
    }
  }

  /**
   * Private helper methods
   */
  private generateJobId(): string {
    return `scrape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private queueJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    // Priority queue insertion
    if (job.options.priority === 'high') {
      this.jobQueue.unshift(jobId);
    } else {
      this.jobQueue.push(jobId);
    }

    // Auto-start processing
    setTimeout(() => this.processQueue(), 100);
  }

  private removeFromQueue(jobId: string): void {
    const index = this.jobQueue.indexOf(jobId);
    if (index > -1) {
      this.jobQueue.splice(index, 1);
    }
  }

  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'queued') return;

    try {
      // Mark as running
      job.status = 'running';
      job.startedAt = Date.now();
      this.runningJobs.add(jobId);
      
      // Update progress
      this.updateJobProgress(jobId, 'Initializing scraper', 10);

      // Get platform-specific configuration
      const platformInfo = this.platformDetection.getPlatformInfo(job.platform);
      
      // Validate URL before scraping
      const validation = this.platformDetection.validateProductURL(job.url);
      if (!validation.isValid) {
        throw new Error(`Invalid product URL: ${validation.warnings.join(', ')}`);
      }

      this.updateJobProgress(jobId, `Starting ${platformInfo.displayName} data collection`, 25);

      // This is where the actual scraping would happen
      // For now, we'll simulate the process
      const result = await this.performScraping(job);
      
      // Mark as completed
      job.status = 'completed';
      job.completedAt = Date.now();
      job.result = result;
      job.progress = {
        stage: 'Completed',
        percentage: 100,
        message: `Successfully collected ${platformInfo.displayName} product data`,
      };

      // Update metrics
      this.updateMetrics(job.platform, true, job.completedAt - job.startedAt!);

      logger.info(`Scraping job completed: ${jobId}`);

    } catch (error) {
      // Handle failure
      job.status = 'failed';
      job.completedAt = Date.now();
      job.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Update metrics
      this.updateMetrics(job.platform, false, 0);

      // Retry logic
      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        job.status = 'queued';
        delete job.completedAt;
        delete job.error;
        this.queueJob(jobId);
        logger.info(`Retrying job ${jobId} (attempt ${job.retryCount})`);
      } else {
        logger.error(`Scraping job failed permanently: ${jobId}`, error);
        Sentry.captureException(error, { extra: { jobId, url: job.url } });
      }

    } finally {
      this.runningJobs.delete(jobId);
      // Continue processing queue
      setTimeout(() => this.processQueue(), 100);
    }
  }

  private updateJobProgress(jobId: string, message: string, percentage: number): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = {
        stage: job.progress.stage,
        percentage: Math.min(percentage, 100),
        message,
      };
    }
  }

  private async performScraping(job: ScrapeJob): Promise<FetchResult> {
    this.updateJobProgress(job.id, 'Calling scraping service', 50);
    
    try {
      // Import MCPBrightDataBridge for actual scraping
      const { mcpBrightDataBridge } = await import('../MCPBrightDataBridge');
      
      let result;
      
      // Handle different platforms
      switch (job.platform) {
        case 'aliexpress':
          result = await mcpBrightDataBridge.scrapeAliExpressProduct(job.url);
          break;
        case 'amazon':
          result = await mcpBrightDataBridge.scrapeAmazonProduct(job.url);
          break;
        case 'flipkart':
          result = await mcpBrightDataBridge.scrapeFlipkartProduct(job.url);
          break;
        case 'myntra':
          result = await mcpBrightDataBridge.scrapeMyntraProduct(job.url);
          break;
        case 'ebay':
          result = await mcpBrightDataBridge.scrapeEbayProduct(job.url);
          break;
        case 'walmart':
          result = await mcpBrightDataBridge.scrapeWalmartProduct(job.url);
          break;
        case 'bestbuy':
          result = await mcpBrightDataBridge.scrapeBestBuyProduct(job.url);
          break;
        case 'target':
          result = await mcpBrightDataBridge.scrapeTargetProduct(job.url);
          break;
        case 'etsy':
          result = await mcpBrightDataBridge.scrapeEtsyProduct(job.url);
          break;
        case 'hm':
          result = await mcpBrightDataBridge.scrapeHMProduct(job.url);
          break;
        case 'asos':
          result = await mcpBrightDataBridge.scrapeASOSProduct(job.url);
          break;
        case 'zara':
          result = await mcpBrightDataBridge.scrapeZaraProduct(job.url);
          break;
        default:
          throw new Error(`Unsupported platform: ${job.platform}`);
      }
      
      this.updateJobProgress(job.id, 'Processing scraped data', 75);
      
      if (result.success && result.data) {
        // Normalize the data from MCP response to ProductData format
        const { DataNormalizationService } = await import('./DataNormalizationService');
        const normalizer = new (DataNormalizationService as any)();
        const normalizedData = normalizer.normalizeFromPlatform(result.data, job.platform);
        
        return {
          success: true,
          data: normalizedData,
          source: 'scraper' as const,
        };
      } else {
        throw new Error(result.error || 'Scraping failed');
      }
      
    } catch (error) {
      logger.error('Scraping failed', { 
        jobId: job.id, 
        platform: job.platform, 
        url: job.url, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scraping failed',
        source: 'scraper' as const,
      };
    }
  }

  private updateMetrics(platform: SupportedPlatform, success: boolean, processingTime: number): void {
    if (!this.performanceMetrics.has(platform)) {
      this.performanceMetrics.set(platform, {
        totalJobs: 0,
        successCount: 0,
        failureCount: 0,
        totalProcessingTime: 0,
      });
    }

    const metrics = this.performanceMetrics.get(platform)!;
    metrics.totalJobs++;
    
    if (success) {
      metrics.successCount++;
      metrics.totalProcessingTime += processingTime;
    } else {
      metrics.failureCount++;
    }
  }

  /**
   * Direct scraping method for simple use cases
   * Creates a job and waits for completion
   */
  async scrapeProduct(url: string, options: ScrapeOptions = {}): Promise<FetchResult> {
    try {
      logger.info('Starting direct product scraping', { url });

      // Create and start the job
      const jobId = await this.createJob(url, { ...options, priority: 'high' });
      
      // Poll for completion
      let job = this.getJob(jobId);
      const startTime = Date.now();
      const timeout = options.timeout || 300000; // 5 minutes default
      
      while (job && job.status === 'queued' || job?.status === 'running') {
        // Check timeout
        if (Date.now() - startTime > timeout) {
          this.cancelJob(jobId);
          throw new Error(`Scraping timeout after ${timeout}ms`);
        }
        
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, 2000));
        job = this.getJob(jobId);
      }
      
      if (!job) {
        throw new Error('Job disappeared during processing');
      }
      
      if (job.status === 'failed') {
        throw new Error(job.error || 'Scraping failed');
      }
      
      if (job.status === 'cancelled') {
        throw new Error('Scraping was cancelled');
      }
      
      if (job.status === 'completed' && job.result) {
        logger.info('Direct scraping completed successfully', { 
          url, 
          jobId, 
          processingTime: Date.now() - startTime 
        });
        return job.result;
      }
      
      throw new Error('Unexpected job state: ' + job.status);
      
    } catch (error) {
      logger.error('Direct scraping failed', { url, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Cancel all running jobs
    for (const jobId of this.runningJobs) {
      this.cancelJob(jobId);
    }

    // Clear all data structures
    this.jobs.clear();
    this.runningJobs.clear();
    this.jobQueue.length = 0;
    this.performanceMetrics.clear();

    logger.info('ProductScrapingEngine disposed');
  }
}

// Export singleton instance for easy use
export const productScrapingEngine = new ProductScrapingEngine();

export default ProductScrapingEngine;