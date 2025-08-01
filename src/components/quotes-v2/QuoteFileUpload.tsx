import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  Image, 
  X, 
  Download,
  Eye,
  AlertCircle,
  Paperclip,
  File,
  FileImage,
  FileVideo
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface QuoteDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size: number;
  description?: string;
  uploaded_at: string;
  is_customer_visible: boolean;
}

interface QuoteFileUploadProps {
  quoteId: string;
  documents: QuoteDocument[];
  onDocumentsUpdate: (documents: QuoteDocument[]) => void;
  isReadOnly?: boolean;
}

const documentTypes = [
  { value: 'invoice', label: 'Invoice', icon: FileText },
  { value: 'receipt', label: 'Receipt', icon: FileText },
  { value: 'shipping_label', label: 'Shipping Label', icon: FileText },
  { value: 'customs_form', label: 'Customs Form', icon: FileText },
  { value: 'insurance_doc', label: 'Insurance Document', icon: FileText },
  { value: 'other', label: 'Other', icon: File }
];

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return FileImage;
    case 'pdf':
      return FileText;
    case 'mp4':
    case 'mov':
    case 'avi':
      return FileVideo;
    default:
      return File;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function QuoteFileUpload({ 
  quoteId, 
  documents, 
  onDocumentsUpdate,
  isReadOnly = false 
}: QuoteFileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState('other');
  const [description, setDescription] = useState('');
  const [isCustomerVisible, setIsCustomerVisible] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 10MB',
        variant: 'destructive'
      });
      return;
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'text/plain', 'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Only images, PDFs, and office documents are allowed',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create unique file name
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `quotes/${quoteId}/${timestamp}_${sanitizedFileName}`;

      // Upload to Cloudflare R2 via edge function
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', filePath);
      formData.append('bucket', 'iwishbag-quote-documents');

      const uploadResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-to-r2`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadResult = await uploadResponse.json();
      const publicUrl = uploadResult.publicUrl;

      // Save document record to database
      const documentData = {
        quote_id: quoteId,
        document_type: documentType,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        uploaded_by: user.id,
        description: description || null,
        is_customer_visible: isCustomerVisible
      };

      const { data: newDocument, error: dbError } = await supabase
        .from('quote_documents')
        .insert(documentData)
        .select()
        .single();

      if (dbError) throw dbError;

      // Update documents list
      onDocumentsUpdate([...documents, newDocument]);

      // Reset form
      setDescription('');
      setDocumentType('other');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      toast({
        title: 'File uploaded',
        description: `${file.name} has been uploaded successfully`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload file. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  }, [quoteId, documentType, description, isCustomerVisible, documents, onDocumentsUpdate]);

  const handleDeleteDocument = async (documentId: string, filePath: string) => {
    try {
      // Delete from Cloudflare R2 via edge function
      const deleteResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-from-r2`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: filePath,
          bucket: 'iwishbag-quote-documents'
        })
      });

      if (!deleteResponse.ok) {
        console.warn('R2 deletion failed:', await deleteResponse.text());
        // Continue with database deletion even if storage fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('quote_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      // Update documents list
      onDocumentsUpdate(documents.filter(doc => doc.id !== documentId));

      toast({
        title: 'File deleted',
        description: 'Document has been removed',
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete failed',
        description: 'Failed to delete document',
        variant: 'destructive'
      });
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Paperclip className="h-5 w-5" />
          Quote Documents
        </CardTitle>
        <CardDescription>
          Upload images, invoices, and other documents for this quote
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section */}
        {!isReadOnly && (
          <div className="space-y-4">
            {/* File Upload Area */}
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop files here, or click to select
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mb-2"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Choose Files'}
              </Button>
              <p className="text-xs text-gray-500">
                Max 10MB • Images, PDFs, Office documents
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileSelect(e.target.files)}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                className="hidden"
                disabled={uploading}
              />
            </div>

            {/* Upload Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description..."
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="customer-visible"
                checked={isCustomerVisible}
                onChange={(e) => setIsCustomerVisible(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="customer-visible" className="text-sm">
                Visible to customer
              </Label>
            </div>
          </div>
        )}

        {/* Documents List */}
        {documents.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Uploaded Documents</h4>
              <Badge variant="secondary">{documents.length} files</Badge>
            </div>
            
            <div className="space-y-2">
              {documents.map((doc) => {
                const Icon = getFileIcon(doc.file_name);
                const docType = documentTypes.find(t => t.value === doc.document_type);
                
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Icon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{doc.file_name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{docType?.label || doc.document_type}</span>
                          <span>•</span>
                          <span>{formatFileSize(doc.file_size)}</span>
                          {doc.description && (
                            <>
                              <span>•</span>
                              <span className="truncate">{doc.description}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {doc.is_customer_visible && (
                        <Badge variant="outline" className="text-xs">
                          Customer Visible
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(doc.file_url, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!isReadOnly && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const filePath = doc.file_url.split('/').slice(-3).join('/');
                            handleDeleteDocument(doc.id, filePath);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {documents.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No documents uploaded yet</p>
          </div>
        )}

        {/* Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Documents marked as "Customer Visible" will be shown to the customer when they view the quote.
            Sensitive documents should be kept internal only.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}