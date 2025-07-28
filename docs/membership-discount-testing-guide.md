# Membership & Discount System Testing Guide

## Overview
We've implemented a comprehensive membership and discount system for iwishBag with the following features:

### Membership System
- **iwishBag Plus**: Annual membership program ($99 USD / ₹4,999 INR / NPR 8,999)
- **Benefits**:
  - 2% additional discount on all orders
  - 90 days FREE warehouse storage (vs 7 days for non-members)
  - Free insurance on all shipments
  - Priority customer support
  - Early access to deals

### Discount System
- **Payment Method Discounts**: 2% off for bank/wire transfers
- **Welcome Discount**: 10% off first order (code: WELCOME2025)
- **Automated Discounts**: Applied based on membership, payment method, order size
- **Smart Stacking**: Discounts intelligently combine based on order value

## Quick Start Testing

### 1. Access the Test Page
Visit: http://localhost:8083/test-membership-discount

This page will:
- Run automated tests on all system components
- Show test results for membership status, discount calculations, and database integrity
- Provide quick links to admin and customer interfaces

### 2. Test Customer Experience

#### A. Non-Member Flow
1. **View Membership Benefits**
   - Go to `/dashboard/membership`
   - See upgrade prompt with regional pricing
   - Click "Become a Plus Member" to see benefits

2. **Test Discount Application**
   - Create a new quote
   - Select "Bank Transfer" as payment method
   - See automatic 2% discount in the breakdown
   - Try code `WELCOME2025` for additional 10% off

#### B. Plus Member Flow
1. **Create a Test Membership** (Admin)
   - Go to `/admin/memberships`
   - Click "Create Membership"
   - Enter customer email and select "iwishBag Plus"

2. **Verify Member Benefits**
   - Customer sees active membership badge
   - Automatic 2% discount on all orders
   - Additional 2% with bank transfer (4% total)
   - FREE 90-day warehouse storage shown

### 3. Test Admin Features

#### Membership Management (`/admin/memberships`)
- **Overview Tab**: See membership stats, revenue, churn rate
- **Members Tab**: Search members, update status, create memberships
- **Settings Tab**: Configure pricing and benefits

#### Discount Management (`/admin/discounts`)
- **Campaigns Tab**: View active campaigns, create new ones
- **Discount Codes**: Generate and manage promo codes
- **Analytics**: Track usage and effectiveness

### 4. Test Scenarios

#### Scenario 1: First-Time Customer (India)
1. Create quote as new user
2. Apply code `WELCOME2025` → 10% off
3. Select bank transfer → Additional 2% off
4. Total discount: 12% (stacked correctly)

#### Scenario 2: Plus Member Large Order
1. Login as Plus member
2. Create quote > $100
3. Discounts applied to total amount
4. Bank transfer adds to member discount

#### Scenario 3: Non-Member Small Order
1. Create quote < $100
2. Bank transfer discount applies to handling fee only
3. Upgrade prompt shown

### 5. Database Verification

Run these queries to verify data:

```sql
-- Check active membership plans
SELECT name, pricing FROM membership_plans WHERE is_active = true;

-- Check discount campaigns
SELECT name, campaign_type, is_active FROM discount_campaigns;

-- Check discount types
SELECT name, code, type, value FROM discount_types;

-- Verify a customer's membership
SELECT * FROM customer_memberships WHERE customer_id = 'YOUR_USER_ID';
```

### 6. Common Issues & Solutions

#### Issue: Discounts not applying
- Check if campaigns are active and within date range
- Verify customer eligibility (first order, membership status)
- Ensure payment method matches discount conditions

#### Issue: Membership benefits not showing
- Verify membership is active and not expired
- Check RLS policies are working correctly
- Ensure customer is logged in

#### Issue: RPC functions failing
- Run migration: `supabase db push`
- Check function permissions in Supabase dashboard
- Verify all required tables exist

### 7. Testing Checklist

- [ ] Non-member sees membership upgrade prompts
- [ ] Membership pricing shows in local currency
- [ ] Bank transfer discount applies automatically
- [ ] Welcome code works for new users only
- [ ] Plus members get 2% on all orders
- [ ] Discounts stack correctly by order size
- [ ] Warehouse benefits display properly
- [ ] Admin can create/manage memberships
- [ ] Admin can create discount campaigns
- [ ] Analytics track discount usage

## API Testing

### Check Membership Status
```javascript
const status = await MembershipService.checkMembershipStatus(customerId);
console.log(status); // { has_membership: true/false, ... }
```

### Calculate Discounts
```javascript
const discounts = await DiscountService.calculateDiscounts(
  customerId,
  quoteTotal,
  handlingFee,
  paymentMethod,
  destinationCountry
);
console.log(discounts); // { discounts: [...], total_discount: X }
```

### Validate Promo Code
```javascript
const validation = await DiscountService.validateDiscountCode('WELCOME2025', customerId);
console.log(validation); // { valid: true/false, discount: {...} }
```

## Next Steps

1. **Production Setup**:
   - Configure Stripe for membership payments
   - Set up automated renewal reminders
   - Create more discount campaigns

2. **Marketing**:
   - Announce Plus membership launch
   - Distribute welcome codes
   - Create member-exclusive campaigns

3. **Monitoring**:
   - Track membership conversion rates
   - Monitor discount usage patterns
   - Analyze impact on order values