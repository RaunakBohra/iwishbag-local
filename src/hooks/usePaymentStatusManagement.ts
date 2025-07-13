import { useMemo } from 'react';

export interface PaymentStatusConfig {
  id: string;
  name: string;
  label: string;
  description: string;
  color: 'default' | 'secondary' | 'outline' | 'destructive' | 'warning';
  icon: string;
  badgeVariant: string;
  isSuccessful: boolean;
  isTerminal: boolean;
  showsInAnalytics: boolean;
  progressPercentage: number;
  customerMessage: string;
  cssClass: string;
}

export interface VerificationStatusConfig {
  id: string;
  name: string;
  label: string;
  description: string;
  color: 'default' | 'secondary' | 'outline' | 'destructive' | 'warning';
  icon: string;
  badgeVariant: string;
  isSuccessful: boolean;
  isTerminal: boolean;
  allowsApproval: boolean;
  customerMessage: string;
  cssClass: string;
}

const defaultPaymentStatuses: PaymentStatusConfig[] = [
  {
    id: 'unpaid',
    name: 'unpaid',
    label: 'Unpaid',
    description: 'Payment not yet received',
    color: 'destructive',
    icon: 'AlertCircle',
    badgeVariant: 'destructive',
    isSuccessful: false,
    isTerminal: false,
    showsInAnalytics: true,
    progressPercentage: 0,
    customerMessage: 'Payment required',
    cssClass: 'payment-unpaid'
  },
  {
    id: 'partial',
    name: 'partial',
    label: 'Partial Payment',
    description: 'Partial payment received',
    color: 'warning',
    icon: 'AlertTriangle',
    badgeVariant: 'warning',
    isSuccessful: false,
    isTerminal: false,
    showsInAnalytics: true,
    progressPercentage: 50,
    customerMessage: 'Partial payment received',
    cssClass: 'payment-partial'
  },
  {
    id: 'paid',
    name: 'paid',
    label: 'Paid',
    description: 'Full payment received',
    color: 'default',
    icon: 'CheckCircle',
    badgeVariant: 'default',
    isSuccessful: true,
    isTerminal: true,
    showsInAnalytics: true,
    progressPercentage: 100,
    customerMessage: 'Payment completed',
    cssClass: 'payment-paid'
  },
  {
    id: 'overpaid',
    name: 'overpaid',
    label: 'Overpaid',
    description: 'More than required amount received',
    color: 'secondary',
    icon: 'TrendingUp',
    badgeVariant: 'secondary',
    isSuccessful: true,
    isTerminal: true,
    showsInAnalytics: true,
    progressPercentage: 100,
    customerMessage: 'Overpayment received - refund will be processed',
    cssClass: 'payment-overpaid'
  }
];

const defaultVerificationStatuses: VerificationStatusConfig[] = [
  {
    id: 'pending',
    name: 'pending',
    label: 'Pending',
    description: 'Awaiting verification',
    color: 'warning',
    icon: 'Clock',
    badgeVariant: 'warning',
    isSuccessful: false,
    isTerminal: false,
    allowsApproval: false,
    customerMessage: 'Verification in progress',
    cssClass: 'verification-pending'
  },
  {
    id: 'verified',
    name: 'verified',
    label: 'Verified',
    description: 'Successfully verified',
    color: 'default',
    icon: 'CheckCircle',
    badgeVariant: 'default',
    isSuccessful: true,
    isTerminal: false,
    allowsApproval: true,
    customerMessage: 'Verification successful',
    cssClass: 'verification-verified'
  },
  {
    id: 'confirmed',
    name: 'confirmed',
    label: 'Confirmed',
    description: 'Verification confirmed and processed',
    color: 'outline',
    icon: 'Shield',
    badgeVariant: 'outline',
    isSuccessful: true,
    isTerminal: true,
    allowsApproval: false,
    customerMessage: 'Verification confirmed',
    cssClass: 'verification-confirmed'
  },
  {
    id: 'rejected',
    name: 'rejected',
    label: 'Rejected',
    description: 'Verification rejected',
    color: 'destructive',
    icon: 'XCircle',
    badgeVariant: 'destructive',
    isSuccessful: false,
    isTerminal: true,
    allowsApproval: false,
    customerMessage: 'Verification rejected - please resubmit',
    cssClass: 'verification-rejected'
  }
];

export const usePaymentStatusManagement = () => {
  const paymentStatuses = useMemo(() => defaultPaymentStatuses, []);
  const verificationStatuses = useMemo(() => defaultVerificationStatuses, []);

  const getPaymentStatusConfig = (status: string): PaymentStatusConfig | null => {
    return paymentStatuses.find(s => s.name === status) || null;
  };

  const getVerificationStatusConfig = (status: string): VerificationStatusConfig | null => {
    return verificationStatuses.find(s => s.name === status) || null;
  };

  const getPaymentStatusesForAnalytics = (): string[] => {
    return paymentStatuses
      .filter(status => status.showsInAnalytics)
      .map(status => status.name);
  };

  const isPaymentComplete = (status: string): boolean => {
    const config = getPaymentStatusConfig(status);
    return config?.isSuccessful ?? false;
  };

  const isVerificationSuccessful = (status: string): boolean => {
    const config = getVerificationStatusConfig(status);
    return config?.isSuccessful ?? false;
  };

  const canApproveVerification = (status: string): boolean => {
    const config = getVerificationStatusConfig(status);
    return config?.allowsApproval ?? false;
  };

  const getPaymentBadgeVariant = (status: string): string => {
    const config = getPaymentStatusConfig(status);
    return config?.badgeVariant ?? 'secondary';
  };

  const getVerificationBadgeVariant = (status: string): string => {
    const config = getVerificationStatusConfig(status);
    return config?.badgeVariant ?? 'secondary';
  };

  const getPaymentProgress = (status: string): number => {
    const config = getPaymentStatusConfig(status);
    return config?.progressPercentage ?? 0;
  };

  return {
    paymentStatuses,
    verificationStatuses,
    getPaymentStatusConfig,
    getVerificationStatusConfig,
    getPaymentStatusesForAnalytics,
    isPaymentComplete,
    isVerificationSuccessful,
    canApproveVerification,
    getPaymentBadgeVariant,
    getVerificationBadgeVariant,
    getPaymentProgress,
  };
};

export default usePaymentStatusManagement;