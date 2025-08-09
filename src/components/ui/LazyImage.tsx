/**
 * LazyImage - Simplified wrapper around OptimizedImage for common use cases
 * 
 * Pre-configured with intelligent defaults for lazy loading across the app.
 * Use this for product images, user avatars, and general content images.
 */

import React from 'react';
import { OptimizedImage, OptimizedImageProps } from './OptimizedImage';

interface LazyImageProps extends Omit<OptimizedImageProps, 'lazyLoad'> {
  // Force lazy loading by default, can be overridden with priority
  variant?: 'product' | 'avatar' | 'hero' | 'gallery';
}

export const LazyImage: React.FC<LazyImageProps> = ({
  variant = 'product',
  priority = false,
  placeholder = 'blur',
  quality = 80,
  objectFit = 'cover',
  ...props
}) => {
  // Variant-specific configurations
  const getVariantConfig = () => {
    switch (variant) {
      case 'avatar':
        return {
          quality: 70,
          placeholder: 'shimmer' as const,
          objectFit: 'cover' as const,
          sizes: '(max-width: 768px) 48px, 64px',
        };
      
      case 'hero':
        return {
          quality: 90,
          placeholder: 'blur' as const,
          objectFit: 'cover' as const,
          priority: true, // Hero images should load immediately
          sizes: '100vw',
        };
      
      case 'gallery':
        return {
          quality: 85,
          placeholder: 'blur' as const,
          objectFit: 'cover' as const,
          sizes: '(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw',
        };
      
      case 'product':
      default:
        return {
          quality: 80,
          placeholder: 'blur' as const,
          objectFit: 'cover' as const,
          sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
        };
    }
  };

  const variantConfig = getVariantConfig();

  return (
    <OptimizedImage
      {...variantConfig}
      {...props}
      priority={priority || variantConfig.priority}
      quality={quality}
      placeholder={placeholder}
      objectFit={objectFit}
      lazyLoad={!priority && !variantConfig.priority} // Only lazy load if not priority
    />
  );
};

export default LazyImage;