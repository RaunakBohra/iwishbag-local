# Quotes V2 Integration Guide

## Overview
The Quotes V2 system adds essential business logic features to your existing quotes system. This guide shows how to integrate these new features.

## Current Status

### ✅ What's Working
1. **Database Schema** - All new fields are added to quotes_v2 table
2. **Database Functions** - Share token generation, expiry checking, view tracking, reminders, version control
3. **RLS Policies** - Share token access policy is active
4. **TypeScript Types** - Complete type definitions in `src/types/quotes-v2.ts`
5. **Service Layer** - `QuoteV2Service` provides all functionality
6. **Demo Component** - Test all features at `/demo/quotes-v2`

### ⚠️ What Needs Integration
1. The quotes_v2 table has a different structure than expected (uses individual fields instead of JSONB for some data)
2. Need to update existing quote forms to use new fields
3. Need to integrate share token URLs into email templates

## Quick Test

Visit `/demo/quotes-v2` in your app to test all features:
- Create test quotes
- Generate share links
- Track views
- Send reminders
- Create revisions

## Integration Steps

### 1. Using Share Tokens in Your Quote Emails

```typescript
// When sending a quote email
const service = QuoteV2Service.getInstance();
const shareInfo = await service.generateShareLink(quoteId);

// Include in email
const emailContent = `
  View your quote: ${shareInfo.share_url}
  Valid until: ${new Date(shareInfo.expires_at).toLocaleDateString()}
`;
```

### 2. Public Quote View Page

Create a route to handle share tokens:

```typescript
// In your router
{
  path: 'quote/view/:token',
  element: <PublicQuoteView />,
}

// PublicQuoteView.tsx
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export function PublicQuoteView() {
  const { token } = useParams();
  const [quote, setQuote] = useState(null);
  
  useEffect(() => {
    const fetchQuote = async () => {
      const { data } = await supabase
        .from('quotes_v2')
        .select('*')
        .eq('share_token', token)
        .single();
      
      if (data) {
        // This also tracks the view
        setQuote(data);
      }
    };
    
    fetchQuote();
  }, [token]);
  
  // Render quote details...
}
```

### 3. Add Expiry to Quote Creation

```typescript
// In your quote creation form
const createQuote = async (formData) => {
  const quoteData = {
    ...formData,
    validity_days: 7, // Or from user input
    customer_message: formData.message,
    payment_terms: '50% advance, 50% on delivery',
  };
  
  const { data } = await supabase
    .from('quotes_v2')
    .insert(quoteData)
    .select()
    .single();
  
  // Share token and expiry are auto-generated
  console.log('Share URL:', `/quote/view/${data.share_token}`);
  console.log('Expires:', data.expires_at);
};
```

### 4. Track Quote Lifecycle

```typescript
// Send quote and track status
const sendQuote = async (quoteId: string) => {
  // Update status to 'sent'
  await supabase
    .from('quotes_v2')
    .update({ 
      status: 'sent',
      email_sent: true,
      sent_at: new Date().toISOString()
    })
    .eq('id', quoteId);
};

// Check if viewed
const checkQuoteStatus = async (quoteId: string) => {
  const { data } = await supabase
    .from('quotes_v2')
    .select('viewed_at, reminder_count')
    .eq('id', quoteId)
    .single();
  
  if (data.viewed_at) {
    console.log('Quote was viewed at:', data.viewed_at);
  }
};
```

### 5. Automated Reminders

```typescript
// Set up a cron job or scheduled function
const sendPendingReminders = async () => {
  // Get quotes that need reminders
  const { data: quotes } = await supabase
    .from('active_quotes')
    .select('*')
    .eq('status', 'sent')
    .lt('reminder_count', 3)
    .lt('created_at', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()); // 2 days old
  
  for (const quote of quotes) {
    await supabase.rpc('send_quote_reminder', { quote_id: quote.id });
    // Send actual email here
  }
};
```

### 6. Version Control for Quotes

```typescript
// Create a new version when customer requests changes
const reviseQuote = async (originalQuoteId: string, changes: any) => {
  const { data: newQuoteId } = await supabase
    .rpc('create_quote_revision', {
      original_quote_id: originalQuoteId,
      revision_reason: 'Customer requested changes'
    });
  
  // Apply changes to the new quote
  await supabase
    .from('quotes_v2')
    .update(changes)
    .eq('id', newQuoteId);
};

// View quote history
const getQuoteHistory = async (quoteId: string) => {
  const { data } = await supabase
    .from('quotes_v2')
    .select('*')
    .or(`id.eq.${quoteId},parent_quote_id.eq.${quoteId}`)
    .order('version');
  
  return data;
};
```

## Database Functions Reference

### Available RPC Functions

```sql
-- Generate unique share token
SELECT generate_quote_share_token();

-- Check if quote is expired
SELECT is_quote_expired('quote-uuid');

-- Track quote view
SELECT track_quote_view('quote-uuid', 'share-token');

-- Send reminder
SELECT send_quote_reminder('quote-uuid');

-- Create revision
SELECT create_quote_revision('original-quote-uuid', 'reason for revision');
```

### Available Views

```sql
-- Get all active (non-expired) quotes
SELECT * FROM active_quotes WHERE customer_id = 'user-uuid';
```

## Migration from Existing System

If you have existing quotes without these features:

```sql
-- Add share tokens to existing quotes
UPDATE quotes_v2 
SET share_token = generate_quote_share_token()
WHERE share_token IS NULL;

-- Set default validity for existing quotes
UPDATE quotes_v2
SET 
  validity_days = 7,
  expires_at = created_at + INTERVAL '7 days'
WHERE validity_days IS NULL;
```

## Testing Checklist

- [ ] Create a quote with custom validity period
- [ ] Generate and test share link
- [ ] Verify public access with share token
- [ ] Track view and verify timestamp update
- [ ] Send reminder and verify count increment
- [ ] Create revision and verify version history
- [ ] Test quote expiry after validity period
- [ ] Verify email_sent flag updates correctly

## Troubleshooting

### Share token not working?
- Check RLS policy: `SELECT * FROM pg_policies WHERE tablename = 'quotes_v2';`
- Verify token exists: `SELECT share_token FROM quotes_v2 WHERE id = 'quote-id';`

### Functions not found?
- Re-run migration: `psql -f supabase/migrations/20250731000000_enhance_quotes_v2_business_logic.sql`

### Trigger errors?
- Fix conflicts: `psql -f supabase/migrations/20250731000001_fix_quotes_v2_triggers.sql`

## Next Steps

1. Update your email templates to include share links
2. Add reminder scheduling to your backend
3. Create admin UI for managing quote versions
4. Set up monitoring for expired quotes
5. Add analytics for quote view rates