-- Enhanced migration to fix phone numbers to E.164 format with + prefix
-- This version better handles numbers that include country codes without +

-- First, let's see what we're about to update
SELECT 
    'Pre-migration Check' as status,
    COUNT(*) as phones_to_update,
    STRING_AGG(phone || ' (' || LENGTH(phone) || ' digits)', ', ') as sample_phones_with_length
FROM auth.users
WHERE phone IS NOT NULL 
AND phone NOT LIKE '+%';

-- Update phones to add + prefix with better country code detection
UPDATE auth.users
SET 
    phone = CASE
        -- Nepal numbers with country code (977 + 10 digits = 13 total)
        WHEN phone ~ '^977[0-9]{10}$' THEN '+' || phone
        
        -- India numbers with country code (91 + 10 digits = 12 total)
        WHEN phone ~ '^91[6-9][0-9]{9}$' THEN '+' || phone
        
        -- US/Canada numbers with country code (1 + 10 digits = 11 total)
        WHEN phone ~ '^1[2-9][0-9]{9}$' THEN '+' || phone
        
        -- Pakistan numbers with country code (92 + 10 digits = 12 total)
        WHEN phone ~ '^92[0-9]{10}$' THEN '+' || phone
        
        -- Bangladesh numbers with country code (880 + 10 digits = 13 total)
        WHEN phone ~ '^880[0-9]{10}$' THEN '+' || phone
        
        -- Sri Lanka numbers with country code (94 + 9 digits = 11 total)
        WHEN phone ~ '^94[0-9]{9}$' THEN '+' || phone
        
        -- UAE numbers with country code (971 + 9 digits = 12 total)
        WHEN phone ~ '^971[0-9]{9}$' THEN '+' || phone
        
        -- UK numbers with country code (44 + 10 digits = 12 total)
        WHEN phone ~ '^44[0-9]{10}$' THEN '+' || phone
        
        -- Australia numbers with country code (61 + 9 digits = 11 total)
        WHEN phone ~ '^61[0-9]{9}$' THEN '+' || phone
        
        -- Singapore numbers with country code (65 + 8 digits = 10 total)
        WHEN phone ~ '^65[0-9]{8}$' THEN '+' || phone
        
        -- --- Numbers without country codes ---
        
        -- Nepal numbers (10 digits, usually starting with 98 or 97)
        WHEN phone ~ '^9[78][0-9]{8}$' AND LENGTH(phone) = 10 THEN '+977' || phone
        
        -- India numbers (10 digits, starting with 6-9)
        WHEN phone ~ '^[6-9][0-9]{9}$' AND LENGTH(phone) = 10 THEN '+91' || phone
        
        -- US/Canada numbers (10 digits, area code doesn't start with 0 or 1)
        WHEN phone ~ '^[2-9][0-9]{9}$' AND LENGTH(phone) = 10 THEN '+1' || phone
        
        -- Generic pattern for numbers that already look international (12+ digits)
        WHEN LENGTH(phone) >= 12 THEN '+' || phone
        
        -- Default: just add + for anything else
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

-- Show all updated phones with detected countries
SELECT 
    'Updated Phones' as status,
    email,
    phone,
    CASE 
        WHEN phone LIKE '+977%' THEN 'Nepal'
        WHEN phone LIKE '+91%' THEN 'India'
        WHEN phone LIKE '+1%' THEN 'US/Canada'
        WHEN phone LIKE '+92%' THEN 'Pakistan'
        WHEN phone LIKE '+880%' THEN 'Bangladesh'
        WHEN phone LIKE '+94%' THEN 'Sri Lanka'
        WHEN phone LIKE '+971%' THEN 'UAE'
        WHEN phone LIKE '+44%' THEN 'UK'
        WHEN phone LIKE '+61%' THEN 'Australia'
        WHEN phone LIKE '+65%' THEN 'Singapore'
        ELSE 'Other'
    END as detected_country,
    LENGTH(phone) as phone_length
FROM auth.users
WHERE phone IS NOT NULL
ORDER BY updated_at DESC;