// Check Cloudflare R2 buckets using API
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function listR2Buckets() {
  const accountId = process.env.VITE_CLOUDFLARE_ACCOUNT_ID || '610762493d34333f1a6d72a037b345cf';
  const apiToken = process.env.VITE_CLOUDFLARE_API_TOKEN || '4Y_WjuGIEtTpK85hmE6XrGwbi85d8zN5Me0T_45l';
  
  console.log('🔍 Checking R2 buckets for account:', accountId);
  
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      console.log('\n✅ R2 Buckets found:');
      data.result.buckets.forEach(bucket => {
        console.log(`\n📦 Bucket: ${bucket.name}`);
        console.log(`   Created: ${new Date(bucket.creation_date).toLocaleDateString()}`);
        console.log(`   Location: ${bucket.location || 'auto'}`);
        
        // Get S3 API credentials endpoint
        console.log(`   S3 API endpoint: https://${accountId}.r2.cloudflarestorage.com/${bucket.name}`);
      });
      
      return data.result.buckets;
    } else {
      console.error('❌ Failed to list buckets:', data.errors);
    }
  } catch (error) {
    console.error('🔥 Error:', error.message);
  }
}

// Run the check
const buckets = await listR2Buckets();

// Show how to create R2 API token
console.log('\n📝 To get R2 API credentials:');
console.log('1. Go to: https://dash.cloudflare.com/?to=/:account/r2/api-tokens');
console.log('2. Click "Create API token"');
console.log('3. Select permissions and bucket');
console.log('4. Save the Access Key ID and Secret Access Key');