# Testing Guide: Discount & Membership System

## 🚀 Quick Start Testing

### 1. Apply Database Migration

First, apply the new database schema:

```bash
# Apply the membership and discount system migration
supabase db push

# Or if you need to apply manually:
PGPASSWORD=postgres psql -h localhost -p 54322 -d postgres -U postgres -f supabase/migrations/20250128000024_membership_discount_system.sql
```

### 2. Verify Database Setup

Run these queries in Supabase SQL Editor to verify:

```sql
-- Check if tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('membership_plans', 'customer_memberships', 'discount_campaigns', 'discount_codes');

-- Check if iwishBag Plus plan exists
SELECT * FROM membership_plans WHERE slug = 'plus';

-- Check payment method discounts
SELECT * FROM payment_method_discounts;

-- Check RPC functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_membership_stats', 'get_discount_stats', 'check_customer_membership', 'calculate_applicable_discounts');
```

## 🧪 Testing Scenarios

### A. Admin Side Testing

#### 1. **Access Admin Panels**
- Navigate to `/admin/memberships` - Membership Management
- Navigate to `/admin/discounts` - Discount Management

#### 2. **Test Membership Management**

**Create a Test Membership:**
1. Go to Membership Management
2. Click "Create Membership" 
3. Enter a customer email (must exist in profiles table)
4. Select "iwishBag Plus" plan
5. Click Create

**View Stats:**
- Check the overview cards for member count, revenue, etc.
- Review recent memberships list

#### 3. **Test Discount Management**

**Create a Test Campaign:**
1. Go to Discount Management
2. Click "Create Campaign"
3. Fill in:
   - Name: "Test 10% Off"
   - Type: Manual
   - Discount: 10% 
   - Start Date: Today
   - Auto-apply: OFF (so you can test with code)
4. Create the campaign

**Create a Discount Code:**
1. Click "Create Code" in the Codes tab
2. Select your test campaign
3. Use code: "TEST10"
4. Set usage limit: 10
5. Create

### B. Customer Side Testing

#### 1. **Test Membership Dashboard**

**As Non-Member:**
1. Login as a regular user
2. Go to dashboard and click "Plus" tab
3. You should see:
   - Upgrade prompt with regional pricing
   - Benefits list
   - ROI calculator

**Create Test Plus Member:**
```sql
-- Make yourself a Plus member for testing
INSERT INTO customer_memberships (customer_id, plan_id, status, expires_at, auto_renew)
SELECT 
  (SELECT id FROM profiles WHERE email = 'your-email@example.com'),
  (SELECT id FROM membership_plans WHERE slug = 'plus'),
  'active',
  CURRENT_TIMESTAMP + INTERVAL '365 days',
  true;
```

**As Plus Member:**
1. Refresh and go to Plus tab
2. You should see:
   - Active membership status
   - Days remaining
   - Usage statistics
   - Active benefits

#### 2. **Test Discount Application**

**Create a Test Quote:**
1. Create a new quote as normal
2. Add items worth $100+
3. In the calculation, you should see:

**For Plus Members:**
- Automatic 2% membership discount applied
- If using bank_transfer: Additional 2% (4% total)

**Test Discount Code:**
1. Look for the discount section in quote details
2. Enter code "TEST10"
3. Click Apply
4. Should see 10% discount added

**Test Order Size Logic:**
- Small order (<$500): Discounts apply to handling fee only
- Large order (≥$500): Discounts apply to total (capped)

### C. Integration Testing

#### 1. **Test SmartCalculationEngine Integration**

Monitor the console/logs when calculating a quote:
```
[DISCOUNT CALCULATION] {
  customer_id: "xxx",
  subtotal: 150,
  handling_fee: 22.5,
  total_discount: 3,
  discounts_applied: [
    { source: "membership", type: "percentage", value: 2, amount: 3 }
  ]
}
```

#### 2. **Test Payment Method Discounts**

1. Create a quote
2. Change payment method between:
   - Credit Card (no discount)
   - Bank Transfer (2% discount)
   - For Plus members: Should stack to 4%

#### 3. **Test Warehouse Benefits**

For Plus members, check package forwarding:
```sql
-- Check storage fee calculation for a Plus member
SELECT * FROM calculate_storage_fees(
  'customer-id-here',
  'package-id-here', 
  100 -- days stored
);
-- Should show 90 free days for Plus members
```

