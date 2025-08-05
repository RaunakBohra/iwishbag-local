// Add this to your existing Cloudflare Worker
// This is the `bestbuy_product` handler to add to your switch statement

// Add this case to your main switch statement:
case 'bestbuy_product':
  return await handleBestBuyProduct(params.arguments.url);

// Add this function to your Cloudflare Worker:
async function handleBestBuyProduct(url) {
  const API_KEY = 'bb4c5d5e818b61cc192b25817a5f5f19e04352dbf5fcb9221e2a40d22b9cf19b';
  const DATASET_ID = 'gd_ltre1jqe1jfr7cccf';
  
  console.log(`🛒 Best Buy Product Scraping: ${url}`);
  
  try {
    // Step 1: Trigger data collection
    console.log(`📤 Triggering Best Buy dataset collection...`);
    const triggerResponse = await fetch(`https://api.brightdata.com/datasets/v3/trigger?dataset_id=${DATASET_ID}&include_errors=true`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ url }])
    });

    if (!triggerResponse.ok) {
      const errorText = await triggerResponse.text();
      console.error(`Dataset trigger failed: ${triggerResponse.status} - ${errorText}`);
      throw new Error(`Dataset trigger failed: ${triggerResponse.status} ${triggerResponse.statusText}`);
    }

    const triggerResult = await triggerResponse.json();
    console.log(`✅ Trigger successful, snapshot ID: ${triggerResult.snapshot_id}`);
    
    const snapshotId = triggerResult.snapshot_id;
    if (!snapshotId) {
      throw new Error('No snapshot_id received from dataset trigger');
    }

    // Step 2: Poll for results (max 30 attempts = 60 seconds)
    console.log(`🔄 Polling for Best Buy data completion...`);
    for (let attempt = 1; attempt <= 30; attempt++) {
      console.log(`🔍 Polling attempt ${attempt}/30 for snapshot ${snapshotId}...`);
      
      // Wait 2 seconds between polls (except first attempt)
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      const progressResponse = await fetch(`https://api.brightdata.com/datasets/v3/progress/${snapshotId}`, {
        headers: { 
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!progressResponse.ok) {
        console.error(`Progress check failed: ${progressResponse.status}`);
        throw new Error(`Progress check failed: ${progressResponse.status}`);
      }

      const progressResult = await progressResponse.json();
      console.log(`📊 Progress status: ${progressResult.status}`);

      if (progressResult.status === 'ready') {
        // Step 3: Download the data
        console.log(`📥 Data ready! Downloading Best Buy product data...`);
        const dataResponse = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
          headers: { 
            'Authorization': `Bearer ${API_KEY}`,
            'Accept': 'application/json'
          }
        });

        if (!dataResponse.ok) {
          const errorText = await dataResponse.text();
          console.error(`Data download failed: ${dataResponse.status} - ${errorText}`);
          throw new Error(`Data download failed: ${dataResponse.status}`);
        }

        const data = await dataResponse.json();
        console.log(`✅ Successfully downloaded ${data.length || 0} Best Buy records`);
        
        // Log sample of the data structure for debugging
        if (data && data.length > 0) {
          console.log(`📋 Sample Best Buy data keys:`, Object.keys(data[0]));
          console.log(`📝 Product title:`, data[0].title);
          console.log(`💰 Product price:`, data[0].final_price || data[0].price);
        }
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(data)
          }]
        };
        
      } else if (progressResult.status === 'failed') {
        const errorMsg = progressResult.error || 'Unknown dataset collection error';
        console.error(`Dataset collection failed: ${errorMsg}`);
        throw new Error(`Dataset collection failed: ${errorMsg}`);
      } else if (progressResult.status === 'running' || progressResult.status === 'pending') {
        console.log(`⏳ Dataset still processing... (${progressResult.status})`);
        // Continue polling
      } else {
        console.warn(`⚠️ Unknown status: ${progressResult.status}`);
      }
    }

    // If we get here, we've exceeded max attempts
    console.error(`⏰ Timeout: Best Buy dataset collection took longer than 60 seconds`);
    throw new Error('Best Buy dataset collection timeout - data not ready within 60 seconds');

  } catch (error) {
    console.error('❌ Best Buy scraping error:', error);
    
    // Return error in the expected MCP format
    return {
      content: [{
        type: 'text',
        text: JSON.stringify([{
          error: error.message || 'Best Buy scraping failed',
          success: false,
          title: 'Best Buy Scraping Error',
          url: url,
          timestamp: new Date().toISOString()
        }])
      }]
    };
  }
}

// INSTRUCTIONS FOR INTEGRATION:
// 1. Copy the `case 'bestbuy_product':` line into your main switch statement
// 2. Copy the entire `handleBestBuyProduct` function into your worker
// 3. Deploy your Cloudflare Worker
// 4. Test with a Best Buy URL

// Your switch statement should look like:
/*
switch (tool) {
  case 'myntra_product':
    return await handleMyntra(params.arguments.url);
  case 'flipkart_product':
    return await handleFlipkart(params.arguments.url);
  case 'bestbuy_product':
    return await handleBestBuyProduct(params.arguments.url);
  default:
    return new Response('Unknown tool', { status: 400 });
}
*/