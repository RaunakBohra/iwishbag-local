-- Storage configuration for iwishBag project
-- This file sets up storage buckets and policies to match cloud database

-- Enable RLS on storage objects and buckets
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Create/Update product-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images', 
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create/Update message-attachments bucket  
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  true, 
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies for product-images bucket
DROP POLICY IF EXISTS "Enable read access for all users" ON storage.objects;
CREATE POLICY "Enable read access for all users" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Enable upload for authenticated users" ON storage.objects;
CREATE POLICY "Enable upload for authenticated users" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'product-images' AND public.is_authenticated());

DROP POLICY IF EXISTS "Enable update for users who uploaded" ON storage.objects;
CREATE POLICY "Enable update for users who uploaded" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'product-images' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Enable delete for users who uploaded" ON storage.objects;
CREATE POLICY "Enable delete for users who uploaded" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'product-images' AND auth.uid() = owner);

-- Policies for message-attachments bucket
DROP POLICY IF EXISTS "Enable read access for all users on message attachments" ON storage.objects;
CREATE POLICY "Enable read access for all users on message attachments" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Enable upload for authenticated users on message attachments" ON storage.objects;
CREATE POLICY "Enable upload for authenticated users on message attachments" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'message-attachments' AND public.is_authenticated());

DROP POLICY IF EXISTS "Enable update for users who uploaded message attachments" ON storage.objects;
CREATE POLICY "Enable update for users who uploaded message attachments" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'message-attachments' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Enable delete for users who uploaded message attachments" ON storage.objects;
CREATE POLICY "Enable delete for users who uploaded message attachments" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'message-attachments' AND auth.uid() = owner);