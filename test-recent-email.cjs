const AWS = require('aws-sdk');

// Configure AWS
AWS.config.region = 'us-east-1';
const lambda = new AWS.Lambda();

// Use the most recent email from S3
const testEvent = {
  Records: [
    {
      eventSource: 'aws:ses',
      ses: {
        mail: {
          timestamp: new Date().toISOString(),
          source: 'test@example.com',
          messageId: 'kr1b0ah66pkdnfmm98idu89bnddfs5rajnknmh81', // Recent email from S3
          destination: ['support@mail.iwishbag.com'],
          commonHeaders: {
            from: ['Test User <test@example.com>'],
            to: ['support@mail.iwishbag.com'],
            subject: 'Test Email - Manual Trigger'
          }
        },
        receipt: {
          spamVerdict: { status: 'PASS' },
          virusVerdict: { status: 'PASS' }
        }
      }
    }
  ]
};

console.log('📧 Manually triggering Lambda with recent email...\n');
console.log('Using message ID:', testEvent.Records[0].ses.mail.messageId);
console.log('This email exists in S3 at: inbox/kr1b0ah66pkdnfmm98idu89bnddfs5rajnknmh81\n');

// Invoke the Lambda function
lambda.invoke({
  FunctionName: 'iwishbag-process-incoming-email',
  InvocationType: 'RequestResponse',
  LogType: 'Tail',
  Payload: JSON.stringify(testEvent)
}, (err, data) => {
  if (err) {
    console.error('❌ Error:', err);
  } else {
    console.log('✅ Lambda invoked successfully!');
    console.log('Status Code:', data.StatusCode);
    
    const payload = JSON.parse(data.Payload);
    console.log('Response:', JSON.stringify(payload, null, 2));
    
    if (data.LogResult) {
      const logs = Buffer.from(data.LogResult, 'base64').toString('utf-8');
      console.log('\n📋 Lambda Logs:\n', logs);
    }
    
    console.log('\n✅ Now check your local database:');
    console.log('   psql -h localhost -p 54322 -d postgres -U postgres -c "SELECT * FROM email_messages WHERE created_at > NOW() - INTERVAL \'5 minutes\'"');
  }
});