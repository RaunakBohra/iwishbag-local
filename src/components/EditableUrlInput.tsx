import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ExternalLink, Edit2, Check, X, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProductScraping } from '@/hooks/useProductScraping';

interface EditableUrlInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showFetchButton?: boolean;
  onDataFetched?: (data: {
    productName?: string;
    price?: number;
    weight?: number;
    currency?: string;
    category?: string;
    brand?: string;
    hsn?: string;
  }) => void;
}

export const EditableUrlInput: React.FC<EditableUrlInputProps> = ({
  value,
  onChange,
  placeholder = "https://www.amazon.com/product-link, https://www.dior.com/luxury-item, or any international store",
  className,
  disabled = false,
  showFetchButton = false,
  onDataFetched
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [hasAutoFilled, setHasAutoFilled] = useState<string | null>(null);
  
  // Product scraping hook (only initialize when needed)
  const productScraping = showFetchButton ? useProductScraping() : null;
  
  // Watch for when scraping completes and auto-fill data becomes available
  useEffect(() => {
    // Only auto-fill if:
    // 1. We have scraping data and it should auto-fill
    // 2. We haven't already auto-filled for this URL
    // 3. We have a callback to trigger
    if (productScraping?.shouldAutoFill && 
        productScraping?.autoFillData && 
        onDataFetched &&
        value && 
        hasAutoFilled !== value) {
      
      console.log('🎯 Auto-filling for URL:', value);
      
      // Trigger auto-fill
      onDataFetched(productScraping.autoFillData);
      
      // Mark this URL as auto-filled to prevent re-triggering
      setHasAutoFilled(value);
    }
  }, [productScraping?.shouldAutoFill, value, hasAutoFilled]);
  
  // If no URL is set yet, start in edit mode
  const shouldShowEditMode = isEditing || (!value && !disabled);
  
  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };
  
  const handleEdit = () => {
    setEditValue(value);
    setIsEditing(true);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };
  
  const handleFetch = async () => {
    if (!value || !productScraping || !onDataFetched) {
      console.log('🚫 HandleFetch early return:', { value: !!value, productScraping: !!productScraping, onDataFetched: !!onDataFetched });
      return;  
    }
    
    console.log('🚀 HandleFetch starting for URL:', value);
    
    try {
      // Clear any previous auto-fill state for this URL
      setHasAutoFilled(null);
      
      await productScraping.scrapeProduct(value);
      
      console.log('✅ Scraping completed, auto-fill will trigger via useEffect');
      
    } catch (error) {
      console.error('❌ Fetch failed:', error);
    }
  };

  if (shouldShowEditMode) {
    // Edit Mode - Clean input with save/cancel buttons
    return (
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className={cn("text-sm h-10", className)}
            autoFocus
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={disabled}
          className="h-10 px-3 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
        >
          <Check className="w-4 h-4" />
        </Button>
        {value && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={disabled}
            className="h-10 px-3"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  }

  // Display Mode - URL display with buttons beside it
  return (
    <div className="flex gap-2 items-center">
      {/* URL Display */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
          {value ? (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center gap-2 flex-shrink-0"
              title={value}
            >
              <ExternalLink className="w-3 h-3" />
              {(() => {
                try {
                  const domain = new URL(value).hostname;
                  return domain.replace('www.', '');
                } catch {
                  return value.split('/')[2] || value;
                }
              })()}
            </a>
          ) : (
            <span className="text-sm text-gray-400 flex-shrink-0">{placeholder}</span>
          )}
        </div>
      </div>
      
      {/* Action buttons - beside the URL input */}
      {/* Fetch button with status indication */}
      {showFetchButton && value && productScraping && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleFetch}
          disabled={disabled || productScraping.isLoading}
          className={cn(
            "h-10 px-2 flex items-center gap-1 flex-shrink-0",
            productScraping.isLoading 
              ? "bg-orange-50 border-orange-200 text-orange-700" 
              : productScraping.isScraped && !productScraping.error
              ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
          )}
          title={productScraping.isLoading ? "Fetching product data..." : "Fetch product data from URL"}
        >
          <Download className={cn("w-4 h-4", productScraping.isLoading && "animate-spin")} />
          <span className="text-xs font-medium">
            {productScraping.isLoading ? "Fetching" : productScraping.isScraped && !productScraping.error ? "Fetched" : "Fetch"}
          </span>
        </Button>
      )}
      
      {/* Edit button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleEdit}
        disabled={disabled}
        className="h-10 px-2 flex items-center gap-1 flex-shrink-0"
        title="Edit this URL"
      >
        <Edit2 className="w-4 h-4" />
        <span className="text-xs font-medium">Edit</span>
      </Button>
    </div>
  );
};