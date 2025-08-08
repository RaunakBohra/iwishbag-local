import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/types/database';

type SellerOrderAutomation = Database['public']['Tables']['seller_order_automation']['Row'];
type SellerOrderAutomationInsert = Database['public']['Tables']['seller_order_automation']['Insert'];

interface BrightdataSession {
  session_id: string;
  browser_type: 'chrome' | 'firefox';
  proxy_location: string;
  session_status: 'initializing' | 'ready' | 'busy' | 'error' | 'terminated';
}

interface OrderPlacementRequest {
  order_item_id: string;
  seller_platform: 'amazon' | 'flipkart' | 'ebay' | 'b&h' | 'other';
  product_url: string;
  quantity: number;
  price_limit?: number;
  seller_account_credentials?: {
    username: string;
    password: string;
    account_type: 'personal' | 'business';
  };
  delivery_address: {
    name: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    phone?: string;
  };
  payment_method: {
    type: 'card' | 'cod' | 'wallet';
    card_details?: {
      number: string;
      expiry: string;
      cvv: string;
      name: string;
    };
  };
}

interface AutomationResult {
  success: boolean;
  session_id?: string;
  seller_order_id?: string;
  seller_tracking_id?: string;
  order_confirmation?: any;
  price_scraped?: number;
  availability_status?: 'in_stock' | 'out_of_stock' | 'limited_stock' | 'unknown';
  estimated_delivery?: string;
  screenshots?: string[];
  error_message?: string;
  retry_recommended?: boolean;
  manual_review_required?: boolean;
  scraped_data?: any;
}

interface EmailScrapingConfig {
  email_account: string;
  email_password: string;
  imap_server: string;
  search_criteria: {
    from_addresses: string[];
    subject_keywords: string[];
    date_range_days: number;
  };
}

class BrightdataAutomationService {
  private static instance: BrightdataAutomationService;
  private brightdataApiKey: string;
  private brightdataEndpoint: string;
  private activeSessions: Map<string, BrightdataSession> = new Map();

  constructor() {
    this.brightdataApiKey = process.env.BRIGHTDATA_API_KEY || '';
    this.brightdataEndpoint = process.env.BRIGHTDATA_ENDPOINT || 'https://proxy-server.brightdata.com';
    
    if (!this.brightdataApiKey) {
      console.warn('Brightdata API key not configured - automation will be disabled');
    }
  }

  public static getInstance(): BrightdataAutomationService {
    if (!BrightdataAutomationService.instance) {
      BrightdataAutomationService.instance = new BrightdataAutomationService();
    }
    return BrightdataAutomationService.instance;
  }

  /**
   * Process order placement automation for an order item
   */
  async processOrderPlacement(orderItemId: string): Promise<AutomationResult> {
    try {
      console.log(`Starting order placement automation for item ${orderItemId}`);

      // 1. Get order item details and create automation record
      const automationRecord = await this.createAutomationRecord(orderItemId, 'order_placement');
      if (!automationRecord) {
        return { success: false, error_message: 'Failed to create automation record' };
      }

      // 2. Get order placement request data
      const requestData = await this.buildOrderPlacementRequest(orderItemId);
      if (!requestData) {
        await this.updateAutomationStatus(automationRecord.id, 'failed', 'Failed to build request data');
        return { success: false, error_message: 'Failed to build order placement request' };
      }

      // 3. Initialize Brightdata session
      const session = await this.initializeBrightdataSession(requestData.seller_platform);
      if (!session) {
        await this.updateAutomationStatus(automationRecord.id, 'failed', 'Failed to initialize browser session');
        return { success: false, error_message: 'Failed to initialize automation session' };
      }

      // 4. Execute order placement automation
      const result = await this.executeOrderPlacementAutomation(session, requestData, automationRecord);
      
      // 5. Update automation record with results
      await this.finalizeAutomationRecord(automationRecord.id, result);
      
      // 6. Update order item with results
      if (result.success) {
        await this.updateOrderItemWithResults(orderItemId, result);
      }

      // 7. Cleanup session
      await this.terminateBrightdataSession(session.session_id);

      return result;
    } catch (error) {
      console.error(`Error in order placement automation for item ${orderItemId}:`, error);
      return {
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown automation error',
      };
    }
  }

