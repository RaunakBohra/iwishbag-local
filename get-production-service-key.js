#!/usr/bin/env node

console.log(`
📋 To update your Lambda function with the correct Supabase Service Role Key:

1. Go to your Supabase Dashboard:
   👉 https://supabase.com/dashboard/project/grgvlrvywsfmnmkxrecd/settings/api

2. Under "Project API keys", find "service_role (secret)"
   ⚠️  This key starts with "eyJ..." and is very long

3. Copy the entire key and run this command:

aws lambda update-function-configuration \\
  --function-name iwishbag-process-incoming-email \\
  --environment Variables="{SUPABASE_URL='https://grgvlrvywsfmnmkxrecd.supabase.co',SUPABASE_SERVICE_ROLE_KEY='YOUR_SERVICE_ROLE_KEY_HERE'}"

Replace YOUR_SERVICE_ROLE_KEY_HERE with the actual key from Supabase dashboard.

📝 Note: The service role key is different from the anon key and has more permissions.
`);