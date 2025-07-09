import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  FileText, 
  Receipt, 
  Package, 
  Eye, 
  Upload,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables } from "@/integrations/supabase/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocumentUploader } from "./DocumentUploader";
import { DocumentViewer } from "./DocumentViewer";

interface Document {
  id: string;
  quote_id: string;
  document_type: 'invoice' | 'receipt' | 'shipping_label' | 'customs_form' | 'insurance_doc' | 'other';
  file_name: string;
  file_url: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
  is_customer_visible: boolean;
  description?: string;
}

interface DocumentManagerProps {
  quoteId: string;
  orderId: string;
  isAdmin?: boolean;
  canUpload?: boolean;
}

export const DocumentManager = ({ 
  quoteId, 
  orderId, 
  isAdmin = false, 
  canUpload = false 
}: DocumentManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [showViewer, setShowViewer] = useState(false);

  // Fetch documents for this quote
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['quote-documents', quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quote_documents')
        .select('*')
        .eq('quote_id', quoteId)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      return data as Document[];
    },
  });

  // Filter documents based on user role
  const visibleDocuments = isAdmin 
    ? documents 
    : documents.filter(doc => doc.is_customer_visible);

  const downloadDocument = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('message-attachments')
        .download(document.file_url.split('/').pop() || '');
      
      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: `${document.file_name} is being downloaded.`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Failed to download the document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('quote_documents')
        .delete()
        .eq('id', documentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-documents', quoteId] });
      toast({
        title: "Document deleted",
        description: "The document has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete the document.",
        variant: "destructive",
      });
    },
  });

  const getDocumentIcon = (type: Document['document_type']) => {
    switch (type) {
      case 'invoice': return Receipt;
      case 'receipt': return Receipt;
      case 'shipping_label': return Package;
      case 'customs_form': return FileText;
      case 'insurance_doc': return FileText;
      default: return FileText;
    }
  };

  const getDocumentTypeLabel = (type: Document['document_type']) => {
    switch (type) {
      case 'invoice': return 'Invoice';
      case 'receipt': return 'Receipt';
      case 'shipping_label': return 'Shipping Label';
      case 'customs_form': return 'Customs Form';
      case 'insurance_doc': return 'Insurance Document';
      default: return 'Document';
    }
  };

  const getDocumentTypeBadgeVariant = (type: Document['document_type']) => {
    switch (type) {
      case 'invoice': return 'default';
      case 'receipt': return 'secondary';
      case 'shipping_label': return 'outline';
      case 'customs_form': return 'destructive';
      case 'insurance_doc': return 'secondary';
      default: return 'outline';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents
            </CardTitle>
            <div className="w-20 h-8 bg-muted animate-pulse rounded"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 bg-muted animate-pulse rounded"></div>
                  <div className="flex-1">
                    <div className="w-48 h-4 bg-muted animate-pulse rounded mb-2"></div>
                    <div className="w-32 h-3 bg-muted animate-pulse rounded"></div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-muted animate-pulse rounded"></div>
                  <div className="w-8 h-8 bg-muted animate-pulse rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents ({visibleDocuments.length})
            </CardTitle>
            {canUpload && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowUploader(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {visibleDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents available</p>
              {canUpload && (
                <p className="text-sm mt-2">Upload documents to get started</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {visibleDocuments.map((document) => {
                const Icon = getDocumentIcon(document.document_type);
                return (
                  <div 
                    key={document.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Icon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">
                            {document.file_name}
                          </p>
                          <Badge variant={getDocumentTypeBadgeVariant(document.document_type)}>
                            {getDocumentTypeLabel(document.document_type)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{formatFileSize(document.file_size)}</span>
                          <span>{new Date(document.uploaded_at).toLocaleDateString()}</span>
                          {document.description && (
                            <span className="truncate">{document.description}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedDocument(document);
                          setShowViewer(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadDocument(document)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDocument.mutate(document.id)}
                          disabled={deleteDocument.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Uploader Dialog */}
      <Dialog open={showUploader} onOpenChange={setShowUploader}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload documents related to order #{orderId}
            </DialogDescription>
          </DialogHeader>
          <DocumentUploader 
            quoteId={quoteId}
            orderId={orderId}
            onSuccess={() => {
              setShowUploader(false);
              queryClient.invalidateQueries({ queryKey: ['quote-documents', quoteId] });
            }}
            isAdmin={isAdmin}
          />
        </DialogContent>
      </Dialog>

      {/* Document Viewer Dialog */}
      <Dialog open={showViewer} onOpenChange={setShowViewer}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDocument && (
                <>
                  {React.createElement(getDocumentIcon(selectedDocument.document_type), { className: "h-5 w-5" })}
                  {selectedDocument.file_name}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedDocument && (
            <DocumentViewer 
              document={selectedDocument}
              onDownload={() => downloadDocument(selectedDocument)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};