  /**
   * Create automation tracking record
   */
  private async createAutomationRecord(
    orderItemId: string, 
    automationType: 'order_placement' | 'tracking_scrape' | 'status_check'
  ): Promise<SellerOrderAutomation | null> {
    try {
      // Get order item details for platform info
      const { data: orderItem, error: itemError } = await supabase
        .from('order_items')
        .select('seller_platform, seller_account_type')
        .eq('id', orderItemId)
        .single();

      if (itemError || !orderItem) {
        console.error('Error fetching order item for automation:', itemError);
        return null;
      }

      const automationInsert: SellerOrderAutomationInsert = {
        order_item_id: orderItemId,
        automation_type: automationType,
        automation_status: 'queued',
        seller_platform: orderItem.seller_platform,
        seller_account_type: orderItem.seller_account_type,
        automation_config: {
          retry_on_failure: true,
          screenshot_on_error: true,
          max_execution_time_minutes: 15,
        },
        retry_count: 0,
        max_retries: 3,
        retry_delay_minutes: 30,
      };

      const { data: automation, error: automationError } = await supabase
        .from('seller_order_automation')
        .insert(automationInsert)
        .select('*')
        .single();

      if (automationError) {
        console.error('Error creating automation record:', automationError);
        return null;
      }

      return automation;
    } catch (error) {
      console.error('Error in createAutomationRecord:', error);
      return null;
    }
  }

  /**
   * Build order placement request from order item
   */
  private async buildOrderPlacementRequest(orderItemId: string): Promise<OrderPlacementRequest | null> {
    try {
      const { data: orderItem, error: itemError } = await supabase
        .from('order_items')
        .select(`
          *,
          orders!inner (
            id,
            delivery_address,
            customer_id,
            profiles!customer_id (
              full_name,
              phone
            )
          )
        `)
        .eq('id', orderItemId)
        .single();

      if (itemError || !orderItem) {
        console.error('Error fetching order item for request building:', itemError);
        return null;
      }

      const order = orderItem.orders;
      const customer = order.profiles;

      // Get seller account credentials (securely stored)
      const sellerAccount = await this.getSellerAccountCredentials(
        orderItem.seller_platform,
        orderItem.seller_account_type || 'personal'
      );

      if (!sellerAccount) {
        console.error(`No seller account credentials found for ${orderItem.seller_platform}`);
        return null;
      }

      // Parse delivery address
      const deliveryAddress = typeof order.delivery_address === 'object' && order.delivery_address 
        ? order.delivery_address as any
        : null;

      if (!deliveryAddress) {
        console.error('No delivery address found for order');
        return null;
      }

      return {
        order_item_id: orderItemId,
        seller_platform: orderItem.seller_platform as any,
        product_url: orderItem.product_url || '',
        quantity: orderItem.quantity,
        price_limit: orderItem.current_price * 1.1, // 10% buffer
        seller_account_credentials: sellerAccount,
        delivery_address: {
          name: customer?.full_name || 'Customer',
          address_line1: deliveryAddress.address_line1,
          address_line2: deliveryAddress.address_line2,
          city: deliveryAddress.city,
          state: deliveryAddress.state,
          postal_code: deliveryAddress.postal_code,
          country: deliveryAddress.country,
          phone: customer?.phone,
        },
        payment_method: {
          type: 'card', // Default to card payment
          // Card details would be retrieved from secure vault
        },
      };
    } catch (error) {
      console.error('Error building order placement request:', error);
      return null;
    }
  }

  /**
   * Get seller account credentials from secure storage
   */
  private async getSellerAccountCredentials(
    platform: string, 
    accountType: string
  ): Promise<{ username: string; password: string; account_type: 'personal' | 'business' } | null> {
    // In production, this would fetch from secure credential storage
    // For demo purposes, return mock data
    return {
      username: `${platform}_user`,
      password: 'secure_password',
      account_type: accountType as 'personal' | 'business',
    };
  }

