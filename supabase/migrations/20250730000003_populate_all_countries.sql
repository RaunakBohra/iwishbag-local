-- Populate all countries with comprehensive data
-- This includes all UN member states and commonly recognized territories

-- First, let's update existing countries with new data
UPDATE public.country_settings SET
    flag_emoji = '🇦🇷', phone_code = '+54', continent = 'South America',
    popular_payment_methods = ARRAY['credit_card', 'mercadopago', 'bank_transfer'],
    languages = ARRAY['es'], default_language = 'es', timezone = 'America/Buenos_Aires'
WHERE code = 'AR';

UPDATE public.country_settings SET
    flag_emoji = '🇧🇷', phone_code = '+55', continent = 'South America',
    popular_payment_methods = ARRAY['credit_card', 'pix', 'boleto', 'bank_transfer'],
    languages = ARRAY['pt'], default_language = 'pt', timezone = 'America/Sao_Paulo'
WHERE code = 'BR';

UPDATE public.country_settings SET
    flag_emoji = '🇨🇦', phone_code = '+1', continent = 'North America',
    popular_payment_methods = ARRAY['credit_card', 'interac', 'paypal', 'bank_transfer'],
    languages = ARRAY['en', 'fr'], default_language = 'en', timezone = 'America/Toronto'
WHERE code = 'CA';

UPDATE public.country_settings SET
    flag_emoji = '🇨🇱', phone_code = '+56', continent = 'South America',
    popular_payment_methods = ARRAY['credit_card', 'webpay', 'bank_transfer'],
    languages = ARRAY['es'], default_language = 'es', timezone = 'America/Santiago'
WHERE code = 'CL';

UPDATE public.country_settings SET
    flag_emoji = '🇨🇳', phone_code = '+86', continent = 'Asia',
    popular_payment_methods = ARRAY['alipay', 'wechat_pay', 'unionpay', 'bank_transfer'],
    languages = ARRAY['zh'], default_language = 'zh', timezone = 'Asia/Shanghai',
    date_format = 'YYYY-MM-DD'
WHERE code = 'CN';

UPDATE public.country_settings SET
    flag_emoji = '🇩🇰', phone_code = '+45', continent = 'Europe',
    popular_payment_methods = ARRAY['credit_card', 'mobilepay', 'bank_transfer'],
    languages = ARRAY['da'], default_language = 'da', timezone = 'Europe/Copenhagen',
    date_format = 'DD-MM-YYYY', decimal_separator = ',', thousand_separator = '.'
WHERE code = 'DK';

UPDATE public.country_settings SET
    flag_emoji = '🇫🇷', phone_code = '+33', continent = 'Europe',
    popular_payment_methods = ARRAY['credit_card', 'paypal', 'bank_transfer'],
    languages = ARRAY['fr'], default_language = 'fr', timezone = 'Europe/Paris',
    date_format = 'DD/MM/YYYY', decimal_separator = ',', thousand_separator = ' ',
    symbol_position = 'after', symbol_space = true
WHERE code = 'FR';

UPDATE public.country_settings SET
    flag_emoji = '🇩🇪', phone_code = '+49', continent = 'Europe',
    popular_payment_methods = ARRAY['credit_card', 'paypal', 'sofort', 'bank_transfer'],
    languages = ARRAY['de'], default_language = 'de', timezone = 'Europe/Berlin',
    date_format = 'DD.MM.YYYY', decimal_separator = ',', thousand_separator = '.',
    symbol_position = 'after', symbol_space = true
WHERE code = 'DE';

UPDATE public.country_settings SET
    flag_emoji = '🇭🇰', phone_code = '+852', continent = 'Asia',
    popular_payment_methods = ARRAY['credit_card', 'octopus', 'alipay', 'bank_transfer'],
    languages = ARRAY['zh', 'en'], default_language = 'zh', timezone = 'Asia/Hong_Kong'
WHERE code = 'HK';

UPDATE public.country_settings SET
    flag_emoji = '🇮🇳', phone_code = '+91', continent = 'Asia',
    popular_payment_methods = ARRAY['upi', 'credit_card', 'debit_card', 'netbanking', 'paytm'],
    languages = ARRAY['en', 'hi'], default_language = 'en', timezone = 'Asia/Kolkata',
    date_format = 'DD/MM/YYYY'
WHERE code = 'IN';

UPDATE public.country_settings SET
    flag_emoji = '🇮🇹', phone_code = '+39', continent = 'Europe',
    popular_payment_methods = ARRAY['credit_card', 'paypal', 'bank_transfer'],
    languages = ARRAY['it'], default_language = 'it', timezone = 'Europe/Rome',
    date_format = 'DD/MM/YYYY', decimal_separator = ',', thousand_separator = '.',
    symbol_position = 'after', symbol_space = true
WHERE code = 'IT';

UPDATE public.country_settings SET
    flag_emoji = '🇲🇾', phone_code = '+60', continent = 'Asia',
    popular_payment_methods = ARRAY['credit_card', 'fpx', 'grabpay', 'bank_transfer'],
    languages = ARRAY['ms', 'en'], default_language = 'ms', timezone = 'Asia/Kuala_Lumpur'
WHERE code = 'MY';

UPDATE public.country_settings SET
    flag_emoji = '🇲🇽', phone_code = '+52', continent = 'North America',
    popular_payment_methods = ARRAY['credit_card', 'oxxo', 'mercadopago', 'bank_transfer'],
    languages = ARRAY['es'], default_language = 'es', timezone = 'America/Mexico_City'
WHERE code = 'MX';

UPDATE public.country_settings SET
    flag_emoji = '🇳🇵', phone_code = '+977', continent = 'Asia',
    popular_payment_methods = ARRAY['esewa', 'khalti', 'bank_transfer', 'cash'],
    languages = ARRAY['ne', 'en'], default_language = 'ne', timezone = 'Asia/Kathmandu'
WHERE code = 'NP';

UPDATE public.country_settings SET
    flag_emoji = '🇳🇱', phone_code = '+31', continent = 'Europe',
    popular_payment_methods = ARRAY['ideal', 'credit_card', 'paypal', 'bank_transfer'],
    languages = ARRAY['nl'], default_language = 'nl', timezone = 'Europe/Amsterdam',
    date_format = 'DD-MM-YYYY', decimal_separator = ',', thousand_separator = '.',
    symbol_position = 'before', symbol_space = true
WHERE code = 'NL';

UPDATE public.country_settings SET
    flag_emoji = '🇳🇿', phone_code = '+64', continent = 'Oceania',
    popular_payment_methods = ARRAY['credit_card', 'bank_transfer', 'paypal'],
    languages = ARRAY['en'], default_language = 'en', timezone = 'Pacific/Auckland'
WHERE code = 'NZ';

UPDATE public.country_settings SET
    flag_emoji = '🇳🇴', phone_code = '+47', continent = 'Europe',
    popular_payment_methods = ARRAY['credit_card', 'vipps', 'bank_transfer'],
    languages = ARRAY['no'], default_language = 'no', timezone = 'Europe/Oslo',
    date_format = 'DD.MM.YYYY', decimal_separator = ',', thousand_separator = ' ',
    symbol_position = 'before', symbol_space = true
WHERE code = 'NO';

UPDATE public.country_settings SET
    flag_emoji = '🇷🇺', phone_code = '+7', continent = 'Europe',
    popular_payment_methods = ARRAY['credit_card', 'yandex_money', 'qiwi', 'bank_transfer'],
    languages = ARRAY['ru'], default_language = 'ru', timezone = 'Europe/Moscow',
    date_format = 'DD.MM.YYYY', decimal_separator = ',', thousand_separator = ' ',
    symbol_position = 'after', symbol_space = true
WHERE code = 'RU';

