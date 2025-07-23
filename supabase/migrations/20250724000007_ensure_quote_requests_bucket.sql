-- Ensure quote-requests bucket exists permanently
-- This bucket stores customer uploaded files for quote requests including:
-- - Product images
-- - Invoices and receipts (PDF, DOC, XLS)
-- - Other supporting documents

-- Create the quote-requests bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quote-requests',
  'quote-requests', 
  true,  -- Public bucket for easy access to customer uploads
  10485760,  -- 10MB limit per file
  ARRAY[
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ];

-- Create RLS policies for the bucket
-- Allow authenticated and anonymous users to upload files for quote requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Anyone can upload to quote-requests' 
    AND tablename = 'objects' 
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Anyone can upload to quote-requests" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'quote-requests');
  END IF;
END $$;

-- Allow anyone to view uploaded files (since quotes may be shared with team)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Anyone can view quote-requests files' 
    AND tablename = 'objects' 
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Anyone can view quote-requests files" ON storage.objects
      FOR SELECT USING (bucket_id = 'quote-requests');
  END IF;
END $$;

-- Allow users to delete their uploads (in case they want to replace files)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can delete quote-requests files' 
    AND tablename = 'objects' 
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Users can delete quote-requests files" ON storage.objects
      FOR DELETE USING (bucket_id = 'quote-requests');
  END IF;
END $$;

-- Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;