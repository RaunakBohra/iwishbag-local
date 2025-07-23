-- File Upload Tracking System
-- Tracks uploaded files to prevent orphaned files and enable cleanup

-- Create table to track all uploaded files
CREATE TABLE uploaded_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    bucket_name TEXT NOT NULL DEFAULT 'quote-requests',
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Tracking fields
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT, -- For anonymous users
    ip_address INET,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'used', 'orphaned', 'deleted')),
    used_at TIMESTAMP WITH TIME ZONE,
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    
    -- Cleanup tracking
    marked_for_deletion_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for efficient queries
CREATE INDEX idx_uploaded_files_status ON uploaded_files(status);
CREATE INDEX idx_uploaded_files_uploaded_at ON uploaded_files(uploaded_at);
CREATE INDEX idx_uploaded_files_user_id ON uploaded_files(user_id);
CREATE INDEX idx_uploaded_files_session_id ON uploaded_files(session_id);
CREATE INDEX idx_uploaded_files_quote_id ON uploaded_files(quote_id);

-- Function to mark files for cleanup (orphaned files older than 48 hours)
CREATE OR REPLACE FUNCTION mark_orphaned_files_for_cleanup()
RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    -- Mark files as orphaned if they're older than 48 hours and haven't been used
    UPDATE uploaded_files 
    SET 
        status = 'orphaned',
        marked_for_deletion_at = timezone('utc'::text, now())
    WHERE 
        status = 'uploaded' 
        AND uploaded_at < (timezone('utc'::text, now()) - INTERVAL '48 hours')
        AND quote_id IS NULL;
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    
    RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup orphaned files (delete files marked for deletion for 24+ hours)
CREATE OR REPLACE FUNCTION cleanup_orphaned_files()
RETURNS TABLE(file_path TEXT, file_name TEXT) AS $$
BEGIN
    -- Return files that should be deleted from storage
    RETURN QUERY
    SELECT 
        uf.file_path,
        uf.file_name
    FROM uploaded_files uf
    WHERE 
        uf.status = 'orphaned'
        AND uf.marked_for_deletion_at IS NOT NULL
        AND uf.marked_for_deletion_at < (timezone('utc'::text, now()) - INTERVAL '24 hours');
    
    -- Mark files as deleted in database
    UPDATE uploaded_files 
    SET 
        status = 'deleted',
        deleted_at = timezone('utc'::text, now())
    WHERE 
        status = 'orphaned'
        AND marked_for_deletion_at IS NOT NULL
        AND marked_for_deletion_at < (timezone('utc'::text, now()) - INTERVAL '24 hours');
END;
$$ LANGUAGE plpgsql;

-- Function to mark file as used when quote is submitted
CREATE OR REPLACE FUNCTION mark_file_as_used(p_file_path TEXT, p_quote_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE uploaded_files 
    SET 
        status = 'used',
        used_at = timezone('utc'::text, now()),
        quote_id = p_quote_id
    WHERE file_path = p_file_path;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- RLS policies
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

-- Users can see their own uploaded files
CREATE POLICY "Users can view own uploaded files" ON uploaded_files
    FOR SELECT USING (
        user_id = auth.uid() OR 
        (user_id IS NULL AND session_id IS NOT NULL) -- Allow anonymous users to see their session files
    );

-- Users can insert their own file records
CREATE POLICY "Users can insert file records" ON uploaded_files
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR 
        user_id IS NULL -- Allow anonymous uploads
    );

-- Only admins can update file status (except marking as used)
CREATE POLICY "Admins can update file status" ON uploaded_files
    FOR UPDATE USING (is_admin());

-- Function to be called from frontend after successful file upload
CREATE OR REPLACE FUNCTION track_uploaded_file(
    p_file_path TEXT,
    p_file_name TEXT,
    p_file_size BIGINT,
    p_file_type TEXT,
    p_session_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    file_id UUID;
BEGIN
    INSERT INTO uploaded_files (
        file_path, 
        file_name, 
        file_size, 
        file_type, 
        user_id, 
        session_id,
        ip_address
    ) VALUES (
        p_file_path,
        p_file_name,
        p_file_size,
        p_file_type,
        auth.uid(),
        p_session_id,
        inet_client_addr()
    ) RETURNING id INTO file_id;
    
    RETURN file_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the system
COMMENT ON TABLE uploaded_files IS 'Tracks all uploaded files to prevent orphaned files. Files are marked as orphaned after 48 hours if not used in quotes, then deleted after additional 24 hours.';