/**
 * Image Optimization Utilities
 * 
 * Advanced image optimization functions including compression, resizing,
 * format conversion, and responsive image URL generation.
 */

interface ImageDimensions {
  width: number;
  height: number;
}

interface ResponsiveImageConfig {
  src: string;
  sizes: Array<{
    width: number;
    density?: number;
    format?: 'webp' | 'avif' | 'jpg' | 'png';
  }>;
  fallback?: {
    width: number;
    quality?: number;
  };
}

interface OptimizationOptions {
  quality?: number;
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  progressive?: boolean;
  blur?: number;
  sharpen?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
}

/**
 * Device-specific image configuration presets
 */
const DEVICE_PRESETS = {
  mobile: { maxWidth: 390, quality: 75, format: 'webp' as const },
  tablet: { maxWidth: 768, quality: 80, format: 'webp' as const },
  desktop: { maxWidth: 1920, quality: 85, format: 'webp' as const },
  retina: { maxWidth: 1920, quality: 80, format: 'webp' as const, density: 2 },
} as const;

/**
 * Content-type specific optimization settings
 */
const CONTENT_TYPE_PRESETS = {
  avatar: {
    sizes: [32, 48, 64, 96, 128],
    quality: 70,
    format: 'webp' as const,
    crop: 'fill' as const,
    gravity: 'face' as const,
  },
  product: {
    sizes: [150, 300, 600, 1200],
    quality: 80,
    format: 'webp' as const,
    crop: 'fill' as const,
  },
  hero: {
    sizes: [800, 1200, 1600, 2400],
    quality: 90,
    format: 'webp' as const,
    crop: 'fill' as const,
  },
  thumbnail: {
    sizes: [100, 150, 200],
    quality: 70,
    format: 'webp' as const,
    crop: 'fill' as const,
  },
  gallery: {
    sizes: [300, 600, 900, 1200],
    quality: 85,
    format: 'webp' as const,
    crop: 'fill' as const,
  },
} as const;

/**
 * Check if URL is a Cloudinary URL
 */
const isCloudinaryUrl = (url: string): boolean => {
  return url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
};

/**
 * Extract Cloudinary public ID from URL
 */
const extractCloudinaryId = (url: string): string | null => {
  try {
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    return matches ? matches[1] : null;
  } catch {
    return null;
  }
};

/**
 * Generate optimized Cloudinary URL with transformations
 */
export const generateCloudinaryUrl = (
  src: string,
  options: OptimizationOptions & {
    width?: number;
    height?: number;
    crop?: 'fill' | 'fit' | 'limit' | 'scale' | 'crop';
    gravity?: 'auto' | 'face' | 'center' | 'north' | 'south' | 'east' | 'west';
    density?: number;
  } = {}
): string => {
  if (!isCloudinaryUrl(src)) {
    return src;
  }

  const {
    width,
    height,
    quality = 80,
    format = 'auto',
    progressive = true,
    crop = 'fill',
    gravity,
    density,
    blur,
    sharpen,
    brightness,
    contrast,
    saturation,
  } = options;

  try {
    const urlParts = src.split('/upload/');
    if (urlParts.length !== 2) return src;

    const [baseUrl, imagePath] = urlParts;
    const transformations: string[] = [];

    // Format and quality
    if (format !== 'auto') {
      transformations.push(`f_${format}`);
    } else {
      transformations.push('f_auto');
    }
    transformations.push(`q_${quality}`);

    // Dimensions and cropping
    if (width && height) {
      transformations.push(`w_${width}`, `h_${height}`, `c_${crop}`);
    } else if (width) {
      transformations.push(`w_${width}`, 'c_limit');
    } else if (height) {
      transformations.push(`h_${height}`, 'c_limit');
    }

    // Gravity for smart cropping
    if (gravity) {
      transformations.push(`g_${gravity}`);
    }

    // Device pixel ratio
    if (density && density > 1) {
      transformations.push(`dpr_${density}`);
    }

    // Progressive loading
    if (progressive) {
      transformations.push('fl_progressive');
    }

    // Performance optimizations
    transformations.push('fl_immutable_cache');

    // Image enhancements
    if (blur !== undefined) transformations.push(`e_blur:${blur}`);
    if (sharpen !== undefined) transformations.push(`e_sharpen:${sharpen}`);
    if (brightness !== undefined) transformations.push(`e_brightness:${brightness}`);
    if (contrast !== undefined) transformations.push(`e_contrast:${contrast}`);
    if (saturation !== undefined) transformations.push(`e_saturation:${saturation}`);

    // Auto-optimize
    transformations.push('fl_awebp'); // Auto-deliver WebP when supported

    return `${baseUrl}/upload/${transformations.join(',')}/${imagePath}`;
  } catch (error) {
    console.warn('Failed to generate optimized Cloudinary URL:', error);
    return src;
  }
};

/**
 * Generate responsive image sources for different screen sizes
 */
