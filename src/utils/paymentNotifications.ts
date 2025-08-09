import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

/**
 * Send simple email with bank details and SMS notification for bank transfer orders
 */
export const sendBankTransferNotification = async (orderId: string) => {
  try {
    logger.info(`Sending bank transfer notification for order ${orderId}`);

    const { data, error } = await supabase.functions.invoke('send-simple-payment-notification', {
      body: { orderId, type: 'both' } // Send both email and SMS
    });

    if (error) {
      throw new Error(error.message);
    }

    logger.info('Bank transfer notification sent successfully', {
      orderId,
      email_sent: data?.email_sent,
      sms_sent: data?.sms_sent
    });

    return data;

  } catch (error) {
    logger.error('Failed to send bank transfer notification:', error);
    throw error;
  }
};

/**
 * Send only email with bank details
 */
export const sendBankDetailsEmail = async (orderId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-simple-payment-notification', {
      body: { orderId, type: 'email_only' }
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;

  } catch (error) {
    logger.error('Failed to send bank details email:', error);
    throw error;
  }
};

/**
 * Send only SMS notification
 */
export const sendPaymentPendingSMS = async (orderId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-simple-payment-notification', {
      body: { orderId, type: 'sms_only' }
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;

  } catch (error) {
    logger.error('Failed to send payment pending SMS:', error);
    throw error;
  }
};