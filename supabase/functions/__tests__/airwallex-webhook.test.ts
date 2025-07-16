import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Deno global
globalThis.Deno = {
  env: {
    get: vi.fn((key: string) => {
      if (key === 'SUPABASE_URL') return 'https://test.supabase.co';
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'test-service-role-key';
      return null;
    })
  }
} as any;

// Mock serve function
const mockServe = vi.fn();
vi.doMock('https://deno.land/std@0.168.0/http/server.ts', () => ({
  serve: mockServe
}));

// Mock Supabase client
const mockSupabaseClient = vi.fn();
vi.doMock('https://esm.sh/@supabase/supabase-js@2', () => ({
  createClient: mockSupabaseClient,
  SupabaseClient: class {}
}));

// Mock CORS headers
vi.doMock('../_shared/cors.ts', () => ({
  createWebhookHeaders: () => ({})
}));

// Mock atomic operations
vi.doMock('../airwallex-webhook/atomic-operations.ts', () => ({
  processPaymentIntentSucceeded: vi.fn().mockResolvedValue({ success: true }),
  processPaymentIntentFailed: vi.fn().mockResolvedValue({ success: true }),
  processRefundSucceeded: vi.fn().mockResolvedValue({ success: true }),
  processRefundFailed: vi.fn().mockResolvedValue({ success: true }),
  processDisputeCreated: vi.fn().mockResolvedValue({ success: true }),
  processDisputeUpdated: vi.fn().mockResolvedValue({ success: true })
}));

// Import the module after mocks are set up
import('../airwallex-webhook/index.ts');

