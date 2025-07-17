// Debug eSewa URL encoding issue
const testUrl = 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';

console.log('Original URL:', testUrl);
console.log('URL encoded:', encodeURIComponent(testUrl));
console.log('URL encoded (URI):', encodeURI(testUrl));

// Test what happens when we create a form programmatically
const form = document.createElement('form');
form.method = 'POST';
form.action = testUrl;

console.log('Form action after setting:', form.action);
console.log('Form method:', form.method);

// Check if there's any whitespace in the URL
console.log('URL length:', testUrl.length);
console.log('URL characters:', testUrl.split('').map(c => c.charCodeAt(0)));

// Test with potential whitespace issues
const potentialBadUrl = 'https://rc-epay.esewa.com.np/api/e  pay/main/v2/form';
console.log('Bad URL encoded:', encodeURIComponent(potentialBadUrl));