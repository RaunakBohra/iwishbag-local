import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, Check, AlertCircle, X, FileText, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import imageCompression from 'browser-image-compression';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface PaymentProofUploadProps {
  quoteId: string;
  orderId: string;
  recipientId?: string | null;
  orderType?: 'order' | 'quote';
}

interface UploadStatus {
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  fileName?: string;
  fileSize?: string;
}

export const ImprovedPaymentProofUpload = ({ 
  quoteId, 
  orderId, 
  recipientId, 
  orderType = 'quote' 
}: PaymentProofUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: 'idle',
    progress: 0,
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const uploadProofMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) {
        throw new Error('Authentication required. Please sign in to upload payment proof.');
      }

      setUploadStatus({
        status: 'uploading',
        progress: 0,
        fileName: file.name,
        fileSize: formatFileSize(file.size),
      });

      try {
        let fileToUpload = file;

        // Compress images for better performance
        if (file.type.startsWith('image/')) {
          setUploadStatus(prev => ({ ...prev, progress: 10 }));
          
          const options = {
            maxSizeMB: 2,
            maxWidthOrHeight: 2048,
            useWebWorker: true,
            fileType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
            initialQuality: 0.8,
          };

          try {
            fileToUpload = await imageCompression(file, options);
            console.log(
              `Payment proof compressed: ${formatFileSize(file.size)} → ${formatFileSize(fileToUpload.size)}`
            );
          } catch (compressionError) {
            console.warn('Image compression failed, using original:', compressionError);
            fileToUpload = file;
          }
        }

        setUploadStatus(prev => ({ ...prev, progress: 25 }));

        // Upload file with retry logic to Cloudflare R2
        setUploadStatus(prev => ({ ...prev, progress: 50 }));

        let uploadAttempts = 0;
        const maxAttempts = 3;
        let uploadError: Error | null = null;
        let uploadResponse: any = null;

        while (uploadAttempts < maxAttempts) {
          try {
            const formData = new FormData();
            formData.append('file', fileToUpload);
            formData.append('folder', 'payment-proofs');

            const response = await supabase.functions.invoke('r2-upload/upload', {
              body: formData,
            });

            if (response.error) {
              throw new Error(response.error.message || 'R2 upload failed');
            }

            uploadResponse = response.data;
            if (uploadResponse.success) {
              uploadError = null;
              break;
            } else {
              throw new Error(uploadResponse.error || 'Upload was not successful');
            }
          } catch (error) {
            uploadError = error as Error;
            uploadAttempts++;
            if (uploadAttempts < maxAttempts) {
              // Wait before retry
              await new Promise((resolve) => setTimeout(resolve, 1000 * uploadAttempts));
            }
          }
        }

        if (uploadError) {
          throw new Error(`Upload failed after ${maxAttempts} attempts: ${uploadError.message}`);
        }

        if (!uploadResponse || !uploadResponse.success) {
          throw new Error('Upload failed: Invalid response from R2');
        }

        setUploadStatus(prev => ({ ...prev, progress: 75 }));

        // Create message with payment proof
        const messageData: any = {
          sender_id: user.id,
          recipient_id: recipientId,
          subject: `Payment Proof for ${orderType === 'order' ? 'Order' : 'Quote'} ${orderId}`,
          content: `Payment proof uploaded for ${orderType === 'order' ? 'Order' : 'Quote'} #${orderId}`,
          attachment_url: uploadResponse.url, // R2 response uses 'url' field
          attachment_file_name: file.name,
          message_type: 'payment_proof',
          verification_status: 'pending',
        };

        // Set the appropriate ID field
        if (orderType === 'order') {
          messageData.order_id = quoteId;
        } else {
          messageData.quote_id = quoteId;
        }

        const { error: messageError } = await supabase.from('messages').insert(messageData);

        if (messageError) {
          throw new Error(`Failed to save payment proof: ${messageError.message}`);
        }

        setUploadStatus(prev => ({ ...prev, progress: 100 }));

        // Notify admins asynchronously
        try {
          await notifyAdmins(orderId);
        } catch (notifyError) {
          console.warn('Admin notification failed:', notifyError);
        }

        return { success: true, publicUrl: uploadResponse.url };

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Payment proof upload error:', error);
        throw new Error(errorMessage);
      }
    },
    onSuccess: () => {
      setUploadStatus({ status: 'success', progress: 100 });
      setShowSuccess(true);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['messages', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['payment-proof-messages', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['payment-proof-messages', quoteId, orderType] });
      
      toast({
        title: '✅ Payment proof uploaded!',
        description: 'Your payment proof has been sent to our team for verification.',
      });

      setTimeout(() => {
        setShowSuccess(false);
        setUploadStatus({ status: 'idle', progress: 0 });
      }, 3000);
    },
    onError: (error) => {
      setUploadStatus({ 
        status: 'error', 
        progress: 0, 
        error: error.message 
      });
      
      toast({
        title: '❌ Upload failed',
        description: error.message || 'Failed to upload payment proof. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const notifyAdmins = async (orderId: string) => {
    try {
      const { data: admins } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('role', 'admin');

      if (admins?.length) {
        console.log(`Notifying ${admins.length} admins about payment proof upload`);
      }
    } catch (error) {
      console.error('Failed to notify admins:', error);
    }
  };

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.some(type => file.type.includes(type))) {
      return 'Please upload an image (JPG, PNG, WebP) or PDF document';
    }

    const maxSize = file.type === 'application/pdf' ? 15 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      const maxSizeMB = file.type === 'application/pdf' ? '15MB' : '10MB';
      return `File size must be less than ${maxSizeMB}`;
    }

    return null;
  };

  const handleFileSelect = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to upload payment proof',
        variant: 'destructive',
      });
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      toast({
        title: 'Invalid file',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    uploadProofMutation.mutate(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName?: string) => {
    if (!fileName) return <Upload className="h-5 w-5" />;
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ext === 'pdf' ? <FileText className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />;
  };

  const isUploading = uploadStatus.status === 'uploading';
  const hasError = uploadStatus.status === 'error';

  return (
    <>
      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Upload Payment Proof
              </CardTitle>
              <CardDescription>
                Upload a screenshot or receipt of your payment for faster processing
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              Max: 10MB (Images) / 15MB (PDF)
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {/* Upload Area */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
              ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              ${isUploading ? 'pointer-events-none opacity-60' : 'hover:border-primary hover:bg-primary/5'}
              ${hasError ? 'border-destructive/50 bg-destructive/5' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-3">
              {isUploading ? (
                <>
                  <div className="animate-pulse">
                    {getFileIcon(uploadStatus.fileName)}
                  </div>
                  <div className="space-y-2 w-full max-w-xs">
                    <div className="flex justify-between text-sm">
                      <span>{uploadStatus.fileName}</span>
                      <span>{uploadStatus.fileSize}</span>
                    </div>
                    <Progress value={uploadStatus.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Uploading... {uploadStatus.progress}%
                    </p>
                  </div>
                </>
              ) : hasError ? (
                <>
                  <AlertCircle className="h-10 w-10 text-destructive" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-destructive">Upload Failed</p>
                    <p className="text-xs text-muted-foreground">{uploadStatus.error}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setUploadStatus({ status: 'idle', progress: 0 })}
                  >
                    Try Again
                  </Button>
                </>
              ) : (
                <>
                  <div className="bg-muted rounded-full p-3">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Drop your file here, or click to browse</p>
                    <p className="text-xs text-muted-foreground">
                      Support: JPG, PNG, WebP, PDF
                    </p>
                  </div>
                  <Button variant="outline" size="sm" disabled={isUploading}>
                    <Camera className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                </>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="bg-green-100 rounded-full p-2">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              Payment Proof Uploaded Successfully
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                Your payment proof has been successfully uploaded and sent to our verification team.
              </p>
              <div className="bg-blue-50 p-3 rounded-lg text-sm">
                <p className="font-medium text-blue-900">What happens next?</p>
                <ul className="mt-1 space-y-1 text-blue-800">
                  <li>• Our team will verify your payment (usually within 2-4 hours)</li>
                  <li>• You'll receive an email confirmation once verified</li>
                  <li>• Your order will be processed immediately after verification</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
};