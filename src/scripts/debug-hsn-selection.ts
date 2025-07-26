import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

async function debugHSNSelection() {
  console.log('🔍 Starting Enhanced HSN Selection Debug...\n');

  const logs = {
    timestamp: new Date().toISOString(),
    consoleLogs: [] as any[],
    errors: [] as string[],
    networkActivity: [] as any[],
    formSubmissions: [] as any[],
    clicks: [] as any[],
    hsnEvents: [] as any[],
  };

  try {
    // Launch Chrome with the Default profile
    console.log('📱 Launching Chrome with Profile 3 (rnkbohra@gmail.com)...');
    const browser = await chromium.launchPersistentContext(
      '/Users/raunakbohra/Library/Application Support/Google/Chrome/Profile 3',
      {
        channel: 'chrome',
        headless: false,
        viewport: { width: 1920, height: 1080 },
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        devtools: true, // Open DevTools automatically
      },
    );

    const page = await browser.newPage();

    // Enhanced console log capture
    page.on('console', (msg) => {
      const logEntry = {
        type: msg.type(),
        text: msg.text(),
        time: new Date().toISOString(),
        location: msg.location(),
      };

      logs.consoleLogs.push(logEntry);

      // Special handling for HSN-related logs
      if (msg.text().includes('HSN') || msg.text().includes('hsn')) {
        logs.hsnEvents.push(logEntry);
        console.log(`🎯 [HSN LOG] ${msg.type()}: ${msg.text()}`);
      } else {
        console.log(`📝 [${msg.type().toUpperCase()}] ${msg.text()}`);
      }
    });

    // Capture errors
    page.on('pageerror', (error) => {
      const errorMsg = `[PAGE ERROR] ${error.message}`;
      logs.errors.push(errorMsg);
      console.error('❌', errorMsg);
    });

    // Enhanced network monitoring
    page.on('request', (request) => {
      const url = request.url();
      const method = request.method();

      // Track all POST requests and form submissions
      if (
        method === 'POST' ||
        url.includes('submit') ||
        request.headers()['content-type']?.includes('form')
      ) {
        const activity = {
          method,
          url,
          postData: request.postData(),
          headers: request.headers(),
          time: new Date().toISOString(),
        };

        logs.networkActivity.push(activity);

        if (url.includes('form') || method === 'POST') {
          logs.formSubmissions.push(activity);
          console.log(`🚨 [FORM SUBMISSION] ${method} ${url}`);
        }

        console.log(`🌐 [NETWORK] ${method} ${url}`);
      }
    });

    // Track navigation events
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        console.log(`🔄 [NAVIGATION] Page navigated to: ${frame.url()}`);
        logs.hsnEvents.push({
          type: 'navigation',
          url: frame.url(),
          time: new Date().toISOString(),
        });
      }
    });

    // Intercept and log all click events
    await page.addInitScript(() => {
      document.addEventListener(
        'click',
        (e) => {
          const target = e.target as HTMLElement;
          const clickInfo = {
            tagName: target.tagName,
            className: target.className,
            id: target.id,
            text: target.textContent?.substring(0, 50),
            isDefaultPrevented: e.defaultPrevented,
            bubbles: e.bubbles,
            propagationStopped: e.cancelBubble,
          };

          console.log('🖱️ [CLICK EVENT]', JSON.stringify(clickInfo));

          // Log if click is on HSN-related element
          if (
            target.textContent?.includes('HSN') ||
            target.className?.includes('hsn') ||
            target.closest('[data-testid*="hsn"]')
          ) {
            console.log('🎯 [HSN CLICK DETECTED]', clickInfo);
          }
        },
        true,
      );

      // Also monitor form submissions
      document.addEventListener(
        'submit',
        (e) => {
          const form = e.target as HTMLFormElement;
          console.log('📋 [FORM SUBMIT EVENT]', {
            action: form.action,
            method: form.method,
            defaultPrevented: e.defaultPrevented,
          });
        },
        true,
      );
    });

    // Navigate to the admin quote page
    console.log('\n📍 Navigating to admin quote page...');
    const targetUrl = 'http://localhost:8080/admin/quotes/46749ac8-3336-43aa-bcbc-ec9f30000aef';

    try {
      await page.goto(targetUrl, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      console.log('✅ Page loaded successfully\n');
    } catch (navError) {
      console.error('❌ Navigation failed:', navError);
      logs.errors.push(`Navigation failed: ${navError}`);

      // Try to understand why
      console.log('\n🔧 Checking if server is running...');
      await page.goto('http://localhost:8080', { timeout: 5000 }).catch((e) => {
        console.log('❌ Server not responding on port 8080');
        console.log('💡 Make sure to run: npm run dev');
      });
    }

    // Wait for the page to stabilize
    await page.waitForTimeout(3000);

    // Execute HSN search workflow
    console.log('\n🔍 Starting HSN search workflow...\n');

    try {
      // Look for HSN search button with multiple strategies
      console.log('1️⃣ Looking for HSN search button...');

      const hsnButtonSelectors = [
        'button:has-text("Search HSN")',
        'button:has-text("Assign HSN")',
        'button:has-text("Change")',
        '[data-testid="hsn-search-button"]',
        '.product-card button:has-text("HSN")',
        'button.text-blue-600',
      ];

      let hsnButton = null;
      for (const selector of hsnButtonSelectors) {
        try {
          const buttons = await page.locator(selector).all();
          for (const btn of buttons) {
            if (await btn.isVisible()) {
              const text = await btn.textContent();
              console.log(`   ✅ Found button with selector "${selector}" - Text: "${text}"`);
              hsnButton = btn;
              break;
            }
          }
          if (hsnButton) break;
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!hsnButton) {
        console.log('   ❌ HSN button not found');
        console.log('\n   📋 Visible buttons on page:');
        const allButtons = await page.locator('button').all();
        for (const btn of allButtons.slice(0, 10)) {
          if (await btn.isVisible()) {
            const text = await btn.textContent();
            console.log(`      - "${text?.trim()}"`);
          }
        }
        throw new Error('Could not find HSN search button');
      }

      // Click the HSN button
      console.log('\n2️⃣ Clicking HSN button...');
      const beforeClickUrl = page.url();
      await hsnButton.click();
      await page.waitForTimeout(1500);

      const afterClickUrl = page.url();
      if (beforeClickUrl !== afterClickUrl) {
        console.log(`   ⚠️ URL changed from ${beforeClickUrl} to ${afterClickUrl}`);
      }

      // Check if dialog opened
      console.log('\n3️⃣ Checking for HSN dialog...');
      const dialog = await page.locator('[role="dialog"]').first();
      if (await dialog.isVisible()) {
        console.log('   ✅ HSN dialog is open');

        // Get dialog content
        const dialogText = await dialog.textContent();
        console.log(`   📄 Dialog contains: ${dialogText?.substring(0, 100)}...`);

        // Wait for HSN results
        await page.waitForTimeout(2000);

        // Find HSN result cards
        console.log('\n4️⃣ Looking for HSN result cards...');
        const resultSelectors = [
          '[data-testid="hsn-result-card"]',
          '.cursor-pointer.hover\\:shadow-lg',
          '[role="dialog"] .border.rounded-lg.p-4',
          'div[onclick*="hsn"]',
        ];

        let hsnResultCard = null;
        for (const selector of resultSelectors) {
          const cards = await page.locator(selector).all();
          if (cards.length > 0) {
            console.log(`   ✅ Found ${cards.length} result cards with selector: ${selector}`);
            hsnResultCard = cards[0];
            break;
          }
        }

        if (hsnResultCard) {
          // Get HSN code from the card
          const hsnCode = await hsnResultCard
            .locator('text=/\\d{8}/')
            .textContent()
            .catch(() => 'Unknown');
          console.log(`   📦 First HSN result: ${hsnCode}`);

          // Monitor what happens on click
          console.log('\n5️⃣ Clicking HSN result card...');
          const beforeSelectUrl = page.url();

          await hsnResultCard.click();
          await page.waitForTimeout(2000);

          const afterSelectUrl = page.url();
          console.log(`   📍 URL before click: ${beforeSelectUrl}`);
          console.log(`   📍 URL after click: ${afterSelectUrl}`);
          console.log(
            `   ${beforeSelectUrl === afterSelectUrl ? '✅ No navigation occurred' : '⚠️ Page navigated!'}`,
          );

          // Check if dialog closed
          const dialogStillOpen = await dialog.isVisible();
          console.log(`   📋 Dialog still open: ${dialogStillOpen}`);

          // Check if HSN was applied
          const appliedHSN = await page
            .locator(`text=${hsnCode}`)
            .first()
            .isVisible()
            .catch(() => false);
          console.log(`   ${appliedHSN ? '✅' : '❌'} HSN code visible on page: ${appliedHSN}`);
        } else {
          console.log('   ❌ No HSN result cards found');
        }
      } else {
        console.log('   ❌ HSN dialog did not open');
      }
    } catch (error) {
      console.error('\n❌ Error during HSN workflow:', error);
      logs.errors.push(`HSN workflow error: ${error}`);
    }

    // Generate report
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 FINAL DEBUG REPORT');
    console.log('='.repeat(60));

    console.log('\n🎯 HSN-Related Events:', logs.hsnEvents.length);
    logs.hsnEvents.forEach((event) => {
      console.log(`   - ${JSON.stringify(event)}`);
    });

    console.log('\n📋 Form Submissions:', logs.formSubmissions.length);
    logs.formSubmissions.forEach((sub) => {
      console.log(`   - ${sub.method} ${sub.url}`);
    });

    console.log('\n❌ Errors:', logs.errors.length);
    logs.errors.forEach((err) => console.log(`   - ${err}`));

    // Save detailed report
    const reportPath = path.join(process.cwd(), 'hsn-debug-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(logs, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);

    // Keep browser open
    console.log('\n🔍 Browser remains open for manual inspection');
    console.log('Press Ctrl+C to exit\n');

    await new Promise(() => {});
  } catch (error) {
    console.error('\n💥 Fatal error:', error);
    logs.errors.push(`[FATAL] ${error}`);
  }
}

// Run the debug script
debugHSNSelection().catch(console.error);
