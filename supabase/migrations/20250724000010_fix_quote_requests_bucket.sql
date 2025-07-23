-- Fix quote-requests bucket and RLS policies
-- Ensure bucket exists and has proper security: only uploader and admin can see files

-- First, create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quote-requests',
  'quote-requests', 
  false,  -- Make bucket private (not public)
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
  public = false,  -- Ensure it's private
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can upload to quote-requests" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view quote-requests files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete quote-requests files" ON storage.objects;

-- Create new secure RLS policies

-- 1. Allow authenticated and anonymous users to upload files
CREATE POLICY "Users can upload to quote-requests" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'quote-requests' AND 
    (auth.uid() IS NOT NULL OR auth.uid() IS NULL)  -- Allow both authenticated and anonymous
  );

-- 2. Only allow file owner or admin to view files
CREATE POLICY "Owner and admin can view quote-requests files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'quote-requests' AND (
      owner = auth.uid() OR  -- File owner can see their files
      is_admin()  -- Admin can see all files
    )
  );

-- 3. Only allow file owner or admin to update files  
CREATE POLICY "Owner and admin can update quote-requests files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'quote-requests' AND (
      owner = auth.uid() OR  -- File owner can update their files
      is_admin()  -- Admin can update all files
    )
  );

-- 4. Only allow file owner or admin to delete files
CREATE POLICY "Owner and admin can delete quote-requests files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'quote-requests' AND (
      owner = auth.uid() OR  -- File owner can delete their files
      is_admin()  -- Admin can delete all files
    )
  );

-- Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;