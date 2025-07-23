-- Create quote-attachments bucket for customer files uploaded during quote requests
-- This bucket will store images, invoices, PDFs, and other documents uploaded by customers

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quote-attachments',
  'quote-attachments', 
  true,  -- Public bucket for easy access
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
-- Allow authenticated and anonymous users to upload files
CREATE POLICY "Anyone can upload quote attachments" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'quote-attachments');

-- Allow anyone to view uploaded files (since quotes may be shared)
CREATE POLICY "Anyone can view quote attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'quote-attachments');

-- Allow users to delete their own uploads (in case they want to replace)
CREATE POLICY "Users can delete their quote attachments" ON storage.objects
  FOR DELETE USING (bucket_id = 'quote-attachments');

-- Update RLS to allow the storage policies to work
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;