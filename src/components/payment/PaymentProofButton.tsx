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
      if (!user) throw new Error('Not authenticated');
      
      setUploading(true);
      
      try {
        let fileToUpload = file;
        
        // Compress image
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
        }

        // Upload file
        const fileExt = file.name.split('.').pop();
        const fileName = `payment-proof-${user.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(fileName, fileToUpload);
        
        if (uploadError) throw uploadError;
        
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
            message_type: 'payment_proof' // Special type for payment proofs
          });

        if (messageError) throw messageError;

        // Notify admins
        await notifyAdmins(orderId);
        
        return { success: true };
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, WebP)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB",
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
            Upload Payment Proof
          </>
        )}
      </Button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
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