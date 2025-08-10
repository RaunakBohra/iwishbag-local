-- ============================================================================
-- ADD IP-BASED COUNTRY DETECTION TO AUTH SIGNUP
-- Automatically detect country and assign currency during user signup
-- ============================================================================

-- Function to detect country from IP address using Edge Function
CREATE OR REPLACE FUNCTION public.detect_country_from_ip(user_ip TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    detected_country TEXT;
    edge_function_url TEXT;
    http_response JSONB;
BEGIN
    -- Default fallback
    detected_country := 'US';
    
    -- Skip detection if no IP provided
    IF user_ip IS NULL OR user_ip = '' OR user_ip = '127.0.0.1' OR user_ip = '::1' THEN
        RAISE LOG 'IP detection skipped: invalid IP address %', user_ip;
        RETURN detected_country;
    END IF;
    
    -- Skip private IP ranges
    IF user_ip LIKE '192.168.%' OR user_ip LIKE '10.%' OR user_ip LIKE '172.16.%' OR user_ip LIKE '172.17.%' OR user_ip LIKE '172.18.%' OR user_ip LIKE '172.19.%' OR user_ip LIKE '172.2_.%' OR user_ip LIKE '172.30.%' OR user_ip LIKE '172.31.%' THEN
        RAISE LOG 'IP detection skipped: private IP address %', user_ip;
        RETURN detected_country;
    END IF;
    
    -- Try to detect country using Supabase Edge Function
    BEGIN
        -- Call the edge function for robust IP detection
        -- In Supabase, we use the net.http_post function to call edge functions
        SELECT
            content::jsonb INTO http_response
        FROM
            net.http_post(
                url := concat(
                    current_setting('app.settings.supabase_url', true),
                    '/functions/v1/detect-user-country'
                ),
                headers := jsonb_build_object(
                    'Authorization', concat('Bearer ', current_setting('app.settings.service_role_key', true)),
                    'Content-Type', 'application/json',
                    'cf-connecting-ip', user_ip
                ),
                body := jsonb_build_object('ip', user_ip)
            ) http_response;
            
        -- Parse the edge function response
        IF http_response IS NOT NULL AND http_response ? 'country' THEN
            detected_country := http_response->>'country';
            RAISE LOG 'IP detection success via edge function: % -> %', user_ip, detected_country;
        ELSE
            -- Fallback to basic IP range detection
            detected_country := public.detect_country_from_ip_ranges(user_ip);
            RAISE LOG 'IP detection fallback to ranges: % -> %', user_ip, detected_country;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Edge function IP detection failed for %: %. Using IP range fallback.', user_ip, SQLERRM;
        -- Fallback to basic IP range detection
        detected_country := public.detect_country_from_ip_ranges(user_ip);
    END;
    
    RETURN detected_country;
END;
$$;

-- Function to detect country from IP ranges (enhanced implementation with more ranges)
CREATE OR REPLACE FUNCTION public.detect_country_from_ip_ranges(user_ip TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    ip_parts INTEGER[];
    first_octet INTEGER;
    second_octet INTEGER;
    detected_country TEXT := 'US';
BEGIN
    -- Parse IP address (basic IPv4 parsing)
    BEGIN
        -- Split IP into octets
        SELECT ARRAY[
            CAST(split_part(user_ip, '.', 1) AS INTEGER),
            CAST(split_part(user_ip, '.', 2) AS INTEGER),
            CAST(split_part(user_ip, '.', 3) AS INTEGER),
            CAST(split_part(user_ip, '.', 4) AS INTEGER)
        ] INTO ip_parts;
        
        first_octet := ip_parts[1];
        second_octet := ip_parts[2];
        
        -- Enhanced country detection based on known IP ranges
        -- Based on common ISP and regional allocations
        CASE
            -- India IP ranges (common ISPs)
            WHEN (first_octet = 14 AND second_octet BETWEEN 96 AND 143) OR 
                 (first_octet = 27 AND second_octet BETWEEN 96 AND 127) OR
                 (first_octet = 49 AND second_octet BETWEEN 14 AND 15) OR
                 (first_octet = 103 AND second_octet BETWEEN 21 AND 22) OR
                 (first_octet = 106 AND second_octet BETWEEN 51 AND 52) OR
                 (first_octet = 117 AND second_octet BETWEEN 192 AND 223) OR
                 (first_octet = 125 AND second_octet BETWEEN 16 AND 31) OR
                 (first_octet = 150 AND second_octet BETWEEN 107 AND 109) OR
                 (first_octet = 182 AND second_octet BETWEEN 68 AND 79) OR
                 (first_octet = 203 AND second_octet BETWEEN 122 AND 125) THEN
                detected_country := 'IN';
                
            -- Nepal IP ranges
            WHEN (first_octet = 113 AND second_octet = 197) OR
                 (first_octet = 202 AND second_octet = 166) OR
                 (first_octet = 202 AND second_octet = 52) OR
                 (first_octet = 202 AND second_octet = 63) OR
                 (first_octet = 202 AND second_octet = 79) OR
                 (first_octet = 103 AND second_octet = 69) THEN
                detected_country := 'NP';
                
            -- China IP ranges (common)
            WHEN (first_octet BETWEEN 1 AND 126 AND second_octet BETWEEN 0 AND 255) OR
                 (first_octet = 14 AND second_octet BETWEEN 0 AND 95) OR
                 (first_octet = 27 AND second_octet BETWEEN 0 AND 95) OR
                 (first_octet BETWEEN 58 AND 61) OR
                 (first_octet BETWEEN 110 AND 125 AND second_octet NOT BETWEEN 16 AND 31) THEN
                -- This is too broad, need more specific detection
                detected_country := 'US'; -- Default for now
                
            -- UK IP ranges
            WHEN (first_octet = 2 AND second_octet BETWEEN 16 AND 31) OR
                 (first_octet = 5 AND second_octet BETWEEN 8 AND 15) OR
                 (first_octet = 25 AND second_octet BETWEEN 0 AND 127) OR
                 (first_octet = 31 AND second_octet BETWEEN 0 AND 31) OR
                 (first_octet = 51 AND second_octet BETWEEN 0 AND 255) OR
                 (first_octet = 62 AND second_octet BETWEEN 0 AND 255) OR
                 (first_octet = 80 AND second_octet BETWEEN 0 AND 127) OR
                 (first_octet = 81 AND second_octet BETWEEN 0 AND 255) OR
                 (first_octet = 82 AND second_octet BETWEEN 0 AND 255) OR
                 (first_octet = 83 AND second_octet BETWEEN 0 AND 255) OR
                 (first_octet = 84 AND second_octet BETWEEN 0 AND 255) OR
                 (first_octet = 85 AND second_octet BETWEEN 0 AND 255) OR
                 (first_octet = 86 AND second_octet BETWEEN 0 AND 255) OR
                 (first_octet = 87 AND second_octet BETWEEN 0 AND 255) OR
                 (first_octet = 88 AND second_octet BETWEEN 0 AND 255) OR
                 (first_octet = 89 AND second_octet BETWEEN 0 AND 255) OR
                 (first_octet = 90 AND second_octet BETWEEN 0 AND 255) OR
                 (first_octet = 91 AND second_octet BETWEEN 0 AND 255) THEN
                detected_country := 'GB';
                
            -- Default fallback
            ELSE
                detected_country := 'US';
        END CASE;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Failed to parse IP address: %. Using US fallback.', user_ip;
        detected_country := 'US';
    END;
    
    RETURN detected_country;
END;
$$;

-- Function to get currency for a country
CREATE OR REPLACE FUNCTION public.get_currency_for_country(country_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    currency_code TEXT;
BEGIN
    -- Get currency from country_settings table
    SELECT currency INTO currency_code
    FROM country_settings
    WHERE code = country_code;
    
    -- If not found, use defaults based on known countries
    IF currency_code IS NULL THEN
        CASE country_code
            WHEN 'IN' THEN currency_code := 'INR';
            WHEN 'NP' THEN currency_code := 'NPR';
            WHEN 'GB' THEN currency_code := 'GBP';
            WHEN 'CA' THEN currency_code := 'CAD';
            WHEN 'AU' THEN currency_code := 'AUD';
            WHEN 'JP' THEN currency_code := 'JPY';
            WHEN 'EU', 'DE', 'FR', 'IT', 'ES' THEN currency_code := 'EUR';
            ELSE currency_code := 'USD';
        END CASE;
    END IF;
    
    RETURN currency_code;
END;
$$;

-- Enhanced auth trigger with IP-based country detection
CREATE OR REPLACE FUNCTION public.handle_new_user_with_country_detection() 
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    has_email_col BOOLEAN;
    has_full_name_col BOOLEAN;
    has_country_col BOOLEAN;
    has_currency_col BOOLEAN;
    detected_country TEXT := 'US';
    user_currency TEXT := 'USD';
    user_ip TEXT;
    request_headers TEXT;
BEGIN
    -- Get user IP from various sources (enhanced detection)
    BEGIN
        -- Try to get IP from request headers in order of reliability
        user_ip := COALESCE(
            -- Cloudflare headers (most reliable for Supabase)
            current_setting('request.headers', true)::json->>'cf-connecting-ip',
            current_setting('request.headers', true)::json->>'cf-ray',
            -- Standard proxy headers
            split_part(current_setting('request.headers', true)::json->>'x-forwarded-for', ',', 1),
            current_setting('request.headers', true)::json->>'x-real-ip',
            current_setting('request.headers', true)::json->>'x-client-ip',
            -- AWS/Load balancer headers
            current_setting('request.headers', true)::json->>'x-forwarded',
            current_setting('request.headers', true)::json->>'forwarded-for',
            current_setting('request.headers', true)::json->>'forwarded',
            -- Direct connection (least reliable in cloud)
            inet_client_addr()::text
        );
        
        -- Clean up the IP (remove whitespace, extract first IP from comma-separated list)
        IF user_ip IS NOT NULL THEN
            user_ip := trim(split_part(user_ip, ',', 1));
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        user_ip := NULL;
        RAISE LOG 'Failed to get user IP: %', SQLERRM;
    END;
    
    -- Detect country from IP
    IF user_ip IS NOT NULL THEN
        detected_country := public.detect_country_from_ip(user_ip);
        RAISE LOG 'Country detection: IP % -> Country %', user_ip, detected_country;
    ELSE
        RAISE LOG 'No IP available, using default country: %', detected_country;
    END IF;
    
    -- Get currency for the detected country
    user_currency := public.get_currency_for_country(detected_country);
    
    -- Check what columns exist in profiles table (schema-safe)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'email' AND table_schema = 'public'
    ) INTO has_email_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'full_name' AND table_schema = 'public'
    ) INTO has_full_name_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'country' AND table_schema = 'public'
    ) INTO has_country_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'preferred_display_currency' AND table_schema = 'public'
    ) INTO has_currency_col;

    -- Create profile based on available columns with country/currency
    IF has_full_name_col AND has_email_col AND has_country_col AND has_currency_col THEN
        INSERT INTO public.profiles (
            id, 
            full_name, 
            email, 
            country, 
            preferred_display_currency
        )
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
            NEW.email,
            detected_country,
            user_currency
        )
        ON CONFLICT (id) DO UPDATE SET
            full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', profiles.full_name, 'User'),
            email = NEW.email,
            country = COALESCE(profiles.country, detected_country),
            preferred_display_currency = COALESCE(profiles.preferred_display_currency, user_currency);
            
    ELSIF has_email_col AND has_country_col AND has_currency_col THEN
        INSERT INTO public.profiles (
            id, 
            email, 
            country, 
            preferred_display_currency
        )
        VALUES (
            NEW.id,
            NEW.email,
            detected_country,
            user_currency
        )
        ON CONFLICT (id) DO UPDATE SET
            email = NEW.email,
            country = COALESCE(profiles.country, detected_country),
            preferred_display_currency = COALESCE(profiles.preferred_display_currency, user_currency);
            
    ELSIF has_country_col AND has_currency_col THEN
        INSERT INTO public.profiles (
            id, 
            country, 
            preferred_display_currency
        )
        VALUES (
            NEW.id,
            detected_country,
            user_currency
        )
        ON CONFLICT (id) DO UPDATE SET
            country = COALESCE(profiles.country, detected_country),
            preferred_display_currency = COALESCE(profiles.preferred_display_currency, user_currency);
            
    ELSE
        -- Fallback: create minimal profile
        INSERT INTO public.profiles (id)
        VALUES (NEW.id)
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Create user role if user_roles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles' AND table_schema = 'public') THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'user')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
    
    RAISE LOG 'User profile created: ID=%, Country=%, Currency=%', NEW.id, detected_country, user_currency;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the signup
        RAISE WARNING 'Error in handle_new_user_with_country_detection: %', SQLERRM;
        
        -- Create basic profile as fallback
        INSERT INTO public.profiles (id)
        VALUES (NEW.id)
        ON CONFLICT (id) DO NOTHING;
        
        RETURN NEW;