UPDATE public.country_settings SET
    flag_emoji = '🇸🇦', phone_code = '+966', continent = 'Asia',
    popular_payment_methods = ARRAY['credit_card', 'mada', 'sadad', 'bank_transfer'],
    languages = ARRAY['ar'], default_language = 'ar', timezone = 'Asia/Riyadh',
    date_format = 'DD/MM/YYYY'
WHERE code = 'SA';

UPDATE public.country_settings SET
    flag_emoji = '🇸🇬', phone_code = '+65', continent = 'Asia',
    popular_payment_methods = ARRAY['credit_card', 'paynow', 'grabpay', 'bank_transfer'],
    languages = ARRAY['en', 'zh', 'ms', 'ta'], default_language = 'en', timezone = 'Asia/Singapore'
WHERE code = 'SG';

UPDATE public.country_settings SET
    flag_emoji = '🇿🇦', phone_code = '+27', continent = 'Africa',
    popular_payment_methods = ARRAY['credit_card', 'eft', 'bank_transfer'],
    languages = ARRAY['en', 'af'], default_language = 'en', timezone = 'Africa/Johannesburg'
WHERE code = 'ZA';

UPDATE public.country_settings SET
    flag_emoji = '🇰🇷', phone_code = '+82', continent = 'Asia',
    popular_payment_methods = ARRAY['credit_card', 'kakao_pay', 'naver_pay', 'bank_transfer'],
    languages = ARRAY['ko'], default_language = 'ko', timezone = 'Asia/Seoul',
    date_format = 'YYYY-MM-DD', decimal_places = 0
WHERE code = 'KR';

UPDATE public.country_settings SET
    flag_emoji = '🇪🇸', phone_code = '+34', continent = 'Europe',
    popular_payment_methods = ARRAY['credit_card', 'paypal', 'bank_transfer'],
    languages = ARRAY['es'], default_language = 'es', timezone = 'Europe/Madrid',
    date_format = 'DD/MM/YYYY', decimal_separator = ',', thousand_separator = '.',
    symbol_position = 'after', symbol_space = true
WHERE code = 'ES';

UPDATE public.country_settings SET
    flag_emoji = '🇸🇪', phone_code = '+46', continent = 'Europe',
    popular_payment_methods = ARRAY['credit_card', 'swish', 'klarna', 'bank_transfer'],
    languages = ARRAY['sv'], default_language = 'sv', timezone = 'Europe/Stockholm',
    date_format = 'YYYY-MM-DD', decimal_separator = ',', thousand_separator = ' ',
    symbol_position = 'after', symbol_space = true
WHERE code = 'SE';

