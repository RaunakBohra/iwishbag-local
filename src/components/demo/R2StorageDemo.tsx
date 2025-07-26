import React, { useState } from 'react';
import { Upload, X, FileImage, Loader2 } from 'lucide-react';
import { useR2Storage } from '../../hooks/useR2Storage';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';

export function R2StorageDemo() {
  const { uploadFile, deleteFile, uploading, progress, error } = useR2Storage();
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ url: string; key: string; name: string }>>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    await handleFiles(files);
  };

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      const result = await uploadFile(file, 'demo');
      if (result) {
        setUploadedFiles(prev => [...prev, { ...result, name: file.name }]);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    handleFiles(files);
  };

  const handleDelete = async (key: string, index: number) => {
    const success = await deleteFile(key);
    if (success) {
      setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">R2 Storage Demo</h2>
        
        {/* Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
            accept="image/*"
          />
          
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <Upload className="w-12 h-12 text-gray-400" />
            <p className="text-lg font-medium">
              Drop files here or click to upload
            </p>
            <p className="text-sm text-gray-500">
              Supports: JPEG, PNG, WebP, GIF (max 10MB)
            </p>
          </label>

          {uploading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p className="text-sm font-medium">Uploading...</p>
                {progress && (
                  <Progress 
                    value={progress.percentage} 
                    className="w-48 mt-2"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}
      </Card>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Uploaded Files</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploadedFiles.map((file, index) => (
              <div key={file.key} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="mt-2">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500 truncate">{file.key}</p>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(file.key, index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Integration Example */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Integration Example</h3>
        <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`import { useR2Storage } from '@/hooks/useR2Storage';

function ProductImageUpload() {
  const { uploadFile, uploading } = useR2Storage();
  
  const handleUpload = async (file: File) => {
    const result = await uploadFile(file, 'products');
    if (result) {
      console.log('Uploaded to:', result.url);
      // Save URL to database
    }
  };
  
  return (
    <input 
      type="file" 
      onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
      disabled={uploading}
    />
  );
}`}
        </pre>
      </Card>
    </div>
  );
}