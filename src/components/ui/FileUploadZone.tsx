import React, { useState, useRef, useCallback } from 'react';
import { 
  Upload, 
  X, 
  FileImage, 
  FileText, 
  File, 
  Image,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Eye,
  RefreshCw,
  Trash2,
  Loader2
} from 'lucide-react';
import { FilePreviewModal } from './FilePreviewModal';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  onFileDelete?: () => void;
  uploadStatus?: {
    status: 'idle' | 'uploading' | 'success' | 'error';
    message?: string;
    progress?: number;
  };
  uploadedFile?: File | null;
  accept?: string;
  maxSize?: number; // in bytes
  disabled?: boolean;
  className?: string;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileSelect,
  onFileDelete,
  uploadStatus = { status: 'idle' },
  uploadedFile,
  accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv',
  maxSize = 10 * 1024 * 1024, // 10MB default
  disabled = false,
  className = '',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
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
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File size must be less than ${formatFileSize(maxSize)}`;
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
      return 'File type not supported. Please upload images, PDFs, or documents.';
    }

    return null;
  };

  const handleFileSelection = useCallback((file: File) => {
    if (disabled) return;

    const error = validateFile(file);
    if (error) {
      // We'll handle this in the parent component
      console.error('File validation error:', error);
      return;
    }

    onFileSelect(file);
  }, [disabled, maxSize, accept, onFileSelect]);

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

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files[0]); // Take first file only
    }
  }, [disabled, handleFileSelection]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
    // Reset input value to allow re-uploading same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelection]);

  const handleClick = useCallback(() => {
    if (!disabled && uploadStatus.status !== 'uploading') {
      fileInputRef.current?.click();
    }
  }, [disabled, uploadStatus.status]);

  // Show uploaded file with actions
  if (uploadedFile && uploadStatus.status === 'success') {
    const FileIcon = getFileIcon(uploadedFile);
    const isImage = uploadedFile.type.startsWith('image/');

    return (
      <div className={`space-y-3 ${className}`}>
        {/* Success Message */}
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
            <p className="text-green-600 text-sm font-medium">
              {uploadStatus.message || `✓ ${uploadedFile.name} uploaded successfully`}
            </p>
          </div>
        </div>

        {/* File Display Chip */}
        <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 max-w-xs">
          <FileIcon className="h-4 w-4 text-green-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-green-800 truncate">{uploadedFile.name}</p>
            <p className="text-xs text-green-600">{formatFileSize(uploadedFile.size)}</p>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              className="p-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded transition-colors"
              title="Preview"
              onClick={() => setShowPreview(true)}
            >
              <Eye className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={onFileDelete}
              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
              title="Remove"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* File Management Buttons */}
        <div className="flex gap-2">
          <label className="flex items-center justify-center px-3 py-2 bg-blue-50 border border-blue-300 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors text-blue-600">
            <RefreshCw className="h-4 w-4" />
            <span className="ml-1 text-sm font-medium">Replace</span>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={accept}
              onChange={handleInputChange}
              disabled={disabled}
            />
          </label>
          <button
            type="button"
            onClick={onFileDelete}
            className="flex items-center justify-center px-3 py-2 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 transition-colors text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            <span className="ml-1 text-sm font-medium">Remove</span>
          </button>
        </div>
      </div>
    );
  }

  // Show uploading state
  if (uploadStatus.status === 'uploading') {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Upload Progress */}
        <div className="p-6 border-2 border-blue-300 border-dashed rounded-lg bg-blue-50">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              {uploadStatus.progress !== undefined && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-700">
                    {Math.round(uploadStatus.progress)}%
                  </span>
                </div>
              )}
            </div>
            <p className="text-sm font-medium text-blue-700 mb-1">
              {uploadStatus.message || 'Uploading file...'}
            </p>
            {uploadStatus.progress !== undefined && (
              <div className="w-full max-w-xs bg-blue-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadStatus.progress}%` }}
                />
              </div>
            )}
            <p className="text-xs text-blue-600">Please wait while we upload your file</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (uploadStatus.status === 'error') {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Error Message */}
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <p className="text-red-600 text-sm font-medium">
              {uploadStatus.message || 'Upload failed. Please try again.'}
            </p>
          </div>
        </div>

        {/* Retry Upload Zone */}
        <div
          className={`
            relative p-6 border-2 border-dashed rounded-lg transition-all cursor-pointer
            ${isDragOver 
              ? 'border-red-400 bg-red-50' 
              : 'border-red-300 hover:border-red-400 hover:bg-red-50'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={accept}
            onChange={handleInputChange}
            disabled={disabled}
          />
          
          <div className="flex flex-col items-center text-center">
            <Upload className="h-8 w-8 text-red-500 mb-3" />
            <p className="text-sm font-medium text-red-700 mb-1">
              Try uploading again
            </p>
            <p className="text-xs text-red-600">
              Drag & drop a file here, or click to browse
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Default upload zone
  return (
    <div className={className}>
      <div
        className={`
          relative p-6 border-2 border-dashed rounded-lg transition-all cursor-pointer
          ${isDragOver 
            ? 'border-teal-400 bg-teal-50' 
            : 'border-gray-300 hover:border-teal-400 hover:bg-teal-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
        />
        
        <div className="flex flex-col items-center text-center">
          <div className={`
            p-3 rounded-full mb-4 transition-colors
            ${isDragOver ? 'bg-teal-100' : 'bg-gray-100'}
          `}>
            <Upload className={`
              h-6 w-6 transition-colors
              ${isDragOver ? 'text-teal-600' : 'text-gray-500'}
            `} />
          </div>
          
          <p className={`
            text-sm font-medium mb-1 transition-colors
            ${isDragOver ? 'text-teal-700' : 'text-gray-700'}
          `}>
            {isDragOver ? 'Drop your file here' : 'Drag & drop a file here'}
          </p>
          
          <p className={`
            text-xs mb-3 transition-colors
            ${isDragOver ? 'text-teal-600' : 'text-gray-500'}
          `}>
            or click to browse your files
          </p>
          
          <div className="flex flex-wrap gap-1 justify-center text-xs text-gray-400">
            <span>Supports:</span>
            <span className="text-gray-500">Images, PDFs, Documents</span>
          </div>
          
          <p className="text-xs text-gray-400 mt-1">
            Max file size: {formatFileSize(maxSize)}
          </p>
        </div>

        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-teal-50 bg-opacity-90 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Upload className="h-8 w-8 text-teal-600 mx-auto mb-2" />
              <p className="text-teal-700 font-medium">Drop to upload</p>
            </div>
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        file={uploadedFile}
      />
    </div>
  );
};