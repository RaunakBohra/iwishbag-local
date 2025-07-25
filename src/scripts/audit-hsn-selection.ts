import { chromium } from 'playwright';

async function auditHSNSelection() {
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Enable console log capture
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    const logEntry = `[${msg.type().toUpperCase()}] ${msg.text()}`;
    consoleLogs.push(logEntry);
    console.log(logEntry);
  });
  
  // Capture page errors
  const pageErrors: string[] = [];
  page.on('pageerror', error => {
    const errorEntry = `[PAGE ERROR] ${error.message}`;
    pageErrors.push(errorEntry);
    console.error(errorEntry);
  });
  
  // Capture network activity
  const networkActivity: string[] = [];
  page.on('request', request => {
    if (request.method() === 'POST' || request.url().includes('form')) {
      const activity = `[NETWORK REQUEST] ${request.method()} ${request.url()}`;
      networkActivity.push(activity);
      console.log(activity);
    }
  });
  
  page.on('response', response => {
    if (response.request().method() === 'POST' || response.url().includes('form')) {
      const activity = `[NETWORK RESPONSE] ${response.status()} ${response.url()}`;
      networkActivity.push(activity);
      console.log(activity);
    }
  });
  
  // Track page navigations
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      console.log(`[NAVIGATION] Page navigated to: ${frame.url()}`);
    }
  });
  
  console.log('=== Starting HSN Selection Audit ===\n');
  
  try {
    // Navigate to the quote detail page
    console.log('1. Navigating to quote page...');
    await page.goto('http://localhost:8082/admin/quotes/46749ac8-3336-43aa-bcbc-ec9f30000aef', {
      waitUntil: 'networkidle'
    });
    
    // Wait for the page to fully load
    await page.waitForTimeout(3000);
    
    // Find and click the HSN search button in the first product card
    console.log('\n2. Looking for HSN search button...');
    const hsnSearchButton = await page.locator('button:has-text("Search HSN")').first();
    
    if (await hsnSearchButton.isVisible()) {
      console.log('   - Found HSN search button, clicking...');
      await hsnSearchButton.click();
      
      // Wait for dialog to open
      await page.waitForTimeout(1000);
      
      // Check if dialog opened
      const dialog = await page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        console.log('   - HSN search dialog opened successfully');
        
        // Wait for HSN results to load
        await page.waitForTimeout(2000);
        
        // Find HSN result items
        const hsnResults = await page.locator('[data-testid="hsn-result-item"], .hsn-result-item, [class*="hsn-result"]');
        const resultCount = await hsnResults.count();
        console.log(`\n3. Found ${resultCount} HSN results in the dialog`);
        
        if (resultCount > 0) {
          // Get initial state
          const initialUrl = page.url();
          console.log(`   - Current URL before clicking: ${initialUrl}`);
          
          // Click the first HSN result
          console.log('\n4. Clicking on the first HSN result...');
          await hsnResults.first().click();
          
          // Wait to see what happens
          await page.waitForTimeout(2000);
          
          // Check if page navigated
          const currentUrl = page.url();
          if (currentUrl !== initialUrl) {
            console.log(`   - ⚠️ PAGE NAVIGATED TO: ${currentUrl}`);
          } else {
            console.log('   - Page did not navigate (good!)');
          }
          
          // Check if dialog is still visible
          const dialogStillVisible = await dialog.isVisible();
          console.log(`   - Dialog still visible: ${dialogStillVisible}`);
          
          // Check if HSN was updated in the product card
          const hsnCodeElement = await page.locator('.hsn-code, [data-testid="hsn-code"], text=/\\d{8}/').first();
          if (await hsnCodeElement.isVisible()) {
            const hsnCode = await hsnCodeElement.textContent();
            console.log(`   - HSN code in product card: ${hsnCode}`);
          }
          
          // Check sidebar HSN component
          const sidebarHSN = await page.locator('[data-testid="sidebar-hsn"], .sidebar-hsn, aside >> text=/HSN/');
          if (await sidebarHSN.isVisible()) {
            console.log('   - Sidebar HSN component is visible');
          }
        }
      } else {
        console.log('   - ⚠️ HSN search dialog did not open');
      }
    } else {
      console.log('   - ⚠️ HSN search button not found');
    }
    
    // Final report
    console.log('\n=== AUDIT REPORT ===');
    console.log('\nConsole Logs:');
    consoleLogs.forEach(log => console.log(log));
    
    console.log('\nPage Errors:');
    if (pageErrors.length === 0) {
      console.log('No JavaScript errors detected');
    } else {
      pageErrors.forEach(error => console.log(error));
    }
    
    console.log('\nNetwork Activity:');
    if (networkActivity.length === 0) {
      console.log('No form submissions or POST requests detected');
    } else {
      networkActivity.forEach(activity => console.log(activity));
    }
    
  } catch (error) {
    console.error('Error during audit:', error);
  }
  
  // Keep browser open for manual inspection
  console.log('\n✅ Audit complete. Browser will remain open for manual inspection.');
  console.log('Press Ctrl+C to close.');
  
  // Keep the script running
  await new Promise(() => {});
}

// Run the audit
auditHSNSelection().catch(console.error);