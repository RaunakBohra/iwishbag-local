-- ===================================================================
-- PRE-PAYPAL INTEGRATION BACKUP
-- Created: $(date +"%Y-%m-%d %H:%M:%S")
-- ===================================================================

-- This backup captures the current state before PayPal integration
-- To restore: Run this file against your database

BEGIN;

-- Step 1: Create backup tables (these will persist if something goes wrong)
-- ===================================================================

-- Backup payment gateways
DROP TABLE IF EXISTS payment_gateways_pre_paypal;
CREATE TABLE payment_gateways_pre_paypal AS 
SELECT * FROM payment_gateways;

-- Backup country settings  
DROP TABLE IF EXISTS country_settings_pre_paypal;
CREATE TABLE country_settings_pre_paypal AS 
SELECT * FROM country_settings;

-- Backup profiles (payment columns only)
DROP TABLE IF EXISTS profiles_payment_pre_paypal;
CREATE TABLE profiles_payment_pre_paypal AS 
SELECT id, preferred_display_currency, cod_enabled, country 
FROM profiles;

-- Backup country payment preferences
DROP TABLE IF EXISTS country_payment_preferences_pre_paypal;
CREATE TABLE country_payment_preferences_pre_paypal AS 
SELECT * FROM country_payment_preferences;

COMMIT;

-- ===================================================================
-- ROLLBACK SCRIPT (Save this for emergency restore)
-- ===================================================================

/*
-- EMERGENCY ROLLBACK - Run this if PayPal integration fails
-- ===================================================================

BEGIN;

-- Restore payment gateways
DELETE FROM payment_gateways;
INSERT INTO payment_gateways SELECT * FROM payment_gateways_pre_paypal;

-- Restore country settings
DELETE FROM country_settings;  
INSERT INTO country_settings SELECT * FROM country_settings_pre_paypal;

-- Restore profile payment settings
UPDATE profiles SET 
    preferred_display_currency = backup.preferred_display_currency,
    cod_enabled = backup.cod_enabled,
    country = backup.country
FROM profiles_payment_pre_paypal backup 
WHERE profiles.id = backup.id;

-- Restore country payment preferences
DELETE FROM country_payment_preferences;
INSERT INTO country_payment_preferences SELECT * FROM country_payment_preferences_pre_paypal;

-- Remove any new columns that were added (if migration partially completed)
ALTER TABLE profiles DROP COLUMN IF EXISTS preferred_payment_gateway;
ALTER TABLE country_settings DROP COLUMN IF EXISTS available_gateways;
ALTER TABLE country_settings DROP COLUMN IF EXISTS default_gateway;
ALTER TABLE country_settings DROP COLUMN IF EXISTS gateway_config;

COMMIT;

-- Clean up backup tables after successful restore
DROP TABLE IF EXISTS payment_gateways_pre_paypal;
DROP TABLE IF EXISTS country_settings_pre_paypal;
DROP TABLE IF EXISTS profiles_payment_pre_paypal;
DROP TABLE IF EXISTS country_payment_preferences_pre_paypal;
*/