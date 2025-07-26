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
  Loader2,
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

interface MultiFileUploadZoneProps {
  onFilesChange: (files: UploadedFile[]) => void;
  onFileUpload: (file: File) => Promise<{ url: string; key: string }>;
  uploadedFiles?: UploadedFile[];
  accept?: string;
  maxSize?: number; // in bytes
  maxFiles?: number; // max number of files
  disabled?: boolean;
  className?: string;
}

export const MultiFileUploadZone: React.FC<MultiFileUploadZoneProps> = ({
  onFilesChange,
  onFileUpload,
  uploadedFiles = [],
  accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv',
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 5, // 5 files max per product
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

  const handleFileSelection = useCallback(async (files: FileList | File[]) => {
    if (disabled) return;

    const fileArray = Array.from(files);
    
    // Check if adding these files would exceed the limit
    if (uploadedFiles.length + fileArray.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed per product`);
      return;
    }

    // Validate each file
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

    // Create new uploaded file entries with uploading status
    const newFiles: UploadedFile[] = validFiles.map(file => ({
      file,
      status: 'uploading' as const,
      message: `Uploading ${file.name}...`,
      progress: 0,
    }));

    // Update state to show uploading files
    const allFiles = [...uploadedFiles, ...newFiles];
    onFilesChange(allFiles);

    // Upload each file
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const fileIndex = uploadedFiles.length + i;

      try {
        const result = await onFileUpload(file);
        
        // Update the specific file with success status
        const updatedFiles = [...allFiles];
        updatedFiles[fileIndex] = {
          ...updatedFiles[fileIndex],
          status: 'success',
          message: `✓ ${file.name} uploaded successfully`,
          url: result.url,
          key: result.key,
        };
        
        onFilesChange(updatedFiles);
      } catch (error) {
        // Update the specific file with error status
        const updatedFiles = [...allFiles];
        updatedFiles[fileIndex] = {
          ...updatedFiles[fileIndex],
          status: 'error',
          message: error instanceof Error ? error.message : 'Upload failed. Please try again.',
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
    // Reset input value to allow re-uploading same file
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

  const canAddMore = uploadedFiles.length < maxFiles && !disabled;

  return (
    <div className={className}>
      {/* Uploaded Files Display */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3 mb-4">
          {uploadedFiles.map((uploadedFile, index) => {
            const FileIcon = getFileIcon(uploadedFile.file);
            
            return (
              <div key={`${uploadedFile.file.name}-${index}`}>
                {/* File Status */}
                {uploadedFile.status === 'uploading' && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-blue-700 text-sm font-medium truncate">
                          {uploadedFile.message}
                        </p>
                        {uploadedFile.progress !== undefined && (
                          <div className="mt-1">
                            <div className="w-full bg-blue-200 rounded-full h-1.5">
                              <div 
                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${uploadedFile.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {uploadedFile.status === 'success' && (
                  <div className="space-y-2">
                    {/* Success Message */}
                    <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <p className="text-green-600 text-sm font-medium">
                          {uploadedFile.message}
                        </p>
                      </div>
                    </div>

                    {/* File Chip */}
                    <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 max-w-xs">
                      <FileIcon className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-green-800 truncate">{uploadedFile.file.name}</p>
                        <p className="text-xs text-green-600">{formatFileSize(uploadedFile.file.size)}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="p-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded transition-colors"
                          title="Preview"
                          onClick={() => setPreviewFile(uploadedFile)}
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFileDelete(index)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                          title="Remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {uploadedFile.status === 'error' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      <p className="text-red-600 text-sm font-medium">
                        {uploadedFile.message}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Zone */}
      {canAddMore && (
        <div
          className={`
            relative p-4 border-2 border-dashed rounded-lg transition-all cursor-pointer
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
            multiple
            className="hidden"
            accept={accept}
            onChange={handleInputChange}
            disabled={disabled}
          />
          
          <div className="flex flex-col items-center text-center">
            <div className={`
              p-2 rounded-full mb-3 transition-colors
              ${isDragOver ? 'bg-teal-100' : 'bg-gray-100'}
            `}>
              {uploadedFiles.length > 0 ? (
                <Plus className={`
                  h-5 w-5 transition-colors
                  ${isDragOver ? 'text-teal-600' : 'text-gray-500'}
                `} />
              ) : (
                <Upload className={`
                  h-5 w-5 transition-colors
                  ${isDragOver ? 'text-teal-600' : 'text-gray-500'}
                `} />
              )}
            </div>
            
            <p className={`
              text-sm font-medium mb-1 transition-colors
              ${isDragOver ? 'text-teal-700' : 'text-gray-700'}
            `}>
              {uploadedFiles.length > 0 
                ? `Add ${isDragOver ? 'files here' : 'more files'}`
                : isDragOver ? 'Drop your files here' : 'Drag & drop files here'
              }
            </p>
            
            <p className={`
              text-xs mb-2 transition-colors
              ${isDragOver ? 'text-teal-600' : 'text-gray-500'}
            `}>
              or click to browse ({uploadedFiles.length}/{maxFiles} files)
            </p>
            
            <div className="flex flex-wrap gap-1 justify-center text-xs text-gray-400">
              <span>Max {formatFileSize(maxSize)} per file</span>
            </div>
          </div>

          {/* Drag overlay */}
          {isDragOver && (
            <div className="absolute inset-0 bg-teal-50 bg-opacity-90 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Upload className="h-6 w-6 text-teal-600 mx-auto mb-2" />
                <p className="text-teal-700 font-medium">Drop to upload</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Max files reached message */}
      {!canAddMore && !disabled && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <p className="text-yellow-700 text-sm">
            Maximum {maxFiles} files reached
          </p>
        </div>
      )}

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