  /**
   * Initialize Brightdata browser session
   */
  private async initializeBrightdataSession(platform: string): Promise<BrightdataSession | null> {
    try {
      if (!this.brightdataApiKey) {
        console.log('Brightdata not configured - using mock session');
        const mockSession: BrightdataSession = {
          session_id: `mock_session_${Date.now()}`,
          browser_type: 'chrome',
          proxy_location: 'US',
          session_status: 'ready',
        };
        this.activeSessions.set(mockSession.session_id, mockSession);
        return mockSession;
      }

      // Configure browser session based on platform
      const sessionConfig = this.getBrowserConfigForPlatform(platform);
      
      // Initialize Brightdata session (mock implementation)
      const sessionResponse = await this.callBrightdataAPI('/session/create', {
        browser_type: sessionConfig.browser_type,
        proxy_location: sessionConfig.proxy_location,
        timeout_minutes: 15,
        screenshots: true,
      });

      if (!sessionResponse.success) {
        console.error('Failed to create Brightdata session:', sessionResponse.error);
        return null;
      }

      const session: BrightdataSession = {
        session_id: sessionResponse.session_id,
        browser_type: sessionConfig.browser_type,
        proxy_location: sessionConfig.proxy_location,
        session_status: 'ready',
      };

      this.activeSessions.set(session.session_id, session);
      return session;
    } catch (error) {
      console.error('Error initializing Brightdata session:', error);
      return null;
    }
  }

  /**
   * Get browser configuration for specific platform
   */
  private getBrowserConfigForPlatform(platform: string): any {
    const configs = {
      amazon: { browser_type: 'chrome', proxy_location: 'US' },
      flipkart: { browser_type: 'chrome', proxy_location: 'IN' },
      ebay: { browser_type: 'chrome', proxy_location: 'US' },
      'b&h': { browser_type: 'chrome', proxy_location: 'US' },
      other: { browser_type: 'chrome', proxy_location: 'US' },
    };

    return configs[platform as keyof typeof configs] || configs.other;
  }

  /**
   * Execute order placement automation
   */
  private async executeOrderPlacementAutomation(
    session: BrightdataSession,
    requestData: OrderPlacementRequest,
    automationRecord: SellerOrderAutomation
  ): Promise<AutomationResult> {
    try {
      console.log(`Executing order placement for ${requestData.seller_platform}`);

      // Update automation status to running
      await this.updateAutomationStatus(automationRecord.id, 'running', null, session.session_id);

      // Execute platform-specific automation script
      const automationResult = await this.executePlatformSpecificAutomation(
        session,
        requestData,
        automationRecord
      );

      return automationResult;
    } catch (error) {
      console.error('Error in order placement execution:', error);
      return {
        success: false,
        error_message: error instanceof Error ? error.message : 'Automation execution error',
        retry_recommended: true,
      };
    }
  }

  /**
   * Execute platform-specific automation
   */
  private async executePlatformSpecificAutomation(
    session: BrightdataSession,
    requestData: OrderPlacementRequest,
    automationRecord: SellerOrderAutomation
  ): Promise<AutomationResult> {
    // Mock implementation - in production this would call actual Brightdata automation
    console.log(`Mock automation for ${requestData.seller_platform} with session ${session.session_id}`);
    
    // Simulate automation delay
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Mock successful result
    const mockResult: AutomationResult = {
      success: true,
      session_id: session.session_id,
      seller_order_id: `${requestData.seller_platform.toUpperCase()}-${Date.now()}`,
      seller_tracking_id: `TRK-${Date.now()}`,
      price_scraped: requestData.price_limit! * 0.95, // 5% below limit
      availability_status: 'in_stock',
      estimated_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      screenshots: [`screenshot_${session.session_id}_1.png`],
      scraped_data: {
        product_title: 'Automated Product Order',
        seller_name: `${requestData.seller_platform} Seller`,
        product_rating: 4.5,
        reviews_count: 1250,
      },
    };

    return mockResult;
  }

  /**
   * Update automation status
   */
  private async updateAutomationStatus(
    automationId: string,
    status: 'queued' | 'running' | 'completed' | 'failed' | 'retry' | 'manual_required',
    errorMessage?: string | null,
    sessionId?: string
  ): Promise<void> {
    const updateData: any = {
      automation_status: status,
      ...(errorMessage && { error_message: errorMessage }),
      ...(sessionId && { brightdata_session_id: sessionId }),
    };

    if (status === 'running') {
      updateData.started_at = new Date().toISOString();
    } else if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('seller_order_automation')
      .update(updateData)
      .eq('id', automationId);

    if (error) {
      console.error('Error updating automation status:', error);
    }
  }

