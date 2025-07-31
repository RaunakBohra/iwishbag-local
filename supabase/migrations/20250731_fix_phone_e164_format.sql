-- Migration to fix phone numbers to E.164 format with + prefix
-- This migration adds the + prefix to existing phone numbers that don't have it

-- First, let's see what we're about to update
SELECT 
    'Pre-migration Check' as status,
    COUNT(*) as phones_to_update,
    STRING_AGG(phone, ', ') as sample_phones
FROM auth.users
WHERE phone IS NOT NULL 
AND phone NOT LIKE '+%';

-- Update phones to add + prefix where missing
-- This assumes phones without + are stored in national format
UPDATE auth.users
SET 
    phone = CASE
        -- US numbers (10 or 11 digits starting with 1)
        WHEN phone ~ '^1[0-9]{10}$' THEN '+' || phone
        WHEN phone ~ '^[2-9][0-9]{9}$' THEN '+1' || phone
        
        -- India numbers (10 digits, usually starting with 6-9)
        WHEN phone ~ '^[6-9][0-9]{9}$' AND LENGTH(phone) = 10 THEN '+91' || phone
        
        -- Nepal numbers (10 digits, usually starting with 9)
        WHEN phone ~ '^9[0-9]{9}$' AND LENGTH(phone) = 10 THEN '+977' || phone
        
        -- Generic pattern for numbers that look like they already have country code
        WHEN LENGTH(phone) > 10 THEN '+' || phone
        
        -- Default: assume US if 10 digits
        WHEN LENGTH(phone) = 10 THEN '+1' || phone
        
        -- For any other pattern, just add +
        ELSE '+' || phone
    END,
    updated_at = NOW()
WHERE phone IS NOT NULL 
AND phone NOT LIKE '+%';

-- Verify the migration results
SELECT 
    'Post-migration Check' as status,
    COUNT(*) as total_phones,
    COUNT(CASE WHEN phone LIKE '+%' THEN 1 END) as phones_with_plus,
    COUNT(CASE WHEN phone NOT LIKE '+%' THEN 1 END) as phones_without_plus,
    CASE 
        WHEN COUNT(phone) > 0 
        THEN ROUND((COUNT(CASE WHEN phone LIKE '+%' THEN 1 END)::numeric / COUNT(phone)::numeric * 100), 2)
        ELSE 0 
    END as e164_compliance_percentage
FROM auth.users
WHERE phone IS NOT NULL;

-- Show sample of updated phones
SELECT 
    'Updated Phones Sample' as status,
    id,
    email,
    phone,
    updated_at
FROM auth.users
WHERE phone IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;