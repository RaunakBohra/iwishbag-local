import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Globe, DollarSign, Weight, ExternalLink } from 'lucide-react';

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
}

export default function ProductSummary({ 
  products, 
  title = "Products Summary", 
  showEditButton = false, 
  onEdit,
  className = "" 
}: ProductSummaryProps) {
  const totalItems = products.reduce((sum, product) => sum + product.quantity, 0);
  const totalValue = products.reduce((sum, product) => {
    const price = parseFloat(product.price) || 0;
    return sum + (price * product.quantity);
  }, 0);

  return (
    <div className={className}>
      {title && (
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold flex items-center gap-2 text-gray-900">
              <Package className="h-6 w-6 text-blue-600" />
              {title}
            </CardTitle>
            {showEditButton && onEdit && (
              <button
                onClick={onEdit}
                className="text-sm text-blue-600 hover:text-blue-800 underline font-medium"
              >
                Edit Products
              </button>
            )}
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <span className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
              <Package className="h-4 w-4 text-blue-600" />
              {products.length} product{products.length !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full">
              <DollarSign className="h-4 w-4 text-green-600" />
              Total: ${totalValue.toFixed(2)}
            </span>
            <span className="flex items-center gap-2 bg-purple-50 px-3 py-1 rounded-full">
              <Weight className="h-4 w-4 text-purple-600" />
              {totalItems} item{totalItems !== 1 ? 's' : ''}
            </span>
          </div>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {products.map((product, index) => (
          <div key={index} className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-start gap-3 mb-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-lg mb-1">
                      {product.name || `Product ${index + 1}`}
                    </h4>
                    {product.url && (
                      <div className="flex items-center gap-2 mb-2">
                        <a 
                          href={product.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Product
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0">
                    Qty: {product.quantity}
                  </Badge>
                  {product.price && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200 border-0">
                      ${parseFloat(product.price).toFixed(2)} each
                    </Badge>
                  )}
                  {product.weight && (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-0">
                      {product.weight} kg
                    </Badge>
                  )}
                  {product.country && (
                    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {product.country}
                    </Badge>
                  )}
                </div>
              </div>
              {product.price && (
                <div className="text-right ml-4">
                  <div className="text-lg font-bold text-gray-900">
                    ${(parseFloat(product.price) * product.quantity).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Total for this item
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </div>
  );
} 