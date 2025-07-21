-- ============================================================================
-- CREATE MESSAGE ATTACHMENTS STORAGE BUCKET
-- Sets up secure file storage for messaging system attachments
-- ============================================================================

-- Create the message-attachments bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments', 
  false, -- Private bucket for security
  10485760, -- 10MB limit per file
  ARRAY[
    'image/jpeg',
    'image/png', 
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for message-attachments bucket

-- Policy: Users can upload files to their own quote folders
CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments' 
  AND (
    -- Users can upload to quote folders they have access to
    (auth.role() = 'authenticated' AND 
     -- Check if user has access to the quote (either as owner or admin)
     (
       -- Extract quote-id from path like: quote-{quote-id}/filename.jpg
       CASE 
         WHEN name ~ '^quote-[a-f0-9-]+/'
         THEN EXISTS (
           SELECT 1 FROM public.quotes q
           WHERE q.id::text = SUBSTRING(name FROM '^quote-([a-f0-9-]+)/')
           AND (q.user_id = auth.uid() OR EXISTS (
             SELECT 1 FROM public.user_roles ur 
             WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'moderator')
           ))
         )
         ELSE false
       END
     )
    )
    OR
    -- Admins can upload anywhere
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);

-- Policy: Users can view message attachments they have access to
CREATE POLICY "Users can view message attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments'
  AND (
    -- Users can view attachments for quotes they have access to
    (auth.role() = 'authenticated' AND 
     -- Check if user has access to the quote
     (
       -- Extract quote-id from path like: quote-{quote-id}/filename.jpg
       CASE 
         WHEN name ~ '^quote-[a-f0-9-]+/'
         THEN EXISTS (
           SELECT 1 FROM public.quotes q
           WHERE q.id::text = SUBSTRING(name FROM '^quote-([a-f0-9-]+)/')
           AND (q.user_id = auth.uid() OR EXISTS (
             SELECT 1 FROM public.user_roles ur 
             WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'moderator')
           ))
         )
         ELSE false
       END
     )
    )
    OR
    -- Admins can view all attachments
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);

-- Policy: Admins can delete message attachments
CREATE POLICY "Admins can delete message attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'message-attachments'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Policy: Users can update their own message attachments metadata
CREATE POLICY "Users can update message attachment metadata"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'message-attachments'
  AND (
    -- Users can update attachments for quotes they have access to
    (auth.role() = 'authenticated' AND 
     -- Check if user has access to the quote
     (
       -- Extract quote-id from path like: quote-{quote-id}/filename.jpg
       CASE 
         WHEN name ~ '^quote-[a-f0-9-]+/'
         THEN EXISTS (
           SELECT 1 FROM public.quotes q
           WHERE q.id::text = SUBSTRING(name FROM '^quote-([a-f0-9-]+)/')
           AND (q.user_id = auth.uid() OR EXISTS (
             SELECT 1 FROM public.user_roles ur 
             WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'moderator')
           ))
         )
         ELSE false
       END
     )
    )
    OR
    -- Admins can update all attachments
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);

-- Create helper function to validate message attachment paths
CREATE OR REPLACE FUNCTION public.validate_message_attachment_path(file_path TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Path should be in format: quote-{uuid}/{timestamp}_{random}.{extension}
  RETURN file_path ~ '^quote-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/[0-9]+_[a-zA-Z0-9]+\.[a-zA-Z0-9]+$';
END;
$$;

-- Add helpful comments
COMMENT ON FUNCTION public.validate_message_attachment_path IS 'Validates that message attachment file paths follow the correct format';

-- Log successful bucket creation
DO $$
BEGIN
  RAISE NOTICE '✅ Message attachments storage bucket created successfully';
  RAISE NOTICE '🔒 RLS policies configured for secure quote-specific access';
  RAISE NOTICE '📁 Path format: quote-{quote-id}/{timestamp}_{random}.{extension}';
  RAISE NOTICE '📊 File size limit: 10MB per file';
  RAISE NOTICE '📎 Allowed types: images, PDFs, documents';
END $$;