import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
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
  className = '' 
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareLink, setShareLink] = useState<string>('');
  const [expiresInDays, setExpiresInDays] = useState('7');

  const generateShareToken = () => {
    return 'share_' + Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
  };

  const generateShareLink = async () => {
    setIsGenerating(true);
    try {
      const shareToken = generateShareToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));

      const { error } = await supabase
        .from('quotes')
        .update({
          share_token: shareToken,
          expires_at: expiresAt.toISOString(),
          is_anonymous: true
        })
        .eq('id', quote.id);

      if (error) throw error;

      const baseUrl = window.location.origin;
      const link = `${baseUrl}/s/${shareToken}`;
      setShareLink(link);

      toast({
        title: "Share Link Generated!",
        description: "Quote share link has been created successfully.",
      });

    } catch (error: any) {
      console.error('Error generating share link:', error);
      toast({
        title: "Error",
        description: "Failed to generate share link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast({
        title: "Copied!",
        description: "Share link copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  const openInNewTab = () => {
    window.open(shareLink, '_blank');
  };

  const hasExistingShareLink = quote.share_token && quote.expires_at && new Date(quote.expires_at) > new Date();

  const handleOpen = () => {
    if (hasExistingShareLink) {
      const baseUrl = window.location.origin;
      setShareLink(`${baseUrl}/s/${quote.share_token}`);
    } else {
      setShareLink('');
    }
    setIsOpen(true);
  };

  if (variant === 'icon') {
    return (
      <>
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => { 
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
              {!shareLink ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="expires">Link Expires In</Label>
                    <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
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

                  <Button 
                    onClick={generateShareLink} 
                    disabled={isGenerating}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4 mr-2" />
                        Generate Share Link
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Share Link</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={shareLink} 
                        readOnly 
                        className="flex-1"
                      />
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
              {shareLink && !hasExistingShareLink && (
                <Button 
                  onClick={generateShareLink} 
                  disabled={isGenerating}
                  variant="outline"
                >
                  Generate New Link
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Button
      size={size}
      variant="outline"
      onClick={handleOpen}
      className={className}
    >
      <Share2 className="h-4 w-4 mr-2" />
      Share Quote
    </Button>
  );
};