UPDATE public.country_settings SET
    flag_emoji = '🇨🇭', phone_code = '+41', continent = 'Europe',
    popular_payment_methods = ARRAY['credit_card', 'twint', 'bank_transfer'],
    languages = ARRAY['de', 'fr', 'it'], default_language = 'de', timezone = 'Europe/Zurich',
    date_format = 'DD.MM.YYYY', decimal_separator = '.', thousand_separator = '''',
    symbol_position = 'before', symbol_space = true
WHERE code = 'CH';

UPDATE public.country_settings SET
    flag_emoji = '🇹🇼', phone_code = '+886', continent = 'Asia',
    popular_payment_methods = ARRAY['credit_card', 'line_pay', 'bank_transfer'],
    languages = ARRAY['zh'], default_language = 'zh', timezone = 'Asia/Taipei'
WHERE code = 'TW';

UPDATE public.country_settings SET
    flag_emoji = '🇹🇭', phone_code = '+66', continent = 'Asia',
    popular_payment_methods = ARRAY['credit_card', 'promptpay', 'truemoney', 'bank_transfer'],
    languages = ARRAY['th'], default_language = 'th', timezone = 'Asia/Bangkok'
WHERE code = 'TH';

UPDATE public.country_settings SET
    flag_emoji = '🇦🇪', phone_code = '+971', continent = 'Asia',
    popular_payment_methods = ARRAY['credit_card', 'apple_pay', 'bank_transfer'],
    languages = ARRAY['ar', 'en'], default_language = 'ar', timezone = 'Asia/Dubai'
WHERE code = 'AE';

UPDATE public.country_settings SET
    flag_emoji = '🇺🇸', phone_code = '+1', continent = 'North America',
    popular_payment_methods = ARRAY['credit_card', 'paypal', 'apple_pay', 'google_pay', 'venmo'],
    languages = ARRAY['en'], default_language = 'en', timezone = 'America/New_York'
WHERE code = 'US';

-- Now insert all remaining countries
INSERT INTO public.country_settings (
    code, name, display_name, currency, rate_from_usd, 
    flag_emoji, phone_code, continent, 
    popular_payment_methods, languages, default_language, 
    timezone, date_format, decimal_places,
    thousand_separator, decimal_separator, symbol_position, symbol_space,
    purchase_allowed, shipping_allowed, is_active
) VALUES 
-- Africa
('DZ', 'Algeria', 'Algeria', 'DZD', 135.0, '🇩🇿', '+213', 'Africa', 
 ARRAY['credit_card', 'bank_transfer'], ARRAY['ar', 'fr'], 'ar', 
 'Africa/Algiers', 'DD/MM/YYYY', 2, ',', '.', 'after', true, true, true, true),

('AO', 'Angola', 'Angola', 'AOA', 830.0, '🇦🇴', '+244', 'Africa',
 ARRAY['bank_transfer'], ARRAY['pt'], 'pt',
 'Africa/Luanda', 'DD/MM/YYYY', 2, '.', ',', 'after', true, true, true, true),

('BJ', 'Benin', 'Benin', 'XOF', 600.0, '🇧🇯', '+229', 'Africa',
 ARRAY['mobile_money', 'bank_transfer'], ARRAY['fr'], 'fr',
 'Africa/Porto-Novo', 'DD/MM/YYYY', 0, ' ', ',', 'after', true, true, true, true),

('BW', 'Botswana', 'Botswana', 'BWP', 13.5, '🇧🇼', '+267', 'Africa',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['en'], 'en',
 'Africa/Gaborone', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('BF', 'Burkina Faso', 'Burkina Faso', 'XOF', 600.0, '🇧🇫', '+226', 'Africa',
 ARRAY['mobile_money', 'bank_transfer'], ARRAY['fr'], 'fr',
 'Africa/Ouagadougou', 'DD/MM/YYYY', 0, ' ', ',', 'after', true, true, true, true),

('BI', 'Burundi', 'Burundi', 'BIF', 2850.0, '🇧🇮', '+257', 'Africa',
 ARRAY['bank_transfer'], ARRAY['fr', 'en'], 'fr',
 'Africa/Bujumbura', 'DD/MM/YYYY', 0, ',', '.', 'after', true, true, true, true),

('CM', 'Cameroon', 'Cameroon', 'XAF', 600.0, '🇨🇲', '+237', 'Africa',
 ARRAY['mobile_money', 'bank_transfer'], ARRAY['fr', 'en'], 'fr',
 'Africa/Douala', 'DD/MM/YYYY', 0, ' ', ',', 'after', true, true, true, true),

('CV', 'Cape Verde', 'Cape Verde', 'CVE', 98.0, '🇨🇻', '+238', 'Africa',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['pt'], 'pt',
 'Atlantic/Cape_Verde', 'DD/MM/YYYY', 2, '.', ',', 'after', true, true, true, true),

('CF', 'Central African Republic', 'Central African Republic', 'XAF', 600.0, '🇨🇫', '+236', 'Africa',
 ARRAY['bank_transfer'], ARRAY['fr'], 'fr',
 'Africa/Bangui', 'DD/MM/YYYY', 0, ' ', ',', 'after', true, true, true, true),

('TD', 'Chad', 'Chad', 'XAF', 600.0, '🇹🇩', '+235', 'Africa',
 ARRAY['bank_transfer'], ARRAY['fr', 'ar'], 'fr',
 'Africa/Ndjamena', 'DD/MM/YYYY', 0, ' ', ',', 'after', true, true, true, true),

('KM', 'Comoros', 'Comoros', 'KMF', 450.0, '🇰🇲', '+269', 'Africa',
 ARRAY['bank_transfer'], ARRAY['ar', 'fr'], 'fr',
 'Indian/Comoro', 'DD/MM/YYYY', 0, ',', '.', 'after', true, true, true, true),

('CG', 'Congo', 'Congo', 'XAF', 600.0, '🇨🇬', '+242', 'Africa',
 ARRAY['mobile_money', 'bank_transfer'], ARRAY['fr'], 'fr',
 'Africa/Brazzaville', 'DD/MM/YYYY', 0, ' ', ',', 'after', true, true, true, true),

('CD', 'Democratic Republic of Congo', 'Democratic Republic of Congo', 'CDF', 2500.0, '🇨🇩', '+243', 'Africa',
 ARRAY['mobile_money', 'bank_transfer'], ARRAY['fr'], 'fr',
 'Africa/Kinshasa', 'DD/MM/YYYY', 2, ',', '.', 'after', true, true, true, true),

('DJ', 'Djibouti', 'Djibouti', 'DJF', 177.0, '🇩🇯', '+253', 'Africa',
 ARRAY['bank_transfer'], ARRAY['fr', 'ar'], 'fr',
 'Africa/Djibouti', 'DD/MM/YYYY', 0, ',', '.', 'after', true, true, true, true),

('EG', 'Egypt', 'Egypt', 'EGP', 50.0, '🇪🇬', '+20', 'Africa',
 ARRAY['credit_card', 'fawry', 'bank_transfer'], ARRAY['ar'], 'ar',
 'Africa/Cairo', 'DD/MM/YYYY', 2, ',', '.', 'before', true, true, true, true),

('GQ', 'Equatorial Guinea', 'Equatorial Guinea', 'XAF', 600.0, '🇬🇶', '+240', 'Africa',
 ARRAY['bank_transfer'], ARRAY['es', 'fr'], 'es',
 'Africa/Malabo', 'DD/MM/YYYY', 0, ' ', ',', 'after', true, true, true, true),

('ER', 'Eritrea', 'Eritrea', 'ERN', 15.0, '🇪🇷', '+291', 'Africa',
 ARRAY['bank_transfer'], ARRAY['ti', 'ar', 'en'], 'ti',
 'Africa/Asmara', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('ET', 'Ethiopia', 'Ethiopia', 'ETB', 56.0, '🇪🇹', '+251', 'Africa',
 ARRAY['bank_transfer'], ARRAY['am'], 'am',
 'Africa/Addis_Ababa', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('GA', 'Gabon', 'Gabon', 'XAF', 600.0, '🇬🇦', '+241', 'Africa',
 ARRAY['mobile_money', 'bank_transfer'], ARRAY['fr'], 'fr',
 'Africa/Libreville', 'DD/MM/YYYY', 0, ' ', ',', 'after', true, true, true, true),

('GM', 'Gambia', 'Gambia', 'GMD', 65.0, '🇬🇲', '+220', 'Africa',
 ARRAY['bank_transfer'], ARRAY['en'], 'en',
 'Africa/Banjul', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('GH', 'Ghana', 'Ghana', 'GHS', 15.5, '🇬🇭', '+233', 'Africa',
 ARRAY['mobile_money', 'credit_card', 'bank_transfer'], ARRAY['en'], 'en',
 'Africa/Accra', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('GN', 'Guinea', 'Guinea', 'GNF', 8600.0, '🇬🇳', '+224', 'Africa',
 ARRAY['mobile_money', 'bank_transfer'], ARRAY['fr'], 'fr',
 'Africa/Conakry', 'DD/MM/YYYY', 0, ' ', ',', 'after', true, true, true, true),

('GW', 'Guinea-Bissau', 'Guinea-Bissau', 'XOF', 600.0, '🇬🇼', '+245', 'Africa',
 ARRAY['bank_transfer'], ARRAY['pt'], 'pt',
 'Africa/Bissau', 'DD/MM/YYYY', 0, ' ', ',', 'after', true, true, true, true),

('CI', 'Ivory Coast', 'Ivory Coast', 'XOF', 600.0, '🇨🇮', '+225', 'Africa',
 ARRAY['mobile_money', 'bank_transfer'], ARRAY['fr'], 'fr',
 'Africa/Abidjan', 'DD/MM/YYYY', 0, ' ', ',', 'after', true, true, true, true),

('KE', 'Kenya', 'Kenya', 'KES', 155.0, '🇰🇪', '+254', 'Africa',
 ARRAY['mpesa', 'credit_card', 'bank_transfer'], ARRAY['en', 'sw'], 'en',
 'Africa/Nairobi', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('LS', 'Lesotho', 'Lesotho', 'LSL', 18.5, '🇱🇸', '+266', 'Africa',
 ARRAY['bank_transfer'], ARRAY['en', 'st'], 'en',
 'Africa/Maseru', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('LR', 'Liberia', 'Liberia', 'LRD', 190.0, '🇱🇷', '+231', 'Africa',
 ARRAY['mobile_money', 'bank_transfer'], ARRAY['en'], 'en',
 'Africa/Monrovia', 'MM/DD/YYYY', 2, ',', '.', 'before', false, true, true, true),

('LY', 'Libya', 'Libya', 'LYD', 4.8, '🇱🇾', '+218', 'Africa',
 ARRAY['bank_transfer'], ARRAY['ar'], 'ar',
 'Africa/Tripoli', 'DD/MM/YYYY', 3, ',', '.', 'after', true, true, true, true),

('MG', 'Madagascar', 'Madagascar', 'MGA', 4600.0, '🇲🇬', '+261', 'Africa',
 ARRAY['mobile_money', 'bank_transfer'], ARRAY['mg', 'fr'], 'mg',
 'Indian/Antananarivo', 'DD/MM/YYYY', 2, ' ', ',', 'after', true, true, true, true),

('MW', 'Malawi', 'Malawi', 'MWK', 1750.0, '🇲🇼', '+265', 'Africa',
 ARRAY['mobile_money', 'bank_transfer'], ARRAY['en'], 'en',
 'Africa/Blantyre', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('ML', 'Mali', 'Mali', 'XOF', 600.0, '🇲🇱', '+223', 'Africa',
 ARRAY['mobile_money', 'bank_transfer'], ARRAY['fr'], 'fr',
 'Africa/Bamako', 'DD/MM/YYYY', 0, ' ', ',', 'after', true, true, true, true),

('MR', 'Mauritania', 'Mauritania', 'MRU', 40.0, '🇲🇷', '+222', 'Africa',
 ARRAY['bank_transfer'], ARRAY['ar'], 'ar',
 'Africa/Nouakchott', 'DD/MM/YYYY', 2, ',', '.', 'after', true, true, true, true),

('MU', 'Mauritius', 'Mauritius', 'MUR', 46.0, '🇲🇺', '+230', 'Africa',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['en', 'fr'], 'en',
 'Indian/Mauritius', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('MA', 'Morocco', 'Morocco', 'MAD', 10.0, '🇲🇦', '+212', 'Africa',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['ar', 'fr'], 'ar',
 'Africa/Casablanca', 'DD/MM/YYYY', 2, ' ', ',', 'after', true, true, true, true),

('MZ', 'Mozambique', 'Mozambique', 'MZN', 64.0, '🇲🇿', '+258', 'Africa',
 ARRAY['mobile_money', 'bank_transfer'], ARRAY['pt'], 'pt',
 'Africa/Maputo', 'DD/MM/YYYY', 2, '.', ',', 'after', true, true, true, true),

('NA', 'Namibia', 'Namibia', 'NAD', 18.5, '🇳🇦', '+264', 'Africa',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['en'], 'en',
 'Africa/Windhoek', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('NE', 'Niger', 'Niger', 'XOF', 600.0, '🇳🇪', '+227', 'Africa',
 ARRAY['mobile_money', 'bank_transfer'], ARRAY['fr'], 'fr',
 'Africa/Niamey', 'DD/MM/YYYY', 0, ' ', ',', 'after', true, true, true, true),

('NG', 'Nigeria', 'Nigeria', 'NGN', 1500.0, '🇳🇬', '+234', 'Africa',
 ARRAY['credit_card', 'bank_transfer', 'mobile_money'], ARRAY['en'], 'en',
 'Africa/Lagos', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('RW', 'Rwanda', 'Rwanda', 'RWF', 1300.0, '🇷🇼', '+250', 'Africa',
 ARRAY['mobile_money', 'bank_transfer'], ARRAY['rw', 'en', 'fr'], 'rw',
 'Africa/Kigali', 'DD/MM/YYYY', 0, ' ', ',', 'after', true, true, true, true),

('SN', 'Senegal', 'Senegal', 'XOF', 600.0, '🇸🇳', '+221', 'Africa',
 ARRAY['mobile_money', 'bank_transfer'], ARRAY['fr'], 'fr',
 'Africa/Dakar', 'DD/MM/YYYY', 0, ' ', ',', 'after', true, true, true, true),

('SC', 'Seychelles', 'Seychelles', 'SCR', 14.0, '🇸🇨', '+248', 'Africa',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['en', 'fr'], 'en',
 'Indian/Mahe', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('SL', 'Sierra Leone', 'Sierra Leone', 'SLE', 23.0, '🇸🇱', '+232', 'Africa',
 ARRAY['mobile_money', 'bank_transfer'], ARRAY['en'], 'en',
 'Africa/Freetown', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('SO', 'Somalia', 'Somalia', 'SOS', 580.0, '🇸🇴', '+252', 'Africa',
 ARRAY['mobile_money', 'bank_transfer'], ARRAY['so', 'ar'], 'so',
 'Africa/Mogadishu', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('SD', 'Sudan', 'Sudan', 'SDG', 600.0, '🇸🇩', '+249', 'Africa',
 ARRAY['bank_transfer'], ARRAY['ar', 'en'], 'ar',
 'Africa/Khartoum', 'DD/MM/YYYY', 2, ',', '.', 'after', true, true, true, true),

('TZ', 'Tanzania', 'Tanzania', 'TZS', 2500.0, '🇹🇿', '+255', 'Africa',
 ARRAY['mobile_money', 'bank_transfer'], ARRAY['sw', 'en'], 'sw',
 'Africa/Dar_es_Salaam', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('TG', 'Togo', 'Togo', 'XOF', 600.0, '🇹🇬', '+228', 'Africa',
 ARRAY['mobile_money', 'bank_transfer'], ARRAY['fr'], 'fr',
 'Africa/Lome', 'DD/MM/YYYY', 0, ' ', ',', 'after', true, true, true, true),

('TN', 'Tunisia', 'Tunisia', 'TND', 3.1, '🇹🇳', '+216', 'Africa',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['ar'], 'ar',
 'Africa/Tunis', 'DD/MM/YYYY', 3, ',', '.', 'after', true, true, true, true),

('UG', 'Uganda', 'Uganda', 'UGX', 3700.0, '🇺🇬', '+256', 'Africa',
 ARRAY['mobile_money', 'bank_transfer'], ARRAY['en'], 'en',
 'Africa/Kampala', 'DD/MM/YYYY', 0, ',', '.', 'before', false, true, true, true),

('ZM', 'Zambia', 'Zambia', 'ZMW', 27.0, '🇿🇲', '+260', 'Africa',
 ARRAY['mobile_money', 'bank_transfer'], ARRAY['en'], 'en',
 'Africa/Lusaka', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('ZW', 'Zimbabwe', 'Zimbabwe', 'ZWL', 360.0, '🇿🇼', '+263', 'Africa',
 ARRAY['mobile_money', 'bank_transfer'], ARRAY['en'], 'en',
 'Africa/Harare', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

-- Asia (remaining countries)
('AF', 'Afghanistan', 'Afghanistan', 'AFN', 90.0, '🇦🇫', '+93', 'Asia',
 ARRAY['bank_transfer'], ARRAY['ps', 'fa'], 'ps',
 'Asia/Kabul', 'DD/MM/YYYY', 2, ',', '.', 'after', true, true, true, true),

('AM', 'Armenia', 'Armenia', 'AMD', 400.0, '🇦🇲', '+374', 'Asia',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['hy'], 'hy',
 'Asia/Yerevan', 'DD.MM.YYYY', 2, ' ', ',', 'after', true, true, true, true),

('AZ', 'Azerbaijan', 'Azerbaijan', 'AZN', 1.7, '🇦🇿', '+994', 'Asia',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['az'], 'az',
 'Asia/Baku', 'DD.MM.YYYY', 2, ' ', ',', 'before', true, true, true, true),

('BH', 'Bahrain', 'Bahrain', 'BHD', 0.377, '🇧🇭', '+973', 'Asia',
 ARRAY['credit_card', 'benefitpay', 'bank_transfer'], ARRAY['ar'], 'ar',
 'Asia/Bahrain', 'DD/MM/YYYY', 3, ',', '.', 'after', true, true, true, true),

('BD', 'Bangladesh', 'Bangladesh', 'BDT', 120.0, '🇧🇩', '+880', 'Asia',
 ARRAY['bkash', 'credit_card', 'bank_transfer'], ARRAY['bn'], 'bn',
 'Asia/Dhaka', 'DD/MM/YYYY', 2, ',', '.', 'before', true, true, true, true),

('BT', 'Bhutan', 'Bhutan', 'BTN', 83.0, '🇧🇹', '+975', 'Asia',
 ARRAY['bank_transfer'], ARRAY['dz'], 'dz',
 'Asia/Thimphu', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('BN', 'Brunei', 'Brunei', 'BND', 1.35, '🇧🇳', '+673', 'Asia',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['ms'], 'ms',
 'Asia/Brunei', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('KH', 'Cambodia', 'Cambodia', 'KHR', 4100.0, '🇰🇭', '+855', 'Asia',
 ARRAY['credit_card', 'wing', 'bank_transfer'], ARRAY['km'], 'km',
 'Asia/Phnom_Penh', 'DD/MM/YYYY', 2, ',', '.', 'after', false, true, true, true),

('GE', 'Georgia', 'Georgia', 'GEL', 2.7, '🇬🇪', '+995', 'Asia',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['ka'], 'ka',
 'Asia/Tbilisi', 'DD/MM/YYYY', 2, ' ', ',', 'before', false, true, true, true),

('ID', 'Indonesia', 'Indonesia', 'IDR', 16000.0, '🇮🇩', '+62', 'Asia',
 ARRAY['credit_card', 'gopay', 'ovo', 'bank_transfer'], ARRAY['id'], 'id',
 'Asia/Jakarta', 'DD/MM/YYYY', 2, '.', ',', 'before', true, true, true, true),

('IR', 'Iran', 'Iran', 'IRR', 42000.0, '🇮🇷', '+98', 'Asia',
 ARRAY['bank_transfer'], ARRAY['fa'], 'fa',
 'Asia/Tehran', 'DD/MM/YYYY', 2, ',', '.', 'before', true, true, false, true),

('IQ', 'Iraq', 'Iraq', 'IQD', 1460.0, '🇮🇶', '+964', 'Asia',
 ARRAY['bank_transfer'], ARRAY['ar', 'ku'], 'ar',
 'Asia/Baghdad', 'DD/MM/YYYY', 3, ',', '.', 'after', true, true, true, true),

('IL', 'Israel', 'Israel', 'ILS', 3.7, '🇮🇱', '+972', 'Asia',
 ARRAY['credit_card', 'bit', 'bank_transfer'], ARRAY['he', 'ar'], 'he',
 'Asia/Jerusalem', 'DD/MM/YYYY', 2, ',', '.', 'before', true, true, true, true),

('JP', 'Japan', 'Japan', 'JPY', 155.0, '🇯🇵', '+81', 'Asia',
 ARRAY['credit_card', 'konbini', 'paypay', 'bank_transfer'], ARRAY['ja'], 'ja',
 'Asia/Tokyo', 'YYYY-MM-DD', 0, ',', '.', 'before', true, true, true, true),

('JO', 'Jordan', 'Jordan', 'JOD', 0.709, '🇯🇴', '+962', 'Asia',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['ar'], 'ar',
 'Asia/Amman', 'DD/MM/YYYY', 3, ',', '.', 'after', true, true, true, true),

('KZ', 'Kazakhstan', 'Kazakhstan', 'KZT', 475.0, '🇰🇿', '+7', 'Asia',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['kk', 'ru'], 'kk',
 'Asia/Almaty', 'DD.MM.YYYY', 2, ' ', ',', 'after', true, true, true, true),

('KW', 'Kuwait', 'Kuwait', 'KWD', 0.308, '🇰🇼', '+965', 'Asia',
 ARRAY['credit_card', 'knet', 'bank_transfer'], ARRAY['ar'], 'ar',
 'Asia/Kuwait', 'DD/MM/YYYY', 3, ',', '.', 'after', true, true, true, true),

('KG', 'Kyrgyzstan', 'Kyrgyzstan', 'KGS', 89.0, '🇰🇬', '+996', 'Asia',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['ky', 'ru'], 'ky',
 'Asia/Bishkek', 'DD.MM.YYYY', 2, ' ', ',', 'after', true, true, true, true),

('LA', 'Laos', 'Laos', 'LAK', 22000.0, '🇱🇦', '+856', 'Asia',
 ARRAY['bank_transfer'], ARRAY['lo'], 'lo',
 'Asia/Vientiane', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('LB', 'Lebanon', 'Lebanon', 'LBP', 89500.0, '🇱🇧', '+961', 'Asia',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['ar'], 'ar',
 'Asia/Beirut', 'DD/MM/YYYY', 2, ',', '.', 'after', true, true, true, true),

('MO', 'Macao', 'Macao', 'MOP', 8.0, '🇲🇴', '+853', 'Asia',
 ARRAY['credit_card', 'alipay', 'bank_transfer'], ARRAY['zh', 'pt'], 'zh',
 'Asia/Macau', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('MV', 'Maldives', 'Maldives', 'MVR', 15.4, '🇲🇻', '+960', 'Asia',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['dv'], 'dv',
 'Indian/Maldives', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('MN', 'Mongolia', 'Mongolia', 'MNT', 3450.0, '🇲🇳', '+976', 'Asia',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['mn'], 'mn',
 'Asia/Ulaanbaatar', 'YYYY-MM-DD', 2, ',', '.', 'before', true, true, true, true),

('MM', 'Myanmar', 'Myanmar', 'MMK', 2100.0, '🇲🇲', '+95', 'Asia',
 ARRAY['wavepay', 'kbzpay', 'bank_transfer'], ARRAY['my'], 'my',
 'Asia/Yangon', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('KP', 'North Korea', 'North Korea', 'KPW', 900.0, '🇰🇵', '+850', 'Asia',
 ARRAY['bank_transfer'], ARRAY['ko'], 'ko',
 'Asia/Pyongyang', 'YYYY-MM-DD', 2, ',', '.', 'before', true, false, false, true),

('OM', 'Oman', 'Oman', 'OMR', 0.385, '🇴🇲', '+968', 'Asia',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['ar'], 'ar',
 'Asia/Muscat', 'DD/MM/YYYY', 3, ',', '.', 'after', true, true, true, true),

('PK', 'Pakistan', 'Pakistan', 'PKR', 280.0, '🇵🇰', '+92', 'Asia',
 ARRAY['credit_card', 'easypaisa', 'jazzcash', 'bank_transfer'], ARRAY['ur', 'en'], 'ur',
 'Asia/Karachi', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('PS', 'Palestine', 'Palestine', 'ILS', 3.7, '🇵🇸', '+970', 'Asia',
 ARRAY['bank_transfer'], ARRAY['ar'], 'ar',
 'Asia/Gaza', 'DD/MM/YYYY', 2, ',', '.', 'before', true, true, true, true),

('PH', 'Philippines', 'Philippines', 'PHP', 58.0, '🇵🇭', '+63', 'Asia',
 ARRAY['credit_card', 'gcash', 'paymaya', 'bank_transfer'], ARRAY['en', 'tl'], 'en',
 'Asia/Manila', 'MM/DD/YYYY', 2, ',', '.', 'before', false, true, true, true),

('QA', 'Qatar', 'Qatar', 'QAR', 3.64, '🇶🇦', '+974', 'Asia',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['ar'], 'ar',
 'Asia/Qatar', 'DD/MM/YYYY', 2, ',', '.', 'after', true, true, true, true),

('LK', 'Sri Lanka', 'Sri Lanka', 'LKR', 320.0, '🇱🇰', '+94', 'Asia',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['si', 'ta'], 'si',
 'Asia/Colombo', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('SY', 'Syria', 'Syria', 'SYP', 13000.0, '🇸🇾', '+963', 'Asia',
 ARRAY['bank_transfer'], ARRAY['ar'], 'ar',
 'Asia/Damascus', 'DD/MM/YYYY', 2, ',', '.', 'after', true, true, false, true),

('TJ', 'Tajikistan', 'Tajikistan', 'TJS', 11.0, '🇹🇯', '+992', 'Asia',
 ARRAY['bank_transfer'], ARRAY['tg'], 'tg',
 'Asia/Dushanbe', 'DD.MM.YYYY', 2, ' ', ',', 'after', true, true, true, true),

('TL', 'Timor-Leste', 'Timor-Leste', 'USD', 1.0, '🇹🇱', '+670', 'Asia',
 ARRAY['bank_transfer'], ARRAY['pt', 'tet'], 'pt',
 'Asia/Dili', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('TM', 'Turkmenistan', 'Turkmenistan', 'TMT', 3.5, '🇹🇲', '+993', 'Asia',
 ARRAY['bank_transfer'], ARRAY['tk'], 'tk',
 'Asia/Ashgabat', 'DD.MM.YYYY', 2, ' ', ',', 'after', true, true, true, true),

('UZ', 'Uzbekistan', 'Uzbekistan', 'UZS', 12500.0, '🇺🇿', '+998', 'Asia',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['uz'], 'uz',
 'Asia/Tashkent', 'DD.MM.YYYY', 2, ' ', ',', 'after', true, true, true, true),

('VN', 'Vietnam', 'Vietnam', 'VND', 25000.0, '🇻🇳', '+84', 'Asia',
 ARRAY['credit_card', 'momo', 'zalopay', 'bank_transfer'], ARRAY['vi'], 'vi',
 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY', 0, '.', ',', 'after', false, true, true, true),

('YE', 'Yemen', 'Yemen', 'YER', 250.0, '🇾🇪', '+967', 'Asia',
 ARRAY['bank_transfer'], ARRAY['ar'], 'ar',
 'Asia/Aden', 'DD/MM/YYYY', 2, ',', '.', 'after', true, true, true, true),

-- Europe (remaining countries)
('AL', 'Albania', 'Albania', 'ALL', 100.0, '🇦🇱', '+355', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['sq'], 'sq',
 'Europe/Tirane', 'DD/MM/YYYY', 2, ' ', ',', 'after', true, true, true, true),

('AD', 'Andorra', 'Andorra', 'EUR', 0.92, '🇦🇩', '+376', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['ca'], 'ca',
 'Europe/Andorra', 'DD/MM/YYYY', 2, '.', ',', 'after', true, true, true, true),

('AT', 'Austria', 'Austria', 'EUR', 0.92, '🇦🇹', '+43', 'Europe',
 ARRAY['credit_card', 'paypal', 'sofort', 'bank_transfer'], ARRAY['de'], 'de',
 'Europe/Vienna', 'DD.MM.YYYY', 2, '.', ',', 'before', true, true, true, true),

('BY', 'Belarus', 'Belarus', 'BYN', 3.3, '🇧🇾', '+375', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['be', 'ru'], 'be',
 'Europe/Minsk', 'DD.MM.YYYY', 2, ' ', ',', 'after', true, true, true, true),

('BE', 'Belgium', 'Belgium', 'EUR', 0.92, '🇧🇪', '+32', 'Europe',
 ARRAY['credit_card', 'bancontact', 'paypal', 'bank_transfer'], ARRAY['nl', 'fr', 'de'], 'nl',
 'Europe/Brussels', 'DD/MM/YYYY', 2, '.', ',', 'before', true, true, true, true),

('BA', 'Bosnia and Herzegovina', 'Bosnia and Herzegovina', 'BAM', 1.8, '🇧🇦', '+387', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['bs', 'hr', 'sr'], 'bs',
 'Europe/Sarajevo', 'DD.MM.YYYY', 2, '.', ',', 'after', true, true, true, true),

('BG', 'Bulgaria', 'Bulgaria', 'BGN', 1.8, '🇧🇬', '+359', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['bg'], 'bg',
 'Europe/Sofia', 'DD.MM.YYYY', 2, ' ', ',', 'after', true, true, true, true),

('HR', 'Croatia', 'Croatia', 'EUR', 0.92, '🇭🇷', '+385', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['hr'], 'hr',
 'Europe/Zagreb', 'DD.MM.YYYY', 2, '.', ',', 'after', true, true, true, true),

('CY', 'Cyprus', 'Cyprus', 'EUR', 0.92, '🇨🇾', '+357', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['el', 'tr'], 'el',
 'Asia/Nicosia', 'DD/MM/YYYY', 2, '.', ',', 'before', true, true, true, true),

('CZ', 'Czech Republic', 'Czech Republic', 'CZK', 23.0, '🇨🇿', '+420', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['cs'], 'cs',
 'Europe/Prague', 'DD.MM.YYYY', 2, ' ', ',', 'after', true, true, true, true),

('EE', 'Estonia', 'Estonia', 'EUR', 0.92, '🇪🇪', '+372', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['et'], 'et',
 'Europe/Tallinn', 'DD.MM.YYYY', 2, ' ', ',', 'after', true, true, true, true),

('FI', 'Finland', 'Finland', 'EUR', 0.92, '🇫🇮', '+358', 'Europe',
 ARRAY['credit_card', 'paypal', 'bank_transfer'], ARRAY['fi', 'sv'], 'fi',
 'Europe/Helsinki', 'DD.MM.YYYY', 2, ' ', ',', 'after', true, true, true, true),

('GR', 'Greece', 'Greece', 'EUR', 0.92, '🇬🇷', '+30', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['el'], 'el',
 'Europe/Athens', 'DD/MM/YYYY', 2, '.', ',', 'after', true, true, true, true),

('HU', 'Hungary', 'Hungary', 'HUF', 360.0, '🇭🇺', '+36', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['hu'], 'hu',
 'Europe/Budapest', 'YYYY-MM-DD', 2, ' ', ',', 'after', true, true, true, true),

('IS', 'Iceland', 'Iceland', 'ISK', 140.0, '🇮🇸', '+354', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['is'], 'is',
 'Atlantic/Reykjavik', 'DD.MM.YYYY', 0, '.', ',', 'after', true, true, true, true),

('IE', 'Ireland', 'Ireland', 'EUR', 0.92, '🇮🇪', '+353', 'Europe',
 ARRAY['credit_card', 'paypal', 'bank_transfer'], ARRAY['en', 'ga'], 'en',
 'Europe/Dublin', 'DD/MM/YYYY', 2, ',', '.', 'before', true, true, true, true),

('XK', 'Kosovo', 'Kosovo', 'EUR', 0.92, '🇽🇰', '+383', 'Europe',
 ARRAY['bank_transfer'], ARRAY['sq', 'sr'], 'sq',
 'Europe/Belgrade', 'DD.MM.YYYY', 2, '.', ',', 'after', true, true, true, true),

('LV', 'Latvia', 'Latvia', 'EUR', 0.92, '🇱🇻', '+371', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['lv'], 'lv',
 'Europe/Riga', 'DD.MM.YYYY', 2, ' ', ',', 'before', true, true, true, true),

('LI', 'Liechtenstein', 'Liechtenstein', 'CHF', 0.89, '🇱🇮', '+423', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['de'], 'de',
 'Europe/Vaduz', 'DD.MM.YYYY', 2, '''', '.', 'before', true, true, true, true),

