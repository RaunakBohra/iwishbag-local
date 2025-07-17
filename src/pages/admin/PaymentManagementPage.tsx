import React, { useState, useEffect } from 'react';
import { Tables } from '@/integrations/supabase/types';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { DateRangePicker } from '@/components/ui/date-range-picker';
// PaymentProofPreviewModal removed - using UnifiedPaymentModal instead
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Receipt,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  DollarSign,
  Image,
  FileText,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreVertical,
  AlertCircle,
  FileDown,
  Keyboard,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface PaymentProofData {
  id: string;
  quote_id: string;
  sender_id: string;
  attachment_url: string;
  attachment_file_name: string;
  created_at: string;
  verification_status: 'pending' | 'verified' | 'rejected' | null;
  admin_notes: string | null;
  verified_at: string | null;
  verified_by: string | null;
  // Joined data
  order_display_id: string;
  final_total: number;
  final_currency: string;
  payment_method: string;
  payment_status: string;
  customer_email: string;
  customer_name: string;
  amount_paid?: number;
  // Payment type indicator
  payment_type: 'bank_transfer_proof' | 'webhook_payment';
  // Webhook payment specific fields
  transaction_id?: string;
  gateway_response?: Record<string, unknown>;
  gateway_name?: string;
}

const PaymentManagementPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [selectedProofs, setSelectedProofs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>(
    'all',
  );
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<
    'all' | 'bank_transfer' | 'payu' | 'stripe' | 'esewa'
  >('all');
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedProof, setSelectedProof] = useState<PaymentProofData | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Fetch payment proofs with pagination
  const {
    data: proofData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      'payment-proofs',
      currentPage,
      pageSize,
      statusFilter,
      paymentMethodFilter,
      searchQuery,
      dateRange,
    ],
    queryFn: async () => {
      let allPaymentData: PaymentProofData[] = [];

      // Fetch bank transfer payment proofs if needed
      if (paymentMethodFilter === 'all' || paymentMethodFilter === 'bank_transfer') {
        let messagesQuery = supabase
          .from('messages')
          .select('*')
          .eq('message_type', 'payment_proof')
          .order('created_at', { ascending: false });

        if (statusFilter !== 'all') {
          messagesQuery = messagesQuery.eq('verification_status', statusFilter);
        }

        if (dateRange.from && dateRange.to) {
          messagesQuery = messagesQuery
            .gte('created_at', dateRange.from.toISOString())
            .lte('created_at', dateRange.to.toISOString());
        }

        const { data: messages, error: messagesError } = await messagesQuery;
        if (messagesError) throw messagesError;

        if (messages && messages.length > 0) {
          // Get unique quote IDs and sender IDs
          const quoteIds = [...new Set(messages.map((m) => m.quote_id).filter(Boolean))];
          const senderIds = [...new Set(messages.map((m) => m.sender_id).filter(Boolean))];

          // Fetch quotes data
          let quotesData: Tables<'quotes'>[] = [];
          if (quoteIds.length > 0) {
            const { data } = await supabase
              .from('quotes')
              .select(
                'id, order_display_id, final_total, final_currency, payment_method, payment_status, email, amount_paid, user_id',
              )
              .in('id', quoteIds);
            quotesData = data || [];
          }

          // Fetch profiles data
          let profilesData: Tables<'profiles'>[] = [];
          if (senderIds.length > 0) {
            const { data } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', senderIds);
            profilesData = data || [];
          }

          // Create lookup maps
          const quotesMap = new Map(quotesData.map((q) => [q.id, q]));
          const profilesMap = new Map(profilesData.map((p) => [p.id, p]));

          // Transform bank transfer data
          const bankTransferData = messages.map((item) => {
            const quote = quotesMap.get(item.quote_id);
            const profile = profilesMap.get(item.sender_id);

            return {
              id: item.id,
              quote_id: item.quote_id,
              sender_id: item.sender_id,
              attachment_url: item.attachment_url,
              attachment_file_name: item.attachment_file_name,
              created_at: item.created_at,
              verification_status: item.verification_status,
              admin_notes: item.admin_notes,
              verified_at: item.verified_at,
              verified_by: item.verified_by,
              // Joined data
              order_display_id: quote?.order_display_id || 'N/A',
              final_total: quote?.final_total || 0,
              final_currency: quote?.final_currency || 'USD',
              payment_method: quote?.payment_method || 'bank_transfer',
              payment_status: quote?.payment_status || 'unpaid',
              customer_email: quote?.email || 'N/A',
              customer_name: profile?.full_name || 'Unknown Customer',
              amount_paid: quote?.amount_paid || 0,
              // Payment type indicator
              payment_type: 'bank_transfer_proof' as const,
            };
          });

          allPaymentData.push(...bankTransferData);
        }
      }

      // Fetch webhook payments (PayU, Stripe, etc.) if needed
      if (
        paymentMethodFilter === 'all' ||
        ['payu', 'stripe', 'esewa'].includes(paymentMethodFilter)
      ) {
        let transactionsQuery = supabase
          .from('payment_transactions')
          .select('*')
          .order('created_at', { ascending: false });

        // Filter by specific gateway if not 'all'
        if (paymentMethodFilter !== 'all') {
          transactionsQuery = transactionsQuery.eq('payment_method', paymentMethodFilter);
        }

        // For webhook payments, we'll map status differently
        if (statusFilter !== 'all') {
          const webhookStatusMap = {
            pending: 'pending',
            verified: 'completed', // Webhook payments are auto-verified when completed
            rejected: 'failed',
          };
          const mappedStatus = webhookStatusMap[statusFilter as keyof typeof webhookStatusMap];
          if (mappedStatus) {
            transactionsQuery = transactionsQuery.eq('status', mappedStatus);
          }
        }

        if (dateRange.from && dateRange.to) {
          transactionsQuery = transactionsQuery
            .gte('created_at', dateRange.from.toISOString())
            .lte('created_at', dateRange.to.toISOString());
        }

        const { data: transactions, error: transactionsError } = await transactionsQuery;
        if (transactionsError) throw transactionsError;

        if (transactions && transactions.length > 0) {
          // Get unique quote IDs and user IDs
          const quoteIds = [...new Set(transactions.map((t) => t.quote_id).filter(Boolean))];
          const userIds = [...new Set(transactions.map((t) => t.user_id).filter(Boolean))];

          // Fetch quotes data
          let quotesData: Tables<'quotes'>[] = [];
          if (quoteIds.length > 0) {
            const { data } = await supabase
              .from('quotes')
              .select(
                'id, order_display_id, final_total, final_currency, payment_method, payment_status, email, amount_paid, user_id',
              )
              .in('id', quoteIds);
            quotesData = data || [];
          }

          // Fetch profiles data
          let profilesData: Tables<'profiles'>[] = [];
          if (userIds.length > 0) {
            const { data } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', userIds);
            profilesData = data || [];
          }

          // Create lookup maps
          const quotesMap = new Map(quotesData.map((q) => [q.id, q]));
          const profilesMap = new Map(profilesData.map((p) => [p.id, p]));

          // Transform webhook payment data
          const webhookData = transactions.map((item) => {
            const quote = quotesMap.get(item.quote_id);
            const profile = profilesMap.get(item.user_id);

            // Map webhook status to verification status
            const getVerificationStatus = (status: string) => {
              switch (status) {
                case 'completed':
                  return 'verified';
                case 'failed':
                  return 'rejected';
                case 'pending':
                  return 'pending';
                default:
                  return null;
              }
            };

            const gatewayName =
              item.payment_method === 'payu'
                ? 'PayU'
                : item.payment_method === 'stripe'
                  ? 'Stripe'
                  : item.payment_method === 'esewa'
                    ? 'eSewa'
                    : item.payment_method || 'Unknown';

            return {
              id: item.id,
              quote_id: item.quote_id,
              sender_id: item.user_id,
              attachment_url: '', // No attachment for webhook payments
              attachment_file_name: `${gatewayName} Transaction`,
              created_at: item.created_at,
              verification_status: getVerificationStatus(item.status || ''),
              admin_notes: null,
              verified_at: item.status === 'completed' ? item.updated_at : null,
              verified_by: null, // Webhook auto-verification
              // Joined data
              order_display_id: quote?.order_display_id || 'N/A',
              final_total: quote?.final_total || 0,
              final_currency: quote?.final_currency || item.currency || 'USD',
              payment_method: item.payment_method || 'unknown',
              payment_status: quote?.payment_status || 'unpaid',
              customer_email: quote?.email || 'N/A',
              customer_name: profile?.full_name || 'Unknown Customer',
              amount_paid: quote?.amount_paid || 0,
              // Payment type indicator
              payment_type: 'webhook_payment' as const,
              // Webhook specific fields
              transaction_id: item.id,
              gateway_response: item.gateway_response,
              gateway_name: gatewayName,
            };
          });

          allPaymentData.push(...webhookData);
        }
      }

      // Sort all data by creation date (newest first)
      allPaymentData.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      // Apply client-side search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        allPaymentData = allPaymentData.filter(
          (item) =>
            item.order_display_id.toLowerCase().includes(query) ||
            item.customer_email.toLowerCase().includes(query) ||
            item.customer_name.toLowerCase().includes(query) ||
            item.attachment_file_name.toLowerCase().includes(query) ||
            (item.transaction_id && item.transaction_id.toLowerCase().includes(query)) ||
            (item.gateway_name && item.gateway_name.toLowerCase().includes(query)),
        );
      }

      // Apply pagination
      const totalCount = allPaymentData.length;
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = allPaymentData.slice(startIndex, endIndex);

      return {
        data: paginatedData,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch overall statistics
  const { data: statistics } = useQuery({
    queryKey: ['payment-proofs-stats', paymentMethodFilter],
    queryFn: async () => {
      const bankTransferStats = {
        total: 0,
        pending: 0,
        verified: 0,
        rejected: 0,
      };
      const webhookStats = { total: 0, pending: 0, verified: 0, rejected: 0 };

      // Get bank transfer stats if needed
      if (paymentMethodFilter === 'all' || paymentMethodFilter === 'bank_transfer') {
        const { data: allProofs, error } = await supabase
          .from('messages')
          .select('verification_status')
          .eq('message_type', 'payment_proof');

        if (!error && allProofs) {
          bankTransferStats.total = allProofs.length;
          bankTransferStats.pending = allProofs.filter(
            (p) => !p.verification_status || p.verification_status === 'pending',
          ).length;
          bankTransferStats.verified = allProofs.filter(
            (p) => p.verification_status === 'verified',
          ).length;
          bankTransferStats.rejected = allProofs.filter(
            (p) => p.verification_status === 'rejected',
          ).length;
        }
      }

      // Get webhook payment stats if needed
      if (
        paymentMethodFilter === 'all' ||
        ['payu', 'stripe', 'esewa'].includes(paymentMethodFilter)
      ) {
        let transactionsQuery = supabase
          .from('payment_transactions')
          .select('status, payment_method');

        // Filter by specific gateway if not 'all'
        if (paymentMethodFilter !== 'all') {
          transactionsQuery = transactionsQuery.eq('payment_method', paymentMethodFilter);
        }

        const { data: allTransactions, error } = await transactionsQuery;

        if (!error && allTransactions) {
          webhookStats.total = allTransactions.length;
          webhookStats.pending = allTransactions.filter((t) => t.status === 'pending').length;
          webhookStats.verified = allTransactions.filter((t) => t.status === 'completed').length;
          webhookStats.rejected = allTransactions.filter((t) => t.status === 'failed').length;
        }
      }

      // Combine stats
      return {
        total: bankTransferStats.total + webhookStats.total,
        pending: bankTransferStats.pending + webhookStats.pending,
        verified: bankTransferStats.verified + webhookStats.verified,
        rejected: bankTransferStats.rejected + webhookStats.rejected,
      };
    },
    refetchInterval: 30000,
  });

  // Unified verify & confirm payment operation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({
      ids,
      status,
      notes,
    }: {
      ids: string[];
      status: 'verified' | 'rejected';
      notes: string;
    }) => {
      const user = (await supabase.auth.getUser()).data.user;

      // Get message details first
      const { data: messages, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .in('id', ids);

      if (fetchError) throw fetchError;

      // Get quote IDs from messages
      const quoteIds = messages?.map((m) => m.quote_id).filter(Boolean) || [];

      // Fetch quote details separately
      let quotes: Tables<'quotes'>[] = [];
      if (quoteIds.length > 0) {
        const { data: quotesData, error: quotesError } = await supabase
          .from('quotes')
          .select('*')
          .in('id', quoteIds);

        if (quotesError) throw quotesError;
        quotes = quotesData || [];
      }

      // For each message, calculate and set the verified amount
      const updatePromises = messages.map(async (message) => {
        const quote = quotes.find((q) => q.id === message.quote_id);
        const orderTotal = quote?.final_total || 0;
        const existingPaid = quote?.amount_paid || 0;
        const remainingBalance = orderTotal - existingPaid;

        // For now, we'll track the amount in the update logic below
        // since verified_amount column was removed from database

        return supabase
          .from('messages')
          .update({
            verification_status: status,
            admin_notes: notes,
            verified_by: user?.id,
            verified_at: new Date().toISOString(),
          })
          .eq('id', message.id);
      });

      // Execute all updates
      const updateResults = await Promise.all(updatePromises);
      const updateError = updateResults.find((result) => result.error)?.error;
      if (updateError) throw updateError;

      // For verified payments, automatically confirm payment using our RPC function
      if (status === 'verified') {
        for (const message of messages || []) {
          if (!message.quote_id) continue;

          // Find the corresponding quote from our fetched quotes
          const quote = quotes.find((q) => q.id === message.quote_id);
          if (!quote) continue;

          const orderTotal = quote.final_total || 0;
          const existingPaid = quote.amount_paid || 0;

          // Use the remaining balance as the amount received
          const remainingBalance = orderTotal - existingPaid;
          const amountReceived = remainingBalance;
          const totalPaid = existingPaid + amountReceived;

          // Determine payment status
          let paymentStatus = 'unpaid';
          if (totalPaid >= orderTotal) {
            paymentStatus = totalPaid > orderTotal ? 'overpaid' : 'paid';
          } else if (totalPaid > 0) {
            paymentStatus = 'partial';
          }

          // Use our RPC function for payment updates
          console.log(`Updating payment for quote ${message.quote_id}:`, {
            new_amount_paid: totalPaid,
            new_payment_status: paymentStatus,
          });

          const { error: paymentError } = await supabase.rpc('force_update_payment', {
            quote_id: message.quote_id,
            new_amount_paid: totalPaid,
            new_payment_status: paymentStatus,
          });

          if (paymentError) {
            console.error('Error updating payment:', paymentError);
            // Show a warning toast about the payment update failure
            toast({
              title: 'Warning',
              description: `Payment proof verified but payment status update failed for order ${quote.order_display_id}. Error: ${paymentError.message}`,
              variant: 'destructive',
            });
          }
        }
      }

      // Send notifications to customers
      for (const message of messages || []) {
        if (!message.quote_id || !user?.id) continue;

        // Find the quote to get the customer's user_id
        const quote = quotes.find((q) => q.id === message.quote_id);
        if (!quote || !quote.user_id) {
          console.log('Skipping notification - no quote or user_id found');
          continue;
        }

        // Skip if trying to send message to self
        if (user.id === quote.user_id) {
          console.log('Skipping notification - cannot send message to self');
          continue;
        }

        let messageContent = '';
        let subject = '';

        if (status === 'verified') {
          messageContent = `Excellent news! Your payment has been verified and confirmed! 🎉\n\nWe have successfully processed your payment and your order is now being prepared.\n\n${notes ? `Admin Notes: ${notes}\n\n` : ''}Thank you for your payment and business with us!`;
          subject = 'Payment Confirmed - Order Processing';
        } else if (status === 'rejected') {
          messageContent = `We've reviewed your payment proof but unfortunately could not verify it.\n\n${notes ? `Reason: ${notes}\n\n` : ''}Please submit a new payment proof with the following:\n- Clear image showing the full transaction\n- Transaction ID/Reference number visible\n- Amount and date clearly shown\n\nYou can upload a new payment proof from your order page.`;
          subject = 'Payment Proof Rejected - Action Required';
        }

        if (messageContent) {
          const messageData = {
            sender_id: user.id,
            recipient_id: quote.user_id, // Use the quote's user_id as recipient
            quote_id: message.quote_id,
            subject,
            content: messageContent,
            message_type: 'payment_verification_result',
            is_read: false,
          };

          console.log('Attempting to send notification message:', messageData);

          const { error: msgError } = await supabase.from('messages').insert(messageData);

          if (msgError) {
            console.error('Failed to send notification message:', msgError);
            console.error('Message data that failed:', messageData);
            // Don't fail the whole operation, just log the error
          } else {
            console.log('Notification message sent successfully');
          }
        }
      }

      // Return the messages and quote IDs for use in onSuccess
      return { messages, quoteIds };
    },
    onSuccess: async (data) => {
      toast({
        title: 'Payment Confirmed!',
        description: `${selectedProofs.size} payment(s) verified and confirmed successfully. Amount paid has been updated.`,
      });
      setSelectedProofs(new Set());

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['payment-proofs'] });
      queryClient.invalidateQueries({ queryKey: ['payment-proofs-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update payment proofs: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && proofData?.data) {
      // Only select bank transfer proofs for bulk operations
      const bankTransferProofs = proofData.data.filter(
        (p) => p.payment_type === 'bank_transfer_proof',
      );
      setSelectedProofs(new Set(bankTransferProofs.map((p) => p.id)));
    } else {
      setSelectedProofs(new Set());
    }
  };

  const handleSelectProof = (id: string, checked: boolean) => {
    // Only allow selection of bank transfer proofs
    const proof = proofData?.data.find((p) => p.id === id);
    if (proof && proof.payment_type !== 'bank_transfer_proof') {
      return; // Don't allow selection of webhook payments
    }

    const newSelected = new Set(selectedProofs);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedProofs(newSelected);
  };

  const handleBulkAction = (action: 'verify' | 'reject') => {
    const status = action === 'verify' ? 'verified' : 'rejected';
    const notes =
      action === 'verify'
        ? 'Payment proof verified and payment confirmed automatically'
        : 'Payment proof rejected - please resubmit with clearer documentation';

    bulkUpdateMutation.mutate({
      ids: Array.from(selectedProofs),
      status,
      notes,
    });
  };

  const exportToCSV = () => {
    if (!proofData?.data || proofData.data.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no payment proofs to export.',
        variant: 'destructive',
      });
      return;
    }

    const headers = [
      'Order ID',
      'Customer Name',
      'Customer Email',
      'Amount',
      'Currency',
      'Payment Method',
      'Submission Date',
      'Verification Status',
      'Verified Amount',
      'Verified Date',
      'Admin Notes',
      'File Name',
    ];

    const rows = proofData.data.map((proof) => [
      proof.order_display_id,
      proof.customer_name,
      proof.customer_email,
      proof.final_total,
      proof.final_currency,
      proof.payment_method,
      format(new Date(proof.created_at), 'yyyy-MM-dd HH:mm'),
      proof.verification_status || 'pending',
      proof.amount_paid?.toString() || '0', // Use amount_paid instead of verified_amount
      proof.verified_at ? format(new Date(proof.verified_at), 'yyyy-MM-dd HH:mm') : '',
      proof.admin_notes || '',
      proof.attachment_file_name,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-proofs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Export successful',
      description: `Exported ${proofData.data.length} payment proofs to CSV.`,
    });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'verified':
        return (
          <Badge variant="outline" className="border-green-200 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="border-red-200 text-red-700">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-amber-200 text-amber-700">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    const icons: Record<string, React.ReactNode> = {
      bank_transfer: <DollarSign className="h-4 w-4 text-blue-600" />,
      cod: <DollarSign className="h-4 w-4 text-green-600" />,
      stripe: <DollarSign className="h-4 w-4 text-purple-600" />,
      payu: <DollarSign className="h-4 w-4 text-orange-600" />,
      esewa: <DollarSign className="h-4 w-4 text-green-600" />,
    };

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            {icons[method] || <DollarSign className="h-4 w-4 text-gray-600" />}
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {method.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const isImage = (filename: string) => {
    const ext = filename.toLowerCase().split('.').pop();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Check if any input or textarea is focused
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // Ctrl/Cmd + A to select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && proofData?.data) {
        e.preventDefault();
        handleSelectAll(true);
      }

      // Ctrl/Cmd + Shift + A to deselect all
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        handleSelectAll(false);
      }

      // V to verify selected
      if (e.key === 'v' && selectedProofs.size > 0) {
        e.preventDefault();
        handleBulkAction('verify');
      }

      // R to reject selected
      if (e.key === 'r' && selectedProofs.size > 0) {
        e.preventDefault();
        handleBulkAction('reject');
      }

      // E to export
      if (e.key === 'e') {
        e.preventDefault();
        exportToCSV();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedProofs, proofData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Payment Proofs</h1>
          <p className="text-sm text-muted-foreground">Review and verify payment submissions</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportToCSV}>
              <FileDown className="h-4 w-4 mr-2" />
              Export CSV
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Keyboard Shortcuts
            </DropdownMenuLabel>
            <DropdownMenuItem disabled>
              <Keyboard className="h-4 w-4 mr-2" />
              <span className="text-xs">Ctrl+A: Select all</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <span className="text-xs ml-6">V: Verify selected</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <span className="text-xs ml-6">R: Reject selected</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <span className="text-xs ml-6">E: Export CSV</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{statistics.total}</p>
                </div>
                <Receipt className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-amber-600">{statistics.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Verified</p>
                  <p className="text-2xl font-bold text-green-600">{statistics.verified}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{statistics.rejected}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order ID, customer, email, or file name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={paymentMethodFilter}
              onValueChange={(value) => setPaymentMethodFilter(value as typeof paymentMethodFilter)}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="payu">PayU</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="esewa">eSewa</SelectItem>
              </SelectContent>
            </Select>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedProofs.size > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-blue-900">
                {selectedProofs.size} payment proof(s) selected
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('verify')}
                  disabled={bulkUpdateMutation.isPending}
                  className="border-green-300 text-green-700 hover:bg-green-50"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Verify All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('reject')}
                  disabled={bulkUpdateMutation.isPending}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Proofs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Proofs</CardTitle>
          <CardDescription>Review and verify payment submissions from customers</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : proofData?.data && proofData.data.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedProofs.size > 0 &&
                          proofData.data
                            .filter((p) => p.payment_type === 'bank_transfer_proof')
                            .every((p) => selectedProofs.has(p.id))
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proofData.data.map((proof) => (
                    <TableRow key={proof.id} className="hover:bg-muted/50">
                      <TableCell>
                        {proof.payment_type === 'bank_transfer_proof' && (
                          <Checkbox
                            checked={selectedProofs.has(proof.id)}
                            onCheckedChange={(checked) =>
                              handleSelectProof(proof.id, checked as boolean)
                            }
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{proof.order_display_id}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{proof.customer_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {proof.customer_email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {proof.final_currency} {proof.final_total.toFixed(2)}
                        </div>
                        {proof.amount_paid > 0 && (
                          <div className="text-sm text-muted-foreground">
                            Paid: {proof.final_currency} {proof.amount_paid.toFixed(2)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(proof.payment_method)}
                          <span className="text-sm capitalize">
                            {proof.payment_method.replace('_', ' ')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(proof.verification_status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(proof.created_at), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(proof.created_at), 'HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {proof.attachment_url && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(proof.attachment_url, '_blank')}
                                  >
                                    {isImage(proof.attachment_file_name) ? (
                                      <Image className="h-4 w-4" />
                                    ) : (
                                      <FileText className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>View {proof.attachment_file_name}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {proof.payment_type === 'bank_transfer_proof' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedProof(proof);
                                    setShowPreviewModal(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View & Verify
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => window.open(proof.attachment_url, '_blank')}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download Proof
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {proofData.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * pageSize + 1} to{' '}
                    {Math.min(currentPage * pageSize, proofData.totalCount)} of{' '}
                    {proofData.totalCount} results
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className={
                            currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                          }
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(5, proofData.totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setCurrentPage((p) => Math.min(proofData.totalPages, p + 1))
                          }
                          className={
                            currentPage === proofData.totalPages
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">No payment proofs found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Payment proofs will appear here when customers submit them
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment proof verification now handled in UnifiedPaymentModal on order detail pages */}
    </div>
  );
};

export default PaymentManagementPage;
