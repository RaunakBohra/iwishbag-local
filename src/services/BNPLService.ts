import { supabase } from '@/integrations/supabase/client';
import { 
  BNPLApplication, 
  BNPLPlan, 
  PaymentSchedule, 
  CreditProfile,
  CreditScoreFactors 
} from '@/types/bnpl';

export class BNPLService {
  private static instance: BNPLService;
  private readonly MIN_CREDIT_SCORE = 400;
  private readonly MAX_CREDIT_SCORE = 850;

  private constructor() {}

  static getInstance(): BNPLService {
    if (!BNPLService.instance) {
      BNPLService.instance = new BNPLService();
    }
    return BNPLService.instance;
  }

  // Calculate credit score based on customer behavior
  async calculateCreditScore(userId: string): Promise<number> {
    try {
      // Get customer data
      const [profileResult, ordersResult, paymentsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('created_at, email_verified, phone_verified')
          .eq('id', userId)
          .single(),
        
        supabase
          .from('orders')
          .select('id, status, created_at, total_amount')
          .eq('user_id', userId),
        
        supabase
          .from('payment_history')
          .select('status, due_date, paid_date')
          .eq('user_id', userId)
      ]);

      if (profileResult.error) throw profileResult.error;

      const profile = profileResult.data;
      const orders = ordersResult.data || [];
      const payments = paymentsResult.data || [];

      // Calculate factors
      const accountAge = Math.floor(
        (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      const completedOrders = orders.filter(o => 
        ['completed', 'delivered'].includes(o.status)
      );
      
      const totalSpent = completedOrders.reduce((sum, o) => sum + o.total_amount, 0);
      
      const onTimePayments = payments.filter(p => {
        if (p.status !== 'paid' || !p.paid_date) return false;
        return new Date(p.paid_date) <= new Date(p.due_date);
      }).length;
      
      const paymentTimeliness = payments.length > 0 
        ? (onTimePayments / payments.length) * 100 
        : 100;

      // Calculate score
      let score = 300; // Base score

      // Account age (max 100 points)
      score += Math.min(accountAge / 3.65, 100);

      // Order history (max 150 points)
      score += Math.min(completedOrders.length * 15, 150);

      // Total spent (max 100 points)
      score += Math.min(totalSpent / 50, 100);

      // Payment timeliness (max 150 points)
      score += paymentTimeliness * 1.5;

      // Verification bonuses
      if (profile.email_verified) score += 20;
      if (profile.phone_verified) score += 30;

      // Ensure score is within bounds
      score = Math.max(this.MIN_CREDIT_SCORE, Math.min(this.MAX_CREDIT_SCORE, Math.round(score)));

      // Update credit profile
      await this.updateCreditProfile(userId, { credit_score: score });

      return score;
    } catch (error) {
      console.error('Error calculating credit score:', error);
      return this.MIN_CREDIT_SCORE;
    }
  }

  // Get or create credit profile
  async getCreditProfile(userId: string): Promise<CreditProfile> {
    const { data, error } = await supabase
      .from('customer_credit_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Profile doesn't exist, create one
      const newProfile = {
        user_id: userId,
        credit_score: await this.calculateCreditScore(userId),
        credit_limit: 100,
        available_credit: 100,
        payment_history_score: 100,
        total_bnpl_used: 0,
        on_time_payments: 0,
        late_payments: 0,
        defaulted_payments: 0,
        kyc_verified: false
      };

      const { data: created, error: createError } = await supabase
        .from('customer_credit_profiles')
        .insert(newProfile)
        .select()
        .single();

      if (createError) throw createError;
      return created;
    }

    if (error) throw error;
    return data;
  }

  // Update credit profile
  async updateCreditProfile(userId: string, updates: Partial<CreditProfile>) {
    const { error } = await supabase
      .from('customer_credit_profiles')
      .update(updates)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // Calculate credit limit based on score and income
  getCreditLimit(creditScore: number, monthlyIncome?: number): number {
    const baseLimit = creditScore * 0.5;

    if (monthlyIncome) {
      // If income verified, allow up to 10% of monthly income
      const incomeBasedLimit = monthlyIncome * 0.1;
      return Math.min(baseLimit, incomeBasedLimit, 5000);
    }

    // Without income verification, conservative limits
    if (creditScore >= 700) return Math.min(baseLimit, 1000);
    if (creditScore >= 600) return Math.min(baseLimit, 500);
    if (creditScore >= 500) return Math.min(baseLimit, 200);
    return 100; // Minimum $100 for everyone
  }

  // Check BNPL eligibility
  async checkEligibility(
    userId: string, 
    orderAmount: number,
    country: string
  ): Promise<{
    eligible: boolean;
    reason?: string;
    availablePlans?: BNPLPlan[];
    creditLimit?: number;
    availableCredit?: number;
    requiresKYC?: boolean;
    requiresDeposit?: boolean;
    depositAmount?: number;
  }> {
    try {
      // Get credit profile
      const profile = await this.getCreditProfile(userId);

      // Check minimum requirements
      if (profile.credit_score < 400) {
        return {
          eligible: false,
          reason: 'Credit score too low. Build your credit history with us.'
        };
      }

      if (orderAmount > profile.available_credit) {
        return {
          eligible: false,
          reason: `Order amount exceeds available credit of $${profile.available_credit}`
        };
      }

      // Get available plans for this country and amount
      const { data: plans, error } = await supabase
        .from('bnpl_plans')
        .select('*')
        .eq('is_active', true)
        .contains('countries', [country])
        .gte('min_amount', orderAmount)
        .lte('max_amount', orderAmount);

      if (error || !plans || plans.length === 0) {
        return {
          eligible: false,
          reason: 'No payment plans available for this order'
        };
      }

      // Check if KYC required
      const requiresKYC = !profile.kyc_verified && orderAmount > 500;

      // Calculate security deposit if needed
      let requiresDeposit = false;
      let depositAmount = 0;

      if (profile.credit_score < 600) {
        requiresDeposit = true;
        depositAmount = this.calculateSecurityDeposit(profile.credit_score, orderAmount);
      }

      return {
        eligible: true,
        availablePlans: plans,
        creditLimit: profile.credit_limit,
        availableCredit: profile.available_credit,
        requiresKYC,
        requiresDeposit,
        depositAmount
      };
    } catch (error) {
      console.error('Error checking BNPL eligibility:', error);
      return {
        eligible: false,
        reason: 'Unable to check eligibility at this time'
      };
    }
  }

  // Calculate security deposit for risky customers
  calculateSecurityDeposit(creditScore: number, orderAmount: number): number {
    if (creditScore >= 700) return 0;
    if (creditScore >= 600) return orderAmount * 0.1;
    if (creditScore >= 500) return orderAmount * 0.2;
    return orderAmount * 0.3;
  }

  // Apply for BNPL
  async applyForBNPL(
    userId: string,
    orderId: string,
    planId: string,
    depositPaid: number = 0
  ): Promise<BNPLApplication> {
    try {
      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !order) throw new Error('Order not found');

      // Get plan details
      const { data: plan, error: planError } = await supabase
        .from('bnpl_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError || !plan) throw new Error('Plan not found');

      // Check eligibility again
      const eligibility = await this.checkEligibility(
        userId, 
        order.total_amount,
        order.destination_country
      );

      if (!eligibility.eligible) {
        throw new Error(eligibility.reason || 'Not eligible for BNPL');
      }

      // Create application
      const application = {
        user_id: userId,
        order_id: orderId,
        amount_usd: order.total_amount,
        currency: order.currency,
        status: 'approved',
        credit_score: (await this.getCreditProfile(userId)).credit_score,
        risk_level: this.calculateRiskLevel(eligibility.creditLimit!, order.total_amount),
        decision_reason: 'Automatic approval based on credit score',
        deposit_amount: depositPaid
      };

      const { data: createdApp, error: appError } = await supabase
        .from('bnpl_applications')
        .insert(application)
        .select()
        .single();

      if (appError) throw appError;

      // Create payment schedule
      await this.createPaymentSchedule(createdApp.id, plan, order.total_amount - depositPaid);

      // Update available credit
      await this.updateAvailableCredit(userId, -order.total_amount);

      return createdApp;
    } catch (error) {
      console.error('Error applying for BNPL:', error);
      throw error;
    }
  }

  // Calculate risk level
  calculateRiskLevel(creditScore: number, orderAmount: number): 'low' | 'medium' | 'high' {
    if (creditScore >= 700 && orderAmount < 500) return 'low';
    if (creditScore >= 600 && orderAmount < 1000) return 'medium';
    return 'high';
  }

  // Create payment schedule
  async createPaymentSchedule(
    applicationId: string, 
    plan: BNPLPlan, 
    amount: number
  ) {
    const installmentAmount = amount / plan.installments;
    const schedules = [];

    for (let i = 0; i < plan.installments; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i);

      schedules.push({
        application_id: applicationId,
        installment_number: i + 1,
        due_date: dueDate.toISOString(),
        amount: installmentAmount,
        status: i === 0 ? 'pending' : 'scheduled'
      });
    }

    const { error } = await supabase
      .from('bnpl_schedules')
      .insert(schedules);

    if (error) throw error;
  }

  // Update available credit
  async updateAvailableCredit(userId: string, amount: number) {
    const profile = await this.getCreditProfile(userId);
    
    const { error } = await supabase
      .from('customer_credit_profiles')
      .update({
        available_credit: Math.max(0, profile.available_credit + amount)
      })
      .eq('user_id', userId);

    if (error) throw error;
  }

  // Process scheduled payment
  async processScheduledPayment(scheduleId: string): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
  }> {
    try {
      const { data: schedule, error } = await supabase
        .from('bnpl_schedules')
        .select('*, bnpl_applications(user_id)')
        .eq('id', scheduleId)
        .single();

      if (error || !schedule) throw new Error('Schedule not found');

      // TODO: Integrate with payment gateway to charge customer
      // For now, simulate payment processing
      const paymentSuccess = Math.random() > 0.1; // 90% success rate for testing

      if (paymentSuccess) {
        // Mark as paid
        await supabase
          .from('bnpl_schedules')
          .update({
            status: 'paid',
            paid_date: new Date().toISOString(),
            transaction_id: `TXN-${Date.now()}`
          })
          .eq('id', scheduleId);

        // Update credit profile
        await this.recordPaymentHistory(
          schedule.bnpl_applications.user_id,
          'on_time'
        );

        // Restore available credit
        await this.updateAvailableCredit(
          schedule.bnpl_applications.user_id,
          schedule.amount
        );

        return {
          success: true,
          transactionId: `TXN-${Date.now()}`
        };
      } else {
        // Handle payment failure
        await this.handlePaymentFailure(scheduleId);
        
        return {
          success: false,
          error: 'Payment declined'
        };
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      };
    }
  }

