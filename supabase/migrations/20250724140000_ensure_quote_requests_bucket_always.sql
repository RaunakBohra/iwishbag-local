-- Ensure quote-requests bucket always exists with proper RLS policies
-- This migration runs during database setup to create the bucket automatically

-- Create quote-requests bucket for file uploads (will not fail if exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quote-requests',
  'quote-requests', 
  false,  -- Private bucket for security
  10485760,  -- 10MB limit per file
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv'
  ];

-- Clean up any existing policies first
DROP POLICY IF EXISTS "quote_requests_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "quote_requests_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "quote_requests_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to quote-requests" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view quote-requests files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete quote-requests files" ON storage.objects;

-- Create secure RLS policies: only uploader and admin can access files
CREATE POLICY "quote_requests_upload_policy" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'quote-requests');

CREATE POLICY "quote_requests_select_policy" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'quote-requests' AND (
      owner = auth.uid() OR  -- File owner can see their files
      is_admin()  -- Admin can see all files
    )
  );

CREATE POLICY "quote_requests_delete_policy" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'quote-requests' AND (
      owner = auth.uid() OR  -- File owner can delete their files
      is_admin()  -- Admin can delete all files
    )
  );

-- Ensure RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;