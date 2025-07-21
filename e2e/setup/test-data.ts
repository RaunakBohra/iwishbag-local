import { supabase } from '../../src/integrations/supabase/client';

/**
 * E2E Test Data Setup for iwishBag
 * 
 * This file contains utilities for setting up test data in the database
 * before running E2E tests.
 */

export interface TestQuote {
  id?: string;
  user_id: string;
  status: string;
  final_total_usd: number;
  destination_country: string;
  origin_country: string;
  items: Array<{
    name: string;
    price_usd: number;
    quantity: number;
    weight_kg: number;
  }>;
}

/**
 * Create a test quote for E2E testing
 */
export async function createTestQuote(userId: string, overrides?: Partial<TestQuote>): Promise<string> {
  const quote: TestQuote = {
    user_id: userId,
    status: 'approved', // Important: needs to be approved for cart testing
    final_total_usd: 150.00,
    destination_country: 'IN',
    origin_country: 'US',
    items: [
      {
        name: 'Test Product for E2E',
        price_usd: 100.00,
        quantity: 1,
        weight_kg: 2.0,
      }
    ],
    ...overrides,
  };

  const { data, error } = await supabase
    .from('quotes')
    .insert(quote)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test quote: ${error.message}`);
  }

  return data.id;
}

/**
 * Create or get test user
 */
export async function createTestUser(email: string, password: string): Promise<string> {
  // First try to sign up the user
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: 'Test User',
        role: 'user',
      }
    }
  });

  if (signUpError && !signUpError.message.includes('already registered')) {
    throw new Error(`Failed to create test user: ${signUpError.message}`);
  }

  // If signup succeeded, return the user ID
  if (signUpData.user) {
    return signUpData.user.id;
  }

  // If user already exists, sign them in to get the ID
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    throw new Error(`Failed to sign in test user: ${signInError.message}`);
  }

  return signInData.user.id;
}

/**
 * Clean up test data after tests
 */
export async function cleanupTestData(userId: string) {
  // Clean up quotes created by test user
  await supabase
    .from('quotes')
    .delete()
    .eq('user_id', userId);

  // Clean up any other test data as needed
  // Note: Be careful not to delete production data
}

/**
 * Setup test data for Golden Path test
 */
export async function setupGoldenPathTestData() {
  const testUserEmail = 'test.customer@iwishbag.com';
  const testUserPassword = 'TestPassword123!';

  try {
    // Create or get test user
    const userId = await createTestUser(testUserEmail, testUserPassword);
    
    // Create an approved quote for the user
    const quoteId = await createTestQuote(userId, {
      status: 'approved',
      final_total_usd: 299.99,
      items: [
        {
          name: 'Premium Headphones',
          price_usd: 250.00,
          quantity: 1,
          weight_kg: 0.8,
        }
      ]
    });

    console.log(`✅ Test data setup complete:`);
    console.log(`   User: ${testUserEmail}`);
    console.log(`   Quote ID: ${quoteId}`);
    
    return { userId, quoteId };
  } catch (error) {
    console.error('❌ Failed to setup test data:', error);
    throw error;
  }
}

/**
 * Check if we're in a test environment
 */
export function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test' || 
         process.env.PLAYWRIGHT_TEST === 'true' ||
         process.env.CI === 'true';
}