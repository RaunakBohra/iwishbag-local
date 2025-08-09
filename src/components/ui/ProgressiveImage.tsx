/**
 * ProgressiveImage - Advanced progressive loading for critical images
 * 
 * Implements multiple loading strategies:
 * - Tiny blur-up placeholder → Medium quality → Full quality
 * - Base64 micro thumbnail → Progressive enhancement
 * - Critical path optimization for above-the-fold content
 */

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { generateCloudinaryUrl, generateBlurPlaceholder } from '@/utils/imageOptimization';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  // Progressive loading specific props
  placeholder?: 'blur' | 'micro' | 'none';
  stages?: 2 | 3; // Number of loading stages
  qualitySteps?: number[]; // Quality levels for each stage
}

interface LoadingState {
  stage: 'placeholder' | 'low' | 'medium' | 'high';
  loaded: boolean;
  error: boolean;
}

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  onLoad,
  onError,
  placeholder = 'blur',
  stages = 3,
  qualitySteps = [20, 60, 90], // Default quality progression
}) => {
  const [state, setState] = useState<LoadingState>({
    stage: 'placeholder',
    loaded: false,
    error: false,
  });

  const imgRefs = {
    low: useRef<HTMLImageElement>(null),
    medium: useRef<HTMLImageElement>(null),
    high: useRef<HTMLImageElement>(null),
  };

  const [urls, setUrls] = useState({
    placeholder: '',
    low: '',
    medium: '',
    high: '',
  });

  // Generate URLs for different quality stages
  useEffect(() => {
    const baseOptions = { width, height, progressive: true };
    
    setUrls({
      placeholder: placeholder === 'blur' ? generateBlurPlaceholder(src, 8) : '',
      low: generateCloudinaryUrl(src, { ...baseOptions, quality: qualitySteps[0] }),
      medium: stages >= 3 ? generateCloudinaryUrl(src, { ...baseOptions, quality: qualitySteps[1] }) : '',
      high: generateCloudinaryUrl(src, { ...baseOptions, quality: qualitySteps[stages - 1] }),
    });
  }, [src, width, height, placeholder, stages, qualitySteps]);

  // Progressive loading logic
  useEffect(() => {
    if (state.error) return;

    let mounted = true;

    const loadImage = (url: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = url;
      });
    };

    const progressiveLoad = async () => {
      try {
        // Stage 1: Load low quality
        await loadImage(urls.low);
        if (!mounted) return;
        
        setState(prev => ({ ...prev, stage: 'low' }));

        // Stage 2: Load medium quality (if 3-stage loading)
        if (stages >= 3 && urls.medium) {
          await loadImage(urls.medium);
          if (!mounted) return;
          setState(prev => ({ ...prev, stage: 'medium' }));
        }

        // Stage 3: Load high quality
        await loadImage(urls.high);
        if (!mounted) return;
        
        setState(prev => ({ ...prev, stage: 'high', loaded: true }));
        onLoad?.();

      } catch (error) {
        if (!mounted) return;
        setState(prev => ({ ...prev, error: true }));
        onError?.();
      }
    };

    // Start progressive loading immediately for priority images
    // or after a short delay for non-priority images
    const delay = priority ? 0 : 100;
    const timeoutId = setTimeout(progressiveLoad, delay);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [urls, stages, priority, onLoad, onError, state.error]);

  // Get current image URL based on loading stage
  const getCurrentImageUrl = () => {
    switch (state.stage) {
      case 'low':
        return urls.low;
      case 'medium':
        return urls.medium || urls.low;
      case 'high':
        return urls.high;
      default:
        return urls.placeholder;
    }
  };

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
          height: height ? `${height}px` : 'auto' 
        }}
      >
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      </div>
    );
  }

  const currentUrl = getCurrentImageUrl();
  const isFullyLoaded = state.loaded && state.stage === 'high';

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Placeholder layer - only visible before low quality loads */}
      {state.stage === 'placeholder' && placeholder !== 'none' && urls.placeholder && (
        <img
          src={urls.placeholder}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-110 opacity-60"
          style={{ filter: 'blur(10px)' }}
          aria-hidden="true"
        />
      )}

      {/* Main progressive image */}
      <img
        src={currentUrl}
        alt={alt}
        width={width}
        height={height}
        className={cn(
          "w-full h-full object-cover transition-all duration-500 ease-out",
          // Blur effect for lower quality stages
          state.stage === 'low' && "filter blur-[0.5px]",
          state.stage === 'medium' && "filter blur-[0.2px]",
          // Opacity transition
          state.stage !== 'placeholder' ? 'opacity-100' : 'opacity-0',
          // Sharpening for final stage
          isFullyLoaded && "filter-none"
        )}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />

      {/* Loading indicator */}
      {!isFullyLoaded && (
        <div className="absolute top-2 right-2">
          <div className="w-3 h-3 bg-white/80 rounded-full flex items-center justify-center">
            <div 
              className={cn(
                "w-2 h-2 rounded-full transition-colors duration-300",
                state.stage === 'placeholder' && "bg-gray-300",
                state.stage === 'low' && "bg-yellow-400",
                state.stage === 'medium' && "bg-blue-400",
                state.stage === 'high' && "bg-green-400"
              )}
            />
          </div>
        </div>
      )}

      {/* Quality indicator (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-1 left-1 px-1 py-0.5 bg-black/70 text-white text-xs rounded">
          {state.stage}
        </div>
      )}
    </div>
  );
};

export default ProgressiveImage;