const AWS = require('aws-sdk');

// Configure AWS
AWS.config.region = 'us-east-1';
const lambda = new AWS.Lambda();

// Create a test event similar to what SES would send
const testEvent = {
  Records: [
    {
      eventSource: 'aws:ses',
      ses: {
        mail: {
          timestamp: '2025-08-01T09:14:14.252Z',
          source: 'Customer <rnkbohra@gmail.com>',
          messageId: 'k59ldl9s1fi1g348jpt79mkc03gkbbkcheh303g1',
          destination: ['support@mail.iwishbag.com'],
          commonHeaders: {
            from: ['Customer <rnkbohra@gmail.com>'],
            to: ['support@mail.iwishbag.com'],
            subject: 'Test Email TO Support'
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

console.log('📧 Manually triggering Lambda with test event...\n');

// Invoke the Lambda function
lambda.invoke({
  FunctionName: 'iwishbag-process-incoming-email',
  InvocationType: 'RequestResponse',
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
    
    console.log('\n✅ Check dashboard in 10 seconds: node check-email-dashboard.js');
  }
});