import { test, expect } from '@playwright/test';
import { login, TEST_USERS } from './helpers/auth';

test.describe('HSN Category Assignment Investigation', () => {
  test('investigate HSN category assignment issue', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`[${msg.type().toUpperCase()}]`, msg.text());
      }
    });

    // Login as admin first
    await login(page, TEST_USERS.admin);
    
    // Navigate to the admin quote page
    await page.goto('/admin/quotes/46749ac8-3336-43aa-bcbc-ec9f30000aef');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ path: 'hsn-investigation-1-initial.png', fullPage: true });

    // Check if we need to switch to edit mode
    const editButton = page.locator('button:has-text("Edit")');
    if (await editButton.isVisible()) {
      console.log('Switching to edit mode...');
      await editButton.click();
      await page.waitForTimeout(1000);
    }

    // Find items without HSN codes
    const unclassifiedItems = page.locator('[data-testid="product-card"]:has-text("Unclassified")');
    const itemCount = await unclassifiedItems.count();
    console.log(`Found ${itemCount} unclassified items`);

    if (itemCount > 0) {
      // Click on the first unclassified item's HSN search
      const firstItem = unclassifiedItems.first();
      await firstItem.screenshot({ path: 'hsn-investigation-2-unclassified-item.png' });
      
      // Look for HSN search trigger
      const hsnSearchTrigger = firstItem.locator('button:has-text("Search HSN"), [role="button"]:has-text("Unclassified")');
      
      if (await hsnSearchTrigger.isVisible()) {
        console.log('Clicking HSN search trigger...');
        
        // Set up request interception to monitor API calls
        const apiCalls = [];
        page.on('request', request => {
          if (request.url().includes('/rest/v1/') || request.url().includes('rpc/')) {
            apiCalls.push({
              url: request.url(),
              method: request.method(),
              postData: request.postData()
            });
          }
        });

        page.on('response', response => {
          if (response.url().includes('/rest/v1/') || response.url().includes('rpc/')) {
            response.json().then(data => {
              console.log('API Response:', JSON.stringify(data, null, 2));
            }).catch(() => {});
          }
        });

        await hsnSearchTrigger.click();
        
        // Wait for HSN search dialog
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
        await page.screenshot({ path: 'hsn-investigation-3-hsn-dialog.png' });

        // Search for a specific HSN code
        const searchInput = page.locator('input[placeholder*="Search HSN"], input[placeholder*="search"]');
        await searchInput.fill('8471');
        await page.waitForTimeout(1000);
        
        // Take screenshot of search results
        await page.screenshot({ path: 'hsn-investigation-4-search-results.png' });

        // Inject script to intercept HSN data
        await page.evaluate(() => {
          // Override the handleHSNAssignment or similar function
          const originalLog = console.log;
          window.console.log = function(...args) {
            if (args[0] && typeof args[0] === 'string' && args[0].includes('HSN')) {
              originalLog('[HSN-INTERCEPT]', ...args);
            }
            originalLog(...args);
          };
        });

        // Click on a search result
        const firstResult = page.locator('[role="dialog"] [role="button"], [role="dialog"] .cursor-pointer').first();
        
        // Get the HSN data before clicking
        const hsnResultData = await firstResult.evaluate(el => {
          // Try to extract data attributes or inner text
          const data = {
            innerText: el.innerText,
            innerHTML: el.innerHTML,
            attributes: {}
          };
          for (let attr of el.attributes) {
            data.attributes[attr.name] = attr.value;
          }
          return data;
        });
        
        console.log('HSN Result Element Data:', JSON.stringify(hsnResultData, null, 2));
        
        await firstResult.click();
        await page.waitForTimeout(2000);
        
        // Take screenshot after selection
        await page.screenshot({ path: 'hsn-investigation-5-after-selection.png' });

        // Check the product card for updated HSN/category
        const updatedCard = firstItem;
        const hsnDisplay = await updatedCard.locator('.bg-green-50, .text-green-800').textContent();
        console.log('HSN Display after selection:', hsnDisplay);
        
        // Check sidebar for synchronization
        const sidebar = page.locator('[data-testid="admin-sidebar"], .fixed.right-0');
        if (await sidebar.isVisible()) {
          await sidebar.screenshot({ path: 'hsn-investigation-6-sidebar.png' });
          
          const sidebarHSN = await sidebar.locator('text=/HSN.*\d{4,8}/').textContent().catch(() => 'Not found');
          console.log('Sidebar HSN display:', sidebarHSN);
        }

        // Log all captured API calls
        console.log('\n=== API CALLS CAPTURED ===');
        apiCalls.forEach((call, index) => {
          console.log(`\nAPI Call ${index + 1}:`);
          console.log('URL:', call.url);
          console.log('Method:', call.method);
          if (call.postData) {
            console.log('Payload:', call.postData);
          }
        });
      }
    }

    // Final screenshot
    await page.screenshot({ path: 'hsn-investigation-7-final-state.png', fullPage: true });
    
    // Keep browser open for manual inspection
    await page.pause();
  });
});