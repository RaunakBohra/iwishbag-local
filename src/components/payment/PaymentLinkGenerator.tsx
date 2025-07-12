import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Link, Loader2, Copy, ExternalLink } from 'lucide-react';
import { usePaymentLinks } from '@/hooks/usePaymentLinks';
import { useToast } from '@/components/ui/use-toast';

interface PaymentLinkGeneratorProps {
  quoteId: string;
  amount: number;
  currency: string;
  customerInfo?: {
    name: string;
    email: string;
    phone: string;
  };
  onLinkCreated?: (link: any) => void;
}

export function PaymentLinkGenerator({
  quoteId,
  amount,
  currency,
  customerInfo,
  onLinkCreated,
}: PaymentLinkGeneratorProps) {
  const { toast } = useToast();
  const { createPaymentLink, isCreating } = usePaymentLinks();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: customerInfo?.name || '',
    email: customerInfo?.email || '',
    phone: customerInfo?.phone || '',
    description: '',
    expiryDays: '7',
    gateway: 'payu' as const,
  });
  const [createdLink, setCreatedLink] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await createPaymentLink({
      quoteId,
      amount,
      currency,
      customerInfo: {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      },
      description: formData.description,
      expiryDays: parseInt(formData.expiryDays),
      gateway: formData.gateway,
    });

    if (result?.success) {
      setCreatedLink(result);
      onLinkCreated?.(result);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: 'Link copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the link manually',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setCreatedLink(null);
    setFormData({
      name: customerInfo?.name || '',
      email: customerInfo?.email || '',
      phone: customerInfo?.phone || '',
      description: '',
      expiryDays: '7',
      gateway: 'payu',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link className="h-4 w-4 mr-2" />
          Generate Payment Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate Payment Link</DialogTitle>
          <DialogDescription>
            Create a payment link for {currency} {amount.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        {!createdLink ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="gateway">Payment Gateway</Label>
                <Select
                  value={formData.gateway}
                  onValueChange={(value: any) => setFormData({ ...formData, gateway: value })}
                >
                  <SelectTrigger id="gateway">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payu">PayU (India)</SelectItem>
                    <SelectItem value="stripe" disabled>Stripe (Coming Soon)</SelectItem>
                    <SelectItem value="paypal" disabled>PayPal (Coming Soon)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="name">Customer Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Customer Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Customer Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Payment for order..."
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="expiryDays">Link Expiry</Label>
                <Select
                  value={formData.expiryDays}
                  onValueChange={(value) => setFormData({ ...formData, expiryDays: value })}
                >
                  <SelectTrigger id="expiryDays">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Link'
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Payment Link Created!</h4>
              <p className="text-sm text-green-700">
                The payment link has been generated successfully.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Short Link</Label>
                <div className="flex gap-2">
                  <Input value={createdLink.shortUrl || ''} readOnly />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(createdLink.shortUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => window.open(createdLink.shortUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Details</Label>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p>Amount: ₹{createdLink.amountInINR} INR</p>
                  {createdLink.originalCurrency !== 'INR' && (
                    <p>Original: {createdLink.originalCurrency} {createdLink.originalAmount}</p>
                  )}
                  <p>Expires: {new Date(createdLink.expiresAt).toLocaleDateString()}</p>
                  <p>Link Code: {createdLink.linkCode}</p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Create Another
              </Button>
              <Button type="button" onClick={() => setOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}