  // Handle payment failure
  async handlePaymentFailure(scheduleId: string) {
    // Mark as late
    await supabase
      .from('bnpl_schedules')
      .update({
        status: 'late',
        late_fee: 25 // $25 late fee
      })
      .eq('id', scheduleId);

    // Send reminder
    await this.sendPaymentReminder(scheduleId, 'payment_failed');
  }

  // Record payment history
  async recordPaymentHistory(
    userId: string, 
    type: 'on_time' | 'late' | 'defaulted'
  ) {
    const profile = await this.getCreditProfile(userId);
    
    const updates: any = {};
    
    switch (type) {
      case 'on_time':
        updates.on_time_payments = profile.on_time_payments + 1;
        break;
      case 'late':
        updates.late_payments = profile.late_payments + 1;
        break;
      case 'defaulted':
        updates.defaulted_payments = profile.defaulted_payments + 1;
        break;
    }

    await this.updateCreditProfile(userId, updates);
  }

  // Send payment reminder
  async sendPaymentReminder(scheduleId: string, type: string) {
    // TODO: Integrate with email/SMS service
    const { error } = await supabase
      .from('bnpl_reminders')
      .insert({
        schedule_id: scheduleId,
        reminder_type: 'email',
        status: 'sent',
        sent_at: new Date().toISOString()
      });

    if (error) console.error('Error sending reminder:', error);
  }

  // Get customer BNPL dashboard data
  async getCustomerBNPLDashboard(userId: string) {
    const [profile, applications, schedules] = await Promise.all([
      this.getCreditProfile(userId),
      
      supabase
        .from('bnpl_applications')
        .select('*, orders(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('bnpl_schedules')
        .select('*, bnpl_applications!inner(user_id)')
        .eq('bnpl_applications.user_id', userId)
        .order('due_date', { ascending: true })
    ]);

    return {
      creditProfile: profile,
      applications: applications.data || [],
      upcomingPayments: schedules.data?.filter(s => s.status === 'pending') || [],
      paymentHistory: schedules.data?.filter(s => s.status === 'paid') || []
    };
  }
}