('LT', 'Lithuania', 'Lithuania', 'EUR', 0.92, '🇱🇹', '+370', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['lt'], 'lt',
 'Europe/Vilnius', 'YYYY-MM-DD', 2, ' ', ',', 'after', true, true, true, true),

('LU', 'Luxembourg', 'Luxembourg', 'EUR', 0.92, '🇱🇺', '+352', 'Europe',
 ARRAY['credit_card', 'paypal', 'bank_transfer'], ARRAY['lb', 'fr', 'de'], 'lb',
 'Europe/Luxembourg', 'DD.MM.YYYY', 2, '.', ',', 'after', true, true, true, true),

('MT', 'Malta', 'Malta', 'EUR', 0.92, '🇲🇹', '+356', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['mt', 'en'], 'mt',
 'Europe/Malta', 'DD/MM/YYYY', 2, ',', '.', 'before', true, true, true, true),

('MD', 'Moldova', 'Moldova', 'MDL', 18.0, '🇲🇩', '+373', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['ro'], 'ro',
 'Europe/Chisinau', 'DD.MM.YYYY', 2, ' ', ',', 'after', true, true, true, true),

('MC', 'Monaco', 'Monaco', 'EUR', 0.92, '🇲🇨', '+377', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['fr'], 'fr',
 'Europe/Monaco', 'DD/MM/YYYY', 2, ' ', ',', 'after', true, true, true, true),

