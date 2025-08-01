export interface BNPLApplication {
  id: string;
  user_id: string;
  order_id: string;
  amount_usd: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'defaulted';
  credit_score: number;
  risk_level: 'low' | 'medium' | 'high';
  decision_reason?: string;
  deposit_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface BNPLPlan {
  id: string;
  name: string;
  description: string;
  installments: number;
  interest_rate: number;
  processing_fee: number;
  late_fee: number;
  min_amount: number;
  max_amount: number;
  countries: string[];
  is_active: boolean;
}

export interface PaymentSchedule {
  id: string;
  application_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  status: 'scheduled' | 'pending' | 'paid' | 'late' | 'defaulted';
  paid_date?: string;
  payment_method?: string;
  transaction_id?: string;
  late_fee: number;
  created_at: string;
}

export interface CreditProfile {
  user_id: string;
  credit_score: number;
  credit_limit: number;
  available_credit: number;
  payment_history_score: number;
  total_bnpl_used: number;
  on_time_payments: number;
  late_payments: number;
  defaulted_payments: number;
  kyc_verified: boolean;
  kyc_documents?: any;
  risk_flags?: any;
  monthly_income?: number;
  created_at: string;
  updated_at: string;
}

export interface CreditScoreFactors {
  accountAge: number;
  orderHistory: number;
  totalSpent: number;
  paymentTimeliness: number;
  disputeRate: number;
  returnRate: number;
  emailVerified: boolean;
  phoneVerified: boolean;
  addressVerified: boolean;
  governmentIdVerified: boolean;
}

export interface KYCDocuments {
  governmentId?: File;
  addressProof?: File;
  incomeProof?: File;
}

export interface PaymentReminder {
  id: string;
  schedule_id: string;
  reminder_type: 'email' | 'sms' | 'push' | 'in_app';
  sent_at: string;
  status: 'pending' | 'sent' | 'failed';
  response?: any;
}

export interface BNPLEligibility {
  eligible: boolean;
  reason?: string;
  availablePlans?: BNPLPlan[];
  creditLimit?: number;
  availableCredit?: number;
  requiresKYC?: boolean;
  requiresDeposit?: boolean;
  depositAmount?: number;
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface BNPLMetrics {
  totalOutstanding: number;
  defaultRate: number;
  averageCreditScore: number;
  approvalRate: number;
  averageOrderValue: number;
  repeatUsageRate: number;
  onTimePaymentRate: number;
  recoveryRate: number;
  averageDaysLate: number;
}