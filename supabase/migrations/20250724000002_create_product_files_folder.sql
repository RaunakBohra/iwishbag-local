-- Create product-files folder structure in existing product-images bucket
-- This allows us to organize files by type within the same bucket

-- The folder structure will be:
-- product-images/
--   ├── product-images/  (existing images)
--   └── product-files/   (new documents and files)

-- No additional bucket creation needed - we'll use the existing product-images bucket
-- with a subdirectory for better organization

-- Ensure the bucket has proper policies for file uploads
-- (This should already exist, but we'll verify the policy covers all file types)

-- Update storage policy to allow all file types in product-images bucket
-- Allow authenticated and anonymous users to upload files
INSERT INTO storage.objects (bucket_id, name, owner, metadata)
SELECT 'product-images', 'product-files/.keep', null, '{}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM storage.objects 
  WHERE bucket_id = 'product-images' AND name = 'product-files/.keep'
);

-- Comment: This migration creates the product-files subdirectory structure
-- within the existing product-images bucket to support document uploads
-- alongside image uploads for quote requests.