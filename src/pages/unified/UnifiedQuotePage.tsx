import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Share2,
  Download,
  Edit,
  Trash2,
  AlertTriangle,
  Loader2,
  Smartphone,
  Monitor,
  Tablet,
  CheckCircle,
  Clock,
  User,
  Package,
  MapPin,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Import our unified components
// import { UnifiedQuoteCard } from '@/components/unified/UnifiedQuoteCard';
// import { UnifiedQuoteBreakdown } from '@/components/unified/UnifiedQuoteBreakdown';
import { UnifiedQuoteActions } from '@/components/unified/UnifiedQuoteActions';
import { UnifiedQuoteForm } from '@/components/unified/UnifiedQuoteForm';
import { QuoteThemeProvider, useQuoteTheme } from '@/contexts/QuoteThemeContext';

// Hooks
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useColorVariantTesting } from '@/hooks/useColorVariantTesting';

// Services
import { supabase } from '@/integrations/supabase/client';
import type { UnifiedQuote } from '@/types/unified-quote';

// PWA and mobile detection
const useDeviceDetection = () => {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isStandalone, setIsStandalone] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    // Device detection
    const checkDevice = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setDeviceType('mobile');
      } else if (width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    // PWA detection
    const checkPWA = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isIOSStandalone = (window.navigator as any).standalone === true;

      setIsStandalone(isStandaloneMode || (isIOS && isIOSStandalone));
    };

    // Install prompt detection
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    checkDevice();
    checkPWA();

    window.addEventListener('resize', checkDevice);
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return false;

    const result = await installPrompt.prompt();
    console.log('Install prompt result:', result);
    setInstallPrompt(null);

    return result.outcome === 'accepted';
  }, [installPrompt]);

  return {
    deviceType,
    isStandalone,
    installPrompt: installPrompt ? promptInstall : null,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
  };
};

// Performance monitoring hook
const usePagePerformance = (pageName: string) => {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    renderTime: 0,
    interactionTime: 0,
  });

  useEffect(() => {
    const startTime = performance.now();

    // Measure initial render
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();

      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          setMetrics((prev) => ({
            ...prev,
            loadTime: navEntry.loadEventEnd - navEntry.navigationStart,
          }));
        }

        if (entry.entryType === 'measure' && entry.name === 'component-render') {
          setMetrics((prev) => ({
            ...prev,
            renderTime: entry.duration,
          }));
        }
      });
    });

    observer.observe({ type: 'navigation', buffered: true });
    observer.observe({ type: 'measure', buffered: true });

    // Mark render complete
    setTimeout(() => {
      const renderTime = performance.now() - startTime;
      performance.mark('component-render-start');
      performance.mark('component-render-end');
      performance.measure('component-render', 'component-render-start', 'component-render-end');

      setMetrics((prev) => ({
        ...prev,
        renderTime,
      }));
    }, 0);

    // Track to analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_performance', {
        page_name: pageName,
        load_time: metrics.loadTime,
        render_time: metrics.renderTime,
        device_type: window.innerWidth < 768 ? 'mobile' : 'desktop',
      });
    }

    return () => observer.disconnect();
  }, [pageName, metrics.loadTime, metrics.renderTime]);

  return metrics;
};

// Main page component
interface UnifiedQuotePageProps {
  mode?: 'view' | 'edit' | 'create';
}

