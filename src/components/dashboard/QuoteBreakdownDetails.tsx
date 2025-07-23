import React, { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Tables } from '@/integrations/supabase/types';
import { useQuoteCurrency } from '@/hooks/useCurrency';
import { currencyService } from '@/services/CurrencyService';
import {
  Receipt,
  Percent,
  Package,
  Truck,
  Shield,
  CreditCard,
  Gift,
  Info,
  Download,
} from 'lucide-react';
import { useQuoteRoute } from '@/hooks/useQuoteRoute';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
// Removed unused imports: cn, Tabs, Accordion, format
import { motion } from 'framer-motion';

type Quote = Tables<'quotes'> & {
  profiles?: { preferred_display_currency?: string } | null;
  quote_items?: Tables<'quote_items'>[];
};

type CountrySetting = Tables<'country_settings'>;

interface QuoteBreakdownDetailsProps {
  quote: Quote;
  countrySettings?: CountrySetting | null;
}

const chargeDescriptions = {
  'Total Item Price': 'The total cost of all items in your quote',
  'Sales Tax': 'Tax applied based on your location and applicable tax laws',
  'Merchant Shipping': 'Shipping cost from the merchant to our facility',
  'International Shipping': 'Cost of shipping your items internationally',
  'Customs & ECS': 'Customs duties and Electronic Cargo Security fees',
  'Domestic Shipping': 'Final delivery cost to your address',
  'Handling Charge': 'Carrier fee for processing, packaging, and preparing your shipment for international delivery',
  'Package Protection': 'Optional insurance coverage protecting against loss, damage, or theft during shipping',
  Insurance: 'Optional insurance coverage for your shipment',
  'Payment Gateway Fee': 'Processing fee for payment transactions',
  Discount: 'Any applicable discounts or promotions',
  Subtotal: 'Total before taxes and additional fees',
  VAT: 'Value Added Tax based on your location',
};