## 📊 Verification Queries

### Check Active Discounts for a Customer
```sql
-- See what discounts would apply
SELECT * FROM calculate_applicable_discounts(
  'customer-id-here',
  1000.00, -- quote total
  150.00,  -- handling fee
  'bank_transfer',
  'US'
);
```

### View Membership Stats
```sql
SELECT * FROM get_membership_stats();
```

### View Discount Stats
```sql
SELECT * FROM get_discount_stats();
```

## 🐛 Common Issues & Solutions

### 1. **Discounts Not Showing**
- Check if customer_id is passed to DiscountDisplay component
- Verify customer has active membership (for member discount)
- Check campaign is active and within date range

### 2. **Migration Errors**
- If functions already exist, drop and recreate:
```sql
DROP FUNCTION IF EXISTS get_membership_stats() CASCADE;
DROP FUNCTION IF EXISTS calculate_applicable_discounts(UUID, DECIMAL, DECIMAL, TEXT, TEXT) CASCADE;
-- Then rerun migration
```

### 3. **Membership Not Showing as Active**
- Check expires_at is in future
- Verify status = 'active'
- Clear service cache: Open console and run:
```javascript
localStorage.clear(); // Clear any cached data
```

## 🧪 Test Data Generator

Create test data quickly:

```sql
-- Create test discount campaign
INSERT INTO discount_types (name, code, type, value, conditions)
VALUES ('Summer Sale', 'SUMMER20', 'percentage', 20, '{"min_order": 50}');

INSERT INTO discount_campaigns (
  name, description, discount_type_id, campaign_type,
  start_date, end_date, auto_apply, is_active
)
SELECT 
  'Summer Sale 2024',
  '20% off all orders over $50',
  id,
  'seasonal',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  true,
  true
FROM discount_types WHERE code = 'SUMMER20';

-- Create test discount code
INSERT INTO discount_codes (code, campaign_id, discount_type_id, usage_limit)
SELECT 
  'SAVE20',
  dc.id,
  dc.discount_type_id,
  100
FROM discount_campaigns dc
WHERE dc.name = 'Summer Sale 2024';
```

## 🔍 Debugging Tips

1. **Enable Console Logging:**
   - Open browser DevTools
   - Watch for `[DISCOUNT CALCULATION]` logs
   - Check for `[MEMBERSHIP STATUS]` logs

2. **Check Network Tab:**
   - Look for RPC calls to Supabase
   - Verify responses from `calculate_applicable_discounts`

3. **Service Testing in Console:**
```javascript
// Test membership service
const { MembershipService } = await import('/src/services/MembershipService.ts');
const status = await MembershipService.checkMembershipStatus('your-user-id');
console.log('Membership status:', status);

// Test discount service  
const { DiscountService } = await import('/src/services/DiscountService.ts');
const validation = await DiscountService.validateDiscountCode('TEST10', 'your-user-id');
console.log('Code validation:', validation);
```

## ✅ Testing Checklist

- [ ] Database migration applied successfully
- [ ] Admin panels accessible at `/admin/memberships` and `/admin/discounts`
- [ ] Can create membership manually in admin
- [ ] Can create discount campaign and codes
- [ ] Customer sees Plus tab in dashboard
- [ ] Non-members see upgrade prompt
- [ ] Plus members see active benefits
- [ ] Membership discount auto-applies (2%)
- [ ] Bank transfer discount works (2%)
- [ ] Discounts stack correctly (4% for Plus + bank transfer)
- [ ] Discount codes can be applied
- [ ] Small orders discount handling fee only
- [ ] Large orders discount total (with cap)
- [ ] Stats and analytics display correctly

## 🎯 Expected Results

When everything is working:

1. **Plus Member + Bank Transfer on $200 order:**
   - Items: $200
   - Handling (15%): $30
   - Membership discount (2%): -$4.60 (on handling for small order)
   - Bank transfer discount (2%): -$4.60 (on handling for small order)
   - Total savings: $9.20

2. **Plus Member + Bank Transfer on $1000 order:**
   - Items: $1000
   - Handling (15%): $150
   - Membership discount (2%): -$20 (on total for large order)
   - Bank transfer discount (2%): -$20 (on total for large order)
   - Total savings: $40 (capped if exceeds 50% of handling)

Happy testing! 🚀