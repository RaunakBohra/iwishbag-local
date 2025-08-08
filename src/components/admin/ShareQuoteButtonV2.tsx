import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Share2,
  Copy,
  Clock,
  ExternalLink,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  DollarSign,
  User,
  Calendar,
} from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type Quote = Tables<'quotes'>;

interface ShareQuoteButtonV2Props {
  quote: Quote;
  variant?: 'icon' | 'button';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

type ShareState = 'initial' | 'existing' | 'generated' | 'generating' | 'error';

export const ShareQuoteButtonV2: React.FC<ShareQuoteButtonV2Props> = ({
  quote,
  variant = 'icon',
  size = 'default',
  className = '',
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [shareState, setShareState] = useState<ShareState>('initial');
  const [shareLink, setShareLink] = useState<string>('');
  const [expiresInDays, setExpiresInDays] = useState('7');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const linkInputRef = useRef<HTMLInputElement>(null);

  // Check if there's an existing valid share link
  const hasExistingShareLink =
    quote.share_token && quote.expires_at && new Date(quote.expires_at) > new Date();

  // Calculate time until expiry
  const getExpiryInfo = () => {
    if (!quote.expires_at) return null;

    const expiryDate = new Date(quote.expires_at);
    const now = new Date();
    const hoursUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (hoursUntilExpiry <= 0) return { status: 'expired', text: 'Expired' };
    if (hoursUntilExpiry <= 24)
      return { status: 'warning', text: `Expires in ${hoursUntilExpiry}h` };

    const daysUntilExpiry = Math.ceil(hoursUntilExpiry / 24);
    return { status: 'active', text: `Expires in ${daysUntilExpiry}d` };
  };

  const expiryInfo = getExpiryInfo();

  // Initialize modal state
  useEffect(() => {
    if (isOpen) {
      if (hasExistingShareLink) {
        setShareState('existing');
        setShareLink(`${window.location.origin}/s/${quote.share_token}`);
      } else {
        setShareState('initial');
        setShareLink('');
      }
      setCopySuccess(false);
    }
  }, [isOpen, hasExistingShareLink, quote.share_token]);

  const generateShareToken = () => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const randomString = Array.from(array, (byte) => byte.toString(36)).join('');
    return 'share_' + randomString + Date.now().toString(36);
  };

  const generateShareLink = async () => {
    setShareState('generating');

    try {
      const shareToken = generateShareToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseFloat(expiresInDays));

      const updateData: any = {
        share_token: shareToken,
        expires_at: expiresAt.toISOString(),
      };

      if (!quote.email) {
        updateData.is_anonymous = true;
      }

      const { error } = await supabase.from('quotes').update(updateData).eq('id', quote.id);

      if (error) throw error;

      const link = `${window.location.origin}/s/${shareToken}`;
      setShareLink(link);
      setShareState('generated');

      // Auto-focus the link input for easy copying
      setTimeout(() => {
        linkInputRef.current?.focus();
        linkInputRef.current?.select();
      }, 100);

      toast({
        title: 'Share Link Generated!',
        description: 'Your quote share link is ready to use.',
      });
    } catch (error) {
      console.error('Error generating share link:', error);
      setShareState('error');
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate share link. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopySuccess(true);

      // Reset success state after 2 seconds
      setTimeout(() => setCopySuccess(false), 2000);

      toast({
        title: 'Copied!',
        description: 'Share link copied to clipboard.',
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy link. Please try selecting and copying manually.',
        variant: 'destructive',
      });
    }
  };

  const openInNewTab = () => {
    window.open(shareLink, '_blank');
  };

  const handleUpdateExpiry = async () => {
    setShareState('generating');

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseFloat(expiresInDays));

      const { error } = await supabase
        .from('quotes')
        .update({ expires_at: expiresAt.toISOString() })
        .eq('id', quote.id);

      if (error) throw error;

