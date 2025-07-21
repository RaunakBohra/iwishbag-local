import { Page, expect } from '@playwright/test';

/**
 * E2E Test Helpers for iwishBag Authentication
 */

export interface TestUser {
  email: string;
  password: string;
  name: string;
  role?: 'user' | 'admin' | 'moderator';
}

// Test user accounts - these should be created in your test database
export const TEST_USERS: Record<string, TestUser> = {
  customer: {
    email: 'test.customer@iwishbag.com',
    password: 'TestPassword123!',
    name: 'Test Customer',
    role: 'user',
  },
  admin: {
    email: 'test.admin@iwishbag.com', 
    password: 'AdminPassword123!',
    name: 'Test Admin',
    role: 'admin',
  },
};

/**
 * Login helper function
 */
export async function login(page: Page, user: TestUser) {
  // Navigate to login page
  await page.goto('/login');
  
  // Fill login form
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  
  // Submit form
  await page.getByRole('button', { name: /sign in|login/i }).click();
  
  // Wait for successful login - adjust selector based on your app
  await expect(page.getByText(/dashboard|my account|welcome/i).first()).toBeVisible({ timeout: 10000 });
  
  return page;
}

/**
 * Logout helper function
 */
export async function logout(page: Page) {
  // Look for logout button/link - adjust selector based on your app
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i })
    .or(page.getByRole('link', { name: /logout|sign out/i }));
  
  await logoutButton.click();
  
  // Verify logout successful
  await expect(page.getByRole('link', { name: /sign in|login/i })).toBeVisible();
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.getByText(/dashboard|my account|welcome/i).first().waitFor({ timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Navigate to user dashboard
 */
export async function goToDashboard(page: Page) {
  await page.getByRole('link', { name: /dashboard|my account/i }).click();
  await expect(page.getByText(/dashboard|my quotes/i)).toBeVisible();
}