import React, { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Tables } from "@/integrations/supabase/types";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { MultiCurrencyDisplay } from "@/components/admin/MultiCurrencyDisplay";
import { useAdminCurrencyDisplay } from "@/hooks/useAdminCurrencyDisplay";
import { Receipt, Percent, Package, Truck, Shield, CreditCard, Gift, Info, ChevronDown, ChevronUp, Download, Hash, Calendar, MapPin } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { format } from "date-fns";

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
  "Total Item Price": "The total cost of all items in your quote",
  "Sales Tax": "Tax applied based on your location and applicable tax laws",
  "Merchant Shipping": "Shipping cost from the merchant to our facility",
  "International Shipping": "Cost of shipping your items internationally",
  "Customs & ECS": "Customs duties and Electronic Cargo Security fees",
  "Domestic Shipping": "Final delivery cost to your address",
  "Handling Charge": "Fee for processing and preparing your shipment",
  "Insurance": "Optional insurance coverage for your shipment",
  "Payment Gateway Fee": "Processing fee for payment transactions",
  "Discount": "Any applicable discounts or promotions",
  "Subtotal": "Total before taxes and additional fees",
  "VAT": "Value Added Tax based on your location",
};

export const QuoteBreakdownDetails: React.FC<QuoteBreakdownDetailsProps> = ({
  quote,
  countrySettings,
}) => {
  const { formatAmount } = useUserCurrency();
  const { formatMultiCurrency } = useAdminCurrencyDisplay();
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  const finalTotalCurrencies = quote.final_total ? formatMultiCurrency({
    usdAmount: quote.final_total,
    quoteCurrency: quote.final_currency,
    customerPreferredCurrency: quote.profiles?.preferred_display_currency,
    showAllVariations: true
  }) : [];

  const totalWeight = quote.quote_items?.reduce((sum, item) => sum + (item.item_weight || 0), 0) || 0;

  const renderRow = (label: string, amount: number | null, isDiscount = false, icon?: React.ReactNode) => {
    if (amount === null || amount === undefined || amount === 0) return null;
    
    const sign = isDiscount ? '-' : '';
    const colorClass = isDiscount ? 'text-green-600' : '';

    return (
      <div className={`flex justify-between items-center py-2 ${colorClass}`}>
        <div className="flex items-center gap-2">
          {icon && <span className="text-gray-400">{icon}</span>}
          <div className="flex items-center gap-1">
            <span>{label}</span>
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
        <span className="font-medium">{sign}{formatAmount(amount)}</span>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 md:p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-gray-600">
            <Package className="h-4 w-4" />
            <span className="text-sm font-medium">Cost of Goods</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total cost of all items in the quote</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="mt-2 text-lg font-semibold">
            {formatAmount(quote.item_price || 0)}
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-gray-600">
            <Receipt className="h-4 w-4" />
            <span className="text-sm font-medium">Quote Total</span>
            <Dialog open={isBreakdownOpen} onOpenChange={setIsBreakdownOpen}>
              <DialogTrigger asChild>
                <button className="group relative">
                  <Info className="h-3 w-3 text-gray-400 hover:text-gray-600 transition-colors animate-bounce hover:animate-none" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl w-[95vw] md:w-[90vw]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-blue-500" />
                    Quote Breakdown
                  </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Items</h3>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Download className="h-4 w-4" />
                        Download PDF
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {quote.quote_items?.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-sm bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            {item.image_url && (
                              <img 
                                src={item.image_url} 
                                alt={item.product_name}
                                className="w-10 h-10 rounded-md object-cover"
                              />
                            )}
                            <div>
                              <div className="font-medium">{item.product_name}</div>
                              <div className="text-gray-500">Quantity: {item.quantity}</div>
                            </div>
                          </div>
                          <span className="font-medium">{formatAmount(item.item_price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold">Charges & Fees</h3>
                    <div className="space-y-2">
                      {renderRow("Total Item Price", quote.item_price, false, <Package className="h-4 w-4" />)}
                      {renderRow("Sales Tax", quote.sales_tax_price, false, <Percent className="h-4 w-4" />)}
                      {renderRow("Merchant Shipping", quote.merchant_shipping_price, false, <Truck className="h-4 w-4" />)}
                      {renderRow("International Shipping", quote.international_shipping, false, <Truck className="h-4 w-4" />)}
                      {renderRow("Customs & ECS", quote.customs_and_ecs, false, <Shield className="h-4 w-4" />)}
                      {renderRow("Domestic Shipping", quote.domestic_shipping, false, <Truck className="h-4 w-4" />)}
                      {renderRow("Handling Charge", quote.handling_charge, false, <Package className="h-4 w-4" />)}
                      {renderRow("Insurance", quote.insurance_amount, false, <Shield className="h-4 w-4" />)}
                      {renderRow("Payment Gateway Fee", quote.payment_gateway_fee, false, <CreditCard className="h-4 w-4" />)}
                      {renderRow("Discount", quote.discount, true, <Gift className="h-4 w-4" />)}
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      {renderRow("Subtotal", quote.sub_total, false, <Receipt className="h-4 w-4" />)}
                      {renderRow("VAT", quote.vat, false, <Percent className="h-4 w-4" />)}
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex justify-between items-center font-semibold">
                        <span>Total Amount</span>
                        <MultiCurrencyDisplay
                          currencies={finalTotalCurrencies}
                          orientation="vertical"
                          showLabels={true}
                          compact={false}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="mt-2 text-lg font-semibold">
            <MultiCurrencyDisplay 
              currencies={finalTotalCurrencies}
              orientation="vertical"
              showLabels={true}
              compact={false}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-gray-600">
            <Package className="h-4 w-4" />
            <span className="text-sm font-medium">Total Weight</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total weight of all items in the quote</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="mt-2 text-lg font-semibold">
            {`${totalWeight} ${countrySettings?.weight_unit || 'kg'}`}
          </div>
        </div>
      </div>
    </div>
  );
};
