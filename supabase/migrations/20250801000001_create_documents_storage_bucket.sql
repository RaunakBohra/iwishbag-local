-- Create documents storage bucket for quote documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
);

-- Create storage policy for documents bucket
CREATE POLICY "Allow authenticated users to upload documents" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Allow users to view documents" ON storage.objects
FOR SELECT USING (bucket_id = 'documents');

CREATE POLICY "Allow users to delete their own documents" ON storage.objects
FOR DELETE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update quotes_v2 table to support documents if not already present
ALTER TABLE quotes_v2 ADD COLUMN IF NOT EXISTS has_documents BOOLEAN DEFAULT FALSE;

-- Create trigger to update has_documents flag
CREATE OR REPLACE FUNCTION update_quote_has_documents()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE quotes_v2 
    SET has_documents = TRUE 
    WHERE id = NEW.quote_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE quotes_v2 
    SET has_documents = (
      SELECT COUNT(*) > 0 
      FROM quote_documents 
      WHERE quote_id = OLD.quote_id
    ) 
    WHERE id = OLD.quote_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quote_has_documents
AFTER INSERT OR DELETE ON quote_documents
FOR EACH ROW EXECUTE FUNCTION update_quote_has_documents();