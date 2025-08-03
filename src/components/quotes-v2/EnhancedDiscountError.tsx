import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  RefreshCw, 
  ExternalLink,
  MessageCircle,
  ShoppingCart,
  Eye,
  Mail
} from 'lucide-react';
import { DiscountError, DiscountErrorService } from '@/services/DiscountErrorService';

interface EnhancedDiscountErrorProps {
  error: DiscountError;
  onRetry?: () => void;
  onBrowseOffers?: () => void;
  onContactSupport?: () => void;
  onContinueShopping?: () => void;
  onSubscribe?: () => void;
  contextualSuggestions?: string[];
  className?: string;
}

export const EnhancedDiscountError: React.FC<EnhancedDiscountErrorProps> = ({
  error,
  onRetry,
  onBrowseOffers,
  onContactSupport,
  onContinueShopping,
  onSubscribe,
  contextualSuggestions = [],
  className = ''
}) => {
  const getIcon = () => {
    switch (error.severity) {
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getAlertVariant = () => {
    switch (error.severity) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'default';
      default:
        return 'default';
    }
  };

  const getAlertClasses = () => {
    switch (error.severity) {
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getSeverityBadge = () => {
    const badgeConfig = {
      error: { color: 'destructive', label: 'Error' },
      warning: { color: 'secondary', label: 'Warning' },
      info: { color: 'outline', label: 'Info' }
    };

    const config = badgeConfig[error.severity];
    return (
      <Badge variant={config.color as any} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const renderActionButton = (action: { label: string; action: string; primary?: boolean }) => {
    const baseClasses = action.primary 
      ? "bg-blue-600 hover:bg-blue-700 text-white" 
      : "border border-gray-300 hover:bg-gray-50";

    const handleClick = () => {
      switch (action.action) {
        case 'retry':
          onRetry?.();
          break;
        case 'browse_offers':
          onBrowseOffers?.();
          break;
        case 'contact_support':
          onContactSupport?.();
          break;
        case 'continue_shopping':
          onContinueShopping?.();
          break;
        case 'subscribe':
          onSubscribe?.();
          break;
        default:
          console.log('Unknown action:', action.action);
      }
    };

    const getActionIcon = () => {
      switch (action.action) {
        case 'retry':
          return <RefreshCw className="w-4 h-4 mr-1" />;
        case 'browse_offers':
          return <Eye className="w-4 h-4 mr-1" />;
        case 'contact_support':
          return <MessageCircle className="w-4 h-4 mr-1" />;
        case 'continue_shopping':
          return <ShoppingCart className="w-4 h-4 mr-1" />;
        case 'subscribe':
          return <Mail className="w-4 h-4 mr-1" />;
        default:
          return <ExternalLink className="w-4 h-4 mr-1" />;
      }
    };

    return (
      <Button
        key={action.action}
        onClick={handleClick}
        size="sm"
        className={baseClasses}
        variant={action.primary ? "default" : "outline"}
      >
        {getActionIcon()}
        {action.label}
      </Button>
    );
  };

  const suggestedActions = DiscountErrorService.getSuggestedActions(error.type);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Error Alert */}
      <Alert className={`${getAlertClasses()}`}>
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <AlertTitle className="text-base font-semibold">
                {error.title}
              </AlertTitle>
              {getSeverityBadge()}
            </div>
            
            <AlertDescription className="text-sm leading-relaxed">
              {error.message}
            </AlertDescription>

            {error.suggestion && (
              <div className="mt-3 p-3 bg-white/60 rounded-md border-l-4 border-blue-400">
                <p className="text-sm font-medium text-blue-900 mb-1">💡 Suggestion:</p>
                <p className="text-sm text-blue-800">{error.suggestion}</p>
              </div>
            )}

            {error.helpText && (
              <div className="mt-2 p-2 bg-gray-100/50 rounded text-xs text-gray-600">
                <strong>Help:</strong> {error.helpText}
              </div>
            )}
          </div>
        </div>
      </Alert>

      {/* Action Buttons */}
      {suggestedActions.length > 0 && (
        <Card className="border-gray-200">
          <CardContent className="pt-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-900">What would you like to do?</h4>
              <div className="flex flex-wrap gap-2">
                {suggestedActions.map(renderActionButton)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contextual Suggestions */}
      {contextualSuggestions.length > 0 && (
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="pt-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-green-900 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Other Ways to Save
              </h4>
              <ul className="space-y-1">
                {contextualSuggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm text-green-800 flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Retry Indicator */}
      {error.retryable && (
        <div className="text-center">
          <p className="text-xs text-gray-500">
            You can try applying this code again after resolving the issue above.
          </p>
        </div>
      )}
    </div>
  );
};