import { Page, expect } from '@playwright/test';

/**
 * E2E Test Helpers for iwishBag Cart Operations
 */

/**
 * Add a quote to cart
 */
export async function addQuoteToCart(page: Page, quoteId?: string) {
  // If specific quote ID provided, navigate to it
  if (quoteId) {
    await page.goto(`/quotes/${quoteId}`);
  }
  
  // Find and click add to cart button
  const addToCartButton = page.getByRole('button', { name: /add to cart/i });
  await expect(addToCartButton).toBeVisible();
  await addToCartButton.click();
  
  // Wait for success indication
  await expect(page.getByText(/added to cart|item added/i).first()).toBeVisible({ timeout: 5000 });
}

/**
 * Navigate to cart page
 */
export async function goToCart(page: Page) {
  const cartIcon = page.locator('[data-testid="cart-icon"]')
    .or(page.getByRole('link', { name: /cart|shopping cart/i }));
    
  await cartIcon.click();
  await expect(page.getByText(/shopping cart|cart/i)).toBeVisible();
}

/**
 * Get cart item count
 */
export async function getCartItemCount(page: Page): Promise<number> {
  const cartIcon = page.locator('[data-testid="cart-icon"]');
  
  try {
    const countText = await cartIcon.textContent();
    const count = countText?.match(/\d+/)?.[0];
    return count ? parseInt(count, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Proceed to checkout from cart
 */
export async function proceedToCheckout(page: Page) {
  await goToCart(page);
  
  const checkoutButton = page.getByRole('button', { name: /checkout|proceed to checkout/i });
  await expect(checkoutButton).toBeVisible();
  await checkoutButton.click();
  
  // Verify we're on checkout page
  await expect(page.getByText(/checkout|order summary/i)).toBeVisible();
}

/**
 * Clear cart
 */
export async function clearCart(page: Page) {
  await goToCart(page);
  
  // Look for remove buttons or clear cart button
  const removeButtons = page.getByRole('button', { name: /remove|delete/i });
  const clearButton = page.getByRole('button', { name: /clear cart|empty cart/i });
  
  if (await clearButton.isVisible()) {
    await clearButton.click();
  } else {
    // Remove items individually
    const count = await removeButtons.count();
    for (let i = 0; i < count; i++) {
      await removeButtons.first().click();
    }
  }
  
  // Verify cart is empty
  await expect(page.getByText(/cart is empty|no items/i)).toBeVisible();
}