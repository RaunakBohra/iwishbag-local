/**
 * Auto-Save Service
 * Handles automatic saving of scraped data and field updates to database
 * with debouncing to prevent excessive API calls
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PendingSave {
  quoteId: string;
  items: any[];
  timestamp: number;
  retryCount: number;
}

interface SaveOptions {
  debounceMs?: number;
  maxRetries?: number;
  showToast?: boolean;
  description?: string;
}

class AutoSaveService {
  private pendingSaves = new Map<string, PendingSave>();
  private saveTimeouts = new Map<string, NodeJS.Timeout>();
  private readonly DEFAULT_DEBOUNCE = 2000; // 2 seconds
  private readonly MAX_RETRIES = 3;

  /**
   * Auto-save quote items with debouncing
   * Delays save to batch multiple rapid changes together
   */
  async autoSaveQuoteItems(
    quoteId: string, 
    items: any[], 
    options: SaveOptions = {}
  ): Promise<void> {
    const {
      debounceMs = this.DEFAULT_DEBOUNCE,
      maxRetries = this.MAX_RETRIES,
      showToast = false,
      description = 'quote data'
    } = options;

    // Clear existing timeout for this quote
    const existingTimeout = this.saveTimeouts.get(quoteId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Store pending save
    this.pendingSaves.set(quoteId, {
      quoteId,
      items,
      timestamp: Date.now(),
      retryCount: 0
    });

    // Set new debounced timeout
    const timeout = setTimeout(async () => {
      await this.executeSave(quoteId, maxRetries, showToast, description);
    }, debounceMs);

    this.saveTimeouts.set(quoteId, timeout);

    console.log(`📝 Auto-save queued for quote ${quoteId} (${debounceMs}ms delay)`);
  }

  /**
   * Immediately save quote items without debouncing
   * Used for critical saves like after scraping completion
   */
  async immediatelyAutoSaveQuoteItems(
    quoteId: string, 
    items: any[], 
    options: SaveOptions = {}
  ): Promise<boolean> {
    const {
      maxRetries = this.MAX_RETRIES,
      showToast = true,
      description = 'scraped product data'
    } = options;

    console.log(`💾 Immediate auto-save for quote ${quoteId}`);

    try {
      const success = await this.saveQuoteItemsToDatabase(quoteId, items);
      
      if (success) {
        if (showToast) {
          toast({
            title: "✅ Data Saved",
            description: `Successfully saved ${description} to database`,
            duration: 3000
          });
        }
        console.log(`✅ Immediate save successful for quote ${quoteId}`);
        return true;
      } else {
        throw new Error('Database save failed');
      }
    } catch (error) {
      console.error(`❌ Immediate save failed for quote ${quoteId}:`, error);
      
      if (showToast) {
        toast({
          title: "⚠️ Save Failed",
          description: `Failed to save ${description}. Changes may be lost.`,
          variant: "destructive",
          duration: 5000
        });
      }
      
      return false;
    }
  }

  /**
   * Execute the actual save operation with retry logic
   */
  private async executeSave(
    quoteId: string, 
    maxRetries: number, 
    showToast: boolean, 
    description: string
  ): Promise<void> {
    const pendingSave = this.pendingSaves.get(quoteId);
    if (!pendingSave) {
      console.warn(`No pending save found for quote ${quoteId}`);
      return;
    }

    try {
      const success = await this.saveQuoteItemsToDatabase(pendingSave.quoteId, pendingSave.items);
      
      if (success) {
        // Save successful - clean up
        this.pendingSaves.delete(quoteId);
        this.saveTimeouts.delete(quoteId);
        
        if (showToast) {
          toast({
            title: "💾 Auto-Saved",
            description: `Automatically saved ${description}`,
            duration: 2000
          });
        }
        
        console.log(`✅ Auto-save completed for quote ${quoteId}`);
      } else {
        throw new Error('Database save operation failed');
      }
      
    } catch (error) {
      console.error(`❌ Auto-save failed for quote ${quoteId}:`, error);
      
      // Retry logic
      pendingSave.retryCount++;
      
      if (pendingSave.retryCount < maxRetries) {
        console.log(`🔄 Retrying auto-save for quote ${quoteId} (attempt ${pendingSave.retryCount + 1}/${maxRetries})`);
        
        // Exponential backoff for retries
        const retryDelay = Math.min(1000 * Math.pow(2, pendingSave.retryCount), 10000);
        
        const retryTimeout = setTimeout(() => {
          this.executeSave(quoteId, maxRetries, showToast, description);
        }, retryDelay);
        
        this.saveTimeouts.set(quoteId, retryTimeout);
        
      } else {
        // Max retries exceeded
        console.error(`❌ Auto-save failed permanently for quote ${quoteId} after ${maxRetries} attempts`);
        
        this.pendingSaves.delete(quoteId);
        this.saveTimeouts.delete(quoteId);
        
        if (showToast) {
          toast({
            title: "❌ Auto-Save Failed",
            description: `Unable to save ${description} after multiple attempts. Please save manually.`,
            variant: "destructive",
            duration: 7000
          });
        }
      }
    }
  }

  /**
   * Save quote items to database
   */
  private async saveQuoteItemsToDatabase(quoteId: string, items: any[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('quotes_v2')
        .update({
          items: items,
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      if (error) {
        console.error('Database save error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Database save exception:', error);
      return false;
    }
  }

  /**
   * Force save all pending saves immediately
   * Useful before page unload
   */
  async flushAllPendingSaves(): Promise<void> {
    console.log(`🚀 Flushing ${this.pendingSaves.size} pending saves`);
    
    const savePromises = Array.from(this.pendingSaves.entries()).map(([quoteId, pendingSave]) => {
      // Clear timeout to prevent double execution
      const timeout = this.saveTimeouts.get(quoteId);
      if (timeout) {
        clearTimeout(timeout);
        this.saveTimeouts.delete(quoteId);
      }
      
      return this.saveQuoteItemsToDatabase(pendingSave.quoteId, pendingSave.items);
    });

    try {
      await Promise.all(savePromises);
      console.log('✅ All pending saves flushed successfully');
    } catch (error) {
      console.error('❌ Some pending saves failed during flush:', error);
    } finally {
      // Clean up
      this.pendingSaves.clear();
      this.saveTimeouts.clear();
    }
  }

  /**
   * Get statistics about pending saves
   */
  getPendingSaveStats(): { count: number; oldestTimestamp: number | null } {
    const count = this.pendingSaves.size;
    let oldestTimestamp: number | null = null;
    
    for (const pendingSave of this.pendingSaves.values()) {
      if (oldestTimestamp === null || pendingSave.timestamp < oldestTimestamp) {
        oldestTimestamp = pendingSave.timestamp;
      }
    }
    
    return { count, oldestTimestamp };
  }

  /**
   * Cancel pending save for a specific quote
   */
  cancelPendingSave(quoteId: string): boolean {
    const timeout = this.saveTimeouts.get(quoteId);
    if (timeout) {
      clearTimeout(timeout);
      this.saveTimeouts.delete(quoteId);
      this.pendingSaves.delete(quoteId);
      console.log(`🚫 Cancelled pending save for quote ${quoteId}`);
      return true;
    }
    return false;
  }

  /**
   * Check if quote has pending saves
   */
  hasPendingSaves(quoteId: string): boolean {
    return this.pendingSaves.has(quoteId);
  }
}

// Export singleton instance
export const autoSaveService = new AutoSaveService();

// Auto-flush on page unload to prevent data loss
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    autoSaveService.flushAllPendingSaves();
  });
  
  // Expose for debugging/testing (development only)
  if (import.meta.env.DEV) {
    (window as any).autoSaveService = autoSaveService;
    console.log('🔧 AutoSaveService exposed on window for testing');
  }
}