export const QuoteBreakdownDetails = React.memo<QuoteBreakdownDetailsProps>(
  ({ quote, countrySettings }) => {
    const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

    // Use unified route determination - same as customs tiers and shipping routes
    const routeInfo = useQuoteRoute(quote);

    // Default to US if route info is not available yet
    const originCountry = routeInfo?.origin || 'US';
    const destinationCountry = routeInfo?.destination || 'US';

    // Use the new unified currency hook
    const currencyDisplay = useQuoteCurrency(quote);

    console.log('[QuoteBreakdownDetails] Debug info:', {
      originCountry,
      destinationCountry,
      exchangeRate: currencyDisplay.exchangeRate,
      quote_id: quote.id,
    });

    // Use modern items structure (same as calculations) or fallback to legacy quote_items
    const totalWeight = quote.items
      ? quote.items.reduce((sum, item) => sum + (item.weight_kg || 0) * (item.quantity || 1), 0)
      : quote.quote_items?.reduce((sum, item) => sum + (item.item_weight || 0) * (item.quantity || 1), 0) || 0;

    const renderRow = (
      label: string,
      amount: number | null,
      isDiscount = false,
      icon?: React.ReactNode,
    ) => {
      if (amount === null || amount === undefined || amount === 0) return null;

      const sign = isDiscount ? '-' : '';
      const colorClass = isDiscount ? 'text-green-600' : '';

      // Format amount in customer's preferred currency (single currency)
      const formattedAmount = currencyDisplay.formatAmount(amount);

      return (
        <div className={`flex justify-between items-center py-1.5 sm:py-2 ${colorClass}`}>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {icon && <span className="text-gray-400">{icon}</span>}
            <div className="flex items-center gap-1">
              <span className="text-xs sm:text-sm">{label}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{chargeDescriptions[label as keyof typeof chargeDescriptions]}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="text-right">
            <span className="font-medium text-xs sm:text-sm">
              {sign}
              {formattedAmount}
            </span>
          </div>
        </div>
      );
    };

    return (
      <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="bg-muted border border-border rounded-lg p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm font-medium">Cost of Goods</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total cost of all items in the quote</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-base sm:text-lg font-semibold text-foreground">
                  {currencyDisplay.formatAmount(quote.item_price || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm font-medium">Total Weight</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total weight of all items in the quote</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-base sm:text-lg font-semibold text-foreground">
                  {`${totalWeight} ${countrySettings?.weight_unit || 'kg'}`}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-muted border border-border rounded-lg p-4 sm:p-6 flex flex-col justify-center h-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Receipt className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm font-medium">Quote Total</span>
                <Dialog open={isBreakdownOpen} onOpenChange={setIsBreakdownOpen}>
                  <DialogTrigger asChild>
                    <div
                      className="relative flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 p-0"
                      style={{ minWidth: 20, minHeight: 20 }}
                    >
                      <motion.div
                        className="absolute w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-emerald-500/70"
                        initial={{ scale: 0.8, opacity: 0.8 }}
                        animate={{
                          scale: [0.8, 1.4],
                          opacity: [0.8, 0],
                        }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          ease: 'easeOut',
                        }}
                      />
                      <motion.div
                        className="absolute w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-emerald-500/60"
                        initial={{ scale: 0.8, opacity: 0.6 }}
                        animate={{
                          scale: [0.8, 1.4],
                          opacity: [0.6, 0],
                        }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          ease: 'easeOut',
                          delay: 0.4,
                        }}
                      />
                      <motion.div
                        className="absolute w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-emerald-500/50"
                        initial={{ scale: 0.8, opacity: 0.4 }}
                        animate={{
                          scale: [0.8, 1.4],
                          opacity: [0.4, 0],
                        }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          ease: 'easeOut',
                          delay: 0.8,
                        }}
                      />
                      <Info className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500 relative" />
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl w-[95vw] md:w-[90vw] bg-card border border-border">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-foreground">
                        <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
                        Quote Breakdown
                      </DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 py-4">
                      <div className="space-y-3 sm:space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm sm:text-base">Items</h3>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 sm:gap-2 bg-white/20 border-white/30 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                          >
                            <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                            Download PDF
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {/* Support both modern items and legacy quote_items structures */}
                          {(quote.items || quote.quote_items)?.map((item) => (
                            <div
                              key={item.id}
                              className="flex justify-between items-center text-xs sm:text-sm bg-white/20 border border-white/30 rounded-lg p-2 sm:p-3"
                            >
                              <div className="flex items-center gap-2 sm:gap-3">
                                {(item.image || item.image_url) && (
                                  <img
                                    src={item.image || item.image_url}
                                    alt={item.name || item.product_name}
                                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-md object-cover"
                                  />
                                )}
                                <div>
                                  <div className="font-medium">{item.name || item.product_name}</div>
                                  <div className="text-muted-foreground">
                                    Quantity: {item.quantity}
                                  </div>
                                </div>
                              </div>
                              <span className="font-medium">
                                {currencyService.formatAmount(
                                  (item.price_usd || item.item_price) * item.quantity,
                                  currencyService.getCurrencyForCountrySync(destinationCountry),
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3 sm:space-y-4">
                        <h3 className="font-semibold text-sm sm:text-base">Charges & Fees</h3>
                        <div className="space-y-1.5 sm:space-y-2">
                          {renderRow(
                            'Total Item Price',
                            quote.item_price,
                            false,
                            <Package className="h-3 w-3 sm:h-4 sm:w-4" />,
                          )}
                          {renderRow(
                            'Sales Tax',
                            quote.calculation_data?.breakdown?.taxes,
                            false,
                            <Percent className="h-3 w-3 sm:h-4 sm:w-4" />,
                          )}
                          {/* Merchant shipping is now included in International Shipping breakdown */}
                          {renderRow(
                            'International Shipping',
                            quote.calculation_data?.breakdown?.shipping,
                            false,
                            <Truck className="h-3 w-3 sm:h-4 sm:w-4" />,
                          )}
                          {renderRow(
                            'Customs & ECS',
                            quote.calculation_data?.breakdown?.customs,
                            false,
                            <Shield className="h-3 w-3 sm:h-4 sm:w-4" />,
                          )}
                          {renderRow(
                            'Domestic Shipping',
                            quote.domestic_shipping,
                            false,
                            <Truck className="h-3 w-3 sm:h-4 sm:w-4" />,
                          )}
                          {renderRow(
                            'Handling Charge',
                            quote.calculation_data?.breakdown?.handling,
                            false,
                            <Package className="h-3 w-3 sm:h-4 sm:w-4" />,
                          )}
                          {renderRow(
                            'Package Protection',
                            quote.calculation_data?.breakdown?.insurance,
                            false,
                            <Shield className="h-3 w-3 sm:h-4 sm:w-4" />,
                          )}
                          {renderRow(
                            'Payment Gateway Fee',
                            quote.calculation_data?.breakdown?.fees,
                            false,
                            <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />,
                          )}
                          {renderRow(
                            'Discount',
                            quote.discount,
                            true,
                            <Gift className="h-3 w-3 sm:h-4 sm:w-4" />,
                          )}
                        </div>
                        <Separator />
                        <div className="space-y-1.5 sm:space-y-2">
                          {renderRow(
                            'Subtotal',
                            quote.sub_total,
                            false,
                            <Receipt className="h-3 w-3 sm:h-4 sm:w-4" />,
                          )}
                          {renderRow(
                            'VAT',
                            quote.vat,
                            false,
                            <Percent className="h-3 w-3 sm:h-4 sm:w-4" />,
                          )}
                        </div>
                        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 sm:p-4">
                          <div className="flex justify-between items-center font-semibold text-sm sm:text-base">
                            <span>Total Amount</span>
                            {(() => {
                              const _purchaseCountry = quote.destination_country || 'US';

                              // Try to get destination country from various possible fields
                              let _deliveryCountry = 'US';
                              if (quote.destination_country) {
                                _deliveryCountry = quote.destination_country;
                              } else if (quote.shipping_address) {
                                const shippingAddress =
                                  typeof quote.shipping_address === 'string'
                                    ? JSON.parse(quote.shipping_address)
                                    : quote.shipping_address;
                                _deliveryCountry =
                                  shippingAddress?.destination_country ||
                                  shippingAddress?.country ||
                                  'US';
                              }

                              const _exchangeRate = quote.exchange_rate;
                              // Use customer's preferred currency for display
                              return (
                                <span className="text-foreground">
                                  {currencyDisplay.formatAmount(quote.final_total_usd || 0)}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {(() => {
                const _purchaseCountry = quote.destination_country || 'US';

                // Try to get destination country from various possible fields
                let _deliveryCountry = 'US';
                if (quote.destination_country) {
                  _deliveryCountry = quote.destination_country;
                } else if (quote.shipping_address) {
                  const shippingAddress =
                    typeof quote.shipping_address === 'string'
                      ? JSON.parse(quote.shipping_address)
                      : quote.shipping_address;
                  _deliveryCountry =
                    shippingAddress?.destination_country || shippingAddress?.country || 'US';
                }

                const _exchangeRate = quote.exchange_rate;
                // Use customer's preferred currency for display
                return (
                  <div className="text-right">
                    <div className="text-base sm:text-lg font-semibold text-foreground">
                      {currencyDisplay.formatAmount(quote.final_total_usd || 0)}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  },
);
