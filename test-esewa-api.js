// Test script to verify eSewa v2 API integration
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

async function testEsewaPayment() {
    console.log('🧪 Testing eSewa v2 API integration...');
    
    // Test payment creation
    const paymentData = {
        quoteIds: ['test-quote-id'],
        gateway: 'esewa',
        amount: 100,
        currency: 'NPR',
        success_url: 'http://localhost:5173/payment-success',
        cancel_url: 'http://localhost:5173/payment-cancel',
        customerInfo: {
            name: 'Test Customer',
            email: 'test@example.com',
            phone: '+977-1234567890'
        }
    };
    
    try {
        console.log('📤 Sending payment request...');
        const response = await fetch(`${SUPABASE_URL}/functions/v1/create-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify(paymentData)
        });
        
        const result = await response.json();
        console.log('📥 Payment response:', result);
        
        if (result.success && result.formData) {
            console.log('✅ eSewa v2 API integration successful!');
            console.log('🔗 Payment URL:', result.url);
            console.log('📋 Form Data:', result.formData);
            
            // Check for required v2 fields
            const requiredFields = ['amount', 'total_amount', 'transaction_uuid', 'product_code', 'signature'];
            const hasAllFields = requiredFields.every(field => result.formData.hasOwnProperty(field));
            
            if (hasAllFields) {
                console.log('✅ All required v2 fields present');
                console.log('🔐 Signature:', result.formData.signature);
                console.log('🆔 Transaction UUID:', result.formData.transaction_uuid);
                console.log('📦 Product Code:', result.formData.product_code);
            } else {
                console.log('❌ Missing required v2 fields');
                console.log('📝 Available fields:', Object.keys(result.formData));
            }
        } else {
            console.log('❌ Payment creation failed');
            console.log('📝 Error:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testEsewaPayment();