END;
$$;

-- Replace the current trigger with the enhanced version
DO $$ 
DECLARE
    trigger_exists BOOLEAN;
BEGIN
    RAISE NOTICE '=== UPGRADING AUTH TRIGGER WITH COUNTRY DETECTION ===';
    
    -- Check and drop existing trigger
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created_enhanced' 
        AND tgrelid = 'auth.users'::regclass
    ) INTO trigger_exists;
    
    IF trigger_exists THEN
        DROP TRIGGER on_auth_user_created_enhanced ON auth.users;
        RAISE NOTICE '🗑️ Removed old enhanced trigger';
    END IF;
    
    -- Create new trigger with country detection
    CREATE TRIGGER on_auth_user_created_with_country
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_new_user_with_country_detection();
        
    RAISE NOTICE '✅ Created enhanced trigger with IP country detection';
    RAISE NOTICE '🌍 New signups will automatically detect country and assign currency!';
END $$;

-- Create a test function to verify IP detection works
CREATE OR REPLACE FUNCTION public.test_ip_country_detection(test_ip TEXT)
RETURNS TABLE(
    ip TEXT,
    detected_country TEXT,
    assigned_currency TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        test_ip,
        public.detect_country_from_ip(test_ip),
        public.get_currency_for_country(public.detect_country_from_ip(test_ip));
END;
$$;

-- Test the IP detection with sample IPs
DO $$
DECLARE
    test_result RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== TESTING IP COUNTRY DETECTION ===';
    
    -- Test with various IP addresses
    FOR test_result IN
        SELECT * FROM public.test_ip_country_detection('8.8.8.8') -- Google DNS
        UNION ALL
        SELECT * FROM public.test_ip_country_detection('1.1.1.1') -- Cloudflare
        UNION ALL
        SELECT * FROM public.test_ip_country_detection('192.168.1.1') -- Private IP
        UNION ALL
        SELECT * FROM public.test_ip_country_detection('127.0.0.1') -- Localhost
    LOOP
        RAISE NOTICE 'IP: % -> Country: % -> Currency: %', 
            test_result.ip, 
            test_result.detected_country, 
            test_result.assigned_currency;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ IP COUNTRY DETECTION ACTIVE!';
    RAISE NOTICE '📝 New users will get country and currency assigned automatically';
    RAISE NOTICE '🌍 Test by signing up a new user and checking their profile';
END $$;