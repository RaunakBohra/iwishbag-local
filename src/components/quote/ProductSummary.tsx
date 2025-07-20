import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Price } from '@/components/ui/Price';
import { Package, Globe, DollarSign, Weight, ExternalLink } from 'lucide-react';

// Utility function to extract clean domain from URL
const extractDomain = (url: string): string => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

interface Product {
  name: string;
  url: string;
  file: File | null;
  quantity: number;
  price: string;
  weight: string;
  country: string;
}

interface ProductSummaryProps {
  products: Product[];
  title?: string;
  showEditButton?: boolean;
  onEdit?: () => void;
  className?: string;
  destinationCountry?: string; // Add destination country for proper currency display
}

export default function ProductSummary({
  products,
  title = 'Products Summary',
  showEditButton = false,
  onEdit,
  className = '',
  destinationCountry,
}: ProductSummaryProps) {
  const totalItems = products.reduce((sum, product) => sum + product.quantity, 0);
  const totalValue = products.reduce((sum, product) => {
    const price = parseFloat(product.price) || 0;
    return sum + price * product.quantity;
  }, 0);

  return (
    <div className={className}>
      {title && (
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg sm:text-xl lg:text-2xl font-semibold flex items-center gap-2 text-gray-900">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600" />
              {title}
            </CardTitle>
            {showEditButton && onEdit && (
              <button
                onClick={onEdit}
                className="text-xs sm:text-sm text-teal-600 hover:text-teal-800 underline font-medium"
              >
                Edit Products
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-600">
            <span className="flex items-center gap-1 sm:gap-2 bg-teal-50 px-2 sm:px-3 py-1 rounded-full">
              <Package className="h-3 w-3 sm:h-4 sm:w-4 text-teal-600" />
              <span className="text-xs sm:text-sm">{products.length} product{products.length !== 1 ? 's' : ''}</span>
            </span>
            {totalValue > 0 && (
              <span className="flex items-center gap-1 sm:gap-2 bg-green-50 px-2 sm:px-3 py-1 rounded-full">
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                <span className="text-xs sm:text-sm font-medium">Total: {totalValue.toFixed(2)}</span>
              </span>
            )}
            <span className="flex items-center gap-1 sm:gap-2 bg-orange-50 px-2 sm:px-3 py-1 rounded-full">
              <Weight className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
              <span className="text-xs sm:text-sm">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
            </span>
          </div>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {products.map((product, index) => (
          <div
            key={index}
            className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-start gap-2 sm:gap-3 mb-3">
                  <div className="bg-teal-100 p-1.5 sm:p-2 rounded-lg">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    {/* Product Name or Domain - Clickable */}
                    {product.name ? (
                      /* If product name exists, make it clickable */
                      <h4 className="text-sm sm:text-base lg:text-lg mb-2">
                        {product.url ? (
                          <a
                            href={product.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-gray-900 hover:text-teal-600 transition-colors inline-flex items-center gap-1"
                          >
                            {product.name}
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="font-semibold text-gray-900">{product.name}</span>
                        )}
                      </h4>
                    ) : product.url ? (
                      /* If no product name, show clickable domain */
                      <h4 className="text-sm sm:text-base lg:text-lg mb-2">
                        <a
                          href={product.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-teal-600 hover:text-teal-800 transition-colors inline-flex items-center gap-1"
                        >
                          {extractDomain(product.url)}
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </h4>
                    ) : (
                      /* Fallback if neither name nor URL */
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base lg:text-lg mb-2">
                        Product {index + 1}
                      </h4>
                    )}

                    {/* Show URL domain for verification (non-clickable since name is clickable) */}
                    {product.url && product.name && (
                      <div className="mb-2">
                        <span className="text-xs sm:text-sm text-gray-500">Source: {extractDomain(product.url)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  <Badge
                    variant="secondary"
                    className="bg-teal-100 text-teal-700 hover:bg-teal-200 border-0"
                  >
                    Qty: {product.quantity}
                  </Badge>
                  {product.price && product.price.trim() !== '' && !isNaN(parseFloat(product.price)) && (
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-700 hover:bg-green-200 border-0"
                    >
                      Price: {parseFloat(product.price).toFixed(2)}
                    </Badge>
                  )}
                  {product.weight && product.weight.trim() !== '' && !isNaN(parseFloat(product.weight)) && (
                    <Badge
                      variant="secondary"
                      className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-0"
                    >
                      {product.weight} kg
                    </Badge>
                  )}
                  {product.country && product.country.trim() !== '' && (
                    <Badge
                      variant="outline"
                      className="bg-gray-50 text-gray-700 border-gray-300 flex items-center gap-1"
                    >
                      <Globe className="h-3 w-3" />
                      {product.country}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </div>
  );
}
