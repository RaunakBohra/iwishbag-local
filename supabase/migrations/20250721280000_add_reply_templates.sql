-- ============================================================================
-- REPLY TEMPLATES SYSTEM
-- Stores canned responses and templates for quick ticket replies
-- ============================================================================

-- Create reply templates table
CREATE TABLE reply_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  subject_template VARCHAR(200),
  body_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Ensure template names are unique within category
  UNIQUE(name, category)
);

-- Create indexes for performance
CREATE INDEX idx_reply_templates_category ON reply_templates(category);
CREATE INDEX idx_reply_templates_active ON reply_templates(is_active);
CREATE INDEX idx_reply_templates_usage ON reply_templates(usage_count DESC);

-- Enable RLS
ALTER TABLE reply_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage reply templates" ON reply_templates
  FOR ALL USING (is_admin());

CREATE POLICY "All authenticated users can read active templates" ON reply_templates
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Update timestamp trigger
CREATE TRIGGER update_reply_templates_updated_at
  BEFORE UPDATE ON reply_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default templates
INSERT INTO reply_templates (name, category, subject_template, body_template, created_by) VALUES

-- Order/Shipping Templates
('Order Status Update', 'shipping', 'Update on Your Order #{{order_id}}', 
'Hi {{customer_name}},

Thank you for contacting us regarding your order.

Your order status: {{status}}
Tracking ID: {{tracking_id}}
Expected delivery: {{delivery_date}}

If you have any other questions, please don''t hesitate to reach out.

Best regards,
iwishBag Support Team', NULL),

('Shipping Delay', 'shipping', 'Shipping Update for Order #{{order_id}}', 
'Hi {{customer_name}},

We want to inform you about a slight delay in your order shipment.

Original expected date: {{original_date}}
New expected date: {{new_date}}
Reason: {{delay_reason}}

We apologize for any inconvenience and appreciate your patience.

Best regards,
iwishBag Support Team', NULL),

-- Payment Templates
('Payment Confirmation', 'payment', 'Payment Received - Order #{{order_id}}', 
'Hi {{customer_name}},

Great news! We have received your payment and your order is now being processed.

Order ID: {{order_id}}
Amount: {{amount}}
Payment Method: {{payment_method}}

You will receive shipping updates once your order is dispatched.

Best regards,
iwishBag Support Team', NULL),

('Payment Issue', 'payment', 'Payment Issue - Order #{{order_id}}', 
'Hi {{customer_name}},

We encountered an issue with your payment for order #{{order_id}}.

Issue: {{payment_issue}}
Next steps: {{next_steps}}

Please contact us if you need assistance with resolving this.

Best regards,
iwishBag Support Team', NULL),

-- Refund Templates
('Refund Initiated', 'refund', 'Refund Initiated - Order #{{order_id}}', 
'Hi {{customer_name}},

We have initiated your refund request.

Order ID: {{order_id}}
Refund Amount: {{refund_amount}}
Expected processing time: 5-7 business days
Refund method: {{refund_method}}

You will receive a confirmation once the refund is processed.

Best regards,
iwishBag Support Team', NULL),

('Refund Processed', 'refund', 'Refund Completed - Order #{{order_id}}', 
'Hi {{customer_name}},

Your refund has been successfully processed.

Order ID: {{order_id}}
Refund Amount: {{refund_amount}}
Processing date: {{process_date}}

The amount should appear in your account within 2-3 business days.

Best regards,
iwishBag Support Team', NULL),

-- General Templates
('Ticket Resolved', 'general', 'Your Support Request Has Been Resolved', 
'Hi {{customer_name}},

We''re pleased to inform you that your support request has been resolved.

Ticket ID: {{ticket_id}}
Resolution: {{resolution_summary}}

If you have any other questions or need further assistance, please don''t hesitate to contact us.

This ticket will be automatically closed in 7 days if no further action is needed.

Best regards,
iwishBag Support Team', NULL),

('Information Required', 'general', 'Additional Information Required', 
'Hi {{customer_name}},

To better assist you with your request, we need some additional information:

{{required_information}}

Please provide these details so we can resolve your issue quickly.

Best regards,
iwishBag Support Team', NULL),

('Thank You', 'general', 'Thank You for Your Feedback', 
'Hi {{customer_name}},

Thank you for taking the time to contact us.

Your feedback is valuable and helps us improve our service.

{{custom_message}}

Best regards,
iwishBag Support Team', NULL),

-- Technical Templates
('Account Access Issue', 'technical', 'Account Access Assistance', 
'Hi {{customer_name}},

We''re here to help you with your account access issue.

Issue reported: {{access_issue}}
Troubleshooting steps:
1. {{step_1}}
2. {{step_2}}
3. {{step_3}}

If these steps don''t resolve the issue, please let us know and we''ll assist further.

Best regards,
iwishBag Support Team', NULL);

-- Add comment
COMMENT ON TABLE reply_templates IS 'Stores canned response templates for customer support tickets';