const UnifiedQuotePageContent: React.FC<UnifiedQuotePageProps> = ({ mode = 'view' }) => {
  const { quoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: isAdmin } = useAdminRole();
  const { trackConversion } = useColorVariantTesting();
  const { colors } = useQuoteTheme();

  // Device and performance detection
  const device = useDeviceDetection();
  const performance = usePagePerformance(`unified-quote-${mode}`);

  // State management
  const [isEditing, setIsEditing] = useState(mode === 'edit' || mode === 'create');
  const [showBreakdown, setShowBreakdown] = useState(!device.isMobile);
  const queryClient = useQueryClient();

  // Determine view mode
  const viewMode = useMemo(() => {
    if (isAdmin) return 'admin';
    if (user) return 'customer';
    return 'guest';
  }, [isAdmin, user]);

  // Fetch quote data
  const {
    data: quote,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: async () => {
      if (!quoteId || mode === 'create') return null;

      const { data, error } = await supabase
        .from('quotes')
        .select(
          `
          *,
          items:quote_items(*),
          profiles:profiles(preferred_display_currency)
        `,
        )
        .eq('id', quoteId)
        .single();

      if (error) throw error;
      return data as UnifiedQuote;
    },
    enabled: !!quoteId && mode !== 'create',
  });

  // Quote action mutation
  const quoteActionMutation = useMutation({
    mutationFn: async ({
      action,
      quote: quoteData,
      optimistic,
    }: {
      action: string;
      quote: UnifiedQuote;
      optimistic?: boolean;
    }) => {
      // Handle different actions
      switch (action) {
        case 'approve':
          const { error: approveError } = await supabase
            .from('quotes')
            .update({ status: 'approved' })
            .eq('id', quoteData.id);
          if (approveError) throw approveError;
          break;

        case 'reject':
          const { error: rejectError } = await supabase
            .from('quotes')
            .update({ status: 'rejected' })
            .eq('id', quoteData.id);
          if (rejectError) throw rejectError;
          break;

        case 'add-to-cart':
          // Add to cart logic here
          trackConversion('quote_added_to_cart', quoteData.final_total_usd);
          break;

        case 'edit':
          setIsEditing(true);
          break;

        case 'delete':
          const { error: deleteError } = await supabase
            .from('quotes')
            .delete()
            .eq('id', quoteData.id);
          if (deleteError) throw deleteError;
          navigate(viewMode === 'admin' ? '/admin/quotes' : '/dashboard/quotes');
          break;

        default:
          console.warn(`Unhandled action: ${action}`);
      }

      return { action, success: true };
    },
    onSuccess: (result) => {
      toast.success(`Quote ${result.action} successful`);
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
    onError: (error) => {
      console.error('Quote action failed:', error);
      toast.error('Action failed. Please try again.');
    },
  });

  // Form submission handler
  const handleFormSubmit = useCallback(
    async (formData: any, files?: File[]) => {
      try {
        if (mode === 'create') {
          // Create new quote
          const { data: newQuote, error } = await supabase
            .from('quotes')
            .insert({
              user_id: user?.id,
              customer_data: {
                info: {
                  name: formData.customerName,
                  email: formData.customerEmail,
                  phone: formData.customerPhone,
                },
              },
              destination_country: formData.destinationCountry,
              shipping_address: { formatted: formData.shippingAddress },
              notes: formData.specialInstructions,
              status: 'pending',
            })
            .select()
            .single();

          if (error) throw error;

          // Add items
          if (newQuote) {
            const { error: itemError } = await supabase.from('quote_items').insert({
              quote_id: newQuote.id,
              name: formData.productName,
              product_url: formData.productUrl,
              quantity: formData.quantity,
              price: formData.estimatedPrice,
            });

            if (itemError) throw itemError;
          }

          toast.success('Quote request submitted successfully!');
          navigate(`/quote/${newQuote.id}`);
        } else {
          // Update existing quote
          const { error } = await supabase
            .from('quotes')
            .update({
              notes: formData.specialInstructions,
              admin_notes: formData.adminNotes,
              priority: formData.priority,
            })
            .eq('id', quoteId);

          if (error) throw error;

          toast.success('Quote updated successfully!');
          setIsEditing(false);
          refetch();
        }

        trackConversion('quote_form_submitted', 1);
      } catch (error) {
        console.error('Form submission error:', error);
        toast.error('Failed to save quote. Please try again.');
        throw error;
      }
    },
    [mode, user?.id, quoteId, navigate, refetch, trackConversion],
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading quote...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Error Loading Quote</h2>
            <p className="text-gray-600 mb-4">
              {error instanceof Error ? error.message : 'Failed to load quote'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => refetch()} variant="outline">
                Try Again
              </Button>
              <Button onClick={() => navigate(-1)}>Go Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mobile layout
  if (device.isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Mobile header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <div className="flex items-center gap-2">
              {mode === 'view' && quote && (
                <>
                  <Badge variant="outline" className="text-xs">
                    {quote.status}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* PWA install prompt */}
          {device.installPrompt && !device.isStandalone && (
            <div className="mt-2 p-2 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-700">Install iwishBag App</span>
                </div>
                <Button
                  size="sm"
                  onClick={device.installPrompt}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Install
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Form or Quote Display */}
          {isEditing ? (
            <UnifiedQuoteForm
              mode={mode === 'create' ? 'create' : 'edit'}
              existingQuote={quote || undefined}
              viewMode={viewMode}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsEditing(false)}
              compact={true}
              className="shadow-none border-0"
            />
          ) : quote ? (
            <>
              {/* Quote Card */}
              {/* <UnifiedQuoteCard
                quote={quote}
                viewMode={viewMode}
                layout="card"
                className="shadow-sm"
              /> */}

              {/* Expandable Breakdown */}
              <Card className="shadow-sm">
                <button
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  className="w-full p-4 text-left flex items-center justify-between"
                >
                  <span className="font-medium">Price Breakdown</span>
                  <Badge variant="outline">${quote.final_total_usd?.toFixed(2)}</Badge>
                </button>

                {showBreakdown && (
                  <div className="border-t">
                    <UnifiedQuoteBreakdown
                      quote={quote}
                      viewMode={viewMode}
                      compact={true}
                      className="shadow-none border-0"
                    />
                  </div>
                )}
              </Card>

              {/* Mobile Actions */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-4">
                <UnifiedQuoteActions
                  quote={quote}
                  viewMode={viewMode}
                  layout="vertical"
                  size="lg"
                  onAction={(action, quote, optimistic) =>
                    quoteActionMutation.mutate({ action, quote, optimistic })
                  }
                  className="w-full"
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  // Desktop/Tablet layout
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-gray-400" />
                <h1 className="text-lg font-semibold">
                  {mode === 'create'
                    ? 'New Quote Request'
                    : mode === 'edit'
                      ? 'Edit Quote'
                      : quote?.display_id || `Quote #${quoteId?.slice(0, 8)}`}
                </h1>
                {quote && <Badge variant="outline">{quote.status}</Badge>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Device indicator */}
              <div className="flex items-center gap-1 text-sm text-gray-500">
                {device.isDesktop && <Monitor className="h-4 w-4" />}
                {device.isTablet && <Tablet className="h-4 w-4" />}
                {device.isMobile && <Smartphone className="h-4 w-4" />}
                <span className="hidden sm:inline">{device.deviceType}</span>
              </div>

              {mode === 'view' && quote && !isEditing && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>

                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>

                  {viewMode === 'admin' && (
                    <Button onClick={() => setIsEditing(true)} size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isEditing ? (
          <div className="max-w-4xl mx-auto">
            <UnifiedQuoteForm
              mode={mode === 'create' ? 'create' : 'edit'}
              existingQuote={quote || undefined}
              viewMode={viewMode}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        ) : quote ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* <UnifiedQuoteCard quote={quote} viewMode={viewMode} layout="detail" /> */}

              <UnifiedQuoteActions
                quote={quote}
                viewMode={viewMode}
                layout="horizontal"
                size="md"
                onAction={(action, quote, optimistic) =>
                  quoteActionMutation.mutate({ action, quote, optimistic })
                }
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <UnifiedQuoteBreakdown
                quote={quote}
                viewMode={viewMode}
                showComparisons={viewMode === 'admin'}
              />

              {/* Quote metadata */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-medium text-gray-900">Quote Details</h3>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>Created {new Date(quote.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>Customer: {quote.customer_data?.info?.name || 'Unknown'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>Destination: {quote.destination_country}</span>
                    </div>

                    {quote.expires_at && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>Expires {new Date(quote.expires_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Performance metrics (development only) */}
              {process.env.NODE_ENV === 'development' && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Performance</h3>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div>Load: {performance.loadTime.toFixed(0)}ms</div>
                      <div>Render: {performance.renderTime.toFixed(0)}ms</div>
                      <div>Device: {device.deviceType}</div>
                      <div>PWA: {device.isStandalone ? 'Yes' : 'No'}</div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <UnifiedQuoteForm
              mode="create"
              viewMode={viewMode}
              onSubmit={handleFormSubmit}
              onCancel={() => navigate(-1)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Main component with theme provider
export const UnifiedQuotePage: React.FC<UnifiedQuotePageProps> = (props) => {
  return (
    <QuoteThemeProvider>
      <UnifiedQuotePageContent {...props} />
    </QuoteThemeProvider>
  );
};

export default UnifiedQuotePage;
