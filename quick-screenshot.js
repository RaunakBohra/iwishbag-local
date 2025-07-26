import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Going to admin quote page...');
    await page.goto('http://localhost:8082/admin/quotes/083faeb7-5748-45ed-8dc5-76af0b58393d');
    
    // Wait for page to load
    await page.waitForTimeout(5000);
    
    // Click on Items & Tax tab if needed
    const itemsTab = await page.locator('text=Items & Tax').first();
    if (await itemsTab.count() > 0) {
      await itemsTab.click();
      await page.waitForTimeout(2000);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'table-layout-fixed.png', fullPage: true });
    console.log('Screenshot saved as table-layout-fixed.png');
    
  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'error-screenshot.png' });
  } finally {
    await browser.close();
  }
})();