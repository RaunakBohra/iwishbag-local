import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import {
  Upload,
  Camera,
  X,
  Image,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  Info,
} from 'lucide-react';
import { packagePhotoService, type PhotoType, type PackagePhoto } from '@/services/PackagePhotoService';

interface PackagePhotoUploadProps {
  packageId?: string;
  consolidationGroupId?: string;
  existingPhotos?: PackagePhoto[];
  onPhotosUpdated?: () => void;
}

interface UploadingFile {
  file: File;
  preview: string;
  photoType: PhotoType;
  caption: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  package_front: 'Package Front',
  package_back: 'Package Back',
  package_label: 'Shipping Label',
  contents: 'Package Contents',
  consolidation_before: 'Before Consolidation',
  consolidation_after: 'After Consolidation',
};

export const PackagePhotoUpload: React.FC<PackagePhotoUploadProps> = ({
  packageId,
  consolidationGroupId,
  existingPhotos = [],
  onPhotosUpdated,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [photos, setPhotos] = useState<PackagePhoto[]>(existingPhotos);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: UploadingFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} is not a supported image format`,
          variant: 'destructive',
        });
        continue;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds 10MB limit`,
          variant: 'destructive',
        });
        continue;
      }

      newFiles.push({
        file,
        preview: URL.createObjectURL(file),
        photoType: i === 0 ? 'package_front' : 'contents',
        caption: '',
        status: 'pending',
      });
    }

    setUploadingFiles(prev => [...prev, ...newFiles]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateUploadingFile = (index: number, updates: Partial<UploadingFile>) => {
    setUploadingFiles(prev => 
      prev.map((file, i) => i === index ? { ...file, ...updates } : file)
    );
  };

  const removeUploadingFile = (index: number) => {
    const file = uploadingFiles[index];
    URL.revokeObjectURL(file.preview);
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (uploadingFiles.length === 0) return;

    setIsUploading(true);
    const newPhotos: PackagePhoto[] = [];

    for (let i = 0; i < uploadingFiles.length; i++) {
      const uploadFile = uploadingFiles[i];
      
      updateUploadingFile(i, { status: 'uploading' });

      try {
        const photo = await packagePhotoService.uploadPhoto(uploadFile.file, {
          packageId,
          consolidationGroupId,
          photoType: uploadFile.photoType,
          caption: uploadFile.caption || undefined,
        });

        newPhotos.push(photo);
        updateUploadingFile(i, { status: 'success' });
        
      } catch (error) {
        updateUploadingFile(i, { 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Upload failed' 
        });
      }
    }

    setIsUploading(false);

    if (newPhotos.length > 0) {
      setPhotos(prev => [...prev, ...newPhotos]);
      toast({
        title: 'Photos uploaded',
        description: `Successfully uploaded ${newPhotos.length} photo(s)`,
      });
      
      // Clear successful uploads
      setUploadingFiles(prev => prev.filter(f => f.status !== 'success'));
      
      onPhotosUpdated?.();
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    setDeletingPhotoId(photoId);

    try {
      await packagePhotoService.deletePhoto(photoId);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      
      toast({
        title: 'Photo deleted',
        description: 'The photo has been removed',
      });
      
      onPhotosUpdated?.();
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete photo',
        variant: 'destructive',
      });
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const pendingUploads = uploadingFiles.filter(f => f.status !== 'success');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Package Photos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Existing Photos */}
        {photos.length > 0 && (
          <div>
            <Label className="mb-3 block">Existing Photos</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <img
                    src={photo.photo_url}
                    alt={photo.caption || 'Package photo'}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeletePhoto(photo.id)}
                      disabled={deletingPhotoId === photo.id}
                    >
                      {deletingPhotoId === photo.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Badge className="absolute top-2 left-2 text-xs">
                    {PHOTO_TYPE_LABELS[photo.photo_type as PhotoType]}
                  </Badge>
                  {photo.caption && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {photo.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div>
          <Label className="mb-3 block">Upload New Photos</Label>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          
          <Button
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            Select Photos
          </Button>
        </div>

        {/* Pending Uploads */}
        {pendingUploads.length > 0 && (
          <div className="space-y-4">
            <Label>Photos to Upload</Label>
            
            {pendingUploads.map((file, index) => (
              <Card key={index} className="p-4">
                <div className="flex gap-4">
                  <img
                    src={file.preview}
                    alt="Preview"
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{file.file.name}</span>
                      {file.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeUploadingFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {file.status === 'uploading' && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {file.status === 'success' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {file.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    
                    {file.status === 'pending' && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Photo Type</Label>
                            <Select
                              value={file.photoType}
                              onValueChange={(value: PhotoType) => 
                                updateUploadingFile(index, { photoType: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(PHOTO_TYPE_LABELS).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>Caption (Optional)</Label>
                            <Input
                              value={file.caption}
                              onChange={(e) => 
                                updateUploadingFile(index, { caption: e.target.value })
                              }
                              placeholder="Add a caption..."
                            />
                          </div>
                        </div>
                      </>
                    )}
                    
                    {file.status === 'error' && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{file.error}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </Card>
            ))}
            
            <Button
              onClick={handleUpload}
              disabled={isUploading || pendingUploads.length === 0}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {pendingUploads.length} Photo(s)
                </>
              )}
            </Button>
          </div>
        )}

        {/* Instructions */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Upload photos of packages for customer reference. Supported formats: JPEG, PNG, WebP. 
            Maximum file size: 10MB per photo.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};