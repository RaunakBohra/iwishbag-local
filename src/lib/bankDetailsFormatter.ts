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