('ME', 'Montenegro', 'Montenegro', 'EUR', 0.92, '🇲🇪', '+382', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['sr'], 'sr',
 'Europe/Podgorica', 'DD.MM.YYYY', 2, '.', ',', 'after', true, true, true, true),

('MK', 'North Macedonia', 'North Macedonia', 'MKD', 56.0, '🇲🇰', '+389', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['mk'], 'mk',
 'Europe/Skopje', 'DD.MM.YYYY', 2, '.', ',', 'after', true, true, true, true),

('PL', 'Poland', 'Poland', 'PLN', 4.0, '🇵🇱', '+48', 'Europe',
 ARRAY['credit_card', 'blik', 'przelewy24', 'bank_transfer'], ARRAY['pl'], 'pl',
 'Europe/Warsaw', 'DD.MM.YYYY', 2, ' ', ',', 'after', true, true, true, true),

('PT', 'Portugal', 'Portugal', 'EUR', 0.92, '🇵🇹', '+351', 'Europe',
 ARRAY['credit_card', 'multibanco', 'mbway', 'bank_transfer'], ARRAY['pt'], 'pt',
 'Europe/Lisbon', 'DD/MM/YYYY', 2, ' ', ',', 'after', true, true, true, true),

('RO', 'Romania', 'Romania', 'RON', 4.6, '🇷🇴', '+40', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['ro'], 'ro',
 'Europe/Bucharest', 'DD.MM.YYYY', 2, '.', ',', 'after', true, true, true, true),

