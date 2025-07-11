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
}

const PaymentProofsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [selectedProofs, setSelectedProofs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('pending');
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
    queryKey: ['payment-proofs', currentPage, pageSize, statusFilter, searchQuery, dateRange],
    queryFn: async () => {
      // First get count
      let countQuery = supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('message_type', 'payment_proof');

      if (statusFilter !== 'all') {
        countQuery = countQuery.eq('verification_status', statusFilter);
      }

      // Note: For count, we can't search on joined data, so we'll only count based on attachment filename
      if (searchQuery) {
        countQuery = countQuery.or(`attachment_file_name.ilike.%${searchQuery}%`);
      }

      if (dateRange.from && dateRange.to) {
        countQuery = countQuery
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString());
      }

      const { count } = await countQuery;

      // Then get paginated data - fetch messages first
      let dataQuery = supabase
        .from('messages')
        .select('*')
        .eq('message_type', 'payment_proof')
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (statusFilter !== 'all') {
        dataQuery = dataQuery.eq('verification_status', statusFilter);
      }

      // Remove server-side search filter for messages query since we'll filter client-side

      if (dateRange.from && dateRange.to) {
        dataQuery = dataQuery
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString());
      }

      const { data: messages, error } = await dataQuery;

      if (error) throw error;

      // Get unique quote IDs and sender IDs
      const quoteIds = [...new Set(messages?.map(m => m.quote_id).filter(Boolean) || [])];
      const senderIds = [...new Set(messages?.map(m => m.sender_id).filter(Boolean) || [])];

      // Fetch quotes data
      let quotesData: any[] = [];
      if (quoteIds.length > 0) {
        const { data } = await supabase
          .from('quotes')
          .select('id, order_display_id, final_total, final_currency, payment_method, payment_status, email, amount_paid')
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

      // Transform data
      let transformedData = messages?.map(item => {
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
          payment_method: quote?.payment_method || 'unknown',
          payment_status: quote?.payment_status || 'unpaid',
          customer_email: quote?.email || 'N/A',
          customer_name: profile?.full_name || 'Unknown Customer',
          amount_paid: quote?.amount_paid || 0,
        };
      }) as PaymentProofData[];

      // Apply client-side search filter
      if (searchQuery && transformedData) {
        const query = searchQuery.toLowerCase();
        transformedData = transformedData.filter(item => 
          item.order_display_id.toLowerCase().includes(query) ||
          item.customer_email.toLowerCase().includes(query) ||
          item.customer_name.toLowerCase().includes(query) ||
          item.attachment_file_name.toLowerCase().includes(query)
        );
      }

      return {
        data: transformedData || [],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch overall statistics
  const { data: statistics } = useQuery({
    queryKey: ['payment-proofs-stats'],
    queryFn: async () => {
      const { data: allProofs, error } = await supabase
        .from('messages')
        .select('verification_status')
        .eq('message_type', 'payment_proof');

      if (error) throw error;

      const total = allProofs?.length || 0;
      const pending = allProofs?.filter(p => !p.verification_status || p.verification_status === 'pending').length || 0;
      const verified = allProofs?.filter(p => p.verification_status === 'verified').length || 0;
      const rejected = allProofs?.filter(p => p.verification_status === 'rejected').length || 0;

      return { total, pending, verified, rejected };
    },
    refetchInterval: 30000,
  });

  // Unified verify & confirm payment operation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, status, notes }: { ids: string[], status: 'verified' | 'rejected', notes: string }) => {
      const user = (await supabase.auth.getUser()).data.user;
      
      // Get message details first to access quote information
      const { data: messages, error: fetchError } = await supabase
        .from('messages')
        .select('*, quotes!inner(*)')
        .in('id', ids);

      if (fetchError) throw fetchError;

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
          if (!message.quote_id || !message.quotes) continue;
          
          const quote = message.quotes;
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
      setSelectedProofs(new Set(proofData.data.map(p => p.id)));
    } else {
      setSelectedProofs(new Set());
    }
  };

  const handleSelectProof = (id: string, checked: boolean) => {
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
                      checked={proofData?.data && selectedProofs.size === proofData.data.length}
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
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => {
                                    setSelectedProof(proof);
                                    setShowPreviewModal(true);
                                  }}
                                  className="flex items-center gap-2 hover:text-primary"
                                >
                                  <div className="w-8 h-8 relative bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                    {isImage(proof.attachment_file_name) ? (
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
                                <p className="text-xs">{proof.attachment_file_name}</p>
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
                        {(!proof.verification_status || proof.verification_status === 'pending') ? (
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