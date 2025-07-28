import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Package,
  Clock,
  MapPin,
  User,
  Calendar,
  Download,
  Share2,
  CheckCircle,
  ShoppingCart,
  AlertCircle,
  Truck,
  Shield,
  CreditCard,
  Globe,
  FileText,
  MessageSquare,
  ChevronRight,
  Crown,
  Gift,
  Calculator,
  Info,
  Eye,
  Copy,
  ExternalLink,
  TrendingUp,
  Activity,
  BarChart3,
  Sparkles,
  Zap,
  Star,
} from 'lucide-react';
import { format } from 'date-fns';
import type { UnifiedQuote } from '@/types/unified-quote';

interface ModernQuoteLayoutProps {
  quote: UnifiedQuote;
  onAddToCart?: () => void;
  onDownloadPDF?: () => void;
  onShare?: () => void;
  isAddingToCart?: boolean;
  children?: React.ReactNode;
}

export const ModernQuoteLayout: React.FC<ModernQuoteLayoutProps> = ({
  quote,
  onAddToCart,
  onDownloadPDF,
  onShare,
  isAddingToCart = false,
  children,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedQuoteId, setCopiedQuoteId] = useState(false);

  // Calculate quote progress
  const statusOrder = ['pending', 'sent', 'approved', 'paid', 'ordered', 'shipped', 'delivered'];
  const currentStatusIndex = statusOrder.indexOf(quote.status);
  const progress = ((currentStatusIndex + 1) / statusOrder.length) * 100;

  // Get status color and icon
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending':
      case 'calculated':
        return { color: 'bg-yellow-500', icon: Clock, label: 'Pending' };
      case 'sent':
        return { color: 'bg-blue-500', icon: MessageSquare, label: 'Sent' };
      case 'approved':
        return { color: 'bg-green-500', icon: CheckCircle, label: 'Approved' };
      case 'paid':
        return { color: 'bg-purple-500', icon: CreditCard, label: 'Paid' };
      case 'ordered':
        return { color: 'bg-indigo-500', icon: ShoppingCart, label: 'Ordered' };
      case 'shipped':
        return { color: 'bg-cyan-500', icon: Truck, label: 'Shipped' };
      case 'delivered':
        return { color: 'bg-emerald-500', icon: Package, label: 'Delivered' };
      case 'rejected':
        return { color: 'bg-red-500', icon: AlertCircle, label: 'Rejected' };
      default:
        return { color: 'bg-gray-500', icon: Info, label: status };
    }
  };

  const statusStyle = getStatusStyle(quote.status);
  const StatusIcon = statusStyle.icon;

  const handleCopyQuoteId = () => {
    navigator.clipboard.writeText(quote.id);
    setCopiedQuoteId(true);
    setTimeout(() => setCopiedQuoteId(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Modern Header with Gradient */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-6 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-12 h-12 rounded-full ${statusStyle.color} bg-opacity-20 flex items-center justify-center`}>
                <StatusIcon className={`h-6 w-6 ${statusStyle.color.replace('bg-', 'text-')}`} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  Quote #{quote.id}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyQuoteId}
                    className="h-6 w-6 p-0"
                  >
                    {copiedQuoteId ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </h1>
                <p className="text-sm text-gray-600">
                  Created {format(new Date(quote.created_at), 'MMM d, yyyy')} • 
                  {quote.destination_country} → {quote.origin_country}
                </p>
              </div>
            </div>
            
            {/* Status Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="default" className={`${statusStyle.color} text-white`}>
                  {statusStyle.label}
                </Badge>
                <span className="text-sm text-gray-600">{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {quote.status === 'approved' && onAddToCart && (
              <Button
                onClick={onAddToCart}
                disabled={isAddingToCart}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                {isAddingToCart ? 'Adding...' : 'Add to Cart'}
              </Button>
            )}
            {onDownloadPDF && (
              <Button variant="outline" onClick={onDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            )}
            {onShare && (
              <Button variant="outline" onClick={onShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Status Timeline (Mobile-friendly) */}
      <Card className="mb-8 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between overflow-x-auto pb-2">
            {statusOrder.map((status, index) => {
              const style = getStatusStyle(status);
              const Icon = style.icon;
              const isPast = index <= currentStatusIndex;
              const isCurrent = status === quote.status;
              
              return (
                <div key={status} className="flex items-center flex-shrink-0">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isPast
                          ? `${style.color} text-white`
                          : 'bg-gray-200 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-offset-2 ring-primary/30' : ''}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`text-xs mt-2 ${isPast ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                      {style.label}
                    </span>
                  </div>
                  {index < statusOrder.length - 1 && (
                    <div
                      className={`h-1 w-12 lg:w-24 mx-2 transition-all duration-300 ${
                        index < currentStatusIndex ? 'bg-primary' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="items" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Items
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Price Breakdown
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <div className="mt-6">
          {children}
        </div>
      </Tabs>
    </div>
  );
};