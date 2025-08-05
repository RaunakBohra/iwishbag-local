#!/usr/bin/env node

/**
 * Flipkart Integration Test Script
 * Tests the complete Flipkart scraping workflow
 */

const https = require('https');

// Test configuration
const WORKER_URL = 'https://brightdata-mcp.rnkbohra.workers.dev';
const TEST_URLS = [
  'https://www.flipkart.com/samsung-galaxy-m14-5g-berry-blue-128-gb/p/itm6c7e78eb889c5',
  'https://www.flipkart.com/nike-revolution-6-nn-running-shoes-men/p/itm4d0b46511ec32',
  'https://www.flipkart.com/realme-narzo-30-racing-blue-128-gb/p/itm6b8a42f4b3e61'
];

/**
 * Make HTTP request to test Flipkart scraping
 */
function testFlipkartScraping(url) {
  return new Promise((resolve, reject) => {
    const requestData = JSON.stringify({
      tool: 'flipkart_product',
      arguments: { url }
    });

    const options = {
      hostname: 'brightdata-mcp.rnkbohra.workers.dev',
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': requestData.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            url,
            status: res.statusCode,
            response,
            success: response.success || false
          });
        } catch (error) {
          resolve({
            url,
            status: res.statusCode,
            error: 'Invalid JSON response',
            rawData: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({ url, error: error.message });
    });

    req.write(requestData);
    req.end();
  });
}

/**
 * Analyze test results
 */
function analyzeResults(results) {
  console.log('\n📊 Test Results Analysis:');
  console.log('=' .repeat(50));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n🎉 Successful Scrapes:');
    successful.forEach((result, index) => {
      console.log(`${index + 1}. ${result.url}`);
      if (result.response && result.response.content) {
        try {
          const data = JSON.parse(result.response.content[0].text)[0];
          console.log(`   Title: ${data.title || 'N/A'}`);
          console.log(`   Price: ${data.final_price || data.current_price || 'N/A'}`);
          console.log(`   Brand: ${data.brand || 'N/A'}`);
          console.log(`   Rating: ${data.rating || 'N/A'}`);
        } catch (e) {
          console.log(`   Raw response: ${JSON.stringify(result.response).substring(0, 100)}...`);
        }
      }
    });
  }
  
  if (failed.length > 0) {
    console.log('\n💥 Failed Scrapes:');
    failed.forEach((result, index) => {
      console.log(`${index + 1}. ${result.url}`);
      console.log(`   Error: ${result.response?.error || result.error || 'Unknown error'}`);
    });
  }
}

/**
 * Check if dataset ID is configured
 */
function checkDatasetConfiguration(results) {
  const hasPlaceholder = results.some(r => 
    r.response?.error?.includes('dataset does not exist') || 
    r.response?.error?.includes('REPLACE_WITH_REAL_FLIPKART_DATASET_ID')
  );
  
  if (hasPlaceholder) {
    console.log('\n⚠️  CONFIGURATION NEEDED:');
    console.log('The Flipkart dataset ID is not configured yet.');
    console.log('Please follow the setup guide in FLIPKART_DATASET_SETUP.md');
    console.log('1. Create dataset in Bright Data dashboard');
    console.log('2. Copy the dataset ID (format: gd_xxxxxxxxxx)');
    console.log('3. Replace REPLACE_WITH_REAL_FLIPKART_DATASET_ID in the code');
    console.log('4. Deploy with: npx wrangler deploy');
    return false;
  }
  
  return true;
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Flipkart Integration Tests');
  console.log('Worker URL:', WORKER_URL);
  console.log('Test URLs:', TEST_URLS.length);
  console.log('-'.repeat(50));
  
  const results = [];
  
  for (let i = 0; i < TEST_URLS.length; i++) {
    const url = TEST_URLS[i];
    console.log(`\n${i + 1}/${TEST_URLS.length} Testing: ${url}`);
    
    try {
      const result = await testFlipkartScraping(url);
      results.push(result);
      
      if (result.success) {
        console.log('✅ Success');
      } else {
        console.log(`❌ Failed: ${result.response?.error || result.error}`);
      }
      
      // Add delay between requests
      if (i < TEST_URLS.length - 1) {
        console.log('⏳ Waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.log(`💥 Request failed: ${error.error || error.message}`);
      results.push({ url, error: error.error || error.message, success: false });
    }
  }
  
  // Analyze results
  analyzeResults(results);
  
  // Check configuration
  const isConfigured = checkDatasetConfiguration(results);
  
  if (isConfigured && results.some(r => r.success)) {
    console.log('\n🎉 Integration is working! Flipkart scraping is functional.');
  } else if (isConfigured) {
    console.log('\n🔧 Integration configured but not working. Check dataset and CSS selectors.');
  }
  
  console.log('\n📝 Next Steps:');
  if (!isConfigured) {
    console.log('1. Set up Flipkart dataset following FLIPKART_DATASET_SETUP.md');
    console.log('2. Update dataset ID in code');
    console.log('3. Re-run this test');
  } else {
    console.log('1. Test with your app: Add Flipkart URL in quote form');
    console.log('2. Verify product data extraction');
    console.log('3. Check price, title, and other fields');
  }
}

// Run tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testFlipkartScraping, runTests };