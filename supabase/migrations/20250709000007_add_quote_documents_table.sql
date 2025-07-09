-- Create quote_documents table for file management
CREATE TABLE IF NOT EXISTS public.quote_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'receipt', 'shipping_label', 'customs_form', 'insurance_doc', 'other')),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    uploaded_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    is_customer_visible BOOLEAN DEFAULT true NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quote_documents_quote_id ON quote_documents(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_documents_uploaded_by ON quote_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_quote_documents_document_type ON quote_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_quote_documents_uploaded_at ON quote_documents(uploaded_at DESC);

-- Enable RLS
ALTER TABLE quote_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quote_documents

-- Customers can view documents that are marked as customer_visible for their quotes
CREATE POLICY "Customers can view their visible quote documents"
ON quote_documents FOR SELECT
USING (
    is_customer_visible = true 
    AND quote_id IN (
        SELECT id FROM quotes 
        WHERE user_id = auth.uid()
    )
);

-- Admins can view all quote documents
CREATE POLICY "Admins can view all quote documents"
ON quote_documents FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Admins can insert quote documents
CREATE POLICY "Admins can insert quote documents"
ON quote_documents FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Admins can update quote documents
CREATE POLICY "Admins can update quote documents"
ON quote_documents FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Admins can delete quote documents
CREATE POLICY "Admins can delete quote documents"
ON quote_documents FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Customers can upload documents to their own quotes (but only if quote allows it)
CREATE POLICY "Customers can upload documents to their quotes"
ON quote_documents FOR INSERT
WITH CHECK (
    quote_id IN (
        SELECT id FROM quotes 
        WHERE user_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quote_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quote_documents_updated_at
    BEFORE UPDATE ON quote_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_quote_documents_updated_at();