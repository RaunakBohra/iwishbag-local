/**
 * useImagePreloader - React hook for intelligent image preloading
 * 
 * Provides easy integration with the asset preloading system.
 * Automatically manages route-based and interaction-based preloading.
 */

import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { assetPreloader } from '@/utils/assetPreloader';

interface PreloadOptions {
  priority?: 'critical' | 'high' | 'medium' | 'low';
  delay?: number;
  onRoute?: boolean; // Whether to preload on route change
}

export const useImagePreloader = () => {
  const location = useLocation();

  /**
   * Preload a single image or array of images
   */
  const preloadImages = useCallback((
    src: string | string[],
    options: PreloadOptions = {}
  ) => {
    const { priority = 'medium', delay = 0 } = options;
    const sources = Array.isArray(src) ? src : [src];

    const preloadItems = sources.map(source => ({
      src: source,
      type: 'image' as const,
      priority,
      crossOrigin: 'anonymous' as const,
    }));

    if (delay > 0) {
      setTimeout(() => {
        assetPreloader.addToQueue(preloadItems);
      }, delay);
    } else {
      assetPreloader.addToQueue(preloadItems);
    }
  }, []);

  /**
   * Preload images for a specific component or page
   */
  const preloadComponentImages = useCallback((
    images: Array<{ src: string; priority?: 'critical' | 'high' | 'medium' | 'low' }>,
    delay = 0
  ) => {
    const preloadItems = images.map(({ src, priority = 'medium' }) => ({
      src,
      type: 'image' as const,
      priority,
      crossOrigin: 'anonymous' as const,
    }));

    if (delay > 0) {
      setTimeout(() => {
        assetPreloader.addToQueue(preloadItems);
      }, delay);
    } else {
      assetPreloader.addToQueue(preloadItems);
    }
  }, []);

  /**
   * Preload images when user hovers over an element
   */
  const preloadOnHover = useCallback((
    src: string | string[],
    options: PreloadOptions = {}
  ) => {
    return {
      onMouseEnter: () => preloadImages(src, { ...options, delay: 100 }),
      onFocus: () => preloadImages(src, { ...options, delay: 100 }),
    };
  }, [preloadImages]);

  /**
   * Get preloader statistics
   */
  const getPreloadStats = useCallback(() => {
    return assetPreloader.getStats();
  }, []);

  // Auto-preload route-specific assets
  useEffect(() => {
    assetPreloader.preloadRouteAssets(location.pathname);
  }, [location.pathname]);

  return {
    preloadImages,
    preloadComponentImages,
    preloadOnHover,
    getPreloadStats,
  };
};

/**
 * Hook for preloading images in a specific component
 */
export const useComponentImagePreloader = (
  images: Array<{ src: string; priority?: 'critical' | 'high' | 'medium' | 'low' }>,
  options: { delay?: number; enabled?: boolean } = {}
) => {
  const { preloadComponentImages } = useImagePreloader();
  const { delay = 1000, enabled = true } = options;

  useEffect(() => {
    if (enabled && images.length > 0) {
      preloadComponentImages(images, delay);
    }
  }, [images, preloadComponentImages, delay, enabled]);
};

/**
 * Hook for preloading images on user interaction
 */
export const useInteractionPreloader = () => {
  const { preloadImages } = useImagePreloader();

  const preloadOnClick = useCallback((src: string | string[]) => ({
    onClick: () => preloadImages(src, { priority: 'high' }),
  }), [preloadImages]);

  const preloadOnHover = useCallback((src: string | string[]) => ({
    onMouseEnter: () => preloadImages(src, { priority: 'medium', delay: 200 }),
  }), [preloadImages]);

  const preloadOnFocus = useCallback((src: string | string[]) => ({
    onFocus: () => preloadImages(src, { priority: 'high', delay: 100 }),
  }), [preloadImages]);

  return {
    preloadOnClick,
    preloadOnHover,
    preloadOnFocus,
  };
};

export default useImagePreloader;