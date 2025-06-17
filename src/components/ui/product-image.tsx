
import React from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { Image as ImageIcon } from 'lucide-react';

interface ProductImageProps {
  imageUrl?: string | null;
  productName: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ProductImage: React.FC<ProductImageProps> = ({
  imageUrl,
  productName,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  if (!imageUrl) {
    return (
      <div className={`${sizeClasses[size]} bg-gray-100 rounded-lg flex items-center justify-center`}>
        <ImageIcon className="w-4 h-4 text-gray-400" />
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className={`${sizeClasses[size]} rounded-lg overflow-hidden border hover:opacity-80 transition-opacity`}>
          <img
            src={imageUrl}
            alt={productName}
            className="w-full h-full object-cover"
          />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <div className="p-4">
          <DialogTitle className="text-lg font-semibold mb-2">{productName}</DialogTitle>
          <img
            src={imageUrl}
            alt={productName}
            className="w-full max-h-96 object-contain rounded-lg"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