  /**
   * Finalize automation record with results
   */
  private async finalizeAutomationRecord(
    automationId: string,
    result: AutomationResult
  ): Promise<void> {
    const updateData = {
      automation_status: result.success ? 'completed' : 'failed',
      success: result.success,
      error_message: result.error_message,
      scraped_data: result.scraped_data || {},
      api_response: result,
      execution_time_seconds: null, // Would be calculated from started_at
      data_quality_score: result.success ? 0.95 : 0.0,
      requires_manual_review: result.manual_review_required || false,
      completed_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('seller_order_automation')
      .update(updateData)
      .eq('id', automationId);

    if (error) {
      console.error('Error finalizing automation record:', error);
    }
  }

  /**
   * Update order item with automation results
   */
  private async updateOrderItemWithResults(
    orderItemId: string,
    result: AutomationResult
  ): Promise<void> {
    const updateData: any = {
      order_automation_status: 'completed',
      item_status: 'seller_order_placed',
      seller_order_id: result.seller_order_id,
      seller_order_date: new Date().toISOString(),
      seller_tracking_id: result.seller_tracking_id,
    };

    // Update price if scraped price is different
    if (result.price_scraped && Math.abs(result.price_scraped - updateData.current_price) > 1) {
      updateData.price_variance = result.price_scraped - updateData.current_price;
      // Note: Actual price update would trigger revision approval process
    }

    const { error } = await supabase
      .from('order_items')
      .update(updateData)
      .eq('id', orderItemId);

    if (error) {
      console.error('Error updating order item with results:', error);
    }
  }

  /**
   * Terminate Brightdata session
   */
  private async terminateBrightdataSession(sessionId: string): Promise<void> {
    try {
      this.activeSessions.delete(sessionId);
      
      if (!this.brightdataApiKey) {
        console.log(`Mock session ${sessionId} terminated`);
        return;
      }

      await this.callBrightdataAPI('/session/terminate', {
        session_id: sessionId,
      });
    } catch (error) {
      console.error('Error terminating Brightdata session:', error);
    }
  }

  /**
   * Mock Brightdata API call
   */
  private async callBrightdataAPI(endpoint: string, payload: any): Promise<any> {
    // Mock implementation - in production would make actual HTTP requests
    console.log(`Mock Brightdata API call to ${endpoint}:`, payload);
    
    return {
      success: true,
      session_id: `bd_session_${Date.now()}`,
      data: payload,
    };
  }

  /**
   * Process multiple order items in batch
   */
  async processBatchOrderPlacement(orderItemIds: string[]): Promise<AutomationResult[]> {
    const results: AutomationResult[] = [];
    
    for (const itemId of orderItemIds) {
      try {
        const result = await this.processOrderPlacement(itemId);
        results.push(result);
        
        // Delay between items to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error processing item ${itemId} in batch:`, error);
        results.push({
          success: false,
          error_message: `Batch processing error for item ${itemId}`,
        });
      }
    }
    
    return results;
  }

  /**
   * Get automation status for order items
   */
  async getAutomationStatus(orderItemIds: string[]): Promise<any[]> {
    const { data: automations, error } = await supabase
      .from('seller_order_automation')
      .select('*')
      .in('order_item_id', orderItemIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching automation status:', error);
      return [];
    }

    return automations || [];
  }

  /**
   * Retry failed automation
   */
  async retryFailedAutomation(automationId: string): Promise<AutomationResult> {
    try {
      const { data: automation, error } = await supabase
        .from('seller_order_automation')
        .select('*, order_items!inner(*)')
        .eq('id', automationId)
        .single();

      if (error || !automation) {
        return { success: false, error_message: 'Automation record not found' };
      }

      // Update retry count
      await supabase
        .from('seller_order_automation')
        .update({
          retry_count: automation.retry_count + 1,
          automation_status: 'retry',
        })
        .eq('id', automationId);

      // Process the order placement again
      return await this.processOrderPlacement(automation.order_item_id);
    } catch (error) {
      console.error('Error retrying automation:', error);
      return { success: false, error_message: 'Retry processing error' };
    }
  }
}

export default BrightdataAutomationService;