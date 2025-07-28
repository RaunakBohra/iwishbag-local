import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { R2StorageService } from '@/services/R2StorageService';
import {
  Download,
  FileText,
  Image,
  Eye,
  ExternalLink,
  Package,
  AlertCircle,
  Loader2,
  Calendar,
  HardDrive
} from 'lucide-react';

interface UploadedFile {
  key: string;
  url: string;
  size: number;
  uploaded: string;
  metadata?: Record<string, any>;
  originalName?: string;
  productIndex?: string;
}

interface UploadedFilesDisplayProps {
  sessionId?: string;
  isAdmin?: boolean;
  className?: string;
  quoteCreatedAt?: string;
}

export const UploadedFilesDisplay: React.FC<UploadedFilesDisplayProps> = ({
  sessionId,
  isAdmin = false,
  className = '',
  quoteCreatedAt
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const r2Service = R2StorageService.getInstance();
        const uploadedFiles = await r2Service.getQuoteFiles(sessionId);
        
        // Debug logging
        console.log('UploadedFilesDisplay Debug:', {
          sessionId,
          quoteCreatedAt,
          totalFiles: uploadedFiles.length,
          files: uploadedFiles.map(f => ({
            name: f.originalName,
            uploaded: f.uploaded,
            uploadedDate: new Date(f.uploaded).toISOString()
          }))
        });
        
        // Check if this is a legacy quote
        // Legacy quotes have sessionIds that are reused across multiple quotes
        // We can detect this by checking if multiple files span across many days
        const fileDates = uploadedFiles.map(f => new Date(f.uploaded).getTime());
        const earliestUpload = fileDates.length > 0 ? new Date(Math.min(...fileDates)) : null;
        const latestUpload = fileDates.length > 0 ? new Date(Math.max(...fileDates)) : null;
        const uploadSpanDays = earliestUpload && latestUpload ? 
          (latestUpload.getTime() - earliestUpload.getTime()) / (1000 * 60 * 60 * 24) : 0;
        
        // If files span more than 7 days, it's likely a legacy shared sessionId
        const isLegacyQuote = uploadSpanDays > 7 || uploadedFiles.length > 10;
        
        console.log('Legacy quote check:', {
          quoteCreatedAt,
          sessionId,
          totalFiles: uploadedFiles.length,
          earliestUpload: earliestUpload?.toISOString(),
          latestUpload: latestUpload?.toISOString(),
          uploadSpanDays,
          isLegacyQuote
        });
        
        if (isLegacyQuote && quoteCreatedAt) {
          // For legacy quotes, filter files by upload time
          const quoteDate = new Date(quoteCreatedAt);
          const dayBefore = new Date(quoteDate.getTime() - 24 * 60 * 60 * 1000);
          const dayAfter = new Date(quoteDate.getTime() + 24 * 60 * 60 * 1000);
          
          console.log('Time window for filtering:', {
            quoteDate: quoteDate.toISOString(),
            dayBefore: dayBefore.toISOString(),
            dayAfter: dayAfter.toISOString()
          });
          
          const filteredFiles = uploadedFiles.filter(file => {
            const uploadDate = new Date(file.uploaded);
            const isWithinWindow = uploadDate >= dayBefore && uploadDate <= dayAfter;
            console.log(`File ${file.originalName}: uploaded ${uploadDate.toISOString()}, within window: ${isWithinWindow}`);
            return isWithinWindow;
          });
          
          console.log(`Legacy quote filtering: ${uploadedFiles.length} files -> ${filteredFiles.length} files within time window`);
          setFiles(filteredFiles);
        } else {
          // For new quotes, use all files with the sessionId
          console.log('Not a legacy quote, showing all files with sessionId:', sessionId);
          setFiles(uploadedFiles);
        }
      } catch (err) {
        console.error('Error fetching uploaded files:', err);
        setError('Failed to load uploaded files');
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [sessionId, quoteCreatedAt]);

  // Group files by product index
  const groupedFiles = React.useMemo(() => {
    const groups: Record<string, UploadedFile[]> = {};
    files.forEach(file => {
      const productIndex = file.metadata?.productIndex || file.productIndex || '0';
      if (!groups[productIndex]) {
        groups[productIndex] = [];
      }
      groups[productIndex].push(file);
    });
    return groups;
  }, [files]);

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Helper function to get file icon
  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    
    if (imageExtensions.includes(extension || '')) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  // Helper function to determine if file can be previewed
  const canPreview = (filename: string): boolean => {
    const extension = filename.split('.').pop()?.toLowerCase();
    const previewableExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf'];
    return previewableExtensions.includes(extension || '');
  };

  // Handle file download
  const handleDownload = (file: UploadedFile) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.originalName || 'file';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle file preview
  const handlePreview = (file: UploadedFile) => {
    window.open(file.url, '_blank');
  };

  if (!sessionId) {
    return null;
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading uploaded files...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (files.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <Package className="h-8 w-8" />
          <p>No files uploaded for this quote</p>
          {isAdmin && (
            <p className="text-sm">Customer did not upload any reference images or documents</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left text-xs font-medium text-gray-500 pb-2">File</th>
              <th className="text-left text-xs font-medium text-gray-500 pb-2 hidden sm:table-cell">Product</th>
              <th className="text-right text-xs font-medium text-gray-500 pb-2">Size</th>
              <th className="text-right text-xs font-medium text-gray-500 pb-2 w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file, index) => {
              const productIndex = file.metadata?.productIndex || file.productIndex || '0';
              return (
                <tr key={file.key} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-2">
                      {getFileIcon(file.originalName || '')}
                      <span className="text-sm font-medium truncate max-w-[200px]">
                        {file.originalName || `file-${index + 1}`}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 text-sm text-gray-600 hidden sm:table-cell">
                    {Object.keys(groupedFiles).length > 1 && `Product ${parseInt(productIndex) + 1}`}
                  </td>
                  <td className="py-2 text-sm text-gray-600 text-right">
                    {formatFileSize(file.size)}
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canPreview(file.originalName || '') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreview(file)}
                          className="h-7 w-7 p-0"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(file)}
                        className="h-7 w-7 p-0"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UploadedFilesDisplay;