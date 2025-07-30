-- Remove ML (Machine Learning) weight estimation system tables and functions
-- This includes ml_category_weights, ml_product_weights, ml_training_history and related functions

-- Drop functions first (to avoid dependency issues)
DROP FUNCTION IF EXISTS public.update_category_weights() CASCADE;

-- Drop triggers that might reference the tables
DROP TRIGGER IF EXISTS update_category_weights_trigger ON public.ml_category_weights CASCADE;
DROP TRIGGER IF EXISTS update_product_weights_trigger ON public.ml_product_weights CASCADE;
DROP TRIGGER IF EXISTS update_training_history_trigger ON public.ml_training_history CASCADE;

-- Drop tables
DROP TABLE IF EXISTS public.ml_category_weights CASCADE;
DROP TABLE IF EXISTS public.ml_product_weights CASCADE;
DROP TABLE IF EXISTS public.ml_training_history CASCADE;

-- Note: ML weight estimation system was used for automatically predicting product weights
-- but has been replaced with simpler weight detection methods in the application logic.