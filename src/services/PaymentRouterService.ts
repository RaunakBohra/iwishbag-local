/**
 * Multi-Gateway Payment Router Service
 * 
 * Intelligent routing system that selects the best payment gateway
 * based on multiple factors: cost, reliability, geography, regulations
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface PaymentGateway {
  id: string;
  name: string;
  display_name: string;
  provider_type: string;
  is_active: boolean;
  supported_countries: string[];
  supported_currencies: string[];
  min_amount: number;
  max_amount: number;
  success_rate: number;
  avg_processing_time: number;
  fee_structure: Record<string, any>;
  config: Record<string, any>;
}

interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  conditions: Record<string, any>;
  gateway_preferences: string[];
  fallback_strategy: string;
  load_balancing_type: string;
  weights: Record<string, number>;
}

interface PaymentContext {
  amount: number;
  currency: string;
  country: string;
  payment_method?: string;
  customer_tier?: string;
  user_id?: string;
  quote_id?: string;
  metadata?: Record<string, any>;
}

interface GatewaySelection {
  gateway: PaymentGateway;
  routing_rule?: RoutingRule;
  estimated_fee: number;
  processing_time_estimate: number;
  confidence_score: number;
  fallback_options: PaymentGateway[];
}

export class PaymentRouterService {
  private static instance: PaymentRouterService;
  private gatewayCache: Map<string, PaymentGateway> = new Map();
  private rulesCache: RoutingRule[] = [];
  private lastCacheUpdate = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): PaymentRouterService {
    if (!PaymentRouterService.instance) {
      PaymentRouterService.instance = new PaymentRouterService();
    }
    return PaymentRouterService.instance;
  }

  /**
   * Select the best payment gateway for a transaction
   */
  async selectGateway(context: PaymentContext): Promise<GatewaySelection> {
    try {
      await this.refreshCacheIfNeeded();
      
      const eligibleGateways = await this.getEligibleGateways(context);
      const matchingRule = await this.findMatchingRule(context);
      
      if (eligibleGateways.length === 0) {
        throw new Error('No eligible payment gateways found for this transaction');
      }

      const selectedGateway = matchingRule 
        ? await this.selectByRule(eligibleGateways, matchingRule, context)
        : await this.selectByScore(eligibleGateways, context);

      const estimatedFee = await this.calculateGatewayFee(selectedGateway, context);
      const fallbackOptions = eligibleGateways
        .filter(g => g.id !== selectedGateway.id)
        .slice(0, 3); // Top 3 alternatives

      return {
        gateway: selectedGateway,
        routing_rule: matchingRule,
        estimated_fee: estimatedFee,
        processing_time_estimate: selectedGateway.avg_processing_time,
        confidence_score: this.calculateConfidenceScore(selectedGateway, context),
        fallback_options: fallbackOptions
      };

    } catch (error) {
      logger.error('Gateway selection failed:', error);
      throw error;
    }
  }

  /**
   * Create a payment session with selected gateway
   */
  async createPaymentSession(
    context: PaymentContext,
    gatewaySelection: GatewaySelection
  ): Promise<string> {
    try {
      const sessionToken = this.generateSessionToken();
      
      const { data, error } = await supabase
        .from('payment_sessions')
        .insert({
          session_token: sessionToken,
          quote_id: context.quote_id,
          user_id: context.user_id,
          amount: context.amount,
          currency: context.currency,
          payment_method: context.payment_method,
          selected_gateway_id: gatewaySelection.gateway.id,
          routing_rule_id: gatewaySelection.routing_rule?.id,
          status: 'created',
          metadata: {
            ...context.metadata,
            estimated_fee: gatewaySelection.estimated_fee,
            confidence_score: gatewaySelection.confidence_score
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Log the session creation
      await this.logPaymentEvent({
        session_id: data.id,
        gateway_id: gatewaySelection.gateway.id,
        event_type: 'session_created',
        event_source: 'system',
        event_data: {
          context,
          gateway_selection: {
            gateway_name: gatewaySelection.gateway.name,
            estimated_fee: gatewaySelection.estimated_fee
          }
        }
      });

      return sessionToken;

    } catch (error) {
      logger.error('Payment session creation failed:', error);
      throw error;
    }
  }

  /**
   * Handle gateway failures and automatic fallback
   */
  async handleGatewayFailure(
    sessionId: string, 
    failureReason: string
  ): Promise<GatewaySelection | null> {
    try {
      // Get current session
      const { data: session, error } = await supabase
        .from('payment_sessions')
        .select('*, selected_gateway_id, routing_rule_id, fallback_attempts')
        .eq('id', sessionId)
        .single();

      if (error || !session) {
        throw new Error('Payment session not found');
      }

      // Increment fallback attempts
      const fallbackAttempts = (session.fallback_attempts || 0) + 1;
      
      if (fallbackAttempts >= 3) {
        logger.warn(`Maximum fallback attempts reached for session ${sessionId}`);
        return null;
      }

      // Log the failure
      await this.logPaymentEvent({
        session_id: sessionId,
        gateway_id: session.selected_gateway_id,
        event_type: 'gateway_failure',
        event_source: 'system',
        event_data: { failure_reason: failureReason, attempt: fallbackAttempts }
      });

      // Select fallback gateway
      const context: PaymentContext = {
        amount: session.amount,
        currency: session.currency,
        country: session.metadata?.country || 'US',
        payment_method: session.payment_method,
        user_id: session.user_id,
        quote_id: session.quote_id
      };

      const newSelection = await this.selectFallbackGateway(
        context, 
        session.selected_gateway_id,
        session.routing_rule_id
      );

      if (newSelection) {
        // Update session with new gateway
        await supabase
          .from('payment_sessions')
          .update({
            selected_gateway_id: newSelection.gateway.id,
            fallback_attempts: fallbackAttempts,
            status: 'gateway_selected',
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        await this.logPaymentEvent({
          session_id: sessionId,
          gateway_id: newSelection.gateway.id,
          event_type: 'fallback_gateway_selected',
          event_source: 'system',
          event_data: { 
            new_gateway: newSelection.gateway.name,
            attempt: fallbackAttempts 
          }
        });
      }

      return newSelection;

    } catch (error) {
      logger.error('Gateway fallback failed:', error);
      throw error;
    }
  }

  /**
   * Calculate dynamic fees for a gateway
   */
  async calculateGatewayFee(
    gateway: PaymentGateway, 
    context: PaymentContext
  ): Promise<number> {
    try {
      // Check cache first
      const cacheKey = `${gateway.id}-${context.amount}-${context.currency}-${context.payment_method}-${context.country}`;
      
      const { data: cached } = await supabase
        .from('gateway_fee_cache')
        .select('calculated_fee')
        .eq('gateway_id', gateway.id)
        .eq('amount', context.amount)
        .eq('currency', context.currency)
        .eq('payment_method', context.payment_method || 'card')
        .eq('country', context.country)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cached) {
        return cached.calculated_fee;
      }

      // Calculate fee using gateway's fee structure
      const feeStructure = gateway.fee_structure;
      let calculatedFee = 0;

      // Base percentage fee
      if (feeStructure.percentage) {
        calculatedFee += context.amount * (feeStructure.percentage / 100);
      }

      // Fixed fee
      if (feeStructure.fixed_fee) {
        calculatedFee += feeStructure.fixed_fee;
      }

      // Country-specific fees
      if (feeStructure.country_fees && feeStructure.country_fees[context.country]) {
        const countryFee = feeStructure.country_fees[context.country];
        if (countryFee.percentage) {
          calculatedFee += context.amount * (countryFee.percentage / 100);
        }
        if (countryFee.fixed_fee) {
          calculatedFee += countryFee.fixed_fee;
        }
      }

      // Payment method specific fees
      if (feeStructure.method_fees && context.payment_method) {
        const methodFee = feeStructure.method_fees[context.payment_method];
        if (methodFee?.percentage) {
          calculatedFee += context.amount * (methodFee.percentage / 100);
        }
        if (methodFee?.fixed_fee) {
          calculatedFee += methodFee.fixed_fee;
        }
      }

      // Cache the result
      await supabase
        .from('gateway_fee_cache')
        .upsert({
          gateway_id: gateway.id,
          amount: context.amount,
          currency: context.currency,
          payment_method: context.payment_method || 'card',
          country: context.country,
          calculated_fee: calculatedFee,
          fee_breakdown: {
            base_percentage: feeStructure.percentage || 0,
            fixed_fee: feeStructure.fixed_fee || 0,
            country_adjustment: feeStructure.country_fees?.[context.country] || 0,
            method_adjustment: feeStructure.method_fees?.[context.payment_method || 'card'] || 0
          }
        });

      return calculatedFee;

    } catch (error) {
      logger.error('Fee calculation failed:', error);
      // Return a default fee rather than failing
      return context.amount * 0.029; // 2.9% default
    }
  }

  /**
   * Get real-time gateway health status
   */
  async getGatewayHealth(): Promise<Record<string, any>> {
    try {
      const { data: metrics } = await supabase
        .from('gateway_health_metrics')
        .select(`
          gateway_id,
          payment_gateways(name, display_name),
          total_requests,
          successful_requests,
          failed_requests,
          avg_response_time_ms,
          total_volume
        `)
        .eq('metric_date', new Date().toISOString().split('T')[0])
        .eq('hour_of_day', new Date().getHours());

      const healthReport: Record<string, any> = {};

      for (const metric of metrics || []) {
        const successRate = metric.total_requests > 0 
          ? (metric.successful_requests / metric.total_requests) * 100 
          : 100;

        healthReport[metric.gateway_id] = {
          gateway_name: metric.payment_gateways?.name,
          display_name: metric.payment_gateways?.display_name,
          success_rate: successRate,
          avg_response_time: metric.avg_response_time_ms,
          total_volume: metric.total_volume,
          status: successRate >= 95 ? 'healthy' : successRate >= 85 ? 'degraded' : 'unhealthy'
        };
      }

      return healthReport;

    } catch (error) {
      logger.error('Gateway health check failed:', error);
      return {};
    }
  }

  // Private helper methods

  private async refreshCacheIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCacheUpdate < this.CACHE_TTL) {
      return;
    }

    try {
      // Refresh gateways cache
      const { data: gateways } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('is_active', true);

      this.gatewayCache.clear();
      for (const gateway of gateways || []) {
        this.gatewayCache.set(gateway.id, gateway);
      }

      // Refresh rules cache
      const { data: rules } = await supabase
        .from('payment_routing_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true });

      this.rulesCache = rules || [];
      this.lastCacheUpdate = now;

    } catch (error) {
      logger.error('Cache refresh failed:', error);
    }
  }

  private async getEligibleGateways(context: PaymentContext): Promise<PaymentGateway[]> {
    const eligible: PaymentGateway[] = [];

    for (const gateway of this.gatewayCache.values()) {
      // Check amount limits
      if (context.amount < gateway.min_amount || context.amount > gateway.max_amount) {
        continue;
      }

      // Check currency support
      if (!gateway.supported_currencies.includes(context.currency)) {
        continue;
      }

      // Check country support
      if (!gateway.supported_countries.includes(context.country)) {
        continue;
      }

      eligible.push(gateway);
    }

    return eligible;
  }

  private async findMatchingRule(context: PaymentContext): Promise<RoutingRule | undefined> {
    for (const rule of this.rulesCache) {
      if (this.ruleMatches(rule, context)) {
        return rule;
      }
    }
    return undefined;
  }

  private ruleMatches(rule: RoutingRule, context: PaymentContext): boolean {
    const conditions = rule.conditions;

    // Check amount range
    if (conditions.amount_range) {
      const range = conditions.amount_range;
      if (context.amount < range.min || context.amount > range.max) {
        return false;
      }
    }

    // Check currency
    if (conditions.currencies && !conditions.currencies.includes(context.currency)) {
      return false;
    }

    // Check country
    if (conditions.countries && !conditions.countries.includes(context.country)) {
      return false;
    }

    // Check payment method
    if (conditions.payment_method && context.payment_method !== conditions.payment_method) {
      return false;
    }

    // Check customer tier
    if (conditions.customer_tier && !conditions.customer_tier.includes(context.customer_tier)) {
      return false;
    }

    // Time-based rules
    if (conditions.time_of_day) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      if (currentTime < conditions.time_of_day.start || currentTime > conditions.time_of_day.end) {
        return false;
      }
    }

    return true;
  }

  private async selectByRule(
    gateways: PaymentGateway[], 
    rule: RoutingRule, 
    context: PaymentContext
  ): Promise<PaymentGateway> {
    // Filter gateways by rule preferences
    const preferredGateways = gateways.filter(g => 
      rule.gateway_preferences.includes(g.id)
    );

    if (preferredGateways.length === 0) {
      return this.selectByScore(gateways, context);
    }

    // Apply load balancing
    switch (rule.load_balancing_type) {
      case 'weighted':
        return this.selectByWeight(preferredGateways, rule.weights);
      case 'round_robin':
        return this.selectRoundRobin(preferredGateways);
      case 'least_connections':
        return await this.selectLeastConnections(preferredGateways);
      default:
        return preferredGateways[0];
    }
  }

  private async selectByScore(gateways: PaymentGateway[], context: PaymentContext): Promise<PaymentGateway> {
    let bestGateway = gateways[0];
    let bestScore = 0;

    for (const gateway of gateways) {
      const score = await this.calculateGatewayScore(gateway, context);
      if (score > bestScore) {
        bestScore = score;
        bestGateway = gateway;
      }
    }

    return bestGateway;
  }

  private async calculateGatewayScore(gateway: PaymentGateway, context: PaymentContext): Promise<number> {
    let score = 0;

    // Success rate (40% weight)
    score += (gateway.success_rate / 100) * 40;

    // Processing time (20% weight) - lower is better
    const timeScore = Math.max(0, 20 - (gateway.avg_processing_time / 300) * 20);
    score += timeScore;

    // Fee cost (30% weight) - lower is better
    const estimatedFee = await this.calculateGatewayFee(gateway, context);
    const feePercentage = (estimatedFee / context.amount) * 100;
    const feeScore = Math.max(0, 30 - feePercentage * 10);
    score += feeScore;

    // Regional preference (10% weight)
    if (gateway.supported_countries.length <= 5) {
      score += 10; // Prefer specialized regional gateways
    }

    return score;
  }

  private selectByWeight(gateways: PaymentGateway[], weights: Record<string, number>): PaymentGateway {
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    const random = Math.random() * totalWeight;
    
    let cumulativeWeight = 0;
    for (const gateway of gateways) {
      cumulativeWeight += weights[gateway.id] || 1;
      if (random <= cumulativeWeight) {
        return gateway;
      }
    }
    
    return gateways[0];
  }

  private selectRoundRobin(gateways: PaymentGateway[]): PaymentGateway {
    // Simple round-robin based on timestamp
    const index = Date.now() % gateways.length;
    return gateways[index];
  }

  private async selectLeastConnections(gateways: PaymentGateway[]): Promise<PaymentGateway> {
    // Count active sessions per gateway
    const { data: sessionCounts } = await supabase
      .from('payment_sessions')
      .select('selected_gateway_id')
      .in('status', ['created', 'initiated', 'processing'])
      .in('selected_gateway_id', gateways.map(g => g.id));

    const connectionCounts: Record<string, number> = {};
    for (const session of sessionCounts || []) {
      connectionCounts[session.selected_gateway_id] = 
        (connectionCounts[session.selected_gateway_id] || 0) + 1;
    }

    // Find gateway with least connections
    let leastConnectedGateway = gateways[0];
    let minConnections = connectionCounts[leastConnectedGateway.id] || 0;

    for (const gateway of gateways) {
      const connections = connectionCounts[gateway.id] || 0;
      if (connections < minConnections) {
        minConnections = connections;
        leastConnectedGateway = gateway;
      }
    }

    return leastConnectedGateway;
  }

  private async selectFallbackGateway(
    context: PaymentContext, 
    excludeGatewayId: string,
    ruleId?: string
  ): Promise<GatewaySelection | null> {
    const eligibleGateways = (await this.getEligibleGateways(context))
      .filter(g => g.id !== excludeGatewayId);

    if (eligibleGateways.length === 0) {
      return null;
    }

    // Apply fallback strategy
    let selectedGateway: PaymentGateway;

    if (ruleId) {
      const rule = this.rulesCache.find(r => r.id === ruleId);
      switch (rule?.fallback_strategy) {
        case 'lowest_fee':
          selectedGateway = await this.selectLowestFee(eligibleGateways, context);
          break;
        case 'highest_success_rate':
          selectedGateway = this.selectHighestSuccessRate(eligibleGateways);
          break;
        case 'fastest':
          selectedGateway = this.selectFastest(eligibleGateways);
          break;
        default:
          selectedGateway = eligibleGateways[0];
      }
    } else {
      selectedGateway = await this.selectByScore(eligibleGateways, context);
    }

    const estimatedFee = await this.calculateGatewayFee(selectedGateway, context);
    
    return {
      gateway: selectedGateway,
      estimated_fee: estimatedFee,
      processing_time_estimate: selectedGateway.avg_processing_time,
      confidence_score: this.calculateConfidenceScore(selectedGateway, context),
      fallback_options: eligibleGateways.filter(g => g.id !== selectedGateway.id).slice(0, 2)
    };
  }

  private async selectLowestFee(gateways: PaymentGateway[], context: PaymentContext): Promise<PaymentGateway> {
    let lowestFeeGateway = gateways[0];
    let lowestFee = await this.calculateGatewayFee(lowestFeeGateway, context);

    for (const gateway of gateways.slice(1)) {
      const fee = await this.calculateGatewayFee(gateway, context);
      if (fee < lowestFee) {
        lowestFee = fee;
        lowestFeeGateway = gateway;
      }
    }

    return lowestFeeGateway;
  }

  private selectHighestSuccessRate(gateways: PaymentGateway[]): PaymentGateway {
    return gateways.reduce((best, current) => 
      current.success_rate > best.success_rate ? current : best
    );
  }

  private selectFastest(gateways: PaymentGateway[]): PaymentGateway {
    return gateways.reduce((fastest, current) => 
      current.avg_processing_time < fastest.avg_processing_time ? current : fastest
    );
  }

  private calculateConfidenceScore(gateway: PaymentGateway, context: PaymentContext): number {
    let confidence = 0;

    // Base confidence from success rate
    confidence += gateway.success_rate;

    // Reduce confidence for amounts near limits
    const amountRatio = context.amount / gateway.max_amount;
    if (amountRatio > 0.8) {
      confidence -= 10; // High amount risk
    }

    // Regional confidence
    if (gateway.supported_countries.includes(context.country)) {
      confidence += 5;
    }

    return Math.min(100, Math.max(0, confidence));
  }

  private generateSessionToken(): string {
    return `iwb_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async logPaymentEvent(event: {
    session_id?: string;
    transaction_id?: string;
    gateway_id?: string;
    event_type: string;
    event_source: string;
    event_data: any;
    previous_status?: string;
    new_status?: string;
  }): Promise<void> {
    try {
      await supabase
        .from('payment_events')
        .insert(event);
    } catch (error) {
      logger.error('Failed to log payment event:', error);
    }
  }
}

// Export singleton instance
export const paymentRouter = PaymentRouterService.getInstance();