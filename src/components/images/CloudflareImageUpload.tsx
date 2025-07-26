import React, { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cloudflareImagesService } from '@/services/CloudflareImagesService';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

interface CloudflareImageUploadProps {
  onUpload: (imageId: string, variants: Record<string, string>) => void;
  maxFiles?: number;
  acceptedFormats?: string[];
  maxSizeMB?: number;
  metadata?: Record<string, string>;
  className?: string;
}

export const CloudflareImageUpload: React.FC<CloudflareImageUploadProps> = ({
  onUpload,
  maxFiles = 1,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  maxSizeMB = 10,
  metadata,
  className = '',
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<Array<{
    id: string;
    url: string;
    variants: Record<string, string>;
  }>>([]);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const handleFile = useCallback(async (file: File) => {
    // Validate file type
    if (!acceptedFormats.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: `Please upload ${acceptedFormats.join(', ')} files only`,
        variant: 'destructive',
      });
      return;
    }

    // Validate file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      toast({
        title: 'File too large',
        description: `Maximum file size is ${maxSizeMB}MB`,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      // Upload to Cloudflare Images
      const response = await cloudflareImagesService.uploadImage(file, metadata);
      
      // Get all variant URLs
      const variants = cloudflareImagesService.getImageVariants(response.id);
      
      // Add to uploaded images
      const newImage = {
        id: response.id,
        url: variants.medium || variants.public,
        variants,
      };
      
      setUploadedImages(prev => [...prev, newImage]);
      
      // Notify parent
      onUpload(response.id, variants);
      
      toast({
        title: 'Image uploaded successfully',
        description: 'Your image has been optimized and is ready to use',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  }, [acceptedFormats, maxSizeMB, metadata, onUpload, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length + uploadedImages.length > maxFiles) {
      toast({
        title: 'Too many files',
        description: `Maximum ${maxFiles} files allowed`,
        variant: 'destructive',
      });
      return;
    }

    imageFiles.forEach(handleFile);
  }, [handleFile, maxFiles, uploadedImages.length, toast]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + uploadedImages.length > maxFiles) {
      toast({
        title: 'Too many files',
        description: `Maximum ${maxFiles} files allowed`,
        variant: 'destructive',
      });
      return;
    }

    files.forEach(handleFile);
  }, [handleFile, maxFiles, uploadedImages.length, toast]);

  const removeImage = async (imageId: string) => {
    try {
      await cloudflareImagesService.deleteImage(imageId);
      setUploadedImages(prev => prev.filter(img => img.id !== imageId));
      toast({
        title: 'Image removed',
        description: 'The image has been deleted',
      });
    } catch (error) {
      toast({
        title: 'Failed to remove image',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={`cloudflare-image-upload ${className}`}>
      {/* Upload Area */}
      {uploadedImages.length < maxFiles && (
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center
            transition-colors cursor-pointer
            ${dragActive ? 'border-teal-500 bg-teal-50' : 'border-gray-300 hover:border-gray-400'}
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="image-upload"
            className="hidden"
            accept={acceptedFormats.join(',')}
            multiple={maxFiles > 1}
            onChange={handleFileInput}
            disabled={uploading}
          />
          
          <label htmlFor="image-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-3">
              {uploading ? (
                <Loader2 className="w-12 h-12 text-gray-400 animate-spin" />
              ) : (
                <Upload className="w-12 h-12 text-gray-400" />
              )}
              
              <div>
                <p className="text-lg font-medium text-gray-700">
                  {uploading ? 'Uploading...' : 'Drop images here or click to upload'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')} up to {maxSizeMB}MB
                </p>
              </div>
              
              {!uploading && (
                <Button type="button" variant="outline" size="sm">
                  Select Images
                </Button>
              )}
            </div>
          </label>
        </div>
      )}

      {/* Uploaded Images */}
      {uploadedImages.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Uploaded Images ({uploadedImages.length}/{maxFiles})
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {uploadedImages.map((image) => (
              <div
                key={image.id}
                className="relative group rounded-lg overflow-hidden border border-gray-200"
              >
                <img
                  src={image.url}
                  alt="Uploaded"
                  className="w-full h-32 object-cover"
                />
                
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => removeImage(image.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                  <p className="text-xs text-white truncate">
                    {image.id.substring(0, 8)}...
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Features Info */}
      <div className="mt-6 p-4 bg-teal-50 rounded-lg">
        <h4 className="flex items-center gap-2 text-sm font-medium text-teal-800 mb-2">
          <ImageIcon className="w-4 h-4" />
          Cloudflare Images Features
        </h4>
        <ul className="text-xs text-teal-700 space-y-1">
          <li>• Automatic WebP/AVIF conversion</li>
          <li>• Multiple sizes generated (thumbnail, small, medium, large)</li>
          <li>• Global CDN delivery</li>
          <li>• Up to 80% bandwidth savings</li>
        </ul>
      </div>
    </div>
  );
};

export default CloudflareImageUpload;