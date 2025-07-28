-- Create package photos storage bucket
INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
VALUES ('package-photos', 'package-photos', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for package photos
CREATE POLICY "Admin users can upload package photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'package-photos' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "Admin users can update package photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'package-photos' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "Admin users can delete package photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'package-photos' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'moderator')
  )
);

CREATE POLICY "Package photos are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'package-photos');

-- Add RLS policies for package_photos table
ALTER TABLE package_photos ENABLE ROW LEVEL SECURITY;

-- Admin can manage all photos
CREATE POLICY "Admin users can manage all package photos"
ON package_photos
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'moderator')
  )
);

-- Customers can view photos for their packages
CREATE POLICY "Customers can view their package photos"
ON package_photos
FOR SELECT
TO authenticated
USING (
  -- For package photos
  (
    package_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM received_packages rp
      JOIN customer_addresses ca ON rp.customer_address_id = ca.id
      WHERE rp.id = package_photos.package_id
      AND ca.user_id = auth.uid()
    )
  )
  OR
  -- For consolidation photos
  (
    consolidation_group_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM consolidation_groups cg
      WHERE cg.id = package_photos.consolidation_group_id
      AND cg.user_id = auth.uid()
    )
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_package_photos_package_id ON package_photos(package_id);
CREATE INDEX IF NOT EXISTS idx_package_photos_consolidation_group_id ON package_photos(consolidation_group_id);
CREATE INDEX IF NOT EXISTS idx_package_photos_photo_type ON package_photos(photo_type);