describe('airwallex-webhook', () => {
  let handler: (req: Request) => Promise<Response>;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockInsert: ReturnType<typeof vi.fn>;
  let mockUpdate: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;
  let mockSingle: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockSupabaseInstance: SupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Capture the handler function passed to serve
    mockServe.mockImplementation((fn) => {
      handler = fn;
    });

    // Set up Supabase mock chain
    mockEq = vi.fn().mockReturnThis();
    mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    mockSelect = vi.fn().mockReturnThis();
    mockInsert = vi.fn().mockResolvedValue({ error: null });
    mockUpdate = vi.fn().mockReturnThis();
    mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'payment_gateways') {
        return { select: mockSelect, eq: mockEq, single: mockSingle };
      } else if (table === 'webhook_logs') {
        return { insert: mockInsert, update: mockUpdate, eq: mockEq };
      }
      return {};
    });

    mockSupabaseInstance = {
      from: mockFrom
    } as any;

    mockSupabaseClient.mockReturnValue(mockSupabaseInstance);

    // Re-import to apply mocks
    return import('../airwallex-webhook/index.ts');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Main webhook handler', () => {
    it('should reject non-POST requests', async () => {
      const req = new Request('https://example.com/webhook', {
        method: 'GET'
      });

      const response = await handler(req);

      expect(response.status).toBe(405);
      expect(await response.text()).toBe('Method not allowed');
    });

    it('should reject requests without signature header', async () => {
      const req = new Request('https://example.com/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test: 'data' })
      });

      const response = await handler(req);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('No signature');
    });

    it('should handle payment_gateways lookup failure', async () => {
      mockSingle.mockResolvedValue({ data: null, error: new Error('Database error') });

      const req = new Request('https://example.com/webhook', {
        method: 'POST',
        headers: {
          'x-airwallex-signature': 't=1234567890,v1=test_signature'
        },
        body: JSON.stringify({ test: 'data' })
      });

      const response = await handler(req);

      expect(response.status).toBe(500);
      expect(await response.text()).toBe('Configuration error');
    });

    it('should handle missing webhook secret', async () => {
      mockSingle.mockResolvedValue({
        data: {
          config: {
            // No webhook_secret
          },
          test_mode: true
        },
        error: null
      });

      const req = new Request('https://example.com/webhook', {
        method: 'POST',
        headers: {
          'x-airwallex-signature': 't=1234567890,v1=test_signature'
        },
        body: JSON.stringify({ test: 'data' })
      });

      const response = await handler(req);

      expect(response.status).toBe(500);
      expect(await response.text()).toBe('Configuration incomplete');
    });

    it('should reject invalid signatures', async () => {
      mockSingle.mockResolvedValue({
        data: {
          config: {
            test_webhook_secret: 'test_secret'
          },
          test_mode: true
        },
        error: null
      });

      const req = new Request('https://example.com/webhook', {
        method: 'POST',
        headers: {
          'x-airwallex-signature': 't=1234567890,v1=invalid_signature'
        },
        body: JSON.stringify({ test: 'data' })
      });

      const response = await handler(req);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Invalid signature');
    });

    it('should handle invalid JSON body', async () => {
      // Mock a valid signature verification
      const validTimestamp = Math.floor(Date.now() / 1000).toString();
      const payload = 'invalid json';
      const secret = 'test_secret';
      
      // Generate a valid signature for the invalid JSON
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(`${validTimestamp}.${payload}`)
      );
      
      const signature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      mockSingle.mockResolvedValue({
        data: {
          config: {
            test_webhook_secret: secret
          },
          test_mode: true
        },
        error: null
      });

      const req = new Request('https://example.com/webhook', {
        method: 'POST',
        headers: {
          'x-airwallex-signature': `t=${validTimestamp},v1=${signature}`
        },
        body: payload
      });

      const response = await handler(req);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Invalid JSON');
    });

    it('should successfully process payment_intent.succeeded event', async () => {
      const validTimestamp = Math.floor(Date.now() / 1000).toString();
      const eventData = {
        id: 'evt_test_123',
        name: 'payment_intent.succeeded',
        account_id: 'acc_test_456',
        data: {
          object: {
            id: 'pi_test_789',
            amount: 10000,
            currency: 'USD',
            status: 'succeeded'
          }
        },
        created_at: new Date().toISOString(),
        version: '2023-10-01'
      };
      const payload = JSON.stringify(eventData);
      const secret = 'test_secret';
      
      // Generate valid signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(`${validTimestamp}.${payload}`)
      );
      
      const signature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      mockSingle.mockResolvedValue({
        data: {
          config: {
            test_webhook_secret: secret
          },
          test_mode: true
        },
        error: null
      });

      const req = new Request('https://example.com/webhook', {
        method: 'POST',
        headers: {
          'x-airwallex-signature': `t=${validTimestamp},v1=${signature}`,
          'user-agent': 'Airwallex-Webhook/1.0'
        },
        body: payload
      });

      const response = await handler(req);
      
      if (response.status !== 200) {
        const errorText = await response.text();
        console.error('Webhook test error:', errorText);
      }
      
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData).toEqual({
        received: true,
        processed: true,
        error: undefined
      });

      // Verify webhook_logs interactions
      expect(mockFrom).toHaveBeenCalledWith('webhook_logs');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        webhook_type: 'airwallex',
        status: 'processing',
        user_agent: 'Airwallex-Webhook/1.0'
      }));
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: 'completed',
        error_message: null
      }));
    });

    it('should handle unhandled event types gracefully', async () => {
      const validTimestamp = Math.floor(Date.now() / 1000).toString();
      const eventData = {
        id: 'evt_test_unknown',
        name: 'unknown.event.type',
        account_id: 'acc_test_456',
        data: {
          object: {
            id: 'obj_test_789'
          }
        },
        created_at: new Date().toISOString(),
        version: '2023-10-01'
      };
      const payload = JSON.stringify(eventData);
      const secret = 'test_secret';
      
      // Generate valid signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(`${validTimestamp}.${payload}`)
      );
      
      const signature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      mockSingle.mockResolvedValue({
        data: {
          config: {
            test_webhook_secret: secret
          },
          test_mode: true
        },
        error: null
      });

      const req = new Request('https://example.com/webhook', {
        method: 'POST',
        headers: {
          'x-airwallex-signature': `t=${validTimestamp},v1=${signature}`
        },
        body: payload
      });

      const response = await handler(req);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.processed).toBe(true);
    });

    it('should continue processing if webhook_logs insert fails', async () => {
      const validTimestamp = Math.floor(Date.now() / 1000).toString();
      const eventData = {
        id: 'evt_test_log_fail',
        name: 'payment_intent.succeeded',
        account_id: 'acc_test_456',
        data: {
          object: {
            id: 'pi_test_789'
          }
        },
        created_at: new Date().toISOString(),
        version: '2023-10-01'
      };
      const payload = JSON.stringify(eventData);
      const secret = 'test_secret';
      
      // Generate valid signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(`${validTimestamp}.${payload}`)
      );
      
      const signature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      mockSingle.mockResolvedValue({
        data: {
          config: {
            test_webhook_secret: secret
          },
          test_mode: true
        },
        error: null
      });

      // Make webhook_logs insert fail
      mockInsert.mockResolvedValue({ error: new Error('Insert failed') });

      const req = new Request('https://example.com/webhook', {
        method: 'POST',
        headers: {
          'x-airwallex-signature': `t=${validTimestamp},v1=${signature}`
        },
        body: payload
      });

      const response = await handler(req);

      expect(response.status).toBe(200);
      expect(mockUpdate).not.toHaveBeenCalled(); // Update shouldn't be called if insert failed
    });

    it('should accept X-Airwallex-Signature header (capital X)', async () => {
      const validTimestamp = Math.floor(Date.now() / 1000).toString();
      const eventData = {
        id: 'evt_test_capital',
        name: 'payment_intent.succeeded',
        account_id: 'acc_test_456',
        data: { object: {} },
        created_at: new Date().toISOString(),
        version: '2023-10-01'
      };
      const payload = JSON.stringify(eventData);
      const secret = 'test_secret';
      
      // Generate valid signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(`${validTimestamp}.${payload}`)
      );
      
      const signature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      mockSingle.mockResolvedValue({
        data: {
          config: { test_webhook_secret: secret },
          test_mode: true
        },
        error: null
      });

      const req = new Request('https://example.com/webhook', {
        method: 'POST',
        headers: {
          'X-Airwallex-Signature': `t=${validTimestamp},v1=${signature}` // Capital X
        },
        body: payload
      });

      const response = await handler(req);

      expect(response.status).toBe(200);
    });
  });

  describe('verifyAirwallexWebhookSignature', () => {
    // Import the function directly for testing
    let verifyAirwallexWebhookSignature: (
      signature: string,
      secret: string,
      payload: string
    ) => Promise<boolean>;

    beforeEach(async () => {
      // Extract the function from the module
      const module = await import('../airwallex-webhook/index.ts');
      // Since the function is not exported, we'll test it through the main handler
      // For these tests, we'll use the handler's behavior to verify the function works correctly
    });

    it('should verify a valid signature', async () => {
      const validTimestamp = Math.floor(Date.now() / 1000).toString();
      const payload = '{"test":"data"}';
      const secret = 'test_webhook_secret';
      
      // Generate valid signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(`${validTimestamp}.${payload}`)
      );
      
      const validSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      mockSingle.mockResolvedValue({
        data: {
          config: { test_webhook_secret: secret },
          test_mode: true
        },
        error: null
      });

      const req = new Request('https://example.com/webhook', {
        method: 'POST',
        headers: {
          'x-airwallex-signature': `t=${validTimestamp},v1=${validSignature}`
        },
        body: payload
      });

      const response = await handler(req);

      // If signature is valid, it should proceed past signature verification
      expect(response.status).not.toBe(400);
    });

    it('should reject signature with missing timestamp', async () => {
      mockSingle.mockResolvedValue({
        data: {
          config: { test_webhook_secret: 'secret' },
          test_mode: true
        },
        error: null
      });

      const req = new Request('https://example.com/webhook', {
        method: 'POST',
        headers: {
          'x-airwallex-signature': 'v1=some_signature' // Missing t=
        },
        body: '{"test":"data"}'
      });

      const response = await handler(req);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Invalid signature');
    });

    it('should reject signature with missing v1', async () => {
      mockSingle.mockResolvedValue({
        data: {
          config: { test_webhook_secret: 'secret' },
          test_mode: true
        },
        error: null
      });

      const req = new Request('https://example.com/webhook', {
        method: 'POST',
        headers: {
          'x-airwallex-signature': 't=1234567890' // Missing v1=
        },
        body: '{"test":"data"}'
      });

      const response = await handler(req);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Invalid signature');
    });

    it('should reject tampered signature', async () => {
      const validTimestamp = Math.floor(Date.now() / 1000).toString();
      
      mockSingle.mockResolvedValue({
        data: {
          config: { test_webhook_secret: 'secret' },
          test_mode: true
        },
        error: null
      });

      const req = new Request('https://example.com/webhook', {
        method: 'POST',
        headers: {
          'x-airwallex-signature': `t=${validTimestamp},v1=tampered_signature_value`
        },
        body: '{"test":"data"}'
      });

      const response = await handler(req);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Invalid signature');
    });

    it('should reject timestamp outside tolerance (too old)', async () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
      const payload = '{"test":"data"}';
      const secret = 'test_webhook_secret';
      
      // Generate signature with old timestamp
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(`${oldTimestamp}.${payload}`)
      );
      
      const signature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      mockSingle.mockResolvedValue({
        data: {
          config: { test_webhook_secret: secret },
          test_mode: true
        },
        error: null
      });

      const req = new Request('https://example.com/webhook', {
        method: 'POST',
        headers: {
          'x-airwallex-signature': `t=${oldTimestamp},v1=${signature}`
        },
        body: payload
      });

      const response = await handler(req);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Invalid signature');
    });

    it('should reject timestamp outside tolerance (too far in future)', async () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 400; // 400 seconds in future
      const payload = '{"test":"data"}';
      const secret = 'test_webhook_secret';
      
      // Generate signature with future timestamp
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(`${futureTimestamp}.${payload}`)
      );
      
      const signature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      mockSingle.mockResolvedValue({
        data: {
          config: { test_webhook_secret: secret },
          test_mode: true
        },
        error: null
      });

      const req = new Request('https://example.com/webhook', {
        method: 'POST',
        headers: {
          'x-airwallex-signature': `t=${futureTimestamp},v1=${signature}`
        },
        body: payload
      });

      const response = await handler(req);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Invalid signature');
    });

    it('should handle empty webhook secret', async () => {
      mockSingle.mockResolvedValue({
        data: {
          config: { test_webhook_secret: '' }, // Empty secret
          test_mode: true
        },
        error: null
      });

      const req = new Request('https://example.com/webhook', {
        method: 'POST',
        headers: {
          'x-airwallex-signature': 't=1234567890,v1=some_signature'
        },
        body: '{"test":"data"}'
      });

      const response = await handler(req);

      expect(response.status).toBe(500);
      expect(await response.text()).toBe('Configuration incomplete');
    });
  });
});