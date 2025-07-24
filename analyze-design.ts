import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Navigate to the site (correct port)
  await page.goto('http://localhost:8080');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Take a screenshot of the landing page
  await page.screenshot({ path: 'landing-page.png', fullPage: true });
  
  // Try to navigate to admin area
  await page.goto('http://localhost:8080/admin/quotes/60d5d580-5ad2-4124-9b3a-5ce53433bedf');
  
  // Wait for navigation
  await page.waitForLoadState('networkidle');
  
  // Take screenshot of the admin quote page
  await page.screenshot({ path: 'admin-quote-page.png', fullPage: true });
  
  // Wait to analyze the design
  await page.waitForTimeout(60000); // Keep browser open for 60 seconds
  
  await browser.close();
})();