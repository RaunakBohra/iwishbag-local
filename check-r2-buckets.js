// Check Cloudflare R2 buckets using API
const fetch = require('node-fetch');

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
        console.log(`   Storage Class: ${bucket.storage_class || 'Standard'}`);
      });
      
      // Also get bucket details for each
      for (const bucket of data.result.buckets) {
        await getBucketDetails(accountId, apiToken, bucket.name);
      }
    } else {
      console.error('❌ Failed to list buckets:', data.errors);
    }
  } catch (error) {
    console.error('🔥 Error:', error.message);
  }
}

async function getBucketDetails(accountId, apiToken, bucketName) {
  try {
    // Get bucket usage
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucketName}/usage`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    if (data.success && data.result) {
      console.log(`\n   📊 Usage for ${bucketName}:`);
      console.log(`      Objects: ${data.result.objectCount || 0}`);
      console.log(`      Size: ${formatBytes(data.result.payloadSize || 0)}`);
    }
  } catch (error) {
    // Usage API might not be available for all buckets
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Run the check
listR2Buckets();