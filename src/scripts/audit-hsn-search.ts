import { chromium } from 'playwright';

async function auditHSNSearch() {
  console.log('Starting HSN Search Audit...');
  
  // Launch Chrome with the specific profile
  const browser = await chromium.launchPersistentContext(
    '/Users/raunakbohra/Library/Application Support/Google/Chrome/Profile 3', // Raunak Bohra profile
    {
      channel: 'chrome',
      headless: false,
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  );

  const page = await browser.newPage();
  
  // Set up console log capture
  const consoleLogs: string[] = [];
  page.on('console', (msg) => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(text);
    console.log('CONSOLE:', text);
  });

  // Set up request monitoring
  const networkActivity: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' || request.url().includes('supabase')) {
      const activity = `${request.method()} ${request.url()}`;
      networkActivity.push(activity);
      console.log('NETWORK:', activity);
    }
  });

  // Set up response monitoring
  page.on('response', (response) => {
    if (response.request().method() === 'POST' || response.url().includes('supabase')) {
      console.log('RESPONSE:', response.status(), response.url());
    }
  });

  // Navigate to the admin quote page
  console.log('Navigating to admin quote page...');
  await page.goto('http://localhost:8080/admin/quotes/46749ac8-3336-43aa-bcbc-ec9f30000aef', {
    waitUntil: 'networkidle'
  });

  // Wait for the page to fully load
  await page.waitForTimeout(3000);

  // Open developer tools
  await page.keyboard.press('F12');
  await page.waitForTimeout(1000);

  try {
    // Look for HSN search button
    console.log('Looking for HSN search button...');
    
    // Try different selectors for the HSN button
    const hsnButtonSelectors = [
      'button:has-text("Assign HSN")',
      'button:has-text("Change")',
      '[data-testid="hsn-search-button"]',
      '.product-card button:has-text("HSN")',
      'button.text-blue-600:has-text("Assign")',
      'button.text-blue-600:has-text("Change")'
    ];

    let hsnButton = null;
    for (const selector of hsnButtonSelectors) {
      try {
        hsnButton = await page.locator(selector).first();
        if (await hsnButton.isVisible()) {
          console.log(`Found HSN button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!hsnButton || !(await hsnButton.isVisible())) {
      console.log('HSN button not found, looking for product cards...');
      const productCards = await page.locator('.border.rounded-lg').all();
      console.log(`Found ${productCards.length} product cards`);
      
      // Log what's visible in the first product card
      if (productCards.length > 0) {
        const firstCardText = await productCards[0].textContent();
        console.log('First product card content:', firstCardText);
      }
      
      throw new Error('Could not find HSN search button');
    }

    // Click the HSN button
    console.log('Clicking HSN button...');
    await hsnButton.click();
    
    // Wait for dialog to open
    await page.waitForTimeout(1000);
    
    // Check if dialog opened
    const dialogSelectors = [
      '[role="dialog"]',
      '.fixed.inset-0',
      '[data-testid="hsn-search-dialog"]',
      'div:has-text("Search HSN Code")'
    ];
    
    let dialogFound = false;
    for (const selector of dialogSelectors) {
      if (await page.locator(selector).isVisible()) {
        console.log(`HSN dialog opened with selector: ${selector}`);
        dialogFound = true;
        break;
      }
    }
    
    if (!dialogFound) {
      console.log('WARNING: HSN dialog may not have opened properly');
    }
    
    // Wait for HSN results to load
    await page.waitForTimeout(2000);
    
    // Try to find and click an HSN result
    console.log('Looking for HSN result cards...');
    const hsnResultSelectors = [
      '[data-testid="hsn-result-card"]',
      '.hsn-result-card',
      'div.border.rounded-lg.p-4.cursor-pointer',
      'div.hover\\:bg-gray-50',
      '[role="dialog"] div.cursor-pointer'
    ];
    
    let hsnResult = null;
    for (const selector of hsnResultSelectors) {
      try {
        const results = await page.locator(selector).all();
        if (results.length > 0) {
          hsnResult = results[0];
          console.log(`Found ${results.length} HSN results with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!hsnResult) {
      console.log('No HSN results found, checking dialog content...');
      const dialogContent = await page.locator('[role="dialog"]').textContent();
      console.log('Dialog content:', dialogContent);
      throw new Error('No HSN result cards found');
    }
    
    // Get the HSN code before clicking
    const hsnCode = await hsnResult.locator('text=/\\d{8}/').textContent().catch(() => 'Unknown');
    console.log(`Clicking on HSN result with code: ${hsnCode}`);
    
    // Monitor what happens after click
    const beforeUrl = page.url();
    console.log('URL before click:', beforeUrl);
    
    // Click the HSN result
    await hsnResult.click();
    
    // Wait to see what happens
    await page.waitForTimeout(2000);
    
    // Check what happened
    const afterUrl = page.url();
    console.log('URL after click:', afterUrl);
    console.log('Page navigated:', beforeUrl !== afterUrl);
    
    // Check if dialog is still open
    const dialogStillOpen = await page.locator('[role="dialog"]').isVisible().catch(() => false);
    console.log('Dialog still open:', dialogStillOpen);
    
    // Check if HSN was updated in the product card
    const updatedHSN = await page.locator(`text=${hsnCode}`).first().isVisible().catch(() => false);
    console.log('HSN code visible on page:', updatedHSN);
    
    // Check sidebar for updates
    const sidebarHSN = await page.locator('.sidebar text=/HSN.*\\d{8}/').textContent().catch(() => 'Not found');
    console.log('Sidebar HSN content:', sidebarHSN);
    
  } catch (error) {
    console.error('Error during audit:', error);
  }
  
  // Final report
  console.log('\n=== AUDIT REPORT ===');
  console.log('\n--- Console Logs ---');
  consoleLogs.forEach(log => console.log(log));
  
  console.log('\n--- Network Activity ---');
  networkActivity.forEach(activity => console.log(activity));
  
  // Keep browser open for manual inspection
  console.log('\n--- Browser kept open for manual inspection ---');
  console.log('Press Ctrl+C to close');
  
  // Wait indefinitely
  await new Promise(() => {});
}

// Run the audit
auditHSNSearch().catch(console.error);