('SM', 'San Marino', 'San Marino', 'EUR', 0.92, '🇸🇲', '+378', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['it'], 'it',
 'Europe/San_Marino', 'DD/MM/YYYY', 2, '.', ',', 'after', true, true, true, true),

('RS', 'Serbia', 'Serbia', 'RSD', 107.0, '🇷🇸', '+381', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['sr'], 'sr',
 'Europe/Belgrade', 'DD.MM.YYYY', 2, '.', ',', 'after', true, true, true, true),

('SK', 'Slovakia', 'Slovakia', 'EUR', 0.92, '🇸🇰', '+421', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['sk'], 'sk',
 'Europe/Bratislava', 'DD.MM.YYYY', 2, ' ', ',', 'after', true, true, true, true),

('SI', 'Slovenia', 'Slovenia', 'EUR', 0.92, '🇸🇮', '+386', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['sl'], 'sl',
 'Europe/Ljubljana', 'DD.MM.YYYY', 2, '.', ',', 'after', true, true, true, true),

('TR', 'Turkey', 'Turkey', 'TRY', 34.0, '🇹🇷', '+90', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['tr'], 'tr',
 'Europe/Istanbul', 'DD.MM.YYYY', 2, '.', ',', 'before', true, true, true, true),

('UA', 'Ukraine', 'Ukraine', 'UAH', 41.0, '🇺🇦', '+380', 'Europe',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['uk'], 'uk',
 'Europe/Kiev', 'DD.MM.YYYY', 2, ' ', ',', 'after', false, true, true, true),

