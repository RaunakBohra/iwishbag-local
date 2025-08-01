#!/usr/bin/env npx tsx

import { promises as fs } from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

async function setupAWSCredentials() {
  console.log('🔧 AWS SES Credentials Setup\n');
  console.log('This script will help you configure AWS credentials for email sending.\n');
  
  console.log('Choose an option:');
  console.log('1. Add credentials to local .env file (for development)');
  console.log('2. Show instructions for Supabase Dashboard (for production)');
  console.log('3. Test with local email service (no AWS needed)\n');
  
  const choice = await question('Enter your choice (1-3): ');
  
  if (choice === '1') {
    console.log('\n📝 Setting up local credentials...\n');
    
    const accessKey = await question('Enter your AWS Access Key ID: ');
    const secretKey = await question('Enter your AWS Secret Access Key: ');
    const region = await question('Enter your AWS Region (default: us-east-1): ') || 'us-east-1';
    
    const envPath = path.join(process.cwd(), 'supabase', '.env.local');
    
    const envContent = `# Local environment variables for Edge Functions
# AWS SES Configuration
AWS_ACCESS_KEY_ID=${accessKey}
AWS_SECRET_ACCESS_KEY=${secretKey}
AWS_REGION=${region}
`;
    
    try {
      await fs.writeFile(envPath, envContent);
      console.log('\n✅ Credentials saved to supabase/.env.local');
      console.log('\n⚠️  Remember to:');
      console.log('1. Never commit these credentials to git');
      console.log('2. Restart Supabase: supabase stop && supabase start');
      console.log('3. Test email sending with: npx tsx src/scripts/test-ses-email.ts');
    } catch (error) {
      console.error('❌ Error writing file:', error);
    }
    
  } else if (choice === '2') {
    console.log('\n📚 Supabase Dashboard Instructions:\n');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to: Settings → Edge Functions → Secrets');
    console.log('3. Add these secrets:');
    console.log('   - AWS_ACCESS_KEY_ID');
    console.log('   - AWS_SECRET_ACCESS_KEY');
    console.log('   - AWS_REGION (e.g., us-east-1)');
    console.log('\n4. These will be available to your Edge Functions in production');
    
  } else if (choice === '3') {
    console.log('\n🧪 Using Local Email Service\n');
    console.log('The QuoteEmailServiceLocal will:');
    console.log('- Log emails to the console instead of sending');
    console.log('- Still update the database (email_sent, sent_at)');
    console.log('- Perfect for testing without AWS setup');
    console.log('\nUse the "Test Email" button in the Quote V2 Demo to try it!');
  }
  
  rl.close();
}

setupAWSCredentials().catch(console.error);