export const generateResponsiveImages = (
  src: string,
  config: ResponsiveImageConfig
): {
  srcSet: string;
  sizes: string;
  src: string;
} => {
  const { sizes, fallback } = config;

  const srcSetEntries = sizes.map(({ width, density = 1, format = 'webp' }) => {
    const optimizedUrl = generateCloudinaryUrl(src, {
      width: Math.round(width * density),
      quality: getOptimalQuality(width),
      format,
      progressive: true,
    });

    return density > 1 
      ? `${optimizedUrl} ${density}x`
      : `${optimizedUrl} ${width}w`;
  });

  const srcSet = srcSetEntries.join(', ');

  // Generate responsive sizes string
  const responsiveSizes = sizes
    .sort((a, b) => b.width - a.width)
    .map((size, index) => {
      if (index === sizes.length - 1) {
        return `${size.width}px`;
      }
      return `(max-width: ${size.width}px) ${size.width}px`;
    })
    .join(', ');

  // Fallback image
  const fallbackSrc = generateCloudinaryUrl(src, {
    width: fallback?.width || 800,
    quality: fallback?.quality || 80,
    format: 'auto',
  });

  return {
    srcSet,
    sizes: responsiveSizes,
    src: fallbackSrc,
  };
};

/**
 * Get optimal quality based on image size
 */
const getOptimalQuality = (width: number): number => {
  if (width <= 300) return 70;
  if (width <= 600) return 75;
  if (width <= 1200) return 80;
  if (width <= 1920) return 85;
  return 90;
};

/**
 * Generate image sources for different content types
 */
export const generateContentTypeImages = (
  src: string,
  contentType: keyof typeof CONTENT_TYPE_PRESETS,
  customOptions: OptimizationOptions = {}
) => {
  const preset = CONTENT_TYPE_PRESETS[contentType];
  const { sizes, quality, format, crop, gravity } = preset;

  const imageSources = sizes.map(width => ({
    width,
    url: generateCloudinaryUrl(src, {
      width,
      quality,
      format,
      crop,
      gravity,
      progressive: true,
      ...customOptions,
    }),
  }));

  return {
    sources: imageSources,
    responsive: generateResponsiveImages(src, {
      src,
      sizes: sizes.map(width => ({ width, format })),
      fallback: { width: sizes[Math.floor(sizes.length / 2)], quality },
    }),
  };
};

/**
 * Generate device-specific image URLs
 */
export const generateDeviceImages = (src: string) => {
  const deviceImages = Object.entries(DEVICE_PRESETS).map(([device, config]) => ({
    device,
    url: generateCloudinaryUrl(src, config),
    ...config,
  }));

  return deviceImages;
};

/**
 * Preload critical images with different priorities
 */
export const preloadCriticalImages = (images: Array<{
  src: string;
  priority: 'high' | 'medium' | 'low';
  contentType?: keyof typeof CONTENT_TYPE_PRESETS;
}>) => {
  images.forEach(({ src, priority, contentType }) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';

    if (contentType && isCloudinaryUrl(src)) {
      // Use optimized version for preloading
      const preset = CONTENT_TYPE_PRESETS[contentType];
      link.href = generateCloudinaryUrl(src, {
        width: preset.sizes[0], // Use smallest size for preload
        quality: preset.quality,
        format: preset.format,
      });
    } else {
      link.href = src;
    }

    // Set fetch priority
    if (priority === 'high') {
      (link as any).fetchPriority = 'high';
    }

    document.head.appendChild(link);
  });
};

/**
 * Calculate image file size reduction estimate
 */
export const estimateFileSizeReduction = (
  originalWidth: number,
  originalHeight: number,
  targetWidth: number,
  targetHeight: number,
  qualityReduction = 0.2
): {
  dimensionReduction: number;
  qualityReduction: number;
  totalReduction: number;
  estimatedSavings: string;
} => {
  const dimensionReduction = 1 - (targetWidth * targetHeight) / (originalWidth * originalHeight);
  const totalReduction = dimensionReduction + qualityReduction - (dimensionReduction * qualityReduction);

  return {
    dimensionReduction: Math.round(dimensionReduction * 100) / 100,
    qualityReduction: Math.round(qualityReduction * 100) / 100,
    totalReduction: Math.round(totalReduction * 100) / 100,
    estimatedSavings: `${Math.round(totalReduction * 100)}%`,
  };
};

/**
 * Generate blur placeholder for progressive loading
 */
export const generateBlurPlaceholder = (src: string, intensity = 5): string => {
  if (!isCloudinaryUrl(src)) {
    // Return a generic blur placeholder for non-Cloudinary images
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjRjNGNEY2Ii8+Cjwvc3ZnPgo=';
  }

  return generateCloudinaryUrl(src, {
    width: 40,
    quality: 50,
    blur: intensity,
    format: 'jpg', // JPG is better for blur placeholders
  });
};

/**
 * Detect optimal image format support
 */
export const detectImageFormatSupport = (): Promise<{
  webp: boolean;
  avif: boolean;
}> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    const webpSupport = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    
    // AVIF detection is more complex, use feature detection
    const avifSupport = typeof window !== 'undefined' && 
      'createImageBitmap' in window &&
      CSS.supports('image', 'url("data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYx")');

    resolve({
      webp: webpSupport,
      avif: avifSupport,
    });
  });
};

export default {
  generateCloudinaryUrl,
  generateResponsiveImages,
  generateContentTypeImages,
  generateDeviceImages,
  preloadCriticalImages,
  estimateFileSizeReduction,
  generateBlurPlaceholder,
  detectImageFormatSupport,
};