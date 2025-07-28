import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  ZoomIn, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  X 
} from 'lucide-react';

interface Photo {
  url: string;
  type?: string;
  caption?: string;
  uploaded_at?: string;
}

interface PackagePhotoGalleryProps {
  photos: Photo[] | string[];
  packageInfo?: {
    suiteNumber?: string;
    senderStore?: string;
    description?: string;
  };
  open: boolean;
  onClose: () => void;
}

export const PackagePhotoGallery: React.FC<PackagePhotoGalleryProps> = ({
  photos,
  packageInfo,
  open,
  onClose
}) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  // Normalize photos to objects
  const normalizedPhotos: Photo[] = photos.map(photo => 
    typeof photo === 'string' ? { url: photo } : photo
  );

  if (normalizedPhotos.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Package Photos</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Photos Available</h3>
            <p className="text-muted-foreground">
              Photos will appear here once the package has been processed.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const currentPhoto = normalizedPhotos[currentPhotoIndex];

  const handlePrevious = () => {
    setCurrentPhotoIndex((prev) => 
      prev === 0 ? normalizedPhotos.length - 1 : prev - 1
    );
  };

  const handleNext = () => {
    setCurrentPhotoIndex((prev) => 
      prev === normalizedPhotos.length - 1 ? 0 : prev + 1
    );
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(currentPhoto.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `package-photo-${currentPhotoIndex + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download photo:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle>Package Photos</DialogTitle>
              {packageInfo && (
                <div className="flex gap-2 mt-2">
                  {packageInfo.suiteNumber && (
                    <Badge variant="outline">{packageInfo.suiteNumber}</Badge>
                  )}
                  {packageInfo.senderStore && (
                    <Badge variant="secondary">{packageInfo.senderStore}</Badge>
                  )}
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="relative flex-1">
          {/* Main photo display */}
          <div className="relative bg-black/5 flex items-center justify-center min-h-[400px]">
            <img
              src={currentPhoto.url}
              alt={`Package photo ${currentPhotoIndex + 1}`}
              className="max-w-full max-h-[60vh] object-contain"
              loading="lazy"
            />
            
            {/* Navigation arrows */}
            {normalizedPhotos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost" 
                  size="sm"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Photo info and controls */}
          <div className="p-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {currentPhotoIndex + 1} of {normalizedPhotos.length}
                </span>
                {currentPhoto.caption && (
                  <span className="text-sm">{currentPhoto.caption}</span>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          </div>

          {/* Thumbnail strip */}
          {normalizedPhotos.length > 1 && (
            <div className="p-4 pt-0">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {normalizedPhotos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPhotoIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${
                      index === currentPhotoIndex 
                        ? 'border-primary' 
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={photo.url}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};