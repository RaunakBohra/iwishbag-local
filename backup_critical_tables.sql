-- ===================================================================
-- CRITICAL TABLES BACKUP - Before PayPal Integration
-- Generated: $(date)
-- ===================================================================
-- This file contains the current structure and data of critical tables
-- that will be modified during PayPal integration

-- Backup of payment_gateways table structure and data
-- ===================================================================
CREATE TABLE payment_gateways_backup AS SELECT * FROM payment_gateways;

-- Backup of country_settings table structure and data  
-- ===================================================================
CREATE TABLE country_settings_backup AS SELECT * FROM country_settings;

-- Backup of profiles table structure (only payment-related columns)
-- ===================================================================
CREATE TABLE profiles_payment_backup AS 
SELECT id, preferred_display_currency, cod_enabled, country 
FROM profiles;

-- Backup of country_payment_preferences table
-- ===================================================================
CREATE TABLE country_payment_preferences_backup AS 
SELECT * FROM country_payment_preferences;

-- Export current gateway configurations
-- ===================================================================
-- Current payment gateways
SELECT 'Current Payment Gateways:' as info;
SELECT code, name, is_active, supported_countries, supported_currencies, 
       fee_percent, fee_fixed, priority, test_mode 
FROM payment_gateways 
ORDER BY priority;

-- Current country settings (payment-related)
SELECT 'Current Country Payment Settings:' as info;
SELECT code, name, currency, payment_gateway, 
       payment_gateway_fixed_fee, payment_gateway_percent_fee
FROM country_settings 
ORDER BY code;

-- Current country payment preferences
SELECT 'Current Country Payment Preferences:' as info;
SELECT country_code, gateway_code, priority, is_active 
FROM country_payment_preferences 
ORDER BY country_code, priority;

-- Generate restore script
-- ===================================================================
SELECT '-- RESTORE SCRIPT (run if rollback needed):' as restore_instructions;
SELECT '-- DROP TABLE IF EXISTS payment_gateways; CREATE TABLE payment_gateways AS SELECT * FROM payment_gateways_backup;' as restore_payments;
SELECT '-- DROP TABLE IF EXISTS country_settings; CREATE TABLE country_settings AS SELECT * FROM country_settings_backup;' as restore_countries;
SELECT '-- UPDATE profiles SET preferred_display_currency = b.preferred_display_currency, cod_enabled = b.cod_enabled, country = b.country FROM profiles_payment_backup b WHERE profiles.id = b.id;' as restore_profiles;