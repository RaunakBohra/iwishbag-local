import { useState, useCallback } from 'react';
import { getStorageService } from '../services/unified/StorageService';
import { toast } from 'sonner';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UseR2StorageReturn {
  uploadFile: (file: File, folder?: string) => Promise<{ url: string; key: string } | null>;
  uploadMultiple: (files: File[], folder?: string) => Promise<Array<{ url: string; key: string }>>;
  deleteFile: (key: string) => Promise<boolean>;
  uploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
}

export function useR2Storage(): UseR2StorageReturn {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const r2Service = getStorageService();

  const uploadFile = useCallback(async (file: File, folder?: string) => {
    setUploading(true);
    setError(null);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });

    try {
      // Validate file
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('File size exceeds 10MB limit');
      }

      // Validate file type for images
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (folder === 'products' && !allowedTypes.includes(file.type)) {
        throw new Error('Only JPEG, PNG, WebP, and GIF images are allowed');
      }

      const result = await r2Service.uploadFile(file, { folder });
      
      toast.success('File uploaded successfully');
      setProgress({ loaded: file.size, total: file.size, percentage: 100 });
      
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(null), 1000);
    }
  }, [r2Service]);

  const uploadMultiple = useCallback(async (files: File[], folder?: string) => {
    setUploading(true);
    setError(null);
    
    const totalSize = files.reduce((acc, file) => acc + file.size, 0);
    setProgress({ loaded: 0, total: totalSize, percentage: 0 });

    try {
      const results = await r2Service.uploadMultiple(files, { folder });
      toast.success(`${files.length} files uploaded successfully`);
      return results;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      toast.error(message);
      return [];
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(null), 1000);
    }
  }, [r2Service]);

  const deleteFile = useCallback(async (key: string) => {
    try {
      await r2Service.deleteFile(key);
      toast.success('File deleted successfully');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      setError(message);
      toast.error(message);
      return false;
    }
  }, [r2Service]);

  return {
    uploadFile,
    uploadMultiple,
    deleteFile,
    uploading,
    progress,
    error,
  };
}