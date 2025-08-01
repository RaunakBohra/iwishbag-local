// Get the service role key for production Supabase
// You need to get this from your Supabase Dashboard

console.log(`
To get your Supabase Service Role Key:

1. Go to: https://supabase.com/dashboard/project/grgvlrvywsfmnmkxrecd/settings/api
2. Under "Project API keys", find "service_role (secret)"
3. Copy the key and run this command:

aws lambda update-function-configuration \\
  --function-name iwishbag-process-incoming-email \\
  --environment Variables="{SUPABASE_URL='https://grgvlrvywsfmnmkxrecd.supabase.co',SUPABASE_SERVICE_ROLE_KEY='YOUR_SERVICE_ROLE_KEY_HERE'}"

Replace YOUR_SERVICE_ROLE_KEY_HERE with the actual key from Supabase dashboard.
`);