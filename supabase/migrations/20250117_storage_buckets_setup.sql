-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('product-images', 'product-images', true),
  ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable delete for users who uploaded" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for users who uploaded message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Enable read access for all users" ON storage.objects;
DROP POLICY IF EXISTS "Enable read access for all users on message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Enable update for users who uploaded" ON storage.objects;
DROP POLICY IF EXISTS "Enable update for users who uploaded message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Enable upload for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable upload for authenticated users on message attachments" ON storage.objects;

-- Create policies for product-images bucket
CREATE POLICY "Enable delete for users who uploaded" ON storage.objects
FOR DELETE USING ((bucket_id = 'product-images'::text) AND (auth.uid() = owner));

CREATE POLICY "Enable read access for all users" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images'::text);

CREATE POLICY "Enable update for users who uploaded" ON storage.objects
FOR UPDATE USING ((bucket_id = 'product-images'::text) AND (auth.uid() = owner));

CREATE POLICY "Enable upload for authenticated users" ON storage.objects
FOR INSERT WITH CHECK ((bucket_id = 'product-images'::text) AND (auth.role() = 'authenticated'));

-- Create policies for message-attachments bucket
CREATE POLICY "Enable delete for users who uploaded message attachments" ON storage.objects
FOR DELETE USING ((bucket_id = 'message-attachments'::text) AND (auth.uid() = owner));

CREATE POLICY "Enable read access for all users on message attachments" ON storage.objects
FOR SELECT USING (bucket_id = 'message-attachments'::text);

CREATE POLICY "Enable update for users who uploaded message attachments" ON storage.objects
FOR UPDATE USING ((bucket_id = 'message-attachments'::text) AND (auth.uid() = owner));

CREATE POLICY "Enable upload for authenticated users on message attachments" ON storage.objects
FOR INSERT WITH CHECK ((bucket_id = 'message-attachments'::text) AND (auth.role() = 'authenticated'));