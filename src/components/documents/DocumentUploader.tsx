import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload, X, FileText, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DocumentUploaderProps {
  quoteId: string;
  orderId: string;
  onSuccess: () => void;
  isAdmin?: boolean;
}

const DOCUMENT_TYPES = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'shipping_label', label: 'Shipping Label' },
  { value: 'customs_form', label: 'Customs Form' },
  { value: 'insurance_doc', label: 'Insurance Document' },
  { value: 'other', label: 'Other' },
] as const;

export const DocumentUploader = ({ 
  quoteId, 
  orderId, 
  onSuccess, 
  isAdmin = false 
}: DocumentUploaderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('');
  const [fileName, setFileName] = useState('');
  const [description, setDescription] = useState('');
  const [isCustomerVisible, setIsCustomerVisible] = useState(true);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file size (50MB limit for documents)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 50MB.",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
    disabled: uploading
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error('Please select a file to upload');
      }
      if (!user) {
        throw new Error('Authentication required. Please sign in to upload documents.');
      }
      if (!documentType) {
        throw new Error('Please select a document type');
      }

      setUploading(true);

      try {
        // Upload file to Supabase Storage with retry logic
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${quoteId}/${documentType}-${Date.now()}.${fileExt}`;
        
        let uploadAttempts = 0;
        const maxAttempts = 3;
        let uploadError: any = null;
        
        while (uploadAttempts < maxAttempts) {
          const { error } = await supabase.storage
            .from('message-attachments')
            .upload(fileName, selectedFile);
          
          if (!error) {
            uploadError = null;
            break;
          } else {
            uploadError = error;
            uploadAttempts++;
            if (uploadAttempts < maxAttempts) {
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 1000 * uploadAttempts));
            }
          }
        }
        
        if (uploadError) {
          throw new Error(`File upload failed after ${maxAttempts} attempts: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(fileName);

        // Save document record to database
        const { error: dbError } = await supabase
          .from('quote_documents')
          .insert({
            quote_id: quoteId,
            document_type: documentType,
            file_name: fileName || selectedFile.name,
            file_url: urlData.publicUrl,
            file_size: selectedFile.size,
            uploaded_by: user.id,
            is_customer_visible: isCustomerVisible,
            description: description || null,
          });

        if (dbError) {
          // If database insert fails, try to clean up the uploaded file
          try {
            await supabase.storage
              .from('message-attachments')
              .remove([fileName]);
          } catch (cleanupError) {
            console.warn('Failed to cleanup uploaded file:', cleanupError);
          }
          throw new Error(`Failed to save document record: ${dbError.message}`);
        }

        return { success: true };
      } catch (error: any) {
        console.error('Document upload error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Document uploaded!",
        description: "The document has been uploaded successfully.",
      });
      
      // Reset form
      setSelectedFile(null);
      setDocumentType('');
      setFileName('');
      setDescription('');
      setIsCustomerVisible(true);
      
      onSuccess();
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setUploading(false);
    },
  });

  const handleUpload = () => {
    if (!selectedFile || !documentType) {
      toast({
        title: "Missing information",
        description: "Please select a file and document type.",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate();
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFileName('');
  };

  return (
    <div className="space-y-4">
      {/* File Upload Area */}
      <div className="space-y-2">
        <Label>Upload File</Label>
        {!selectedFile ? (
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'}
              ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            {isDragActive ? (
              <p>Drop the file here...</p>
            ) : (
              <div>
                <p className="font-medium">Click to upload or drag and drop</p>
                <p className="text-sm text-muted-foreground mt-1">
                  PDF, Images, Word, Excel files (max 50MB)
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
            <FileText className="h-6 w-6 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeFile}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Document Type */}
      <div className="space-y-2">
        <Label htmlFor="document-type">Document Type *</Label>
        <Select 
          value={documentType} 
          onValueChange={setDocumentType}
          disabled={uploading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select document type" />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Custom File Name */}
      <div className="space-y-2">
        <Label htmlFor="file-name">Display Name</Label>
        <Input
          id="file-name"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          placeholder="Enter a custom name for this document"
          disabled={uploading}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description for this document"
          rows={3}
          disabled={uploading}
        />
      </div>

      {/* Customer Visibility (Admin only) */}
      {isAdmin && (
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="customer-visible">Customer Visible</Label>
            <p className="text-sm text-muted-foreground">
              Allow customer to view and download this document
            </p>
          </div>
          <Switch
            id="customer-visible"
            checked={isCustomerVisible}
            onCheckedChange={setIsCustomerVisible}
            disabled={uploading}
          />
        </div>
      )}

      {/* Upload Button */}
      <div className="flex gap-2 pt-4">
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || !documentType || uploading}
          className="flex-1"
        >
          {uploading ? (
            <>
              <Upload className="h-4 w-4 mr-2 animate-pulse" />
              Uploading...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Upload Document
            </>
          )}
        </Button>
      </div>
    </div>
  );
};