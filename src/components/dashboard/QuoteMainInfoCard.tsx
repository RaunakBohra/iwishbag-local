import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ProductImage } from '@/components/ui/product-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface QuoteMainInfoCardProps {
  imageUrl?: string | null;
  productName: string;
  quoteId: string;
  status?: string;
  price: string;
  eta?: string;
  ctaLabel: string;
  onCtaClick: () => void;
  ctaDisabled?: boolean;
  hint?: string;
  disclaimer?: string;
  onRejectClick?: () => void;
  showRejectLink?: boolean;
}

export const QuoteMainInfoCard: React.FC<QuoteMainInfoCardProps> = ({
  imageUrl,
  productName,
  quoteId,
  status,
  price,
  eta,
  ctaLabel,
  onCtaClick,
  ctaDisabled,
  hint,
  disclaimer,
  onRejectClick,
  showRejectLink = false,
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <Card className="w-full max-w-4xl mx-auto mb-8 overflow-hidden shadow-sm border border-gray-100">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          {/* Left: Product Image (smaller on mobile) */}
          {imageUrl && (
            <div className="w-full md:w-1/3 bg-gray-50 flex items-center justify-center p-4 md:p-6">
              <ProductImage 
                imageUrl={imageUrl} 
                productName={productName} 
                size="lg"
                className="max-h-[120px] w-[80px] md:max-h-[300px] md:w-auto object-contain rounded-md border border-gray-200 bg-white"
              />
            </div>
          )}

          {/* Right: Content */}
          <div className={imageUrl ? "flex-1 p-4 md:p-6 flex flex-col gap-4 justify-center" : "w-full p-4 md:p-6 flex flex-col gap-4 justify-center"}>
            {/* Header */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base md:text-lg font-semibold text-gray-900">Quote #{quoteId}</span>
                {status && (
                  <Badge variant="outline" className="capitalize text-xs px-2 py-0.5">{status}</Badge>
                )}
              </div>
              <span className="text-lg md:text-xl font-bold text-gray-900 leading-tight">{productName}</span>
            </div>

            <Separator />

            {/* Price and ETA */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl md:text-3xl font-bold text-gray-900">{price}</span>
                {eta && (
                  <span className="text-xs md:text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="h-4 w-4" /> ETA: {eta}
                  </span>
                )}
              </div>
            </div>

            {/* Action Button and Hint */}
            <div className="flex flex-col gap-1 mt-2">
              <Button
                className="w-full rounded-lg text-base font-semibold py-3"
                size="lg"
                onClick={onCtaClick}
                disabled={ctaDisabled}
                variant="destructive"
              >
                {ctaLabel}
              </Button>
              {showRejectLink && onRejectClick && !ctaDisabled && (
                <div className="text-xs text-muted-foreground mt-2 text-center">
                  Not happy with this quote?{' '}
                  <button
                    className="underline hover:text-primary transition-colors"
                    onClick={onRejectClick}
                    type="button"
                  >
                    Reject Quote
                  </button>
                </div>
              )}
              {hint && (
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-1 ml-1">
                  <Info className="h-3 w-3" />
                  <span>{hint}</span>
                  <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                      <button 
                        type="button" 
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Show disclaimer"
                      >
                        <Info className="h-3 w-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="max-w-xs text-xs p-3">
                      {disclaimer || 'By proceeding, you agree to our terms and conditions. This is a placeholder disclaimer fetched from backend settings.'}
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 