('GB', 'United Kingdom', 'United Kingdom', 'GBP', 0.79, '🇬🇧', '+44', 'Europe',
 ARRAY['credit_card', 'paypal', 'apple_pay', 'google_pay', 'bank_transfer'], ARRAY['en'], 'en',
 'Europe/London', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('VA', 'Vatican City', 'Vatican City', 'EUR', 0.92, '🇻🇦', '+379', 'Europe',
 ARRAY['bank_transfer'], ARRAY['it', 'la'], 'it',
 'Europe/Vatican', 'DD/MM/YYYY', 2, '.', ',', 'after', true, true, true, true),

-- North America (remaining countries)
('AG', 'Antigua and Barbuda', 'Antigua and Barbuda', 'XCD', 2.7, '🇦🇬', '+1-268', 'North America',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['en'], 'en',
 'America/Antigua', 'MM/DD/YYYY', 2, ',', '.', 'before', false, true, true, true),

('BS', 'Bahamas', 'Bahamas', 'BSD', 1.0, '🇧🇸', '+1-242', 'North America',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['en'], 'en',
 'America/Nassau', 'MM/DD/YYYY', 2, ',', '.', 'before', false, true, true, true),

('BB', 'Barbados', 'Barbados', 'BBD', 2.0, '🇧🇧', '+1-246', 'North America',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['en'], 'en',
 'America/Barbados', 'MM/DD/YYYY', 2, ',', '.', 'before', false, true, true, true),

('BZ', 'Belize', 'Belize', 'BZD', 2.0, '🇧🇿', '+501', 'North America',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['en'], 'en',
 'America/Belize', 'MM/DD/YYYY', 2, ',', '.', 'before', false, true, true, true),

('CR', 'Costa Rica', 'Costa Rica', 'CRC', 530.0, '🇨🇷', '+506', 'North America',
 ARRAY['credit_card', 'sinpe', 'bank_transfer'], ARRAY['es'], 'es',
 'America/Costa_Rica', 'DD/MM/YYYY', 2, '.', ',', 'before', true, true, true, true),

('CU', 'Cuba', 'Cuba', 'CUP', 24.0, '🇨🇺', '+53', 'North America',
 ARRAY['bank_transfer'], ARRAY['es'], 'es',
 'America/Havana', 'DD/MM/YYYY', 2, ',', '.', 'before', false, false, false, true),

('DM', 'Dominica', 'Dominica', 'XCD', 2.7, '🇩🇲', '+1-767', 'North America',
 ARRAY['bank_transfer'], ARRAY['en'], 'en',
 'America/Dominica', 'MM/DD/YYYY', 2, ',', '.', 'before', false, true, true, true),

('DO', 'Dominican Republic', 'Dominican Republic', 'DOP', 60.0, '🇩🇴', '+1-809', 'North America',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['es'], 'es',
 'America/Santo_Domingo', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('SV', 'El Salvador', 'El Salvador', 'USD', 1.0, '🇸🇻', '+503', 'North America',
 ARRAY['credit_card', 'bitcoin', 'bank_transfer'], ARRAY['es'], 'es',
 'America/El_Salvador', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('GD', 'Grenada', 'Grenada', 'XCD', 2.7, '🇬🇩', '+1-473', 'North America',
 ARRAY['bank_transfer'], ARRAY['en'], 'en',
 'America/Grenada', 'MM/DD/YYYY', 2, ',', '.', 'before', false, true, true, true),

('GT', 'Guatemala', 'Guatemala', 'GTQ', 7.8, '🇬🇹', '+502', 'North America',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['es'], 'es',
 'America/Guatemala', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('HT', 'Haiti', 'Haiti', 'HTG', 145.0, '🇭🇹', '+509', 'North America',
 ARRAY['mobile_money', 'bank_transfer'], ARRAY['fr', 'ht'], 'fr',
 'America/Port-au-Prince', 'DD/MM/YYYY', 2, ' ', ',', 'after', true, true, true, true),

('HN', 'Honduras', 'Honduras', 'HNL', 25.0, '🇭🇳', '+504', 'North America',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['es'], 'es',
 'America/Tegucigalpa', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('JM', 'Jamaica', 'Jamaica', 'JMD', 155.0, '🇯🇲', '+1-876', 'North America',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['en'], 'en',
 'America/Jamaica', 'MM/DD/YYYY', 2, ',', '.', 'before', false, true, true, true),

('NI', 'Nicaragua', 'Nicaragua', 'NIO', 37.0, '🇳🇮', '+505', 'North America',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['es'], 'es',
 'America/Managua', 'DD/MM/YYYY', 2, ',', '.', 'before', true, true, true, true),

('PA', 'Panama', 'Panama', 'PAB', 1.0, '🇵🇦', '+507', 'North America',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['es'], 'es',
 'America/Panama', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('KN', 'Saint Kitts and Nevis', 'Saint Kitts and Nevis', 'XCD', 2.7, '🇰🇳', '+1-869', 'North America',
 ARRAY['bank_transfer'], ARRAY['en'], 'en',
 'America/St_Kitts', 'MM/DD/YYYY', 2, ',', '.', 'before', false, true, true, true),

('LC', 'Saint Lucia', 'Saint Lucia', 'XCD', 2.7, '🇱🇨', '+1-758', 'North America',
 ARRAY['bank_transfer'], ARRAY['en'], 'en',
 'America/St_Lucia', 'MM/DD/YYYY', 2, ',', '.', 'before', false, true, true, true),

('VC', 'Saint Vincent and the Grenadines', 'Saint Vincent and the Grenadines', 'XCD', 2.7, '🇻🇨', '+1-784', 'North America',
 ARRAY['bank_transfer'], ARRAY['en'], 'en',
 'America/St_Vincent', 'MM/DD/YYYY', 2, ',', '.', 'before', false, true, true, true),

('TT', 'Trinidad and Tobago', 'Trinidad and Tobago', 'TTD', 6.8, '🇹🇹', '+1-868', 'North America',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['en'], 'en',
 'America/Port_of_Spain', 'MM/DD/YYYY', 2, ',', '.', 'before', false, true, true, true),

-- South America (remaining countries)
('BO', 'Bolivia', 'Bolivia', 'BOB', 6.9, '🇧🇴', '+591', 'South America',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['es', 'qu', 'ay'], 'es',
 'America/La_Paz', 'DD/MM/YYYY', 2, '.', ',', 'before', false, true, true, true),

('CO', 'Colombia', 'Colombia', 'COP', 4000.0, '🇨🇴', '+57', 'South America',
 ARRAY['credit_card', 'pse', 'nequi', 'bank_transfer'], ARRAY['es'], 'es',
 'America/Bogota', 'DD/MM/YYYY', 2, '.', ',', 'before', false, true, true, true),

('EC', 'Ecuador', 'Ecuador', 'USD', 1.0, '🇪🇨', '+593', 'South America',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['es'], 'es',
 'America/Guayaquil', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('GF', 'French Guiana', 'French Guiana', 'EUR', 0.92, '🇬🇫', '+594', 'South America',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['fr'], 'fr',
 'America/Cayenne', 'DD/MM/YYYY', 2, ' ', ',', 'after', true, true, true, true),

('GY', 'Guyana', 'Guyana', 'GYD', 210.0, '🇬🇾', '+592', 'South America',
 ARRAY['bank_transfer'], ARRAY['en'], 'en',
 'America/Guyana', 'MM/DD/YYYY', 2, ',', '.', 'before', false, true, true, true),

('PY', 'Paraguay', 'Paraguay', 'PYG', 7300.0, '🇵🇾', '+595', 'South America',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['es', 'gn'], 'es',
 'America/Asuncion', 'DD/MM/YYYY', 0, '.', ',', 'before', true, true, true, true),

('PE', 'Peru', 'Peru', 'PEN', 3.8, '🇵🇪', '+51', 'South America',
 ARRAY['credit_card', 'yape', 'plin', 'bank_transfer'], ARRAY['es'], 'es',
 'America/Lima', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('SR', 'Suriname', 'Suriname', 'SRD', 32.0, '🇸🇷', '+597', 'South America',
 ARRAY['bank_transfer'], ARRAY['nl'], 'nl',
 'America/Paramaribo', 'DD/MM/YYYY', 2, '.', ',', 'before', false, true, true, true),

('UY', 'Uruguay', 'Uruguay', 'UYU', 40.0, '🇺🇾', '+598', 'South America',
 ARRAY['credit_card', 'mercadopago', 'bank_transfer'], ARRAY['es'], 'es',
 'America/Montevideo', 'DD/MM/YYYY', 2, '.', ',', 'before', false, true, true, true),

('VE', 'Venezuela', 'Venezuela', 'VES', 36.5, '🇻🇪', '+58', 'South America',
 ARRAY['bank_transfer'], ARRAY['es'], 'es',
 'America/Caracas', 'DD/MM/YYYY', 2, '.', ',', 'before', false, true, false, true),

-- Oceania (remaining countries)
('AU', 'Australia', 'Australia', 'AUD', 1.55, '🇦🇺', '+61', 'Oceania',
 ARRAY['credit_card', 'paypal', 'afterpay', 'bank_transfer'], ARRAY['en'], 'en',
 'Australia/Sydney', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('FJ', 'Fiji', 'Fiji', 'FJD', 2.3, '🇫🇯', '+679', 'Oceania',
 ARRAY['credit_card', 'bank_transfer'], ARRAY['en', 'fj'], 'en',
 'Pacific/Fiji', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('KI', 'Kiribati', 'Kiribati', 'AUD', 1.55, '🇰🇮', '+686', 'Oceania',
 ARRAY['bank_transfer'], ARRAY['en'], 'en',
 'Pacific/Tarawa', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('MH', 'Marshall Islands', 'Marshall Islands', 'USD', 1.0, '🇲🇭', '+692', 'Oceania',
 ARRAY['bank_transfer'], ARRAY['en', 'mh'], 'en',
 'Pacific/Majuro', 'MM/DD/YYYY', 2, ',', '.', 'before', false, true, true, true),

('FM', 'Micronesia', 'Micronesia', 'USD', 1.0, '🇫🇲', '+691', 'Oceania',
 ARRAY['bank_transfer'], ARRAY['en'], 'en',
 'Pacific/Pohnpei', 'MM/DD/YYYY', 2, ',', '.', 'before', false, true, true, true),

('NR', 'Nauru', 'Nauru', 'AUD', 1.55, '🇳🇷', '+674', 'Oceania',
 ARRAY['bank_transfer'], ARRAY['na', 'en'], 'en',
 'Pacific/Nauru', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('PW', 'Palau', 'Palau', 'USD', 1.0, '🇵🇼', '+680', 'Oceania',
 ARRAY['bank_transfer'], ARRAY['en'], 'en',
 'Pacific/Palau', 'MM/DD/YYYY', 2, ',', '.', 'before', false, true, true, true),

('PG', 'Papua New Guinea', 'Papua New Guinea', 'PGK', 3.7, '🇵🇬', '+675', 'Oceania',
 ARRAY['bank_transfer'], ARRAY['en'], 'en',
 'Pacific/Port_Moresby', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('WS', 'Samoa', 'Samoa', 'WST', 2.8, '🇼🇸', '+685', 'Oceania',
 ARRAY['bank_transfer'], ARRAY['sm', 'en'], 'en',
 'Pacific/Apia', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('SB', 'Solomon Islands', 'Solomon Islands', 'SBD', 8.5, '🇸🇧', '+677', 'Oceania',
 ARRAY['bank_transfer'], ARRAY['en'], 'en',
 'Pacific/Guadalcanal', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('TO', 'Tonga', 'Tonga', 'TOP', 2.4, '🇹🇴', '+676', 'Oceania',
 ARRAY['bank_transfer'], ARRAY['to', 'en'], 'to',
 'Pacific/Tongatapu', 'DD/MM/YYYY', 2, ',', '.', 'before', true, true, true, true),

('TV', 'Tuvalu', 'Tuvalu', 'AUD', 1.55, '🇹🇻', '+688', 'Oceania',
 ARRAY['bank_transfer'], ARRAY['tvl', 'en'], 'en',
 'Pacific/Funafuti', 'DD/MM/YYYY', 2, ',', '.', 'before', false, true, true, true),

('VU', 'Vanuatu', 'Vanuatu', 'VUV', 120.0, '🇻🇺', '+678', 'Oceania',
 ARRAY['bank_transfer'], ARRAY['bi', 'en', 'fr'], 'bi',
 'Pacific/Efate', 'DD/MM/YYYY', 0, ',', '.', 'before', true, true, true, true)

ON CONFLICT (code) DO UPDATE SET
    is_active = EXCLUDED.is_active,
    display_name = COALESCE(EXCLUDED.display_name, country_settings.display_name),
    phone_code = COALESCE(EXCLUDED.phone_code, country_settings.phone_code),
    flag_emoji = COALESCE(EXCLUDED.flag_emoji, country_settings.flag_emoji),
    continent = COALESCE(EXCLUDED.continent, country_settings.continent),
    popular_payment_methods = COALESCE(EXCLUDED.popular_payment_methods, country_settings.popular_payment_methods),
    timezone = COALESCE(EXCLUDED.timezone, country_settings.timezone),
    date_format = COALESCE(EXCLUDED.date_format, country_settings.date_format),
    languages = COALESCE(EXCLUDED.languages, country_settings.languages),
    default_language = COALESCE(EXCLUDED.default_language, country_settings.default_language),
    updated_at = now();