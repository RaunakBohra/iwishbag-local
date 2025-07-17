import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Share2, Copy, Clock, ExternalLink } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type Quote = Tables<'quotes'>;

interface ShareQuoteButtonProps {
  quote: Quote;
  variant?: 'icon' | 'button';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export const ShareQuoteButton: React.FC<ShareQuoteButtonProps> = ({
  quote,
  variant = 'icon',
  size = 'default',
  className = '',
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareLink, setShareLink] = useState<string>('');
  const [expiresInDays, setExpiresInDays] = useState('7');

  const generateShareToken = () => {
    // Use crypto.getRandomValues for secure token generation
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const randomString = Array.from(array, (byte) => byte.toString(36)).join('');
    return 'share_' + randomString + Date.now().toString(36);
  };

  const generateShareLink = async () => {
    setIsGenerating(true);
    try {
      const shareToken = generateShareToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseFloat(expiresInDays));

      // Only set is_anonymous if the quote doesn't have an email
      interface ShareLinkUpdateData {
        share_token: string;
        expires_at: string;
        is_anonymous?: boolean;
      }

      const updateData: ShareLinkUpdateData = {
        share_token: shareToken,
        expires_at: expiresAt.toISOString(),
      };

      // Only set is_anonymous to true if there's no email
      if (!quote.email) {
        updateData.is_anonymous = true;
      }

      const { error } = await supabase.from('quotes').update(updateData).eq('id', quote.id);

      if (error) throw error;

      const baseUrl = window.location.origin;
      const link = `${baseUrl}/s/${shareToken}`;
      setShareLink(link);

      toast({
        title: 'Share Link Generated!',
        description: 'Quote share link has been created successfully.',
      });
    } catch (error) {
      console.error('Error generating share link:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate share link. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const updateExpiryOnly = async () => {
    setIsGenerating(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseFloat(expiresInDays));

      const { error } = await supabase
        .from('quotes')
        .update({
          expires_at: expiresAt.toISOString(),
        })
        .eq('id', quote.id);

      if (error) throw error;

      toast({
        title: 'Expiry Updated!',
        description: `Share link expiry updated to ${expiresInDays === '0.000694' ? '1 minute' : expiresInDays + ' days'}.`,
      });

      // Close the dialog after updating
      setIsOpen(false);
    } catch (error) {
      console.error('Error updating expiry:', error);
      toast({
        title: 'Error',
        description: 'Failed to update expiry. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast({
        title: 'Copied!',
        description: 'Share link copied to clipboard.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to copy link to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const openInNewTab = () => {
    window.open(shareLink, '_blank');
  };

  const hasExistingShareLink =
    quote.share_token && quote.expires_at && new Date(quote.expires_at) > new Date();

  const handleOpen = () => {
    // Always reset to allow generating new links
    setShareLink('');
    setIsOpen(true);
  };

  if (variant === 'icon') {
    return (
      <>
        <Button
          size="icon"
          variant="ghost"
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            handleOpen();
          }}
          className={`h-7 w-7 rounded-md hover:bg-primary/10 hover:text-primary transition-colors ${className}`}
          aria-label="Share Quote"
        >
          <Share2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
        </Button>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Share Quote
              </DialogTitle>
              <DialogDescription>
                Generate a shareable link for quote {quote.display_id || quote.id.substring(0, 8)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {hasExistingShareLink && !shareLink && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold">Existing share link:</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs flex-1">
                        {window.location.origin}/s/{quote.share_token}
                      </p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => {
                          if (quote.share_token) {
                            navigator.clipboard.writeText(
                              `${window.location.origin}/s/${quote.share_token}`,
                            );
                            toast({
                              title: 'Copied!',
                              description: 'Share link copied to clipboard.',
                            });
                          }
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Expires: {new Date(quote.expires_at!).toLocaleDateString()}
                    </p>
                    <Button
                      size="sm"
                      variant="link"
                      className="text-xs p-0 h-auto mt-2"
                      onClick={updateExpiryOnly}
                      disabled={isGenerating}
                    >
                      Update expiry to{' '}
                      {expiresInDays === '0.000694' ? '1 minute' : expiresInDays + ' days'}
                    </Button>
                  </div>
                </div>
              )}

              {!shareLink ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="expires">Link Expires In</Label>
                    <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.000694">1 Minute (Testing)</SelectItem>
                        <SelectItem value="1">1 Day</SelectItem>
                        <SelectItem value="3">3 Days</SelectItem>
                        <SelectItem value="7">7 Days</SelectItem>
                        <SelectItem value="14">14 Days</SelectItem>
                        <SelectItem value="30">30 Days</SelectItem>
                        <SelectItem value="90">90 Days</SelectItem>
                        <SelectItem value="365">1 Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={generateShareLink} disabled={isGenerating} className="w-full">
                    {isGenerating ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4 mr-2" />
                        {hasExistingShareLink ? 'Generate New Share Link' : 'Generate Share Link'}
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Share Link</Label>
                    <div className="flex gap-2">
                      <Input value={shareLink} readOnly className="flex-1" />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={copyToClipboard}
                        aria-label="Copy link"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={openInNewTab}
                        aria-label="Open in new tab"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {hasExistingShareLink && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Expires: {new Date(quote.expires_at!).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Close
              </Button>
              {shareLink && (
                <Button
                  onClick={() => {
                    setShareLink('');
                    setExpiresInDays('7');
                  }}
                  variant="outline"
                >
                  Generate Another Link
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Button size={size} variant="outline" onClick={handleOpen} className={className}>
        <Share2 className="h-4 w-4 mr-2" />
        Share Quote
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share Quote
            </DialogTitle>
            <DialogDescription>
              Generate a shareable link for quote {quote.display_id || quote.id.substring(0, 8)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {hasExistingShareLink && !shareLink && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-sm text-blue-900">
                  <p className="font-semibold">Existing share link:</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs flex-1">
                      {window.location.origin}/s/{quote.share_token}
                    </p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => {
                        if (quote.share_token) {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/s/${quote.share_token}`,
                          );
                          toast({
                            title: 'Copied!',
                            description: 'Share link copied to clipboard.',
                          });
                        }
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Expires: {new Date(quote.expires_at!).toLocaleDateString()}
                  </p>
                  <Button
                    size="sm"
                    variant="link"
                    className="text-xs p-0 h-auto mt-2"
                    onClick={updateExpiryOnly}
                    disabled={isGenerating}
                  >
                    Update expiry to{' '}
                    {expiresInDays === '0.000694' ? '1 minute' : expiresInDays + ' days'}
                  </Button>
                </div>
              </div>
            )}

            {!shareLink ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="expires">Link Expires In</Label>
                  <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.000694">1 Minute (Testing)</SelectItem>
                      <SelectItem value="1">1 Day</SelectItem>
                      <SelectItem value="3">3 Days</SelectItem>
                      <SelectItem value="7">7 Days</SelectItem>
                      <SelectItem value="14">14 Days</SelectItem>
                      <SelectItem value="30">30 Days</SelectItem>
                      <SelectItem value="90">90 Days</SelectItem>
                      <SelectItem value="365">1 Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={generateShareLink} disabled={isGenerating} className="w-full">
                  {isGenerating ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4 mr-2" />
                      {hasExistingShareLink ? 'Generate New Share Link' : 'Generate Share Link'}
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Share Link</Label>
                  <div className="flex gap-2">
                    <Input value={shareLink} readOnly className="flex-1" />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={copyToClipboard}
                      aria-label="Copy link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={openInNewTab}
                      aria-label="Open in new tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            {shareLink && (
              <Button
                onClick={() => {
                  setShareLink('');
                  setExpiresInDays('7');
                }}
                variant="outline"
              >
                Generate Another Link
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
