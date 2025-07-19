-- Fix trigger function to use correct column name
-- The column is raw_user_meta_data, not user_metadata

-- Update the trigger function to use the correct column name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Call ensure_user_profile with OAuth metadata if available
  -- Use raw_user_meta_data instead of user_metadata
  PERFORM public.ensure_user_profile_with_oauth(NEW.id, NEW.raw_user_meta_data);
  
  RETURN NEW;
END;
$function$;