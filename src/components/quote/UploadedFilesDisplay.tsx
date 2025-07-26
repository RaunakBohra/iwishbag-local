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
}

export const UploadedFilesDisplay: React.FC<UploadedFilesDisplayProps> = ({
  sessionId,
  isAdmin = false,
  className = ''
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
        setFiles(uploadedFiles);
      } catch (err) {
        console.error('Error fetching uploaded files:', err);
        setError('Failed to load uploaded files');
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [sessionId]);

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
    <div className={`space-y-4 ${className}`}>
      {Object.entries(groupedFiles).map(([productIndex, productFiles]) => (
        <div key={productIndex} className="space-y-3">
          {Object.keys(groupedFiles).length > 1 && (
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-500" />
              <Badge variant="secondary">
                Product {parseInt(productIndex) + 1}
              </Badge>
            </div>
          )}
          
          <div className="grid gap-3">
            {productFiles.map((file, index) => (
              <div
                key={file.key}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 text-gray-500">
                    {getFileIcon(file.originalName || '')}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {file.originalName || `file-${index + 1}`}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                      <div className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {formatFileSize(file.size)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(file.uploaded).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {canPreview(file.originalName || '') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreview(file)}
                      className="h-8 w-8 p-0"
                      title="Preview file"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(file)}
                    className="h-8 w-8 p-0"
                    title="Download file"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(file.url, '_blank')}
                    className="h-8 w-8 p-0"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {isAdmin && files.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Admin Note:</strong> These files were uploaded by the customer during quote submission. 
            Review them for accurate pricing and product identification.
          </p>
        </div>
      )}
    </div>
  );
};

export default UploadedFilesDisplay;