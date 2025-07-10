-- Simple migration to add destination_country to user_addresses if it doesn't exist
-- This avoids conflicts with other migrations

-- Add the destination_country column only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_addresses' 
                   AND column_name = 'destination_country') THEN
        ALTER TABLE user_addresses ADD COLUMN destination_country VARCHAR(2);
    END IF;
END $$;

-- Update existing addresses to set destination_country based on existing country field
-- Only update rows where destination_country is NULL
UPDATE user_addresses 
SET destination_country = 
  CASE 
    WHEN LENGTH(country) = 2 THEN UPPER(country) -- Already a 2-letter code
    WHEN country = 'India' THEN 'IN'
    WHEN country = 'Nepal' THEN 'NP'
    WHEN country = 'United States' THEN 'US'
    WHEN country = 'United Kingdom' THEN 'GB'
    WHEN country = 'Japan' THEN 'JP'
    WHEN country = 'Australia' THEN 'AU'
    WHEN country = 'Canada' THEN 'CA'
    WHEN country = 'Germany' THEN 'DE'
    WHEN country = 'France' THEN 'FR'
    WHEN country = 'Italy' THEN 'IT'
    WHEN country = 'Spain' THEN 'ES'
    WHEN country = 'Brazil' THEN 'BR'
    WHEN country = 'China' THEN 'CN'
    WHEN country = 'South Korea' THEN 'KR'
    WHEN country = 'Singapore' THEN 'SG'
    WHEN country = 'Malaysia' THEN 'MY'
    WHEN country = 'Thailand' THEN 'TH'
    WHEN country = 'Philippines' THEN 'PH'
    WHEN country = 'Indonesia' THEN 'ID'
    WHEN country = 'Vietnam' THEN 'VN'
    WHEN country = 'Bangladesh' THEN 'BD'
    WHEN country = 'Sri Lanka' THEN 'LK'
    WHEN country = 'Pakistan' THEN 'PK'
    WHEN country = 'United Arab Emirates' THEN 'AE'
    WHEN country = 'Saudi Arabia' THEN 'SA'
    WHEN country = 'South Africa' THEN 'ZA'
    WHEN country = 'Egypt' THEN 'EG'
    WHEN country = 'Nigeria' THEN 'NG'
    WHEN country = 'Kenya' THEN 'KE'
    WHEN country = 'Mexico' THEN 'MX'
    WHEN country = 'Argentina' THEN 'AR'
    WHEN country = 'Chile' THEN 'CL'
    WHEN country = 'Colombia' THEN 'CO'
    WHEN country = 'Peru' THEN 'PE'
    WHEN country = 'Russia' THEN 'RU'
    WHEN country = 'Turkey' THEN 'TR'
    WHEN country = 'Poland' THEN 'PL'
    WHEN country = 'Netherlands' THEN 'NL'
    WHEN country = 'Belgium' THEN 'BE'
    WHEN country = 'Switzerland' THEN 'CH'
    WHEN country = 'Austria' THEN 'AT'
    WHEN country = 'Sweden' THEN 'SE'
    WHEN country = 'Norway' THEN 'NO'
    WHEN country = 'Denmark' THEN 'DK'
    WHEN country = 'Finland' THEN 'FI'
    WHEN country = 'Ireland' THEN 'IE'
    WHEN country = 'Portugal' THEN 'PT'
    WHEN country = 'Greece' THEN 'GR'
    WHEN country = 'Czech Republic' THEN 'CZ'
    WHEN country = 'Hungary' THEN 'HU'
    WHEN country = 'Romania' THEN 'RO'
    WHEN country = 'Bulgaria' THEN 'BG'
    WHEN country = 'Croatia' THEN 'HR'
    WHEN country = 'Slovenia' THEN 'SI'
    WHEN country = 'Slovakia' THEN 'SK'
    WHEN country = 'Lithuania' THEN 'LT'
    WHEN country = 'Latvia' THEN 'LV'
    WHEN country = 'Estonia' THEN 'EE'
    WHEN country = 'Malta' THEN 'MT'
    WHEN country = 'Cyprus' THEN 'CY'
    WHEN country = 'Luxembourg' THEN 'LU'
    WHEN country = 'Israel' THEN 'IL'
    WHEN country = 'New Zealand' THEN 'NZ'
    ELSE 'US' -- Default fallback
  END
WHERE destination_country IS NULL;

-- Add an index for efficient filtering by destination_country (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_user_addresses_destination_country 
ON user_addresses (destination_country);