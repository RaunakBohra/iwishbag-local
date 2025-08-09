/**
 * OptimizedImage - High-performance image component with automatic format optimization
 * 
 * BENEFITS:
 * - Automatic WebP/AVIF format conversion with fallbacks
 * - Intelligent lazy loading with intersection observer
 * - Progressive loading with blur-up effect
 * - Responsive image sizing for different devices
 * - Cloudinary URL optimization for existing images
 * - Built-in error handling and retry logic
 * 
 * USAGE:
 * - <OptimizedImage src="image.jpg" alt="Description" />
 * - <OptimizedImage src="cloudinary-url" priority />
 * - <OptimizedImage src="external-image" lazyLoad={false} />
 */

import React, { useState, useRef, useEffect, CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { generateCloudinaryUrl, generateResponsiveImages, generateBlurPlaceholder } from '@/utils/imageOptimization';
import { imagePerformanceTracker } from '@/utils/imagePerformanceTracker';

export interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
  priority?: boolean; // Skip lazy loading for critical images
  lazyLoad?: boolean; // Default true
  blurDataURL?: string; // Custom blur placeholder
  sizes?: string; // Responsive sizes
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  quality?: number; // Image quality (1-100)
  placeholder?: 'blur' | 'empty' | 'shimmer';
  onLoad?: () => void;
  onError?: () => void;
  retryCount?: number; // Number of retry attempts
}

interface ImageState {
  loaded: boolean;
  error: boolean;
  retries: number;
  inView: boolean;
}

// Legacy support - use new optimization utility
const optimizeCloudinaryUrl = (
  url: string, 
  width?: number, 
  height?: number, 
  quality: number = 80,
  format: 'auto' | 'webp' | 'avif' = 'auto'
): string => {
  return generateCloudinaryUrl(url, {
    width,
    height,
    quality,
    format,
    progressive: true,
  });
};

// Generate responsive image sources with different formats  
const generateImageSources = (
  src: string,
  width?: number,
  height?: number,
  quality: number = 80
): { avif: string; webp: string; fallback: string } => {
  return {
    avif: generateCloudinaryUrl(src, { width, height, quality, format: 'avif', progressive: true }),
    webp: generateCloudinaryUrl(src, { width, height, quality, format: 'webp', progressive: true }),
    fallback: generateCloudinaryUrl(src, { width, height, quality, format: 'auto', progressive: true }),
  };
};

// Generate blur placeholder
const generateBlurDataURL = (): string => {
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjRjNGNEY2Ii8+Cjwvc3ZnPgo=';
};

// Shimmer placeholder component
const ShimmerPlaceholder: React.FC<{ className?: string }> = ({ className }) => (
  <div 
    className={cn(
      "animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]",
      className
    )}
    style={{
      backgroundImage: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
      animation: 'shimmer 1.5s infinite',
    }}
  />
);

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  style,
  priority = false,
  lazyLoad = true,
  blurDataURL,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  objectFit = 'cover',
  quality = 80,
  placeholder = 'blur',
  onLoad,
  onError,
  retryCount = 2,
}) => {
  const [state, setState] = useState<ImageState>({
    loaded: false,
    error: false,
    retries: 0,
    inView: priority ? true : false, // Skip intersection observer for priority images
  });

  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !lazyLoad) {
      setState(prev => ({ ...prev, inView: true }));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setState(prev => ({ ...prev, inView: true }));
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Load images 50px before they come into view
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [priority, lazyLoad]);

  // Generate optimized image sources
  const imageSources = generateImageSources(src, width, height, quality);

  // Performance tracking
  const trackingId = useRef<string>(`opt-img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  
  useEffect(() => {
    // Start performance tracking
    imagePerformanceTracker.startImageLoad(trackingId.current, {
      src,
      width,
      height,
      isOptimized: true,
      loadMethod: priority ? 'eager' : 'lazy',
      placeholder,
    });
  }, [src, width, height, priority, placeholder]);

  // Handle image load
  const handleLoad = () => {
    setState(prev => ({ ...prev, loaded: true }));
    imagePerformanceTracker.completeImageLoad(trackingId.current, true);
    onLoad?.();
  };

  // Handle image error with retry logic
  const handleError = () => {
    setState(prev => {
      const newRetries = prev.retries + 1;
      
      if (newRetries < retryCount) {
        // Retry loading after a short delay
        setTimeout(() => {
          if (imgRef.current) {
            imgRef.current.src = imageSources.fallback;
          }
        }, 1000 * newRetries); // Exponential backoff
        
        return { ...prev, retries: newRetries };
      } else {
        // Max retries reached, mark as error
        imagePerformanceTracker.completeImageLoad(trackingId.current, false);
        onError?.();
        return { ...prev, error: true };
      }
    });
  };

  // Don't render anything if not in view and lazy loading is enabled
  if (!state.inView && lazyLoad) {
    return (
      <div 
        ref={imgRef}
        className={cn("bg-gray-200", className)}
        style={{ 
          width: width ? `${width}px` : '100%', 
          height: height ? `${height}px` : 'auto',
          ...style 
        }}
      >
        {placeholder === 'shimmer' && <ShimmerPlaceholder className="w-full h-full" />}
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div 
        className={cn(
          "bg-gray-100 flex items-center justify-center text-gray-400",
          className
        )}
        style={{ 
          width: width ? `${width}px` : '100%', 
          height: height ? `${height}px` : 'auto',
          ...style 
        }}
      >
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)} style={style}>
      {/* Blur placeholder */}
      {placeholder === 'blur' && !state.loaded && (
        <img
          src={blurDataURL || generateBlurPlaceholder(src, 5)}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110"
          aria-hidden="true"
        />
      )}

      {/* Shimmer placeholder */}
      {placeholder === 'shimmer' && !state.loaded && (
        <ShimmerPlaceholder className="absolute inset-0 w-full h-full" />
      )}

      {/* Main image with format fallbacks */}
      <picture>
        {/* AVIF format (best compression) */}
        <source 
          srcSet={imageSources.avif} 
          type="image/avif" 
          sizes={sizes}
        />
        
        {/* WebP format (good compression, wider support) */}
        <source 
          srcSet={imageSources.webp} 
          type="image/webp" 
          sizes={sizes}
        />
        
        {/* Fallback format */}
        <img
          ref={imgRef}
          src={imageSources.fallback}
          alt={alt}
          width={width}
          height={height}
          className={cn(
            "transition-opacity duration-300",
            state.loaded ? 'opacity-100' : 'opacity-0',
            `object-${objectFit}`
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      </picture>
    </div>
  );
};

// Add CSS animation for shimmer effect
export const ImageOptimizationStyles = `
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
`;

export default OptimizedImage;