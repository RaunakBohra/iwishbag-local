-- Add RLS policies for quote_documents table

-- Enable RLS on quote_documents table
ALTER TABLE quote_documents ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to insert documents for their own quotes
CREATE POLICY "Users can insert quote documents" ON quote_documents
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  (uploaded_by = auth.uid() OR is_admin())
);

-- Policy for authenticated users to view quote documents
CREATE POLICY "Users can view quote documents" ON quote_documents
FOR SELECT USING (
  auth.role() = 'authenticated' AND
  (
    -- Users can see documents they uploaded
    uploaded_by = auth.uid() OR
    -- Admins can see all documents
    is_admin() OR
    -- Users can see customer-visible documents for quotes they have access to
    (is_customer_visible = true AND EXISTS (
      SELECT 1 FROM quotes_v2 q 
      WHERE q.id = quote_documents.quote_id 
      AND (q.customer_email = (SELECT email FROM profiles WHERE id = auth.uid()) OR is_admin())
    ))
  )
);

-- Policy for authenticated users to update their own documents
CREATE POLICY "Users can update their own quote documents" ON quote_documents
FOR UPDATE USING (
  auth.role() = 'authenticated' AND
  (uploaded_by = auth.uid() OR is_admin())
) WITH CHECK (
  auth.role() = 'authenticated' AND
  (uploaded_by = auth.uid() OR is_admin())
);

-- Policy for authenticated users to delete their own documents
CREATE POLICY "Users can delete their own quote documents" ON quote_documents
FOR DELETE USING (
  auth.role() = 'authenticated' AND
  (uploaded_by = auth.uid() OR is_admin())
);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON quote_documents TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE quote_documents_id_seq TO authenticated;