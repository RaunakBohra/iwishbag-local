-- Create quote-requests bucket for customer files uploaded during quote requests
-- This bucket will store images, invoices, PDFs, and other documents uploaded by customers

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quote-requests',
  'quote-requests', 
  true,  -- Public bucket for easy access to quote attachments
  10485760,  -- 10MB limit per file
  ARRAY[
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the bucket
-- Allow authenticated and anonymous users to upload files for quote requests
CREATE POLICY "Anyone can upload to quote-requests" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'quote-requests');

-- Allow anyone to view uploaded files (since quotes may be shared with team)
CREATE POLICY "Anyone can view quote-requests files" ON storage.objects
  FOR SELECT USING (bucket_id = 'quote-requests');

-- Allow users to delete their uploads (in case they want to replace files)
CREATE POLICY "Users can delete quote-requests files" ON storage.objects
  FOR DELETE USING (bucket_id = 'quote-requests');

-- Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;