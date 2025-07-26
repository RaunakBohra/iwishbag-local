import React, { useState, useRef, useCallback } from 'react';
import { 
  Upload, 
  X, 
  FileImage, 
  FileText, 
  File, 
  Image,
  FileSpreadsheet,
  Eye,
  Loader2,
  Paperclip,
  Plus
} from 'lucide-react';
import { FilePreviewModal } from './FilePreviewModal';

interface UploadedFile {
  file: File;
  url?: string;
  key?: string;
  status: 'idle' | 'uploading' | 'success' | 'error';
  message?: string;
  progress?: number;
}

interface InlineFileUploadZoneProps {
  onFilesChange: (files: UploadedFile[]) => void;
  onFileUpload: (file: File) => Promise<{ url: string; key: string }>;
  uploadedFiles?: UploadedFile[];
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}

export const InlineFileUploadZone: React.FC<InlineFileUploadZoneProps> = ({
  onFilesChange,
  onFileUpload,
  uploadedFiles = [],
  accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv',
  maxSize = 10 * 1024 * 1024,
  maxFiles = 5,
  disabled = false,
  className = '',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (file: File) => {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();

    if (type.startsWith('image/')) return Image;
    if (type === 'application/pdf' || name.endsWith('.pdf')) return FileText;
    if (type.includes('spreadsheet') || name.endsWith('.xlsx') || name.endsWith('.xls')) return FileSpreadsheet;
    if (type.includes('document') || name.endsWith('.docx') || name.endsWith('.doc')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File too large`;
    }

    const acceptedTypes = accept.split(',').map(type => type.trim());
    const isValidType = acceptedTypes.some(acceptedType => {
      if (acceptedType.startsWith('.')) {
        return file.name.toLowerCase().endsWith(acceptedType.toLowerCase());
      }
      if (acceptedType.includes('/*')) {
        const mainType = acceptedType.split('/')[0];
        return file.type.startsWith(mainType);
      }
      return file.type === acceptedType;
    });

    if (!isValidType) {
      return 'File type not supported';
    }

    return null;
  };

  const handleFileSelection = useCallback(async (files: FileList | File[]) => {
    if (disabled) return;

    const fileArray = Array.from(files);
    
    if (uploadedFiles.length + fileArray.length > maxFiles) {
      alert(`Max ${maxFiles} files`);
      return;
    }

    const validFiles: File[] = [];
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        alert(`${file.name}: ${error}`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const newFiles: UploadedFile[] = validFiles.map(file => ({
      file,
      status: 'uploading' as const,
      message: `Uploading...`,
      progress: 0,
    }));

    const allFiles = [...uploadedFiles, ...newFiles];
    onFilesChange(allFiles);

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const fileIndex = uploadedFiles.length + i;

      try {
        const result = await onFileUpload(file);
        
        const updatedFiles = [...allFiles];
        updatedFiles[fileIndex] = {
          ...updatedFiles[fileIndex],
          status: 'success',
          message: `Uploaded`,
          url: result.url,
          key: result.key,
        };
        
        onFilesChange(updatedFiles);
      } catch (error) {
        const updatedFiles = [...allFiles];
        updatedFiles[fileIndex] = {
          ...updatedFiles[fileIndex],
          status: 'error',
          message: 'Failed',
        };
        
        onFilesChange(updatedFiles);
      }
    }
  }, [disabled, maxSize, accept, maxFiles, uploadedFiles, onFileUpload, onFilesChange]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragOver(false);
      }
      return newCounter;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files);
    }
  }, [disabled, handleFileSelection]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelection]);

  const handleClick = useCallback(() => {
    if (!disabled && uploadedFiles.length < maxFiles) {
      fileInputRef.current?.click();
    }
  }, [disabled, uploadedFiles.length, maxFiles]);

  const handleFileDelete = useCallback((index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  }, [uploadedFiles, onFilesChange]);

  const successFiles = uploadedFiles.filter(f => f.status === 'success');
  const uploadingFiles = uploadedFiles.filter(f => f.status === 'uploading');
  const hasUploading = uploadingFiles.length > 0;

  return (
    <div className={className}>
      {/* Inline Upload Button */}
      <div
        className={`
          relative flex items-center justify-center h-[40px] sm:h-[48px] px-3 sm:px-4 border-2 border-dashed rounded-lg cursor-pointer transition-all
          ${isDragOver 
            ? 'border-teal-400 bg-teal-50' 
            : 'border-orange-400 hover:border-orange-500 bg-orange-50 hover:bg-orange-100'
          }
          ${disabled || uploadedFiles.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}
          ${hasUploading ? 'border-blue-300 bg-blue-50' : ''}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        title={`Upload files • ${uploadedFiles.length}/${maxFiles} files • Max 10MB`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled || uploadedFiles.length >= maxFiles}
        />
        
        {hasUploading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-blue-700 text-sm font-medium hidden sm:inline">
              Uploading...
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {successFiles.length > 0 ? (
              <>
                <Paperclip className={`h-4 w-4 ${isDragOver ? 'text-teal-600' : 'text-orange-500'}`} />
                <span className={`text-sm font-medium hidden sm:inline ${isDragOver ? 'text-teal-700' : 'text-orange-600'}`}>
                  {successFiles.length}/{maxFiles}
                </span>
              </>
            ) : (
              <>
                <Upload className={`h-4 w-4 ${isDragOver ? 'text-teal-600' : 'text-orange-600'}`} />
                <span className={`text-sm font-medium hidden sm:inline ${isDragOver ? 'text-teal-700' : 'text-orange-700'}`}>
                  {isDragOver ? 'Drop files' : 'Upload'}
                </span>
              </>
            )}
          </div>
        )}

        {/* Progress bar for uploading */}
        {hasUploading && uploadingFiles[0]?.progress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-200 rounded-b-lg overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${uploadingFiles[0].progress}%` }}
            />
          </div>
        )}

        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-teal-50 bg-opacity-90 rounded-lg flex items-center justify-center">
            <div className="flex items-center gap-1 text-teal-700">
              <Upload className="h-3 w-3" />
              <span className="text-xs font-medium">Drop</span>
            </div>
          </div>
        )}
      </div>

      {/* File Chips - Only show successful uploads */}
      {successFiles.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {successFiles.map((uploadedFile, index) => {
            const FileIcon = getFileIcon(uploadedFile.file);
            return (
              <div 
                key={`file-${index}`} 
                className="inline-flex items-center gap-1 bg-green-50 border border-green-200 rounded px-2 py-1 text-xs"
              >
                <FileIcon className="h-3 w-3 text-green-600 flex-shrink-0" />
                <span className="text-green-800 font-medium truncate max-w-16 sm:max-w-20">
                  {uploadedFile.file.name}
                </span>
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    className="p-0.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                    title="Preview"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewFile(uploadedFile);
                    }}
                  >
                    <Eye className="h-2.5 w-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileDelete(uploadedFiles.findIndex(f => f === uploadedFile));
                    }}
                    className="p-0.5 text-red-500 hover:bg-red-100 rounded transition-colors"
                    title="Remove"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Error Files - Compact Error Display */}
      {uploadedFiles.filter(f => f.status === 'error').map((uploadedFile, index) => (
        <div key={`error-${index}`} className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
          <div className="flex items-center gap-1">
            <X className="h-3 w-3 text-red-600 flex-shrink-0" />
            <span className="text-red-700 font-medium truncate">
              {uploadedFile.file.name}
            </span>
            <span className="text-red-600">failed</span>
          </div>
        </div>
      ))}

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile?.file || null}
        fileUrl={previewFile?.url}
      />
    </div>
  );
};