      setShareState('existing');
      toast({
        title: 'Expiry Updated!',
        description: `Share link expiry extended to ${expiresInDays === '0.000694' ? '1 minute' : expiresInDays + ' days'}.`,
      });
    } catch (error) {
      console.error('Error updating expiry:', error);
      setShareState('error');
      toast({
        title: 'Update Failed',
        description: 'Failed to update expiry. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsAdvancedOpen(false);
    setCopySuccess(false);
  };

  const renderTriggerButton = () => {
    if (variant === 'icon') {
      return (
        <Button
          size="icon"
          variant="ghost"
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
          className={cn(
            'h-7 w-7 rounded-md hover:bg-primary/10 hover:text-primary transition-colors',
            className,
          )}
          aria-label="Share Quote"
        >
          <Share2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
        </Button>
      );
    }

    return (
      <Button
        size={size}
        variant="outline"
        onClick={() => setIsOpen(true)}
        className={cn('gap-2', className)}
      >
        <Share2 className="h-4 w-4" />
        Share Quote
      </Button>
    );
  };

  const renderQuotePreview = () => (
    <Card className="border-l-4 border-l-teal-500 bg-gradient-to-r from-teal-50 to-blue-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900">
                Quote {quote.display_id || quote.id.substring(0, 8)}
              </h4>
              <Badge variant="outline" className="text-xs">
                {quote.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {quote.final_total_origincurrency && (
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />${quote.final_total_origincurrency.toFixed(2)}
                </div>
              )}
              {quote.email && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {quote.email}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(quote.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderContent = () => {
    switch (shareState) {
      case 'initial':
        return (
          <div className="space-y-4">
            <div className="text-center py-6">
              <Share2 className="h-12 w-12 text-teal-500 mx-auto mb-3" />
              <h3 className="font-semibold text-lg text-gray-900">Create Share Link</h3>
              <p className="text-gray-600 text-sm mt-1">
                Generate a secure link to share this quote
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="expiry">Link Expires In</Label>
                <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.000694">1 Minute (Testing)</SelectItem>
                    <SelectItem value="1">1 Day</SelectItem>
                    <SelectItem value="3">3 Days</SelectItem>
                    <SelectItem value="7">7 Days (Recommended)</SelectItem>
                    <SelectItem value="14">14 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={generateShareLink}
                className="w-full min-h-[44px]"
                size="lg"
                aria-describedby="generate-help-text"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Generate Share Link
              </Button>
              <p id="generate-help-text" className="sr-only">
                This will create a secure link that expires in{' '}
                {expiresInDays === '0.000694' ? '1 minute' : expiresInDays + ' days'}
              </p>
            </div>
          </div>
        );

      case 'existing':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-green-900">Active Share Link</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-green-700">{expiryInfo?.text}</span>
                  {expiryInfo?.status === 'warning' && (
                    <AlertCircle className="h-3 w-3 text-orange-500" />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Share Link</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    ref={linkInputRef}
                    value={shareLink}
                    readOnly
                    className="flex-1 font-mono text-sm"
                    onClick={(e) => e.currentTarget.select()}
                  />
                  <Button
                    size="icon"
                    variant={copySuccess ? 'default' : 'outline'}
                    onClick={copyToClipboard}
                    className={cn(
                      'transition-all duration-200',
                      copySuccess && 'bg-green-600 hover:bg-green-700',
                    )}
                  >
                    {copySuccess ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button size="icon" variant="outline" onClick={openInNewTab}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={copyToClipboard}
                  className="flex-1 min-h-[44px]"
                  size="lg"
                  aria-label={
                    copySuccess ? 'Link copied to clipboard' : 'Copy share link to clipboard'
                  }
                >
                  {copySuccess ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShareState('initial')}
                  className="min-h-[44px]"
                  aria-label="Generate a new share link"
                >
                  Generate New
                </Button>
              </div>
            </div>
          </div>
        );

      case 'generated':
        return (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg text-gray-900">Link Generated!</h3>
              <p className="text-gray-600 text-sm mt-1">Your quote share link is ready to use</p>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Share Link</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    ref={linkInputRef}
                    value={shareLink}
                    readOnly
                    className="flex-1 font-mono text-sm bg-green-50 border-green-200"
                    onClick={(e) => e.currentTarget.select()}
                  />
                  <Button
                    size="icon"
                    variant={copySuccess ? 'default' : 'outline'}
                    onClick={copyToClipboard}
                    className={cn(
                      'transition-all duration-200',
                      copySuccess && 'bg-green-600 hover:bg-green-700',
                    )}
                  >
                    {copySuccess ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button size="icon" variant="outline" onClick={openInNewTab}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button
                onClick={copyToClipboard}
                className="w-full min-h-[44px]"
                size="lg"
                aria-label={copySuccess ? 'Link copied successfully' : 'Copy generated share link'}
              >
                {copySuccess ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'generating':
        return (
          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="h-12 w-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="font-semibold text-lg text-gray-900">Generating Link...</h3>
              <p className="text-gray-600 text-sm mt-1">
                Please wait while we create your share link
              </p>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="space-y-4">
            <div className="text-center py-6">
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="font-semibold text-lg text-gray-900">Generation Failed</h3>
              <p className="text-gray-600 text-sm mt-1">Something went wrong. Please try again.</p>
            </div>

            <Button
              onClick={() => setShareState('initial')}
              className="w-full min-h-[44px]"
              variant="outline"
              aria-label="Try generating share link again"
            >
              Try Again
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const renderAdvancedOptions = () => (
    <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-2 h-auto">
          <span className="text-sm font-medium">Advanced Options</span>
          {isAdvancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-3">
        {shareState === 'existing' && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="new-expiry">Update Expiry</Label>
              <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Day</SelectItem>
                  <SelectItem value="3">3 Days</SelectItem>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="14">14 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleUpdateExpiry}
              variant="outline"
              className="w-full"
              disabled={shareState === 'generating'}
            >
              <Clock className="h-4 w-4 mr-2" />
              Update Expiry
            </Button>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <>
      {renderTriggerButton()}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="max-w-lg sm:max-w-lg w-[95vw] sm:w-full max-h-[85vh] overflow-y-auto"
          onEscapeKeyDown={handleClose}
          aria-labelledby="share-quote-title"
          aria-describedby="share-quote-description"
        >
          <DialogHeader>
            <DialogTitle
              id="share-quote-title"
              className="flex items-center gap-2 text-lg sm:text-xl"
            >
              <Share2 className="h-5 w-5 text-teal-600" />
              Share Quote
            </DialogTitle>
            <DialogDescription id="share-quote-description" className="text-sm sm:text-base">
              Create and manage shareable links for your quote
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {renderQuotePreview()}
            {renderContent()}
            {(shareState === 'existing' || shareState === 'generated') && renderAdvancedOptions()}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              className="min-h-[44px] px-6"
              aria-label="Close share quote dialog"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
