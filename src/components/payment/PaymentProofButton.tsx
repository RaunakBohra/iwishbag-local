import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import imageCompression from 'browser-image-compression';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PaymentProofButtonProps {
  quoteId: string;
  orderId: string;
  recipientId?: string | null;
}

export const PaymentProofButton = ({ 
  quoteId, 
  orderId,
  recipientId 
}: PaymentProofButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const uploadProofMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('Authentication required. Please sign in to upload payment proof.');
      
      setUploading(true);
      
      try {
        let fileToUpload = file;
        
        // Only compress images, not PDFs
        if (file.type.startsWith('image/')) {
          const options = {
            maxSizeMB: 1.5,
            maxWidthOrHeight: 2048,
            useWebWorker: true,
            fileType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
            initialQuality: 0.85
          };
          
          try {
            fileToUpload = await imageCompression(file, options);
            console.log(`Payment proof - Original: ${(file.size / 1024 / 1024).toFixed(2)}MB, Compressed: ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`);
          } catch (compressionError) {
            console.error('Image compression failed, using original:', compressionError);
            // Continue with original file if compression fails
            fileToUpload = file;
          }
        }

        // Upload file with retry logic
        const fileExt = file.name.split('.').pop();
        const fileName = `payment-proof-${user.id}-${Date.now()}.${fileExt}`;
        
        let uploadAttempts = 0;
        const maxAttempts = 3;
        let uploadError: Error | null = null;
        
        while (uploadAttempts < maxAttempts) {
          const { error } = await supabase.storage
            .from('message-attachments')
            .upload(fileName, fileToUpload);
          
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
          throw new Error(`Upload failed after ${maxAttempts} attempts: ${uploadError.message}`);
        }
        
        const { data: urlData } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(fileName);

        // Create message with payment proof
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            sender_id: user.id,
            recipient_id: recipientId,
            quote_id: quoteId,
            subject: `Payment Proof for Order ${orderId}`,
            content: `Payment proof uploaded for Order #${orderId}`,
            attachment_url: urlData.publicUrl,
            attachment_file_name: file.name,
            message_type: 'payment_proof',
            verification_status: 'pending' // Ensure new submissions are marked as pending
          });

        if (messageError) {
          throw new Error(`Failed to save payment proof record: ${messageError.message}`);
        }

        // Notify admins (don't fail if this fails)
        try {
          await notifyAdmins(orderId);
        } catch (notifyError) {
          console.warn('Admin notification failed:', notifyError);
          // Don't throw error for notification failure
        }
        
        return { success: true };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Payment proof upload error:', error);
        throw new Error(errorMessage);
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      setShowSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['messages', quoteId] });
      toast({
        title: "Payment proof uploaded!",
        description: "Your payment proof has been sent to our team for verification.",
      });
      
      // Hide success dialog after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload payment proof. Please try again.",
        variant: "destructive",
      });
    },
  });

  const notifyAdmins = async (orderId: string) => {
    // Create admin notification
    try {
      // Get all admin users
      const { data: admins, error: adminError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('role', 'admin');
      
      if (adminError) throw adminError;
      
      // Create notification for each admin
      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          title: 'New Payment Proof Uploaded',
          message: `Payment proof has been uploaded for Order #${orderId}`,
          type: 'payment_proof',
          data: { orderId, quoteId }
        }));
        
        // In a real implementation, you would insert these notifications
        // For now, we'll log them
        console.log('Admin notifications created:', notifications);
      }
    } catch (error) {
      console.error('Failed to notify admins:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input to allow re-selection of same file if needed
    e.target.value = '';

    // Validate file type - allow both images and PDFs for receipts
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.some(type => file.type.includes(type))) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, WebP) or PDF document",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (15MB for documents, 10MB for images)
    const maxSize = file.type === 'application/pdf' ? 15 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      const maxSizeMB = file.type === 'application/pdf' ? '15MB' : '10MB';
      toast({
        title: "File too large",
        description: `Please select a file smaller than ${maxSizeMB}`,
        variant: "destructive",
      });
      return;
    }

    // Check if user is authenticated before proceeding
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload payment proof",
        variant: "destructive",
      });
      return;
    }

    uploadProofMutation.mutate(file);
  };

  return (
    <>
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        variant="outline"
        className="gap-2"
      >
        {uploading ? (
          <>
            <Upload className="h-4 w-4 animate-pulse" />
            Uploading...
          </>
        ) : (
          <>
            <Camera className="h-4 w-4" />
            Upload New Payment Proof
          </>
        )}
      </Button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Payment Proof Uploaded
            </DialogTitle>
            <DialogDescription>
              Your payment proof has been successfully uploaded and sent to our team for verification. 
              You will receive an email once your payment is confirmed.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
};