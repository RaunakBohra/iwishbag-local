-- Create a function to send bank transfer email when payment method is bank_transfer
CREATE OR REPLACE FUNCTION send_bank_transfer_email()
RETURNS TRIGGER AS $$
DECLARE
  v_email_template RECORD;
  v_bank_details JSONB;
  v_formatted_details TEXT;
  v_email_html TEXT;
BEGIN
  -- Only process if payment method is bank_transfer and status is changing to 'ordered'
  IF NEW.payment_method = 'bank_transfer' AND NEW.status = 'ordered' AND OLD.status != 'ordered' THEN
    
    -- Get the bank transfer email template
    SELECT * INTO v_email_template
    FROM email_templates
    WHERE template_id = 'bank_transfer_details'
    LIMIT 1;
    
    -- If no template exists, create a default one
    IF v_email_template IS NULL THEN
      INSERT INTO email_templates (
        template_id,
        name,
        subject,
        html_content,
        variables,
        is_active
      ) VALUES (
        'bank_transfer_details',
        'Bank Transfer Payment Instructions',
        'Payment Instructions for Order {{quote_id}}',
        '<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Bank Transfer Payment Instructions</h2>
    <p>Dear {{customer_name}},</p>
    <p>Thank you for your order! Please complete your payment using the bank details below:</p>
    
    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">Order Details</h3>
      <p><strong>Order ID:</strong> {{quote_id}}</p>
      <p><strong>Total Amount:</strong> {{total_amount}} {{currency}}</p>
    </div>
    
    <div style="background-color: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #0284c7;">
      <h3 style="margin-top: 0; color: #0284c7;">Bank Account Details</h3>
      {{bank_details}}
    </div>
    
    <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #f59e0b;">
      <h4 style="margin-top: 0; color: #d97706;">Important Instructions:</h4>
      <ul style="margin: 0; padding-left: 20px;">
        <li>Please use your Order ID ({{quote_id}}) as the payment reference</li>
        <li>Send payment confirmation to support@iwishbag.com</li>
        <li>Your order will be processed once payment is confirmed</li>
      </ul>
    </div>
    
    <p>If you have any questions, please don't hesitate to contact our support team.</p>
    <p>Best regards,<br>The iwishBag Team</p>
  </div>
</body>
</html>',
        '["customer_name", "quote_id", "total_amount", "currency", "bank_details"]',
        true
      )
      RETURNING * INTO v_email_template;
    END IF;
    
    -- Get bank details for the destination country
    SELECT bank_accounts INTO v_bank_details
    FROM country_settings
    WHERE code = NEW.destination_country
    LIMIT 1;
    
    -- Format bank details
    IF v_bank_details IS NOT NULL AND jsonb_array_length(v_bank_details) > 0 THEN
      v_formatted_details := '';
      
      -- Format each bank account
      FOR i IN 0..jsonb_array_length(v_bank_details) - 1 LOOP
        v_formatted_details := v_formatted_details || 
          '<div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e5e7eb;">' ||
          '<p style="margin: 5px 0;"><strong>Bank Name:</strong> ' || COALESCE(v_bank_details->i->>'bank_name', '') || '</p>' ||
          '<p style="margin: 5px 0;"><strong>Account Name:</strong> ' || COALESCE(v_bank_details->i->>'account_name', '') || '</p>' ||
          '<p style="margin: 5px 0;"><strong>Account Number:</strong> ' || COALESCE(v_bank_details->i->>'account_number', '') || '</p>' ||
          '<p style="margin: 5px 0;"><strong>Currency:</strong> ' || COALESCE(v_bank_details->i->>'currency', '') || '</p>';
          
        -- Add conditional fields
        IF v_bank_details->i->>'swift_code' IS NOT NULL THEN
          v_formatted_details := v_formatted_details || '<p style="margin: 5px 0;"><strong>SWIFT Code:</strong> ' || (v_bank_details->i->>'swift_code') || '</p>';
        END IF;
        
        IF v_bank_details->i->>'iban' IS NOT NULL THEN
          v_formatted_details := v_formatted_details || '<p style="margin: 5px 0;"><strong>IBAN:</strong> ' || (v_bank_details->i->>'iban') || '</p>';
        END IF;
        
        IF v_bank_details->i->>'ifsc_code' IS NOT NULL THEN
          v_formatted_details := v_formatted_details || '<p style="margin: 5px 0;"><strong>IFSC Code:</strong> ' || (v_bank_details->i->>'ifsc_code') || '</p>';
        END IF;
        
        IF v_bank_details->i->>'branch_address' IS NOT NULL THEN
          v_formatted_details := v_formatted_details || '<p style="margin: 5px 0;"><strong>Branch Address:</strong> ' || (v_bank_details->i->>'branch_address') || '</p>';
        END IF;
        
        v_formatted_details := v_formatted_details || '</div>';
      END LOOP;
    ELSE
      v_formatted_details := '<p>Bank details will be provided by our support team.</p>';
    END IF;
    
    -- Replace variables in template
    v_email_html := v_email_template.html_content;
    v_email_html := REPLACE(v_email_html, '{{customer_name}}', COALESCE(NEW.customer_name, 'Customer'));
    v_email_html := REPLACE(v_email_html, '{{quote_id}}', COALESCE(NEW.display_id, NEW.id::TEXT));
    v_email_html := REPLACE(v_email_html, '{{total_amount}}', COALESCE(NEW.final_total::TEXT, '0'));
    v_email_html := REPLACE(v_email_html, '{{currency}}', COALESCE(NEW.currency, 'USD'));
    v_email_html := REPLACE(v_email_html, '{{bank_details}}', v_formatted_details);
    
    -- Insert into email queue (to be picked up by a background job or sent immediately)
    INSERT INTO email_queue (
      recipient_email,
      subject,
      html_content,
      template_id,
      related_entity_type,
      related_entity_id,
      status
    ) VALUES (
      NEW.email,
      REPLACE(v_email_template.subject, '{{quote_id}}', COALESCE(NEW.display_id, NEW.id::TEXT)),
      v_email_html,
      'bank_transfer_details',
      'quote',
      NEW.id,
      'pending'
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bank transfer emails
DROP TRIGGER IF EXISTS send_bank_transfer_email_trigger ON quotes;
CREATE TRIGGER send_bank_transfer_email_trigger
  AFTER UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION send_bank_transfer_email();

-- Create email queue table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  template_id TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  status TEXT DEFAULT 'pending',
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for email queue processing
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status, created_at);

-- Add RLS policies for email queue
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Admin can view all emails
CREATE POLICY "Admin can view all emails" ON email_queue
  FOR SELECT USING (is_admin());

-- System can manage all emails (for background jobs)
CREATE POLICY "System can manage emails" ON email_queue
  FOR ALL USING (true);