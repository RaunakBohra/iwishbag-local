import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { QuoteDocument } from './DocumentManager';

interface DocumentViewerProps {
  document: QuoteDocument;
  onDownload: () => void;
}

export const DocumentViewer = ({ document, onDownload }: DocumentViewerProps) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const isPdf = document.file_name.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(document.file_name);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Document Info */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div>
          <h3 className="font-medium">{document.file_name}</h3>
          <p className="text-sm text-muted-foreground">
            {formatFileSize(document.file_size)}
            {document.description && ` • ${document.description}`}
          </p>
        </div>
        <div className="flex gap-2">
          {isImage && (
            <>
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleRotate}>
                <RotateCw className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={document.file_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </a>
          </Button>
        </div>
      </div>

      {/* Document Content */}
      <div className="border rounded-lg overflow-hidden bg-white">
        {isPdf ? (
          <iframe src={document.file_url} className="w-full h-[600px]" title={document.file_name} />
        ) : isImage ? (
          <div className="flex justify-center p-4 bg-gray-50">
            <img
              src={document.file_url}
              alt={document.file_name}
              className="max-w-full max-h-[600px] object-contain transition-transform"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'center',
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-muted rounded-lg flex items-center justify-center">
                <ExternalLink className="h-8 w-8" />
              </div>
              <div>
                <p className="font-medium">Preview not available</p>
                <p className="text-sm">
                  This file type cannot be previewed. Click "Download" or "Open in New Tab" to view.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" asChild>
                  <a href={document.file_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in New Tab
                  </a>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Zoom indicator for images */}
      {isImage && (
        <div className="text-center text-sm text-muted-foreground">
          Zoom: {zoom}% • Rotation: {rotation}°
        </div>
      )}
    </div>
  );
};
