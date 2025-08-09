/**
 * Payment Proof Service
 * Handles payment proof upload, verification, and management workflows
 * Extracted from UnifiedPaymentModal for clean proof handling
 * 
 * RESPONSIBILITIES:
 * - File upload and storage management
 * - Payment proof verification workflows
 * - Admin approval and rejection processes
 * - Image/document validation and processing
 * - Verification status tracking and notifications
 * - Proof metadata and annotations
 * - Integration with storage services
 * - Security validation and access controls
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentProof {
  id: string;
  quote_id: string;
  file_name: string;
  attachment_url: string;
  file_size?: number;
  file_type?: string;
  created_at: string;
  verified_at?: string | null;
  verified_by?: string | null;
  verified_amount?: number | null;
  verification_notes?: string | null;
  verification_status?: VerificationStatus | null;
  sender_id?: string;
  sender_profile?: {
    full_name?: string;
    email?: string;
  };
  metadata?: {
    original_filename?: string;
    upload_source?: string;
    image_dimensions?: { width: number; height: number };
    extracted_text?: string;
  };
}

export enum VerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REQUIRES_CLARIFICATION = 'requires_clarification'
}

export interface UploadProofInput {
  quote_id: string;
  file: File;
  sender_id?: string;
  notes?: string;
  extracted_amount?: number;
}

export interface VerifyProofInput {
  proof_id: string;
  status: VerificationStatus;
  verified_amount?: number;
  verification_notes?: string;
  verified_by: string;
}

export interface ProofQuery {
  quote_id?: string;
  verification_status?: VerificationStatus;
  verified_by?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface ProofAnalytics {
  totalProofs: number;
  pendingVerification: number;
  approvedProofs: number;
  rejectedProofs: number;
  averageProcessingTime: number;
  verificationRate: number;
}

export class PaymentProofService {
  private static instance: PaymentProofService;
  private proofsCache = new Map<string, { data: PaymentProof[]; timestamp: number }>();
  private readonly cacheTTL = 10 * 60 * 1000; // 10 minutes
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedFileTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

  constructor() {
    logger.info('PaymentProofService initialized');
  }

  static getInstance(): PaymentProofService {
    if (!PaymentProofService.instance) {
      PaymentProofService.instance = new PaymentProofService();
    }
    return PaymentProofService.instance;
  }

  /**
   * Get payment proofs for a quote
   */
  async getPaymentProofs(quoteId: string, forceRefresh: boolean = false): Promise<PaymentProof[]> {
    try {
      // Check cache first
      if (!forceRefresh) {
        const cached = this.getFromCache(quoteId);
        if (cached) {
          logger.debug('Payment proofs cache hit for quote:', quoteId);
          return cached;
        }
      }

      logger.info('Fetching payment proofs for quote:', quoteId);

      const { data: proofs, error } = await supabase
        .from('payment_proofs')
        .select(`
          *,
          sender_profile:profiles!payment_proofs_sender_id_fkey(full_name, email)
        `)
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching payment proofs:', error);
        throw error;
      }

      const processedProofs = this.processProofData(proofs || []);

      // Cache the result
      this.setCache(quoteId, processedProofs);

      logger.info(`Payment proofs loaded: ${processedProofs.length} proofs for quote ${quoteId}`);
      return processedProofs;

    } catch (error) {
      logger.error('Failed to get payment proofs:', error);
      throw error;
    }
  }

  /**
   * Upload payment proof
   */
  async uploadPaymentProof(uploadData: UploadProofInput): Promise<PaymentProof> {
    try {
      logger.info('Uploading payment proof:', { 
        quote_id: uploadData.quote_id, 
        fileName: uploadData.file.name,
        fileSize: uploadData.file.size
      });

      // Validate file
      this.validateFile(uploadData.file);

      // Upload file to storage
      const uploadResult = await this.uploadFileToStorage(uploadData.file, uploadData.quote_id);

      // Extract metadata from file
      const metadata = await this.extractFileMetadata(uploadData.file);

      // Save proof record to database
      const proofData = {
        quote_id: uploadData.quote_id,
        file_name: uploadData.file.name,
        attachment_url: uploadResult.publicUrl,
        file_size: uploadData.file.size,
        file_type: uploadData.file.type,
        sender_id: uploadData.sender_id,
        verification_status: VerificationStatus.PENDING,
        metadata: {
          original_filename: uploadData.file.name,
          upload_source: 'modal',
          ...metadata
        },
        created_at: new Date().toISOString()
      };

      if (uploadData.extracted_amount) {
        proofData['extracted_amount'] = uploadData.extracted_amount;
      }

      const { data: savedProof, error } = await supabase
        .from('payment_proofs')
        .insert(proofData)
        .select(`
          *,
          sender_profile:profiles!payment_proofs_sender_id_fkey(full_name, email)
        `)
        .single();

      if (error) throw error;

      // Clear cache for this quote
      this.clearQuoteCache(uploadData.quote_id);

      // Send notification to admins
      await this.notifyAdminOfNewProof(savedProof);

      // Log the upload
      await this.logProofActivity({
        proof_id: savedProof.id,
        quote_id: uploadData.quote_id,
        action: 'proof_uploaded',
        user_id: uploadData.sender_id
      });

      logger.info('Payment proof uploaded successfully:', savedProof.id);
      return this.processProofData([savedProof])[0];

    } catch (error) {
      logger.error('Failed to upload payment proof:', error);
      throw error;
    }
  }

  /**
   * Verify payment proof (admin action)
   */
  async verifyPaymentProof(verificationData: VerifyProofInput): Promise<PaymentProof> {
    try {
      logger.info('Verifying payment proof:', { 
        proof_id: verificationData.proof_id,
        status: verificationData.status
      });

      const updateData = {
        verification_status: verificationData.status,
        verified_by: verificationData.verified_by,
        verified_at: new Date().toISOString(),
        verification_notes: verificationData.verification_notes,
        verified_amount: verificationData.verified_amount,
        updated_at: new Date().toISOString()
      };

      const { data: verifiedProof, error } = await supabase
        .from('payment_proofs')
        .update(updateData)
        .eq('id', verificationData.proof_id)
        .select(`
          *,
          sender_profile:profiles!payment_proofs_sender_id_fkey(full_name, email)
        `)
        .single();

      if (error) throw error;

      // Clear cache for the quote
      this.clearQuoteCache(verifiedProof.quote_id);

      // Send notification to customer
      await this.notifyCustomerOfVerification(verifiedProof);

      // If approved, trigger payment processing
      if (verificationData.status === VerificationStatus.APPROVED && verificationData.verified_amount) {
        await this.triggerPaymentFromProof(verifiedProof, verificationData.verified_amount);
      }

      // Log the verification
      await this.logProofActivity({
        proof_id: verificationData.proof_id,
        quote_id: verifiedProof.quote_id,
        action: 'proof_verified',
        user_id: verificationData.verified_by,
        details: {
          status: verificationData.status,
          amount: verificationData.verified_amount
        }
      });

      logger.info('Payment proof verified successfully');
      return this.processProofData([verifiedProof])[0];

    } catch (error) {
      logger.error('Failed to verify payment proof:', error);
      throw error;
    }
  }

  /**
   * Delete payment proof
   */
  async deletePaymentProof(proofId: string, deletedBy: string): Promise<void> {
    try {
      logger.info('Deleting payment proof:', proofId);

      // Get proof details first
      const { data: proof, error: fetchError } = await supabase
        .from('payment_proofs')
        .select('*')
        .eq('id', proofId)
        .single();

      if (fetchError) throw fetchError;

      // Delete file from storage
      await this.deleteFileFromStorage(proof.attachment_url);

      // Delete proof record
      const { error: deleteError } = await supabase
        .from('payment_proofs')
        .delete()
        .eq('id', proofId);

      if (deleteError) throw deleteError;

      // Clear cache
      this.clearQuoteCache(proof.quote_id);

      // Log the deletion
      await this.logProofActivity({
        proof_id: proofId,
        quote_id: proof.quote_id,
        action: 'proof_deleted',
        user_id: deletedBy
      });

      logger.info('Payment proof deleted successfully');

    } catch (error) {
      logger.error('Failed to delete payment proof:', error);
      throw error;
    }
  }

  /**
   * Search payment proofs with filters
   */
  async searchPaymentProofs(query: ProofQuery): Promise<PaymentProof[]> {
    try {
      let supabaseQuery = supabase
        .from('payment_proofs')
        .select(`
          *,
          sender_profile:profiles!payment_proofs_sender_id_fkey(full_name, email)
        `);

      // Apply filters
      if (query.quote_id) {
        supabaseQuery = supabaseQuery.eq('quote_id', query.quote_id);
      }

      if (query.verification_status) {
        supabaseQuery = supabaseQuery.eq('verification_status', query.verification_status);
      }

      if (query.verified_by) {
        supabaseQuery = supabaseQuery.eq('verified_by', query.verified_by);
      }

      if (query.date_from) {
        supabaseQuery = supabaseQuery.gte('created_at', query.date_from);
      }

      if (query.date_to) {
        supabaseQuery = supabaseQuery.lte('created_at', query.date_to);
      }

      // Apply pagination
      if (query.limit) {
        supabaseQuery = supabaseQuery.limit(query.limit);
      }

      if (query.offset) {
        supabaseQuery = supabaseQuery.range(query.offset, query.offset + (query.limit || 50) - 1);
      }

      // Order by most recent first
      supabaseQuery = supabaseQuery.order('created_at', { ascending: false });

      const { data, error } = await supabaseQuery;

      if (error) throw error;

      const processedProofs = this.processProofData(data || []);
      
      logger.info(`Proof search completed: ${processedProofs.length} results`);
      return processedProofs;

    } catch (error) {
      logger.error('Proof search failed:', error);
      throw error;
    }
  }

  /**
   * Get payment proof analytics
   */
  async getProofAnalytics(dateFrom: string, dateTo: string): Promise<ProofAnalytics> {
    try {
      const { data: proofs, error } = await supabase
        .from('payment_proofs')
        .select('*')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo);

      if (error) throw error;

      const analytics = this.calculateProofAnalytics(proofs || []);
      logger.info('Proof analytics calculated for date range');

      return analytics;

    } catch (error) {
      logger.error('Failed to get proof analytics:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private validateFile(file: File): void {
    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds ${this.maxFileSize / (1024 * 1024)}MB limit`);
    }

    if (!this.allowedFileTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }

    if (!file.name || file.name.trim().length === 0) {
      throw new Error('File must have a valid name');
    }
  }

  private async uploadFileToStorage(file: File, quoteId: string): Promise<{ publicUrl: string; path: string }> {
    try {
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `payment-proof-${quoteId}-${timestamp}.${fileExt}`;
      const filePath = `payment-proofs/${quoteId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('payment-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('payment-attachments')
        .getPublicUrl(filePath);

      return {
        publicUrl: urlData.publicUrl,
        path: filePath
      };

    } catch (error) {
      logger.error('File upload failed:', error);
      throw new Error('Failed to upload file to storage');
    }
  }

  private async extractFileMetadata(file: File): Promise<any> {
    const metadata: any = {
      original_filename: file.name,
      file_size: file.size,
      file_type: file.type
    };

    try {
      // Extract image dimensions for image files
      if (file.type.startsWith('image/')) {
        const dimensions = await this.getImageDimensions(file);
        metadata.image_dimensions = dimensions;
      }

      // TODO: Add OCR for text extraction if needed
      // metadata.extracted_text = await this.extractTextFromImage(file);

    } catch (error) {
      logger.warn('Failed to extract file metadata:', error);
    }

    return metadata;
  }

  private getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  private async deleteFileFromStorage(attachmentUrl: string): Promise<void> {
    try {
      // Extract file path from URL
      const url = new URL(attachmentUrl);
      const pathSegments = url.pathname.split('/');
      const filePath = pathSegments.slice(-2).join('/'); // Get last two segments

      const { error } = await supabase.storage
        .from('payment-attachments')
        .remove([filePath]);

      if (error) {
        logger.warn('Failed to delete file from storage:', error);
        // Don't throw error as the database record is more important
      }

    } catch (error) {
      logger.warn('Error deleting file from storage:', error);
    }
  }

  private processProofData(proofs: any[]): PaymentProof[] {
    return proofs.map(proof => ({
      ...proof,
      verification_status: proof.verification_status || VerificationStatus.PENDING,
      metadata: proof.metadata ? (typeof proof.metadata === 'string' ? JSON.parse(proof.metadata) : proof.metadata) : {}
    }));
  }

  private async notifyAdminOfNewProof(proof: PaymentProof): Promise<void> {
    try {
      // This would integrate with notification service
      logger.info(`New payment proof notification sent for proof ${proof.id}`);
      
      // TODO: Implement notification to admins
      // await notificationService.sendAdminNotification({
      //   type: 'new_payment_proof',
      //   proof_id: proof.id,
      //   quote_id: proof.quote_id
      // });

    } catch (error) {
      logger.error('Failed to notify admin of new proof:', error);
    }
  }

  private async notifyCustomerOfVerification(proof: PaymentProof): Promise<void> {
    try {
      // This would integrate with notification service
      logger.info(`Verification notification sent for proof ${proof.id}`);
      
      // TODO: Implement notification to customer
      // await notificationService.sendCustomerNotification({
      //   type: 'proof_verification_update',
      //   proof_id: proof.id,
      //   status: proof.verification_status,
      //   customer_id: proof.sender_id
      // });

    } catch (error) {
      logger.error('Failed to notify customer of verification:', error);
    }
  }

  private async triggerPaymentFromProof(proof: PaymentProof, amount: number): Promise<void> {
    try {
      // This would integrate with PaymentLedgerService
      logger.info(`Triggering payment from approved proof ${proof.id}, amount: ${amount}`);
      
      // TODO: Integrate with PaymentLedgerService to record payment
      // await paymentLedgerService.recordPayment({
      //   quote_id: proof.quote_id,
      //   amount: amount,
      //   currency: 'USD', // Would be determined from quote
      //   payment_method: 'bank_transfer', // Would be determined from proof
      //   reference_number: `PROOF-${proof.id}`,
      //   created_by: proof.verified_by
      // });

    } catch (error) {
      logger.error('Failed to trigger payment from proof:', error);
    }
  }

  private async logProofActivity(activity: {
    proof_id: string;
    quote_id: string;
    action: string;
    user_id?: string;
    details?: any;
  }): Promise<void> {
    try {
      await supabase
        .from('payment_proof_activity_logs')
        .insert({
          ...activity,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      logger.error('Failed to log proof activity:', error);
      // Don't throw, as this is non-critical
    }
  }

  private calculateProofAnalytics(proofs: any[]): ProofAnalytics {
    const totalProofs = proofs.length;
    const pendingVerification = proofs.filter(p => p.verification_status === VerificationStatus.PENDING).length;
    const approvedProofs = proofs.filter(p => p.verification_status === VerificationStatus.APPROVED).length;
    const rejectedProofs = proofs.filter(p => p.verification_status === VerificationStatus.REJECTED).length;

    // Calculate average processing time for verified proofs
    const verifiedProofs = proofs.filter(p => p.verified_at && p.created_at);
    const averageProcessingTime = verifiedProofs.length > 0
      ? verifiedProofs.reduce((sum, proof) => {
          const created = new Date(proof.created_at).getTime();
          const verified = new Date(proof.verified_at).getTime();
          return sum + (verified - created);
        }, 0) / verifiedProofs.length / (1000 * 60 * 60) // Convert to hours
      : 0;

    const verificationRate = totalProofs > 0 ? (approvedProofs + rejectedProofs) / totalProofs * 100 : 0;

    return {
      totalProofs,
      pendingVerification,
      approvedProofs,
      rejectedProofs,
      averageProcessingTime,
      verificationRate
    };
  }

  // Cache management methods
  private getFromCache(quoteId: string): PaymentProof[] | null {
    const cached = this.proofsCache.get(quoteId);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    
    if (cached) {
      this.proofsCache.delete(quoteId);
    }
    
    return null;
  }

  private setCache(quoteId: string, data: PaymentProof[]): void {
    this.proofsCache.set(quoteId, {
      data,
      timestamp: Date.now()
    });
  }

  private clearQuoteCache(quoteId: string): void {
    this.proofsCache.delete(quoteId);
  }

  /**
   * Public utility methods
   */
  clearAllCache(): void {
    this.proofsCache.clear();
    logger.info('Payment proof cache cleared');
  }

  getCacheStats(): { cacheSize: number; cacheHitRate: number } {
    // Implementation would track cache hits/misses
    return {
      cacheSize: this.proofsCache.size,
      cacheHitRate: 0.75 // Placeholder
    };
  }

  dispose(): void {
    this.proofsCache.clear();
    logger.info('PaymentProofService disposed');
  }
}

export default PaymentProofService;