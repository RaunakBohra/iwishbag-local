import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type BankAccountType = Tables<'bank_account_details'>;

/**
 * Fetches and formats bank account details for a specific currency
 * Used for email templates and order confirmations
 */
export async function getBankDetailsForCurrency(currency: string): Promise<string> {
  try {
    const { data: bankAccounts, error } = await supabase
      .from('bank_account_details')
      .select('*')
      .eq('is_active', true)
      .eq('currency_code', currency)
      .order('is_fallback', { ascending: true })
      .limit(1);

    if (error) {
      console.error('Error fetching bank details:', error);
      return 'Bank details are currently unavailable. Please contact support for payment instructions.';
    }

    if (!bankAccounts || bankAccounts.length === 0) {
      return `No bank accounts found for ${currency} currency. Please contact support for payment instructions.`;
    }

    const account = bankAccounts[0];
    return formatBankDetailsForEmail(account);
  } catch (error) {
    console.error('Error in getBankDetailsForCurrency:', error);
    return 'Error retrieving bank details. Please contact support for payment instructions.';
  }
}

/**
 * Formats bank account details for email templates
 */
export function formatBankDetailsForEmail(account: BankAccountType): string {
  const details = [
    `<strong>Bank Name:</strong> ${account.bank_name}`,
    `<strong>Account Name:</strong> ${account.account_name}`,
    `<strong>Account Number:</strong> ${account.account_number}`,
  ];

  if (account.swift_code) {
    details.push(`<strong>SWIFT Code:</strong> ${account.swift_code}`);
  }

  if (account.currency_code) {
    details.push(`<strong>Currency:</strong> ${account.currency_code}`);
  }

  // Add new payment fields
  if (account.upi_id) {
    details.push(`<strong>UPI ID:</strong> ${account.upi_id}`);
  }

  // Add QR code image if available
  if (account.payment_qr_url) {
    details.push(`<br><div style="margin: 15px 0;"><strong>Payment QR Code:</strong><br><img src="${account.payment_qr_url}" alt="Payment QR Code" style="max-width: 200px; height: auto; border: 1px solid #ddd; padding: 10px; border-radius: 5px;"></div>`);
  }

  // Add custom fields if available
  if (account.custom_fields && typeof account.custom_fields === 'object') {
    const customFieldsData = account.custom_fields as Record<string, unknown>;
    const fieldLabels = (account.field_labels || {}) as Record<string, string>;
    
    Object.entries(customFieldsData).forEach(([key, value]) => {
      if (value) {
        const label = fieldLabels[key] || key;
        details.push(`<strong>${label}:</strong> ${value}`);
      }
    });
  }

  // Add instructions at the end if available
  if (account.instructions) {
    details.push(`<br><div style="background: #f8f9fa; padding: 10px; border-radius: 5px; border-left: 4px solid #007bff;"><strong>Payment Instructions:</strong><br>${account.instructions}</div>`);
  }

  return details.join('<br>');
}

/**
 * Formats bank account details for plain text (non-HTML) contexts
 */
export function formatBankDetailsForText(account: BankAccountType): string {
  const details = [
    `Bank Name: ${account.bank_name}`,
    `Account Name: ${account.account_name}`,
    `Account Number: ${account.account_number}`,
  ];

  if (account.swift_code) {
    details.push(`SWIFT Code: ${account.swift_code}`);
  }

  if (account.currency_code) {
    details.push(`Currency: ${account.currency_code}`);
  }

  // Add new payment fields
  if (account.upi_id) {
    details.push(`UPI ID: ${account.upi_id}`);
  }

  if (account.payment_qr_url) {
    details.push(`Payment QR Code: ${account.payment_qr_url}`);
  }

  // Add custom fields if available
  if (account.custom_fields && typeof account.custom_fields === 'object') {
    const customFieldsData = account.custom_fields as Record<string, unknown>;
    const fieldLabels = (account.field_labels || {}) as Record<string, string>;
    
    Object.entries(customFieldsData).forEach(([key, value]) => {
      if (value) {
        const label = fieldLabels[key] || key;
        details.push(`${label}: ${value}`);
      }
    });
  }

  // Add instructions at the end if available
  if (account.instructions) {
    details.push(`\nPayment Instructions:\n${account.instructions}`);
  }

  return details.join('\n');
}

/**
 * Gets bank details as HTML for email templates
 * This function should be called when sending bank transfer emails
 * 
 * Usage example in email service:
 * const bankDetails = await getBankDetailsForCurrency(order.currency);
 * const emailContent = emailTemplate.replace('{{bank_details}}', bankDetails);
 */
export { getBankDetailsForCurrency as getBankDetailsForEmail };