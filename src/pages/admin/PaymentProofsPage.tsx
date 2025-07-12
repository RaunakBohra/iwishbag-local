import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { PaymentProofPreviewModal } from '@/components/payment/PaymentProofPreviewModal';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  verified_amount: number | null;
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
  gateway_response?: any;
  gateway_name?: string;
}

const PaymentProofsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [selectedProofs, setSelectedProofs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('pending');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'bank_transfer' | 'payu' | 'stripe' | 'esewa'>('all');
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedProof, setSelectedProof] = useState<PaymentProofData | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Fetch payment proofs with pagination
  const { data: proofData, isLoading, refetch } = useQuery({
    queryKey: ['payment-proofs', currentPage, pageSize, statusFilter, paymentMethodFilter, searchQuery, dateRange],
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
          const quoteIds = [...new Set(messages.map(m => m.quote_id).filter(Boolean))];
          const senderIds = [...new Set(messages.map(m => m.sender_id).filter(Boolean))];

          // Fetch quotes data
          let quotesData: any[] = [];
          if (quoteIds.length > 0) {
            const { data } = await supabase
              .from('quotes')
              .select('id, order_display_id, final_total, final_currency, payment_method, payment_status, email, amount_paid, user_id')
              .in('id', quoteIds);
            quotesData = data || [];
          }

          // Fetch profiles data
          let profilesData: any[] = [];
          if (senderIds.length > 0) {
            const { data } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', senderIds);
            profilesData = data || [];
          }

          // Create lookup maps
          const quotesMap = new Map(quotesData.map(q => [q.id, q]));
          const profilesMap = new Map(profilesData.map(p => [p.id, p]));

          // Transform bank transfer data
          const bankTransferData = messages.map(item => {
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
              verified_amount: item.verified_amount,
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
      if (paymentMethodFilter === 'all' || ['payu', 'stripe', 'esewa'].includes(paymentMethodFilter)) {
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
            'pending': 'pending',
            'verified': 'completed', // Webhook payments are auto-verified when completed
            'rejected': 'failed'
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
          const quoteIds = [...new Set(transactions.map(t => t.quote_id).filter(Boolean))];
          const userIds = [...new Set(transactions.map(t => t.user_id).filter(Boolean))];

          // Fetch quotes data
          let quotesData: any[] = [];
          if (quoteIds.length > 0) {
            const { data } = await supabase
              .from('quotes')
              .select('id, order_display_id, final_total, final_currency, payment_method, payment_status, email, amount_paid, user_id')
              .in('id', quoteIds);
            quotesData = data || [];
          }

          // Fetch profiles data
          let profilesData: any[] = [];
          if (userIds.length > 0) {
            const { data } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', userIds);
            profilesData = data || [];
          }

          // Create lookup maps
          const quotesMap = new Map(quotesData.map(q => [q.id, q]));
          const profilesMap = new Map(profilesData.map(p => [p.id, p]));

          // Transform webhook payment data
          const webhookData = transactions.map(item => {
            const quote = quotesMap.get(item.quote_id);
            const profile = profilesMap.get(item.user_id);
            
            // Map webhook status to verification status
            const getVerificationStatus = (status: string) => {
              switch (status) {
                case 'completed': return 'verified';
                case 'failed': return 'rejected';
                case 'pending': return 'pending';
                default: return null;
              }
            };

            const gatewayName = item.payment_method === 'payu' ? 'PayU' : 
                              item.payment_method === 'stripe' ? 'Stripe' : 
                              item.payment_method === 'esewa' ? 'eSewa' : 
                              item.payment_method || 'Unknown';

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
              verified_amount: item.amount,
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
      allPaymentData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Apply client-side search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        allPaymentData = allPaymentData.filter(item => 
          item.order_display_id.toLowerCase().includes(query) ||
          item.customer_email.toLowerCase().includes(query) ||
          item.customer_name.toLowerCase().includes(query) ||
          item.attachment_file_name.toLowerCase().includes(query) ||
          (item.transaction_id && item.transaction_id.toLowerCase().includes(query)) ||
          (item.gateway_name && item.gateway_name.toLowerCase().includes(query))
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
      let bankTransferStats = { total: 0, pending: 0, verified: 0, rejected: 0 };
      let webhookStats = { total: 0, pending: 0, verified: 0, rejected: 0 };

      // Get bank transfer stats if needed
      if (paymentMethodFilter === 'all' || paymentMethodFilter === 'bank_transfer') {
        const { data: allProofs, error } = await supabase
          .from('messages')
          .select('verification_status')
          .eq('message_type', 'payment_proof');

        if (!error && allProofs) {
          bankTransferStats.total = allProofs.length;
          bankTransferStats.pending = allProofs.filter(p => !p.verification_status || p.verification_status === 'pending').length;
          bankTransferStats.verified = allProofs.filter(p => p.verification_status === 'verified').length;
          bankTransferStats.rejected = allProofs.filter(p => p.verification_status === 'rejected').length;
        }
      }

      // Get webhook payment stats if needed
      if (paymentMethodFilter === 'all' || ['payu', 'stripe', 'esewa'].includes(paymentMethodFilter)) {
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
          webhookStats.pending = allTransactions.filter(t => t.status === 'pending').length;
          webhookStats.verified = allTransactions.filter(t => t.status === 'completed').length;
          webhookStats.rejected = allTransactions.filter(t => t.status === 'failed').length;
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
    mutationFn: async ({ ids, status, notes }: { ids: string[], status: 'verified' | 'rejected', notes: string }) => {
      const user = (await supabase.auth.getUser()).data.user;
      
      // Get message details first
      const { data: messages, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .in('id', ids);

      if (fetchError) throw fetchError;
      
      // Get quote IDs from messages
      const quoteIds = messages?.map(m => m.quote_id).filter(Boolean) || [];
      
      // Fetch quote details separately
      let quotes: any[] = [];
      if (quoteIds.length > 0) {
        const { data: quotesData, error: quotesError } = await supabase
          .from('quotes')
          .select('*')
          .in('id', quoteIds);
          
        if (quotesError) throw quotesError;
        quotes = quotesData || [];
      }

      // Update the verification status
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          verification_status: status,
          admin_notes: notes,
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
        })
        .in('id', ids);

      if (updateError) throw updateError;

      // For verified payments, automatically confirm payment
      if (status === 'verified') {
        for (const message of messages || []) {
          if (!message.quote_id) continue;
          
          // Find the corresponding quote from our fetched quotes
          const quote = quotes.find(q => q.id === message.quote_id);
          if (!quote) continue;
          
          const orderTotal = quote.final_total || 0;
          const existingPaid = quote.amount_paid || 0;
          
          // Use the order total as the verified amount if not specified
          const amountReceived = orderTotal;
          const totalPaid = existingPaid + amountReceived;
          
          // Determine payment status
          let paymentStatus = 'unpaid';
          if (totalPaid >= orderTotal) {
            paymentStatus = totalPaid > orderTotal ? 'overpaid' : 'paid';
          } else if (totalPaid > 0) {
            paymentStatus = 'partial';
          }

          // Update quote with payment confirmation
          const { error: paymentError } = await supabase
            .from('quotes')
            .update({
              payment_status: paymentStatus,
              paid_at: new Date().toISOString(),
              amount_paid: totalPaid
            })
            .eq('id', message.quote_id);

          if (paymentError) {
            console.error('Error updating payment:', paymentError);
            // Don't fail the whole operation, just log the error
          }
        }
      }

      // Send notifications to customers
      for (const message of messages || []) {
        if (!message.quote_id || !user?.id) continue;

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
          await supabase
            .from('messages')
            .insert({
              sender_id: user.id,
              recipient_id: message.sender_id,
              quote_id: message.quote_id,
              subject,
              content: messageContent,
              message_type: 'payment_verification_result'
            });
        }
      }
    },
    onSuccess: () => {
      toast({
        title: 'Payment Confirmed!',
        description: `${selectedProofs.size} payment(s) verified and confirmed successfully. Amount paid has been updated.`,
      });
      setSelectedProofs(new Set());
      refetch();
      // Invalidate all admin-orders queries (regardless of filters)
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'admin-orders' 
      });
      queryClient.invalidateQueries({ queryKey: ['payment-proof-stats'] });
      
      // Invalidate specific quote queries for each message
      for (const message of messages || []) {
        if (message.quote_id) {
          queryClient.invalidateQueries({ queryKey: ['admin-quote', message.quote_id] });
          queryClient.invalidateQueries({ queryKey: ['quotes', message.quote_id] });
        }
      }
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
      const bankTransferProofs = proofData.data.filter(p => p.payment_type === 'bank_transfer_proof');
      setSelectedProofs(new Set(bankTransferProofs.map(p => p.id)));
    } else {
      setSelectedProofs(new Set());
    }
  };

  const handleSelectProof = (id: string, checked: boolean) => {
    // Only allow selection of bank transfer proofs
    const proof = proofData?.data.find(p => p.id === id);
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
    const notes = action === 'verify' 
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
      'File Name'
    ];

    const rows = proofData.data.map(proof => [
      proof.order_display_id,
      proof.customer_name,
      proof.customer_email,
      proof.final_total,
      proof.final_currency,
      proof.payment_method,
      format(new Date(proof.created_at), 'yyyy-MM-dd HH:mm'),
      proof.verification_status || 'pending',
      proof.verified_amount || '',
      proof.verified_at ? format(new Date(proof.verified_at), 'yyyy-MM-dd HH:mm') : '',
      proof.admin_notes || '',
      proof.attachment_file_name
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
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
        return <Badge variant="outline" className="border-green-200 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="border-red-200 text-red-700"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline" className="border-amber-200 text-amber-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
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
            <p className="text-xs">{method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
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
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
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
            <DropdownMenuLabel className="text-xs text-muted-foreground">Keyboard Shortcuts</DropdownMenuLabel>
            <DropdownMenuItem className="text-xs" disabled>
              <span className="flex-1">Select all</span>
              <kbd className="text-xs">⌘A</kbd>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs" disabled>
              <span className="flex-1">Verify</span>
              <kbd className="text-xs">V</kbd>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs" disabled>
              <span className="flex-1">Reject</span>
              <kbd className="text-xs">R</kbd>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Statistics Summary Bar */}
      {statistics && statistics.pending > 0 && (
        <div className="bg-amber-50/50 border border-amber-200/50 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-medium text-amber-800">
              {statistics.pending} pending review
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{statistics.total} total</span>
            <span>{statistics.verified} verified</span>
            <span>{statistics.rejected} rejected</span>
          </div>
        </div>
      )}

      {/* Simplified Notice */}
      <div className="bg-green-50/50 border border-green-200/50 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
          <div className="text-sm text-green-800">
            <p className="font-medium">✓ Simplified One-Click Process</p>
            <p className="text-xs mt-1">
              Click the verify button (✓) to <strong>verify proof AND confirm payment</strong> in one action. The payment amount will be automatically updated!
            </p>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Payment Proofs</CardTitle>
            <div className="flex gap-2">
              {selectedProofs.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-green-300 hover:bg-green-50"
                    onClick={() => handleBulkAction('verify')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify & Confirm Payment ({selectedProofs.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-300 hover:bg-red-50"
                    onClick={() => handleBulkAction('reject')}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Selected ({selectedProofs.size})
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order ID, customer, file name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentMethodFilter} onValueChange={(value: any) => setPaymentMethodFilter(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="payu">PayU</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="esewa">eSewa</SelectItem>
              </SelectContent>
            </Select>
            
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              className="w-[300px]"
            />
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={proofData?.data && selectedProofs.size === proofData.data.filter(p => p.payment_type === 'bank_transfer_proof').length && proofData.data.filter(p => p.payment_type === 'bank_transfer_proof').length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="w-[50px]">Method</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-16 w-16 rounded-lg" /></TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-36" />
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-4 rounded-full" /></TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Skeleton className="h-8 w-8 rounded" />
                          <Skeleton className="h-8 w-8 rounded" />
                          <Skeleton className="h-8 w-8 rounded" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : proofData?.data && proofData.data.length > 0 ? (
                  proofData.data.map((proof) => (
                    <TableRow key={proof.id} className={`hover:bg-gray-50 ${(!proof.verification_status || proof.verification_status === 'pending') ? 'border-l-4 border-l-amber-400' : ''}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedProofs.has(proof.id)}
                          onCheckedChange={(checked) => handleSelectProof(proof.id, checked as boolean)}
                          disabled={proof.payment_type === 'webhook_payment'}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => {
                                    if (proof.payment_type === 'bank_transfer_proof') {
                                      setSelectedProof(proof);
                                      setShowPreviewModal(true);
                                    }
                                  }}
                                  className={`flex items-center gap-2 ${proof.payment_type === 'bank_transfer_proof' ? 'hover:text-primary' : 'cursor-default'}`}
                                >
                                  <div className="w-8 h-8 relative bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                    {proof.payment_type === 'webhook_payment' ? (
                                      // Webhook payment icon
                                      <div className="flex items-center justify-center h-full">
                                        {proof.gateway_name === 'PayU' && <DollarSign className="h-4 w-4 text-orange-600" />}
                                        {proof.gateway_name === 'Stripe' && <DollarSign className="h-4 w-4 text-purple-600" />}
                                        {proof.gateway_name === 'eSewa' && <DollarSign className="h-4 w-4 text-green-600" />}
                                        {!['PayU', 'Stripe', 'eSewa'].includes(proof.gateway_name || '') && <DollarSign className="h-4 w-4 text-blue-600" />}
                                      </div>
                                    ) : isImage(proof.attachment_file_name) ? (
                                      <img
                                        src={proof.attachment_url}
                                        alt="Payment proof"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                        }}
                                      />
                                    ) : (
                                      <div className="flex items-center justify-center h-full">
                                        <FileText className="h-4 w-4 text-gray-400" />
                                      </div>
                                    )}
                                    <div className="hidden flex items-center justify-center h-full">
                                      <Image className="h-4 w-4 text-gray-400" />
                                    </div>
                                  </div>
                                  <span className="font-medium">#{proof.order_display_id}</span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">
                                  {proof.payment_type === 'webhook_payment' 
                                    ? `${proof.gateway_name} Transaction` 
                                    : proof.attachment_file_name}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{proof.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{proof.customer_email}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{proof.final_currency} {proof.final_total.toFixed(2)}</p>
                        {proof.verified_amount && (
                          <p className="text-xs text-green-600">✓ {proof.final_currency} {proof.verified_amount.toFixed(2)}</p>
                        )}
                        {proof.payment_status !== 'paid' && proof.verification_status === 'verified' && (
                          <div className="mt-1 p-1 bg-amber-100 border border-amber-300 rounded text-xs">
                            <p className="text-amber-800 font-medium">⚠️ Legacy verification - payment not confirmed</p>
                            <p className="text-amber-700 text-[10px] mt-0.5">Click order ID to manually confirm payment</p>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {getPaymentMethodIcon(proof.payment_method)}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{format(new Date(proof.created_at), 'MMM dd')}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(proof.created_at), 'HH:mm')}</p>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(proof.verification_status)}
                      </TableCell>
                      <TableCell className="text-right">
                        {proof.payment_type === 'webhook_payment' ? (
                          // Webhook payments - show status info
                          <div className="flex items-center justify-end gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <span>Auto-verified</span>
                                    {proof.transaction_id && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs"
                                        onClick={() => {
                                          // Show transaction details
                                          toast({
                                            title: `${proof.gateway_name} Transaction`,
                                            description: `ID: ${proof.transaction_id}\nAmount: ${proof.final_currency} ${proof.verified_amount}\nStatus: ${proof.verification_status}`,
                                          });
                                        }}
                                      >
                                        View
                                      </Button>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Automatically verified by {proof.gateway_name} webhook</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        ) : (!proof.verification_status || proof.verification_status === 'pending') ? (
                          // Bank transfer proofs - show manual verification buttons
                          <div className="flex items-center justify-end gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600"
                                    onClick={() => {
                                      // Unified verify & confirm payment action
                                      bulkUpdateMutation.mutate({
                                        ids: [proof.id],
                                        status: 'verified',
                                        notes: 'Payment proof verified and payment confirmed automatically',
                                      });
                                    }}
                                    disabled={bulkUpdateMutation.isPending}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Verify & Confirm Payment (One Click)</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                                    onClick={() => {
                                      bulkUpdateMutation.mutate({
                                        ids: [proof.id],
                                        status: 'rejected',
                                        notes: 'Payment proof unclear - please resubmit',
                                      });
                                    }}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Reject</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => window.open(proof.attachment_url, '_blank')}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => window.open(proof.attachment_url, '_blank')}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <Receipt className="h-12 w-12 text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">No payment proofs found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {proofData && proofData.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, proofData.totalCount)} of {proofData.totalCount} results
              </p>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, proofData.totalPages) }, (_, i) => {
                    const pageNumber = currentPage <= 3 ? i + 1 : currentPage + i - 2;
                    if (pageNumber > proofData.totalPages) return null;
                    
                    return (
                      <Button
                        key={pageNumber}
                        variant={pageNumber === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNumber)}
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === proofData.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(proofData.totalPages)}
                  disabled={currentPage === proofData.totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {selectedProof && (
        <PaymentProofPreviewModal
          isOpen={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedProof(null);
            refetch();
          }}
          message={{
            id: selectedProof.id,
            quote_id: selectedProof.quote_id,
            sender_id: selectedProof.sender_id,
            attachment_url: selectedProof.attachment_url,
            attachment_file_name: selectedProof.attachment_file_name,
            created_at: selectedProof.created_at,
            verification_status: selectedProof.verification_status,
            admin_notes: selectedProof.admin_notes,
            verified_at: selectedProof.verified_at,
            verified_by: selectedProof.verified_by,
            verified_amount: selectedProof.verified_amount,
            message_type: 'payment_proof',
            subject: '',
            content: '',
            is_read: true,
            recipient_id: '',
            reply_to_message_id: null,
            sender_email: selectedProof.customer_email,
            sender_name: selectedProof.customer_name,
            updated_at: selectedProof.created_at,
          }}
          orderId={selectedProof.quote_id}
          onStatusUpdate={() => {
            refetch();
            // Invalidate all admin-orders queries (regardless of filters)
            queryClient.invalidateQueries({ 
              predicate: (query) => query.queryKey[0] === 'admin-orders' 
            });
            queryClient.invalidateQueries({ queryKey: ['payment-proof-stats'] });
            if (selectedProof?.quote_id) {
              queryClient.invalidateQueries({ queryKey: ['admin-quote', selectedProof.quote_id] });
              queryClient.invalidateQueries({ queryKey: ['quotes', selectedProof.quote_id] });
            }
          }}
        />
      )}
    </div>
  );
};

export { PaymentProofsPage };