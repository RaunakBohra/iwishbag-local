import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, FileText, Camera, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
interface ImageUploadProps {
  onImageUpload: (url: string) => void;
  onImageRemove: () => void;
  currentImageUrl?: string;
  disabled?: boolean;
  isMessageAttachment?: boolean;
}
export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUpload,
  onImageRemove,
  currentImageUrl,
  disabled = false,
  isMessageAttachment = false
}) => {
  const [uploading, setUploading] = useState(false);
  const {
    toast
  } = useToast();
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file size (5MB limit)
    if (file.size > 5242880) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive"
      });
      return;
    }
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `product-images/${fileName}`;
      const {
        error: uploadError
      } = await supabase.storage.from('product-images').upload(filePath, file);
      if (uploadError) {
        throw uploadError;
      }
      const {
        data
      } = supabase.storage.from('product-images').getPublicUrl(filePath);
      onImageUpload(data.publicUrl);
      toast({
        title: "Image uploaded!",
        description: "Your product image has been uploaded successfully."
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  }, [onImageUpload, toast]);
  const {
    getRootProps,
    getInputProps,
    isDragActive
  } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    disabled: disabled || uploading
  });
  const handleRemoveImage = () => {
    onImageRemove();
    toast({
      title: "Image removed",
      description: "Product image has been removed from your quote."
    });
  };

  // Special styling for message attachment
  if (isMessageAttachment) {
    return <Button type="button" variant="outline" size="sm" disabled={disabled || uploading} className="h-9 px-3" {...getRootProps()}>
        <input {...getInputProps()} />
        {uploading ? <div className="animate-spin">
            <Upload className="h-4 w-4" />
          </div> : <Paperclip className="h-4 w-4" />}
        <span className="ml-2">Attach</span>
      </Button>;
  }
  if (currentImageUrl) {
    const isPdf = currentImageUrl.toLowerCase().endsWith('.pdf');
    return <div className="relative w-full max-w-md mx-auto">
        {isPdf ? <div className="w-full h-48 flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 bg-gray-50 p-2">
              <FileText className="h-16 w-16 text-gray-400" />
              <span className="mt-2 text-sm text-gray-600 break-all">
                {currentImageUrl.split('/').pop()}
              </span>
            </div> : <img src={currentImageUrl} alt="Product" className="w-full h-48 object-cover rounded-lg border-2 border-gray-200" />}
        <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={handleRemoveImage} disabled={disabled}>
          <X className="h-4 w-4" />
        </Button>
      </div>;
  }
  return <div {...getRootProps()} className={`
        relative border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer
        ${isDragActive ? 'border-primary bg-primary/5 scale-105' : 'border-gray-300 hover:border-primary/50'}
        ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50/50'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        group overflow-hidden
      `}>
      <input {...getInputProps()} />
      <div className="flex flex-col items-center flex p-6 text-center space-y-3 py-0 px-0 my-0 mx-0">
        <div className={`
          p-3 rounded-full transition-all duration-200
          ${isDragActive ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary'}
        `}>
          {uploading ? <div className="animate-spin">
              <Upload className="h-6 w-6" />
            </div> : <Camera className="h-6 w-6" />}
        </div>
        
        <div className="space-y-1">
          {uploading ? <p className="text-sm font-medium text-gray-600">Uploading...</p> : isDragActive ? <p className="text-sm font-medium text-primary">Drop your file here</p> : null}
        </div>
      </div>
      
      {/* Animated background on hover */}
      <div className={`
        absolute inset-0 -z-10 transition-opacity duration-300
        ${isDragActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}
        bg-gradient-to-br from-primary/5 to-transparent
      `} />
    </div>;
};