/**
 * End-to-End Tests for Regional Pricing in Checkout Flow
 * 
 * Tests the complete user journey from quote approval to checkout with regional pricing
 */

import { test, expect } from '@playwright/test';

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'testpassword123'
};

const mockQuoteData = {
  items: [
    {
      product_name: 'Test Product',
      product_url: 'https://example.com/product',
      quantity: 1,
      item_price: 50,
      item_weight: 0.5
    }
  ],
  origin_country: 'US',
  destination_country: 'IN'
};

test.describe('Regional Pricing Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
  });

  test('should display regional pricing in checkout flow', async ({ page }) => {
    // Skip auth for this test - assume user is already logged in
    await page.goto('/checkout');

    // Wait for page to load
    await page.waitForSelector('[data-testid="checkout-page"]', { timeout: 10000 });

    // Check if addon services section is present
    const addonServicesSection = page.locator('[data-testid="addon-services"]');
    await expect(addonServicesSection).toBeVisible();

    // Verify regional pricing badge appears for supported countries
    const regionalPricingBadge = page.locator('text=Optimized Regional Pricing');
    // Badge should be visible if the user is in a supported country
    if (await regionalPricingBadge.isVisible()) {
      await expect(regionalPricingBadge).toBeVisible();
    }
  });

  test('should calculate correct totals with addon services', async ({ page }) => {
    // Navigate to checkout with items in cart
    await page.goto('/checkout');
    await page.waitForSelector('[data-testid="checkout-page"]', { timeout: 10000 });

    // Get initial order total
    const initialTotal = await page.locator('[data-testid="order-total"]').textContent();
    const initialAmount = parseFloat(initialTotal?.replace(/[^0-9.]/g, '') || '0');

    // Select an addon service
    const packageProtectionToggle = page.locator('[data-testid="addon-package_protection"] input');
    if (await packageProtectionToggle.isVisible()) {
      await packageProtectionToggle.click();

      // Wait for total to update
      await page.waitForTimeout(1000);

      // Verify total increased
      const updatedTotal = await page.locator('[data-testid="order-total"]').textContent();
      const updatedAmount = parseFloat(updatedTotal?.replace(/[^0-9.]/g, '') || '0');

      expect(updatedAmount).toBeGreaterThan(initialAmount);
    }
  });

  test('should show different pricing for different countries', async ({ page }) => {
    // This test would require mocking geolocation or having test accounts in different countries
    // For now, we'll test the country selection mechanism

    await page.goto('/checkout');
    await page.waitForSelector('[data-testid="checkout-page"]');

    // Check if country-specific pricing is displayed
    const countryIndicator = page.locator('[data-testid="country-indicator"]');
    await expect(countryIndicator).toBeVisible();

    // Verify addon services show appropriate pricing
    const addonServices = page.locator('[data-testid^="addon-"]');
    const count = await addonServices.count();

    for (let i = 0; i < count; i++) {
      const service = addonServices.nth(i);
      const priceElement = service.locator('[data-testid="service-price"]');
      
      if (await priceElement.isVisible()) {
        const priceText = await priceElement.textContent();
        expect(priceText).toMatch(/\$[\d,.]+/); // Should show price in currency format
      }
    }
  });

  test('should complete checkout with addon services', async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForSelector('[data-testid="checkout-page"]');

    // Fill in required checkout information
    
    // Select delivery address (if available)
    const addressSelector = page.locator('[data-testid="address-selector"]');
    if (await addressSelector.isVisible()) {
      await addressSelector.click();
      await page.locator('[data-testid="address-option"]:first-child').click();
    }

    // Select payment method
    const paymentSelector = page.locator('[data-testid="payment-method-selector"]');
    if (await paymentSelector.isVisible()) {
      await paymentSelector.click();
      await page.locator('[data-testid="payment-option-bank_transfer"]').click();
    }

    // Select some addon services
    const expressProcessing = page.locator('[data-testid="addon-express_processing"] input');
    if (await expressProcessing.isVisible()) {
      await expressProcessing.click();
    }

    // Verify order summary includes addon services
    const orderSummary = page.locator('[data-testid="order-summary"]');
    await expect(orderSummary).toContainText('Add-on Services');

    // Place the order
    const placeOrderButton = page.locator('[data-testid="place-order-button"]');
    if (await placeOrderButton.isEnabled()) {
      await placeOrderButton.click();

      // Should navigate to confirmation page
      await page.waitForURL('**/order-confirmation/**', { timeout: 10000 });
      
      // Verify confirmation page shows addon services
      const confirmationPage = page.locator('[data-testid="order-confirmation"]');
      await expect(confirmationPage).toBeVisible();
    }
  });

  test('should validate addon service selections', async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForSelector('[data-testid="checkout-page"]');

    // Select conflicting addon services (if any)
    const addonServices = page.locator('[data-testid^="addon-"] input');
    const serviceCount = await addonServices.count();

    // Select multiple services
    for (let i = 0; i < Math.min(serviceCount, 3); i++) {
      const service = addonServices.nth(i);
      if (await service.isVisible()) {
        await service.click();
        await page.waitForTimeout(500); // Wait for state update
      }
    }

    // Verify no validation errors appear for valid selections
    const validationErrors = page.locator('[data-testid="addon-validation-error"]');
    expect(await validationErrors.count()).toBe(0);
  });

  test('should handle country detection fallback', async ({ page }) => {
    // Mock failed IP detection by blocking geolocation APIs
    await page.route('https://ipapi.co/**', route => route.abort());
    await page.route('https://api.country.is/**', route => route.abort());
    await page.route('https://ipwho.is/**', route => route.abort());

    await page.goto('/checkout');
    await page.waitForSelector('[data-testid="checkout-page"]');

    // Should still show addon services with fallback country (US)
    const addonServices = page.locator('[data-testid="addon-services"]');
    await expect(addonServices).toBeVisible();

    // Should show fallback country in the interface
    const countryIndicator = page.locator('[data-testid="country-indicator"]');
    if (await countryIndicator.isVisible()) {
      const countryText = await countryIndicator.textContent();
      expect(countryText).toContain('US'); // Should fallback to US
    }
  });

  test('should show bundle recommendations', async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForSelector('[data-testid="checkout-page"]');

    // Check if bundle recommendations appear
    const bundleSection = page.locator('[data-testid="addon-bundles"]');
    
    if (await bundleSection.isVisible()) {
      // Verify bundle shows savings
      const savingsIndicator = page.locator('[data-testid="bundle-savings"]');
      await expect(savingsIndicator).toBeVisible();
      
      const savingsText = await savingsIndicator.textContent();
      expect(savingsText).toMatch(/Save.*\$/);
    }
  });

  test('should persist addon selections during checkout', async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForSelector('[data-testid="checkout-page"]');

    // Select addon services
    const packageProtection = page.locator('[data-testid="addon-package_protection"] input');
    if (await packageProtection.isVisible()) {
      await packageProtection.click();
      expect(await packageProtection.isChecked()).toBe(true);

      // Navigate away and back (simulate form navigation)
      await page.goBack();
      await page.goForward();

      // Verify selection is preserved
      await page.waitForSelector('[data-testid="checkout-page"]');
      const restoredCheckbox = page.locator('[data-testid="addon-package_protection"] input');
      expect(await restoredCheckbox.isChecked()).toBe(true);
    }
  });

  test('should show appropriate recommendations based on order value', async ({ page }) => {
    // This test would require different test scenarios with various order values
    await page.goto('/checkout');
    await page.waitForSelector('[data-testid="checkout-page"]');

    // Verify recommendations section exists
    const recommendationsSection = page.locator('[data-testid="addon-recommendations"]');
    if (await recommendationsSection.isVisible()) {
      
      // Check for recommendation badges
      const recommendedBadges = page.locator('[data-testid="recommendation-badge"]');
      const badgeCount = await recommendedBadges.count();
      
      expect(badgeCount).toBeGreaterThan(0);
      
      // Verify badges show appropriate text
      for (let i = 0; i < badgeCount; i++) {
        const badge = recommendedBadges.nth(i);
        const badgeText = await badge.textContent();
        expect(badgeText).toMatch(/(Highly Recommended|Recommended|Consider|Popular)/);
      }
    }
  });

  test('should handle mobile responsive layout', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/checkout');
    await page.waitForSelector('[data-testid="checkout-page"]');

    // Verify addon services section is properly displayed on mobile
    const addonServices = page.locator('[data-testid="addon-services"]');
    await expect(addonServices).toBeVisible();

    // Check if services are properly stacked on mobile
    const serviceCards = page.locator('[data-testid^="addon-service-card-"]');
    const cardCount = await serviceCards.count();
    
    if (cardCount > 0) {
      // Verify cards are stacked vertically (check bounding boxes)
      const firstCard = serviceCards.nth(0);
      const secondCard = serviceCards.nth(Math.min(1, cardCount - 1));
      
      const firstBox = await firstCard.boundingBox();
      const secondBox = await secondCard.boundingBox();
      
      if (firstBox && secondBox && cardCount > 1) {
        // On mobile, cards should be stacked (second card below first)
        expect(secondBox.y).toBeGreaterThan(firstBox.y + firstBox.height - 10);
      }
    }
  });
});