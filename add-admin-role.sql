-- Add admin role for current user
-- Run this in Supabase SQL editor after logging in

-- First, let's see what users exist
SELECT id, email FROM auth.users LIMIT 5;

-- Then add admin role for the current user (replace with actual user ID)
-- You can get your user ID from the auth.users table above
INSERT INTO user_roles (user_id, role, created_at, updated_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'iwbtracking@gmail.com' LIMIT 1),
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  updated_at = NOW(); 
 