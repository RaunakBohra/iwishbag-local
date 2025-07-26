import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  FileImage,
  File,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  fileUrl?: string;
  fileName?: string;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  file,
  fileUrl,
  fileName,
}) => {
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = fileName || file?.name || 'Unknown File';
  const fileType = file?.type || 'application/octet-stream';

  // Create preview URL for File objects
  useEffect(() => {
    if (file && !fileUrl) {
      setIsLoading(true);
      try {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load file preview');
        setIsLoading(false);
      }

      return () => {
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
      };
    } else if (fileUrl) {
      setPreviewUrl(fileUrl);
    }
  }, [file, fileUrl]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setImageZoom(1);
      setImageRotation(0);
      setError(null);
    }
  }, [isOpen]);

  const handleDownload = () => {
    if (file) {
      // Create download link for File objects
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (fileUrl) {
      // Open URL in new tab for remote files
      window.open(fileUrl, '_blank');
    }
  };

  const isImage = () => fileType.startsWith('image/');
  const isPdf = () => fileType === 'application/pdf' || displayName.toLowerCase().endsWith('.pdf');

  const getFileIcon = () => {
    if (isImage()) return FileImage;
    if (isPdf()) return FileText;
    return File;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderPreview = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Loading preview...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 mb-2">{error}</p>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </div>
        </div>
      );
    }

    if (isImage() && previewUrl) {
      return (
        <div className="relative overflow-hidden bg-gray-100 rounded-lg">
          <div className="flex items-center justify-center min-h-96">
            <img
              src={previewUrl}
              alt={displayName}
              className="max-w-full max-h-96 object-contain transition-transform duration-200"
              style={{
                transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
              }}
              onError={() => setError('Failed to load image')}
            />
          </div>
          
          {/* Image Controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="flex items-center gap-2 bg-black bg-opacity-70 rounded-full px-4 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white hover:bg-opacity-20 p-2 h-auto"
                onClick={() => setImageZoom(Math.max(0.25, imageZoom - 0.25))}
                disabled={imageZoom <= 0.25}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <span className="text-white text-sm px-2">
                {Math.round(imageZoom * 100)}%
              </span>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white hover:bg-opacity-20 p-2 h-auto"
                onClick={() => setImageZoom(Math.min(3, imageZoom + 0.25))}
                disabled={imageZoom >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              
              <div className="w-px h-6 bg-white bg-opacity-30 mx-1" />
              
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white hover:bg-opacity-20 p-2 h-auto"
                onClick={() => setImageRotation((imageRotation + 90) % 360)}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (isPdf() && previewUrl) {
      return (
        <div className="h-96 bg-gray-100 rounded-lg">
          <iframe
            src={previewUrl}
            className="w-full h-full border-0 rounded-lg"
            title={displayName}
          />
        </div>
      );
    }

    // Fallback for other file types
    const FileIcon = getFileIcon();
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <FileIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium mb-2">{displayName}</p>
          <p className="text-gray-500 text-sm mb-4">Preview not available for this file type</p>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download to View
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 truncate">
              {React.createElement(getFileIcon(), { className: "h-5 w-5 flex-shrink-0" })}
              <span className="truncate">{displayName}</span>
            </DialogTitle>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              {fileUrl && (
                <Button variant="outline" size="sm" onClick={() => window.open(fileUrl, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* File Info */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>Type: {fileType}</span>
            {file?.size && <span>Size: {formatFileSize(file.size)}</span>}
          </div>
        </DialogHeader>
        
        <div className="mt-4">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
};