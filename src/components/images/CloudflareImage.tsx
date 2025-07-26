import React, { useState } from 'react';
import { cloudflareImagesService } from '@/services/CloudflareImagesService';
import { Loader2 } from 'lucide-react';

interface CloudflareImageProps {
  imageId: string;
  alt: string;
  variant?: 'thumbnail' | 'small' | 'medium' | 'large' | 'public';
  className?: string;
  responsive?: boolean;
  lazy?: boolean;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const CloudflareImage: React.FC<CloudflareImageProps> = ({
  imageId,
  alt,
  variant = 'medium',
  className = '',
  responsive = true,
  lazy = true,
  fallbackSrc = '/placeholder-image.png',
  onLoad,
  onError,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Get image URL for the specified variant
  const src = cloudflareImagesService.getImageUrl(imageId, variant);
  
  // Get responsive srcset if enabled
  const srcSet = responsive ? cloudflareImagesService.getResponsiveSrcSet(imageId) : undefined;
  
  // Get all variant URLs for sizes attribute
  const variants = cloudflareImagesService.getImageVariants(imageId);

  const handleLoad = () => {
    setLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
    onError?.();
  };

  if (error && fallbackSrc) {
    return (
      <img
        src={fallbackSrc}
        alt={alt}
        className={className}
      />
    );
  }

  return (
    <div className={`cloudflare-image-wrapper relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      )}
      
      <picture>
        {/* Modern formats for browsers that support them */}
        <source
          type="image/avif"
          srcSet={srcSet}
          sizes={responsive ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" : undefined}
        />
        <source
          type="image/webp"
          srcSet={srcSet}
          sizes={responsive ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" : undefined}
        />
        
        {/* Fallback to regular format */}
        <img
          src={src}
          srcSet={srcSet}
          sizes={responsive ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" : undefined}
          alt={alt}
          loading={lazy ? 'lazy' : 'eager'}
          onLoad={handleLoad}
          onError={handleError}
          className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        />
      </picture>
    </div>
  );
};

/**
 * Responsive Cloudflare Image with automatic variant selection
 */
export const ResponsiveCloudflareImage: React.FC<CloudflareImageProps> = (props) => {
  return (
    <CloudflareImage
      {...props}
      responsive={true}
    />
  );
};

/**
 * Product Image Component with zoom on hover
 */
export const ProductImage: React.FC<CloudflareImageProps & {
  showZoom?: boolean;
}> = ({
  showZoom = true,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative overflow-hidden group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CloudflareImage
        {...props}
        className={`
          ${props.className}
          ${showZoom ? 'group-hover:scale-110 transition-transform duration-300' : ''}
        `}
      />
      
      {showZoom && isHovered && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded text-xs">
            Click to zoom
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Gallery Component with lightbox
 */
export const CloudflareImageGallery: React.FC<{
  imageIds: string[];
  className?: string;
}> = ({ imageIds, className = '' }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <>
      <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
        {imageIds.map((imageId) => (
          <div
            key={imageId}
            onClick={() => setSelectedImage(imageId)}
            className="cursor-pointer hover:opacity-90 transition-opacity"
          >
            <CloudflareImage
              imageId={imageId}
              alt="Gallery image"
              variant="small"
              className="w-full h-48 object-cover rounded-lg"
            />
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <CloudflareImage
            imageId={selectedImage}
            alt="Full size image"
            variant="large"
            className="max-w-full max-h-full"
          />
          
          <button
            className="absolute top-4 right-4 text-white text-xl hover:text-gray-300"
            onClick={() => setSelectedImage(null)}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
};

export default CloudflareImage;