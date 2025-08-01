const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

// Test S3
async function testS3() {
  console.log('🧪 Testing S3...');
  
  const s3Client = new S3Client({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    // Test upload
    const testKey = `test/test-${Date.now()}.txt`;
    await s3Client.send(new PutObjectCommand({
      Bucket: 'iwishbag-emails',
      Key: testKey,
      Body: 'Hello from S3 test!',
    }));
    
    console.log('✅ S3 upload successful!');
    
    // Test read
    const getResult = await s3Client.send(new GetObjectCommand({
      Bucket: 'iwishbag-emails',
      Key: testKey,
    }));
    
    const content = await getResult.Body.transformToString();
    console.log('✅ S3 read successful:', content);
    
  } catch (error) {
    console.error('❌ S3 test failed:', error.message);
  }
}

// Test R2 (S3-compatible API)
async function testR2() {
  console.log('\n🧪 Testing R2...');
  
  const r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  try {
    // Test upload
    const testKey = `test/test-${Date.now()}.txt`;
    await r2Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'iwishbag-email-attachments',
      Key: testKey,
      Body: 'Hello from R2 test! Testing email attachments bucket.',
    }));
    
    console.log('✅ R2 upload successful!');
    console.log(`📎 Bucket: ${process.env.R2_BUCKET_NAME}`);
    console.log(`🔑 Key: ${testKey}`);
    
    // Test read
    const getResult = await r2Client.send(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'iwishbag-email-attachments',
      Key: testKey,
    }));
    
    const content = await getResult.Body.transformToString();
    console.log('✅ R2 read successful:', content);
    
  } catch (error) {
    console.error('❌ R2 test failed:', error.message);
  }
}

// Load environment variables
require('dotenv').config({ path: 'supabase/.env.local' });

// Run tests
async function runTests() {
  await testS3();
  await testR2();
}

runTests();