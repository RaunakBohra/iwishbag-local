# Multi-Currency Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Pre-Implementation Checklist](#pre-implementation-checklist)
3. [Phase 0: Cleanup & Removal](#phase-0-cleanup--removal)
4. [Phase 0.5: Compatibility Layer & Safe Migration](#phase-05-compatibility-layer--safe-migration)
5. [Phase 1: Database Schema](#phase-1-database-schema)
6. [Phase 2: Exchange Rate Management](#phase-2-exchange-rate-management)
7. [Phase 3: Company Routing](#phase-3-company-routing)
8. [Phase 4: Purchase Readiness Dashboard](#phase-4-purchase-readiness-dashboard)
9. [Phase 5: Settlement & Reconciliation](#phase-5-settlement--reconciliation)
10. [Phase 6: Currency Display](#phase-6-currency-display)
11. [Phase 7: Migration](#phase-7-migration)
12. [Phase 8: Monitoring & Alerts](#phase-8-monitoring--alerts)
13. [Testing Strategy](#testing-strategy)
14. [Rollback Plan](#rollback-plan)
15. [Success Metrics](#success-metrics)

## Overview

This guide outlines the implementation of a comprehensive multi-currency system for iwishBag, addressing:
- Multi-company operations (Nepal, India, Singapore)
- Automated currency routing and reconciliation
- Exchange rate locking with dynamic duration
- Real-time purchase readiness tracking
- FX risk management and profit visibility

### Key Business Rules
1. **Company Routing**:
   - Nepal company handles NPR transactions
   - India company handles INR transactions  
   - Singapore company handles all other currencies
   
2. **Exchange Rates**:
   - INR-NPR fixed at 1:1.6
   - Dynamic rates with margins: 2% NPR, 2.5% volatile, 1.5% stable
   - Rate locking based on order value and volatility

3. **Settlement**:
   - Weekly settlements with manual approval
   - FX gain/loss tracking
   - Automated remittance notifications

## Pre-Implementation Checklist

- [ ] Backup production database
- [ ] Create staging environment for testing
- [ ] Notify team about upcoming changes
- [ ] Review and understand current payment flow
- [ ] Identify all hardcoded currency mappings
- [ ] Document current exchange rate sources
- [ ] Set up monitoring for migration

## Phase 0: Cleanup & Removal

### Files to Remove Completely
```bash
# Remove these files after confirming no dependencies
rm src/hooks/useQuoteDisplayCurrency.ts
rm src/lib/countryToCurrency.ts  # If exists
```

### Files to Refactor
1. **src/lib/currencyUtils.ts**
   - Remove all hardcoded country-to-currency mappings
   - Remove `getCountryToCurrencyMapping()`
   - Update to use CurrencyService exclusively

2. **src/components/forms/QuoteForm.tsx**
   - Remove country-based currency assumptions
   - Add purchase source field

3. **src/pages/admin/ExchangeRates.tsx**
   - Add company context
   - Support direct rate management

### Database Cleanup
```sql
-- Remove after data migration
ALTER TABLE shipping_routes DROP COLUMN exchange_rate CASCADE;

-- Remove currency constraints
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_preferred_display_currency_check;

-- Archive old data
CREATE TABLE archived_exchange_rates AS 
SELECT * FROM shipping_routes WHERE exchange_rate IS NOT NULL;
```

### Deprecated Functions
Mark these as deprecated with clear migration paths:
```typescript
// @deprecated Use exchangeRateService.getExchangeRate() instead
function getHardcodedExchangeRate() { }

// @deprecated Use companyRoutingService.getSettlementCurrency() instead  
function calculateQuoteInDestinationCurrency() { }
```

## Phase 0.5: Compatibility Layer & Safe Migration

### Overview
This phase ensures safe migration from the existing system to the new multi-currency system without breaking current functionality. We'll run both systems in parallel, monitor differences, and gradually switch over.

### Critical Systems to Handle With Care

#### 1. **Existing Blockers Analysis**

**Hardcoded Country-to-Currency Mappings**
```typescript
// ⚠️ BLOCKER: Found in multiple files
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  'US': 'USD',
  'IN': 'INR', 
  'NP': 'NPR',
  // ... hardcoded list
};

// Files affected:
// - src/hooks/useQuoteDisplayCurrency.ts (REMOVE)
// - src/lib/currencyUtils.ts (REFACTOR)
// - Components using getCurrencyForCountry()
```

**Exchange Rate in Shipping Routes**
```sql
-- Current system mixes shipping with currency
shipping_routes.exchange_rate -- DEPRECATE THIS

-- Safe migration approach:
-- 1. Copy rates to new system
-- 2. Run parallel for verification
-- 3. Remove only after confirmation
```

**Profile Currency Constraints**
```sql
-- MUST REMOVE: Blocks dynamic currencies
ALTER TABLE profiles 
DROP CONSTRAINT profiles_preferred_display_currency_check;
```

#### 2. **Compatibility Layer Implementation**

Create a compatibility layer to run both systems:

```typescript
// src/lib/currencyCompatibility.ts
import { logger } from '@/services/LoggingService';
import { companyRoutingService } from '@/services/CompanyRoutingService';
import { getFeatureFlag } from '@/config/featureFlags';

export class CurrencyCompatibilityLayer {
  private static instance: CurrencyCompatibilityLayer;
  
  static getInstance(): CurrencyCompatibilityLayer {
    if (!CurrencyCompatibilityLayer.instance) {
      CurrencyCompatibilityLayer.instance = new CurrencyCompatibilityLayer();
    }
    return CurrencyCompatibilityLayer.instance;
  }

  // Run both old and new systems, log differences
  async getCurrencyWithFallback(
    country: string, 
    company?: string,
    context?: {
      userId?: string;
      quoteId?: string;
      source?: string;
    }
  ) {
    // Old system result
    const oldCurrency = this.getOldCountryCurrency(country);
    
    // New system result
    const newCurrency = company ? 
      await companyRoutingService.getSettlementCurrency(company) : 
      await this.getNewCountryCurrency(country);
    
    // Log mismatches for monitoring
    if (oldCurrency !== newCurrency) {
      logger.warn('Currency system mismatch detected', {
        country,
        company,
        oldCurrency,
        newCurrency,
        context,
        timestamp: new Date()
      });
      
      // Track in database for analysis
      await this.trackMismatch({
        type: 'currency_selection',
        old_value: oldCurrency,
        new_value: newCurrency,
        context
      });
    }
    
    // Use feature flag to control which to return
    const useNewSystem = await getFeatureFlag('use-new-currency-system', context?.userId);
    return useNewSystem ? newCurrency : oldCurrency;
  }

  // Gradual migration helper
  async shouldUseNewSystem(feature: string, userId?: string): Promise<boolean> {
    return getFeatureFlag(`currency-${feature}`, userId);
  }

  // Old system (to be removed)
  private getOldCountryCurrency(country: string): string {
    const mapping: Record<string, string> = {
      'US': 'USD',
      'IN': 'INR',
      'NP': 'NPR',
      // ... existing mappings
    };
    return mapping[country] || 'USD';
  }

  // New system
  private async getNewCountryCurrency(country: string): Promise<string> {
    return currencyService.getCurrencyForCountry(country);
  }
}

export const currencyCompatibility = CurrencyCompatibilityLayer.getInstance();
```

#### 3. **Feature Flag System**

```typescript
// src/config/featureFlags.ts
interface FeatureFlags {
  // Core features
  'use-new-currency-system': boolean;
  'use-company-routing': boolean;
  'use-rate-locking': boolean;
  'show-triple-currency': boolean;
  
  // Component-specific flags
  'currency-quote-display': boolean;
  'currency-payment-gateway': boolean;
  'currency-settlement': boolean;
}

// Progressive rollout configuration
export const ROLLOUT_SCHEDULE = {
  'use-new-currency-system': {
    week1: { percentage: 0, userGroups: ['internal'] },
    week2: { percentage: 10, userGroups: ['beta'] },
    week3: { percentage: 50, userGroups: ['all'] },
    week4: { percentage: 100, userGroups: ['all'] }
  }
};

export async function getFeatureFlag(
  flag: keyof FeatureFlags, 
  userId?: string
): Promise<boolean> {
  // Check user-specific overrides
  if (userId) {
    const override = await checkUserOverride(flag, userId);
    if (override !== null) return override;
  }
  
  // Check rollout percentage
  const rollout = ROLLOUT_SCHEDULE[flag];
  if (rollout) {
    return checkRolloutStatus(rollout, userId);
  }
  
  // Default to false for safety
  return false;
}
```

#### 4. **Gradual Component Migration**

Update components one by one with fallback:

```typescript
// Example: Updating Quote Display Component
// src/components/QuoteBreakdown.tsx

import { currencyCompatibility } from '@/lib/currencyCompatibility';

export function QuoteBreakdown({ quote }) {
  const [currency, setCurrency] = useState<string>();
  
  useEffect(() => {
    async function determineCurrency() {
      // New fields with fallback to old logic
      if (quote.handling_company_code) {
        // New system: use company-based currency
        setCurrency(quote.settlement_currency);
      } else {
        // Compatibility layer handles old vs new
        const curr = await currencyCompatibility.getCurrencyWithFallback(
          quote.destination_country,
          quote.handling_company_code,
          { quoteId: quote.id }
        );
        setCurrency(curr);
      }
    }
    
    determineCurrency();
  }, [quote]);
  
  return <PriceDisplay amount={quote.total} currency={currency} />;
}
```

#### 5. **Database Migration Safety**

```sql
-- Step 1: Add new columns WITHOUT removing old ones
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS handling_company_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS settlement_currency VARCHAR(3),
ADD COLUMN IF NOT EXISTS locked_exchange_rate_id UUID,
ADD COLUMN IF NOT EXISTS company_routing_metadata JSONB;

-- Step 2: Create tracking table for migration
CREATE TABLE IF NOT EXISTS currency_migration_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(50),
  record_id UUID,
  old_currency VARCHAR(3),
  new_currency VARCHAR(3),
  mismatch BOOLEAN DEFAULT false,
  migration_date TIMESTAMPTZ DEFAULT now()
);

-- Step 3: Parallel population with tracking
CREATE OR REPLACE FUNCTION populate_new_currency_fields()
RETURNS void AS $$
BEGIN
  -- Update quotes with new fields
  UPDATE quotes q
  SET 
    handling_company_code = COALESCE(
      handling_company_code,
      CASE 
        WHEN origin_country = 'IN' THEN 'IN'
        WHEN destination_country = 'NP' THEN 'NP'
        WHEN destination_country = 'IN' THEN 'IN'
        ELSE 'SG'
      END
    ),
    settlement_currency = COALESCE(
      settlement_currency,
      CASE handling_company_code
        WHEN 'NP' THEN 'NPR'
        WHEN 'IN' THEN 'INR'
        ELSE 'USD'
      END
    )
  WHERE handling_company_code IS NULL;
  
  -- Track any mismatches
  INSERT INTO currency_migration_tracking (table_name, record_id, old_currency, new_currency, mismatch)
  SELECT 
    'quotes',
    q.id,
    cs.currency as old_currency,
    q.settlement_currency as new_currency,
    cs.currency != q.settlement_currency as mismatch
  FROM quotes q
  JOIN country_settings cs ON cs.code = q.destination_country
  WHERE q.settlement_currency IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Only after verification (2+ weeks)
-- Check mismatch rate first
SELECT 
  COUNT(*) FILTER (WHERE mismatch) * 100.0 / COUNT(*) as mismatch_percentage
FROM currency_migration_tracking;

-- If mismatch rate < 1%, safe to proceed
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_preferred_display_currency_check;
```

#### 6. **Monitoring & Health Checks**

```typescript
// src/services/MigrationMonitoring.ts
export class MigrationMonitoring {
  private static instance: MigrationMonitoring;
  
  static getInstance(): MigrationMonitoring {
    if (!MigrationMonitoring.instance) {
      MigrationMonitoring.instance = new MigrationMonitoring();
    }
    return MigrationMonitoring.instance;
  }

  // Track every decision for analysis
  async trackCurrencyDecision(context: {
    feature: string;
    oldSystem: any;
    newSystem: any;
    userId?: string;
    quoteId?: string;
    metadata?: Record<string, any>;
  }) {
    await supabase.from('migration_tracking').insert({
      feature: context.feature,
      old_value: JSON.stringify(context.oldSystem),
      new_value: JSON.stringify(context.newSystem),
      match: JSON.stringify(context.oldSystem) === JSON.stringify(context.newSystem),
      user_id: context.userId,
      quote_id: context.quoteId,
      metadata: context.metadata,
      timestamp: new Date()
    });
  }
  
  // Health check dashboard
  async getSystemHealth(): Promise<{
    mismatchRate: number;
    errorRate: number;
    performanceImpact: number;
    readyForNextPhase: boolean;
  }> {
    // Calculate mismatch rate
    const { data: mismatches } = await supabase
      .from('migration_tracking')
      .select('match')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000)); // Last 24h
    
    const mismatchRate = mismatches ? 
      mismatches.filter(m => !m.match).length / mismatches.length : 0;
    
    // Calculate error rate
    const { data: errors } = await supabase
      .from('error_logs')
      .select('id')
      .ilike('message', '%currency%')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000));
    
    const errorRate = errors ? errors.length / 1000 : 0; // Per 1000 operations
    
    // Performance metrics
    const perfImpact = await this.measurePerformanceImpact();
    
    return {
      mismatchRate,
      errorRate,
      performanceImpact: perfImpact,
      readyForNextPhase: mismatchRate < 0.01 && errorRate < 0.001
    };
  }

  // Alert on issues
  async checkAndAlert() {
    const health = await this.getSystemHealth();
    
    if (health.mismatchRate > 0.05) {
      await this.sendAlert({
        level: 'warning',
        message: `High mismatch rate: ${(health.mismatchRate * 100).toFixed(2)}%`,
        action: 'Review currency logic differences'
      });
    }
    
    if (health.errorRate > 0.01) {
      await this.sendAlert({
        level: 'critical',
        message: `High error rate in currency system: ${health.errorRate}`,
        action: 'Investigate immediately'
      });
    }
  }
}
```

#### 7. **Rollback Procedures**

```typescript
// src/scripts/rollback-currency-system.ts
export async function rollbackCurrencySystem(phase: string) {
  switch (phase) {
    case 'feature-flags':
      // Disable all new features
      await setFeatureFlag('use-new-currency-system', false);
      await setFeatureFlag('use-company-routing', false);
      break;
      
    case 'database':
      // Revert to old columns (don't drop new ones yet)
      await supabase.rpc('use_legacy_currency_fields');
      break;
      
    case 'complete':
      // Full rollback
      await rollbackDatabase();
      await rollbackCode();
      await clearCaches();
      break;
  }
  
  // Notify team
  await notifyTeam(`Currency system rolled back to ${phase}`);
}
```

### Migration Sequence & Timeline

#### Week 1: Setup & Monitoring
- [ ] Deploy compatibility layer
- [ ] Enable logging and tracking
- [ ] Set all feature flags to false
- [ ] Monitor baseline metrics

#### Week 2: Internal Testing
- [ ] Enable features for internal team only
- [ ] Monitor mismatch rates
- [ ] Fix any critical issues
- [ ] Document edge cases

#### Week 3: Beta Rollout (10%)
- [ ] Enable for 10% of users
- [ ] Monitor error rates
- [ ] Gather feedback
- [ ] Performance testing

#### Week 4: Expanded Rollout (50%)
- [ ] Enable for 50% of users
- [ ] A/B test results
- [ ] Prepare for full rollout
- [ ] Final compatibility checks

#### Week 5: Full Migration
- [ ] Enable for all users
- [ ] Remove feature flags
- [ ] Deprecate old code
- [ ] Celebrate! 🎉

### Critical Files Migration Order

1. **Phase 1 - Data Layer** (Low Risk)
   - CurrencyService.ts ✓ (already good)
   - Database schema additions
   - Migration tracking setup

2. **Phase 2 - Services** (Medium Risk)
   - CompanyRoutingService.ts (new)
   - ExchangeRateService.ts (new)
   - QuoteCalculatorService.ts (enhance carefully)

3. **Phase 3 - UI Components** (Higher Risk)
   - Currency display components
   - Quote forms
   - Payment flows

4. **Phase 4 - Cleanup** (Final)
   - Remove useQuoteDisplayCurrency.ts
   - Remove hardcoded mappings
   - Drop old database columns

## Phase 1: Database Schema

### 1.1 Core Tables
```sql
-- Company management
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE NOT NULL CHECK (code IN ('NP', 'IN', 'SG')),
  name VARCHAR(100) NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  base_currency VARCHAR(3) NOT NULL,
  supported_currencies JSONB DEFAULT '[]',
  payment_gateways JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Company routing rules
CREATE TABLE company_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_country VARCHAR(2) NOT NULL,
  destination_country VARCHAR(2) NOT NULL,
  purchase_source VARCHAR(50),
  handling_company_code VARCHAR(10) NOT NULL REFERENCES companies(code),
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(origin_country, destination_country, purchase_source, priority)
);

-- Exchange rate locks
CREATE TABLE exchange_rate_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id),
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  locked_rate DECIMAL(15,6) NOT NULL,
  market_rate DECIMAL(15,6) NOT NULL,
  margin_applied DECIMAL(5,2),
  lock_duration_hours INTEGER NOT NULL,
  locked_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'used')),
  order_value_usd DECIMAL(15,2),
  volatility_factor DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  INDEX idx_rate_locks_quote_id (quote_id),
  INDEX idx_rate_locks_expires_at (expires_at)
);

-- Direct exchange rates
CREATE TABLE direct_exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(15,6) NOT NULL,
  is_fixed BOOLEAN DEFAULT false,
  source VARCHAR(50) NOT NULL CHECK (source IN ('manual', 'api', 'fixed')),
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_currency, to_currency, valid_from)
);

-- Company administrators
CREATE TABLE company_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  company_code VARCHAR(10) REFERENCES companies(code),
  role VARCHAR(50) DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, company_code)
);
```

### 1.2 Update Existing Tables
```sql
-- Update quotes table
ALTER TABLE quotes 
ADD COLUMN handling_company_code VARCHAR(10) REFERENCES companies(code),
ADD COLUMN locked_exchange_rate_id UUID REFERENCES exchange_rate_locks(id),
ADD COLUMN settlement_currency VARCHAR(3),
ADD COLUMN settlement_amount DECIMAL(15,2),
ADD COLUMN company_routing_metadata JSONB,
ADD COLUMN purchase_source VARCHAR(50);

-- Update payment_transactions
ALTER TABLE payment_transactions
ADD COLUMN handling_company_code VARCHAR(10) REFERENCES companies(code),
ADD COLUMN settlement_currency VARCHAR(3),
ADD COLUMN settlement_amount DECIMAL(15,2),
ADD COLUMN fx_gain_loss DECIMAL(15,2);

-- Add indexes for performance
CREATE INDEX idx_quotes_handling_company ON quotes(handling_company_code);
CREATE INDEX idx_quotes_status_company ON quotes(status, handling_company_code);
```

### 1.3 Settlement Tables
```sql
-- Settlement tracking
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_code VARCHAR(10) REFERENCES companies(code),
  settlement_date DATE NOT NULL,
  currency VARCHAR(3) NOT NULL,
  total_sales DECIMAL(15,2),
  total_costs DECIMAL(15,2),
  fx_gain_loss DECIMAL(15,2),
  net_amount DECIMAL(15,2),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'cancelled')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_code, settlement_date)
);

-- Settlement line items
CREATE TABLE settlement_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID REFERENCES settlements(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES quotes(id),
  transaction_type VARCHAR(50) NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  exchange_rate_used DECIMAL(15,6),
  original_currency VARCHAR(3),
  original_amount DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.4 RLS Policies
```sql
-- Company-based access control
CREATE POLICY "Company admins see their quotes" ON quotes
  FOR ALL USING (
    handling_company_code IN (
      SELECT company_code FROM company_admins 
      WHERE user_id = auth.uid()
    ) OR is_admin()
  );

-- Settlement access
CREATE POLICY "Company admins manage settlements" ON settlements
  FOR ALL USING (
    company_code IN (
      SELECT company_code FROM company_admins 
      WHERE user_id = auth.uid() AND role IN ('admin', 'finance')
    ) OR is_admin()
  );
```

## Phase 2: Exchange Rate Management

### 2.1 Exchange Rate Service
```typescript
// src/services/ExchangeRateService.ts
import { supabase } from '@/integrations/supabase/client';
import { FIXED_DIRECT_RATES } from '@/config/directRates';

export interface ExchangeRateLock {
  id: string;
  rate: number;
  expiresAt: Date;
  status: 'active' | 'expired' | 'used';
}

export class ExchangeRateService {
  private static instance: ExchangeRateService;
  
  static getInstance(): ExchangeRateService {
    if (!ExchangeRateService.instance) {
      ExchangeRateService.instance = new ExchangeRateService();
    }
    return ExchangeRateService.instance;
  }

  async getExchangeRate(
    from: string, 
    to: string,
    options?: {
      preferDirect?: boolean;
      quoteId?: string;
      includeMargin?: boolean;
    }
  ): Promise<number> {
    // 1. Check for locked rate if quoteId provided
    if (options?.quoteId) {
      const lockedRate = await this.getLockedRate(options.quoteId);
      if (lockedRate) return lockedRate;
    }

    // 2. Check direct rates (especially INR-NPR)
    const directRate = await this.getDirectRate(from, to);
    if (directRate) {
      return options?.includeMargin 
        ? this.applyMargin(directRate, from, to)
        : directRate;
    }

    // 3. Try reverse direct rate
    const reverseRate = await this.getDirectRate(to, from);
    if (reverseRate) {
      const rate = 1 / reverseRate;
      return options?.includeMargin 
        ? this.applyMargin(rate, from, to)
        : rate;
    }

    // 4. Fall back to triangulation through USD
    if (from !== 'USD' && to !== 'USD') {
      const fromToUsd = await this.getExchangeRate(from, 'USD');
      const usdToTarget = await this.getExchangeRate('USD', to);
      const rate = fromToUsd * usdToTarget;
      return options?.includeMargin 
        ? this.applyMargin(rate, from, to)
        : rate;
    }

    // 5. Get from external API or database
    return this.fetchMarketRate(from, to);
  }

  async lockRateForQuote(
    quoteId: string,
    orderValue: number,
    from: string,
    to: string
  ): Promise<ExchangeRateLock> {
    const marketRate = await this.getExchangeRate(from, to);
    const rateWithMargin = this.applyMargin(marketRate, from, to);
    const duration = this.calculateLockDuration(orderValue, from, to);
    
    const { data, error } = await supabase
      .from('exchange_rate_locks')
      .insert({
        quote_id: quoteId,
        from_currency: from,
        to_currency: to,
        locked_rate: rateWithMargin,
        market_rate: marketRate,
        margin_applied: this.getMarginForCurrencyPair(from, to),
        lock_duration_hours: duration,
        expires_at: new Date(Date.now() + duration * 60 * 60 * 1000),
        order_value_usd: orderValue,
        volatility_factor: this.getCurrencyVolatility(from, to)
      })
      .select()
      .single();

    if (error) throw error;
    
    return {
      id: data.id,
      rate: data.locked_rate,
      expiresAt: new Date(data.expires_at),
      status: 'active'
    };
  }

  private async getDirectRate(from: string, to: string): Promise<number | null> {
    // Try database first
    const { data } = await supabase
      .from('direct_exchange_rates')
      .select('rate')
      .eq('from_currency', from)
      .eq('to_currency', to)
      .gte('valid_until', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (data?.rate) return data.rate;
    
    // Fallback to hardcoded for critical rates
    const key = `${from}-${to}`;
    return FIXED_DIRECT_RATES[key] || null;
  }

  private calculateLockDuration(
    orderValue: number,
    from: string,
    to: string
  ): number {
    // Base duration by order value
    let hours = 24;
    if (orderValue < 500) hours = 12;
    else if (orderValue < 1000) hours = 24;
    else if (orderValue < 5000) hours = 48;
    else hours = 72;
    
    // Adjust for volatility
    const volatility = this.getCurrencyVolatility(from, to);
    if (volatility > 0.05) hours = hours * 0.75;
    else if (volatility < 0.02) hours = hours * 1.25;
    
    return Math.round(hours);
  }

  private applyMargin(rate: number, from: string, to: string): number {
    const margin = this.getMarginForCurrencyPair(from, to);
    return rate * (1 + margin / 100);
  }

  private getMarginForCurrencyPair(from: string, to: string): number {
    // NPR transactions: 2%
    if (from === 'NPR' || to === 'NPR') return 2.0;
    
    // Volatile currencies: 2.5%
    const volatileCurrencies = ['TRY', 'ARS', 'BRL', 'ZAR'];
    if (volatileCurrencies.includes(from) || volatileCurrencies.includes(to)) {
      return 2.5;
    }
    
    // Stable currencies: 1.5%
    return 1.5;
  }

  private getCurrencyVolatility(from: string, to: string): number {
    // Simplified volatility calculation
    // In production, this would fetch from a volatility API
    const volatileMap: Record<string, number> = {
      'TRY': 0.08,
      'ARS': 0.10,
      'BRL': 0.06,
      'ZAR': 0.07,
      'NPR': 0.03,
      'INR': 0.02,
      'USD': 0.01,
      'EUR': 0.01
    };
    
    return Math.max(
      volatileMap[from] || 0.02,
      volatileMap[to] || 0.02
    );
  }
}

export const exchangeRateService = ExchangeRateService.getInstance();
```

### 2.2 Direct Rates Configuration
```typescript
// src/config/directRates.ts
export const FIXED_DIRECT_RATES: Record<string, number> = {
  'INR-NPR': 1.6,
  'NPR-INR': 0.625
} as const;

export const CURRENCY_MARGINS = {
  NPR: 2.0,
  volatile: 2.5,
  stable: 1.5
} as const;

export const VOLATILE_CURRENCIES = ['TRY', 'ARS', 'BRL', 'ZAR'];
```

## Phase 3: Company Routing

### 3.1 Company Routing Service
```typescript
// src/services/CompanyRoutingService.ts
import { supabase } from '@/integrations/supabase/client';

export interface RoutingDecision {
  company: string;
  reason: string;
  metadata?: Record<string, any>;
}

export class CompanyRoutingService {
  private static instance: CompanyRoutingService;
  
  static getInstance(): CompanyRoutingService {
    if (!CompanyRoutingService.instance) {
      CompanyRoutingService.instance = new CompanyRoutingService();
    }
    return CompanyRoutingService.instance;
  }

  async determineHandlingCompany(
    originCountry: string,
    destinationCountry: string,
    purchaseSource?: string
  ): Promise<RoutingDecision> {
    // 1. Check explicit routing rules
    const { data: rule } = await supabase
      .from('company_routing_rules')
      .select('*')
      .eq('origin_country', originCountry)
      .eq('destination_country', destinationCountry)
      .eq('is_active', true)
      .order('priority', { ascending: true })
      .limit(1)
      .single();
    
    if (rule) {
      return {
        company: rule.handling_company_code,
        reason: 'explicit_rule',
        metadata: { rule_id: rule.id }
      };
    }

    // 2. Purchase source based routing
    if (purchaseSource) {
      if (['flipkart', 'amazon.in'].includes(purchaseSource.toLowerCase())) {
        return {
          company: 'IN',
          reason: 'purchase_source',
          metadata: { source: purchaseSource }
        };
      }
    }

    // 3. Origin country based routing
    if (originCountry === 'IN') {
      return {
        company: 'IN',
        reason: 'origin_country',
        metadata: { country: originCountry }
      };
    }

    // 4. Destination based fallback
    if (destinationCountry === 'NP') {
      return {
        company: 'NP',
        reason: 'destination_country',
        metadata: { country: destinationCountry }
      };
    }
    
    if (destinationCountry === 'IN') {
      return {
        company: 'IN',
        reason: 'destination_country',
        metadata: { country: destinationCountry }
      };
    }

    // 5. Default to Singapore
    return {
      company: 'SG',
      reason: 'default',
      metadata: { 
        origin: originCountry,
        destination: destinationCountry 
      }
    };
  }

  async getCompanyDetails(companyCode: string) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('code', companyCode)
      .single();
    
    if (error) throw error;
    return data;
  }

  async getSettlementCurrency(companyCode: string): Promise<string> {
    const company = await this.getCompanyDetails(companyCode);
    return company.base_currency;
  }

  async getCompanyPaymentGateways(companyCode: string): Promise<string[]> {
    const company = await this.getCompanyDetails(companyCode);
    return company.payment_gateways || [];
  }
}

export const companyRoutingService = CompanyRoutingService.getInstance();
```

### 3.2 Update Quote Calculator
```typescript
// Updates to QuoteCalculatorService.ts
import { companyRoutingService } from '@/services/CompanyRoutingService';
import { exchangeRateService } from '@/services/ExchangeRateService';

// Add to QuoteCalculationParams interface
export interface QuoteCalculationParams {
  // ... existing fields
  purchaseSource?: string;
  lockExchangeRate?: boolean;
}

// Update performCalculation method
private async performCalculation(
  params: QuoteCalculationParams,
  calculationId?: string
): Promise<QuoteCalculationBreakdown> {
  // ... existing calculation logic ...

  // Determine handling company
  const routingDecision = await companyRoutingService.determineHandlingCompany(
    params.originCountry,
    params.destinationCountry,
    params.purchaseSource
  );

  // Get settlement currency
  const settlementCurrency = await companyRoutingService.getSettlementCurrency(
    routingDecision.company
  );

  // Lock exchange rate if requested
  let lockedRateId: string | undefined;
  if (params.lockExchangeRate && calculationId) {
    const lock = await exchangeRateService.lockRateForQuote(
      calculationId,
      final_total,
      'USD',
      settlementCurrency
    );
    lockedRateId = lock.id;
  }

  // Add company routing to breakdown
  return {
    ...existingBreakdown,
    handling_company: routingDecision.company,
    company_routing_reason: routingDecision.reason,
    company_routing_metadata: routingDecision.metadata,
    settlement_currency: settlementCurrency,
    locked_exchange_rate_id: lockedRateId
  };
}
```

## Phase 4: Purchase Readiness Dashboard

### 4.1 Dashboard Component
```typescript
// src/components/admin/PurchaseReadinessDashboard.tsx
import { useRealtimePurchaseReadiness } from '@/hooks/useRealtimePurchaseReadiness';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/currencyUtils';

interface CompanyReadiness {
  company: string;
  readyToPurchase: number;
  totalPending: number;
  totalAmount: number;
  currency: string;
}

export function PurchaseReadinessDashboard() {
  const readiness = useRealtimePurchaseReadiness();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {['NP', 'IN', 'SG'].map(companyCode => (
        <CompanyReadinessCard
          key={companyCode}
          company={companyCode}
          data={readiness[companyCode]}
        />
      ))}
    </div>
  );
}

function CompanyReadinessCard({ 
  company, 
  data 
}: { 
  company: string; 
  data?: CompanyReadiness;
}) {
  const getStatus = () => {
    if (!data || data.totalPending === 0) return 'idle';
    const ratio = data.readyToPurchase / data.totalPending;
    if (ratio >= 0.8) return 'ready';
    if (ratio >= 0.5) return 'warning';
    return 'critical';
  };

  const status = getStatus();
  const statusColors = {
    ready: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
    idle: 'bg-gray-400'
  };

  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-3 h-3 m-2 rounded-full ${statusColors[status]} animate-pulse`} />
      
      <CardHeader>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{company} Company</h3>
          <Badge variant={status === 'ready' ? 'success' : status === 'warning' ? 'warning' : 'destructive'}>
            {status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Ready to Purchase</span>
            <span className="font-medium">{data?.readyToPurchase || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total Pending</span>
            <span className="font-medium">{data?.totalPending || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total Amount</span>
            <span className="font-medium">
              {data ? formatCurrency(data.totalAmount, data.currency) : '-'}
            </span>
          </div>
        </div>
        
        {data && data.totalPending > 0 && (
          <div className="mt-4">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${statusColors[status]} transition-all duration-500`}
                style={{ width: `${(data.readyToPurchase / data.totalPending) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((data.readyToPurchase / data.totalPending) * 100)}% ready
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 4.2 Real-time Hook
```typescript
// src/hooks/useRealtimePurchaseReadiness.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useRealtimePurchaseReadiness() {
  const [readiness, setReadiness] = useState<Record<string, CompanyReadiness>>({});

  const fetchReadiness = async () => {
    const { data, error } = await supabase.rpc('get_purchase_readiness');
    
    if (!error && data) {
      const readinessMap: Record<string, CompanyReadiness> = {};
      data.forEach(item => {
        readinessMap[item.company_code] = {
          company: item.company_code,
          readyToPurchase: item.ready_to_purchase,
          totalPending: item.total_pending,
          totalAmount: item.total_amount,
          currency: item.currency
        };
      });
      setReadiness(readinessMap);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchReadiness();

    // Set up real-time subscription
    const channel = supabase
      .channel('purchase-readiness')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes',
          filter: 'status=in.(approved,paid)'
        },
        () => {
          // Refresh data when quotes change
          fetchReadiness();
        }
      )
      .subscribe();

    // Refresh every minute
    const interval = setInterval(fetchReadiness, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  return readiness;
}
```

### 4.3 Database Function
```sql
-- Function to get purchase readiness by company
CREATE OR REPLACE FUNCTION get_purchase_readiness()
RETURNS TABLE (
  company_code VARCHAR,
  ready_to_purchase BIGINT,
  total_pending BIGINT,
  total_amount DECIMAL,
  currency VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  WITH company_quotes AS (
    SELECT 
      q.handling_company_code,
      q.status,
      q.final_total,
      c.base_currency
    FROM quotes q
    JOIN companies c ON c.code = q.handling_company_code
    WHERE q.status IN ('approved', 'paid')
      AND q.handling_company_code IS NOT NULL
  )
  SELECT 
    cq.handling_company_code,
    COUNT(*) FILTER (WHERE cq.status = 'paid')::BIGINT as ready_to_purchase,
    COUNT(*)::BIGINT as total_pending,
    COALESCE(SUM(cq.final_total) FILTER (WHERE cq.status = 'paid'), 0) as total_amount,
    MAX(cq.base_currency) as currency
  FROM company_quotes cq
  GROUP BY cq.handling_company_code;
END;
$$ LANGUAGE plpgsql;
```

## Phase 5: Settlement & Reconciliation

### 5.1 Settlement Service
```typescript
// src/services/SettlementService.ts
import { supabase } from '@/integrations/supabase/client';
import { exchangeRateService } from './ExchangeRateService';

export interface Settlement {
  id: string;
  company_code: string;
  settlement_date: string;
  currency: string;
  total_sales: number;
  total_costs: number;
  fx_gain_loss: number;
  net_amount: number;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  line_items?: SettlementLineItem[];
}

export interface SettlementLineItem {
  quote_id: string;
  transaction_type: string;
  amount: number;
  exchange_rate_used: number;
  original_currency: string;
  original_amount: number;
}

export class SettlementService {
  private static instance: SettlementService;
  
  static getInstance(): SettlementService {
    if (!SettlementService.instance) {
      SettlementService.instance = new SettlementService();
    }
    return SettlementService.instance;
  }

  async generateWeeklySettlement(
    companyCode: string,
    weekEndDate: Date
  ): Promise<Settlement> {
    // Get week start date
    const weekStartDate = new Date(weekEndDate);
    weekStartDate.setDate(weekStartDate.getDate() - 7);

    // Get all completed transactions for the week
    const { data: transactions, error } = await supabase
      .from('quotes')
      .select(`
        *,
        payment_transactions (*)
      `)
      .eq('handling_company_code', companyCode)
      .eq('status', 'completed')
      .gte('updated_at', weekStartDate.toISOString())
      .lte('updated_at', weekEndDate.toISOString());

    if (error) throw error;

    // Get company details
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('code', companyCode)
      .single();

    // Calculate totals
    let totalSales = 0;
    let totalCosts = 0;
    let fxGainLoss = 0;
    const lineItems: SettlementLineItem[] = [];

    for (const transaction of transactions || []) {
      // Calculate in settlement currency
      const settlementRate = await this.getSettlementRate(
        transaction,
        company.base_currency
      );
      
      const settlementAmount = transaction.final_total * settlementRate;
      totalSales += settlementAmount;

      // Calculate FX gain/loss
      const fxDiff = this.calculateFxGainLoss(
        transaction,
        settlementRate,
        company.base_currency
      );
      fxGainLoss += fxDiff;

      // Add line item
      lineItems.push({
        quote_id: transaction.id,
        transaction_type: 'sale',
        amount: settlementAmount,
        exchange_rate_used: settlementRate,
        original_currency: 'USD',
        original_amount: transaction.final_total
      });
    }

    // Create settlement record
    const { data: settlement, error: settlementError } = await supabase
      .from('settlements')
      .insert({
        company_code: companyCode,
        settlement_date: weekEndDate.toISOString().split('T')[0],
        currency: company.base_currency,
        total_sales: totalSales,
        total_costs: totalCosts,
        fx_gain_loss: fxGainLoss,
        net_amount: totalSales - totalCosts + fxGainLoss,
        status: 'pending'
      })
      .select()
      .single();

    if (settlementError) throw settlementError;

    // Insert line items
    if (lineItems.length > 0) {
      await supabase
        .from('settlement_line_items')
        .insert(
          lineItems.map(item => ({
            ...item,
            settlement_id: settlement.id
          }))
        );
    }

    return {
      ...settlement,
      line_items: lineItems
    };
  }

  private async getSettlementRate(
    transaction: any,
    settlementCurrency: string
  ): Promise<number> {
    // Use locked rate if available
    if (transaction.locked_exchange_rate_id) {
      const { data: lock } = await supabase
        .from('exchange_rate_locks')
        .select('locked_rate')
        .eq('id', transaction.locked_exchange_rate_id)
        .single();
      
      if (lock) return lock.locked_rate;
    }

    // Otherwise get current rate
    return exchangeRateService.getExchangeRate('USD', settlementCurrency);
  }

  private calculateFxGainLoss(
    transaction: any,
    actualRate: number,
    settlementCurrency: string
  ): number {
    // If no locked rate, no FX gain/loss
    if (!transaction.locked_exchange_rate_id) return 0;

    // Calculate difference between locked and actual rate
    const expectedAmount = transaction.final_total * transaction.exchange_rate;
    const actualAmount = transaction.final_total * actualRate;
    
    return actualAmount - expectedAmount;
  }

  async approveSettlement(
    settlementId: string,
    userId: string
  ): Promise<void> {
    await supabase
      .from('settlements')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString()
      })
      .eq('id', settlementId);
  }

  async getPendingSettlements(companyCode?: string): Promise<Settlement[]> {
    let query = supabase
      .from('settlements')
      .select(`
        *,
        settlement_line_items (*)
      `)
      .eq('status', 'pending')
      .order('settlement_date', { ascending: false });

    if (companyCode) {
      query = query.eq('company_code', companyCode);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }
}

export const settlementService = SettlementService.getInstance();
```

### 5.2 Settlement UI Component
```typescript
// src/components/admin/SettlementApproval.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settlementService } from '@/services/SettlementService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currencyUtils';
import { useAuth } from '@/hooks/useAuth';

export function SettlementApproval() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCompany, setSelectedCompany] = useState<string>('all');

  const { data: settlements, isLoading } = useQuery({
    queryKey: ['pending-settlements', selectedCompany],
    queryFn: () => settlementService.getPendingSettlements(
      selectedCompany === 'all' ? undefined : selectedCompany
    )
  });

  const approveMutation = useMutation({
    mutationFn: (settlementId: string) => 
      settlementService.approveSettlement(settlementId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-settlements'] });
    }
  });

  if (isLoading) return <div>Loading settlements...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Pending Settlements</h2>
        <select
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Companies</option>
          <option value="NP">Nepal</option>
          <option value="IN">India</option>
          <option value="SG">Singapore</option>
        </select>
      </div>

      {settlements?.map(settlement => (
        <Card key={settlement.id} className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold">
                {settlement.company_code} - Week ending {settlement.settlement_date}
              </h3>
              <p className="text-sm text-muted-foreground">
                {settlement.line_items?.length || 0} transactions
              </p>
            </div>
            <Button
              onClick={() => approveMutation.mutate(settlement.id)}
              disabled={approveMutation.isPending}
            >
              Approve Settlement
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Sales</p>
              <p className="font-medium">
                {formatCurrency(settlement.total_sales, settlement.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Costs</p>
              <p className="font-medium">
                {formatCurrency(settlement.total_costs, settlement.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">FX Gain/Loss</p>
              <p className={`font-medium ${settlement.fx_gain_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(settlement.fx_gain_loss), settlement.currency)}
                {settlement.fx_gain_loss >= 0 ? ' ↑' : ' ↓'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Net Amount</p>
              <p className="font-bold text-lg">
                {formatCurrency(settlement.net_amount, settlement.currency)}
              </p>
            </div>
          </div>

          {settlement.line_items && settlement.line_items.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-blue-600">
                View transaction details
              </summary>
              <div className="mt-2 space-y-2">
                {settlement.line_items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>Quote #{item.quote_id.slice(-8)}</span>
                    <span>
                      {formatCurrency(item.original_amount, item.original_currency)} → 
                      {formatCurrency(item.amount, settlement.currency)}
                      @ {item.exchange_rate_used.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </Card>
      ))}

      {(!settlements || settlements.length === 0) && (
        <p className="text-center text-muted-foreground py-8">
          No pending settlements
        </p>
      )}
    </div>
  );
}
```

## Phase 6: Currency Display

### 6.1 Smart Currency Detection Hook
```typescript
// src/hooks/useSmartCurrency.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { currencyService } from '@/services/CurrencyService';
import { supabase } from '@/integrations/supabase/client';

interface SmartCurrencyResult {
  currency: string;
  detectionMethod: 'user_preference' | 'geolocation' | 'browser' | 'default';
  isLoading: boolean;
  setCurrency: (currency: string) => Promise<void>;
}

export function useSmartCurrency(): SmartCurrencyResult {
  const { user } = useAuth();
  const [currency, setCurrencyState] = useState<string>('USD');
  const [detectionMethod, setDetectionMethod] = useState<SmartCurrencyResult['detectionMethod']>('default');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    detectCurrency();
  }, [user]);

  const detectCurrency = async () => {
    setIsLoading(true);

    // 1. Check user preference
    if (user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_display_currency')
        .eq('id', user.id)
        .single();
      
      if (profile?.preferred_display_currency) {
        setCurrencyState(profile.preferred_display_currency);
        setDetectionMethod('user_preference');
        setIsLoading(false);
        return;
      }
    }

    // 2. Try geolocation
    if ('geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        
        // Use reverse geocoding API to get country
        const country = await getCountryFromCoordinates(
          position.coords.latitude,
          position.coords.longitude
        );
        
        if (country) {
          const currency = currencyService.getCurrencyForCountrySync(country);
          setCurrencyState(currency);
          setDetectionMethod('geolocation');
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.log('Geolocation failed, trying browser locale');
      }
    }

    // 3. Browser locale
    const locale = navigator.language;
    const countryCode = locale.split('-')[1]?.toUpperCase();
    if (countryCode) {
      const currency = currencyService.getCurrencyForCountrySync(countryCode);
      if (currency !== 'USD') {
        setCurrencyState(currency);
        setDetectionMethod('browser');
        setIsLoading(false);
        return;
      }
    }

    // 4. Default
    setDetectionMethod('default');
    setIsLoading(false);
  };

  const setCurrency = async (newCurrency: string) => {
    setCurrencyState(newCurrency);
    
    // Save to user profile if logged in
    if (user?.id) {
      await supabase
        .from('profiles')
        .update({ preferred_display_currency: newCurrency })
        .eq('id', user.id);
    } else {
      // Save to localStorage for non-logged in users
      localStorage.setItem('preferred_currency', newCurrency);
    }
  };

  return {
    currency,
    detectionMethod,
    isLoading,
    setCurrency
  };
}

// Helper function for reverse geocoding
async function getCountryFromCoordinates(lat: number, lon: number): Promise<string | null> {
  try {
    // Use a reverse geocoding service
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    const data = await response.json();
    return data.countryCode || null;
  } catch {
    return null;
  }
}
```

### 6.2 Triple Currency Display for Admin
```typescript
// src/components/admin/TripleCurrencyDisplay.tsx
import { useMemo } from 'react';
import { formatCurrency } from '@/lib/currencyUtils';
import { useMultiCurrencyConversion } from '@/hooks/useMultiCurrencyConversion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TripleCurrencyDisplayProps {
  amount: number;
  baseCurrency: string;
  originCurrency: string;
  destinationCurrency: string;
  settlementCurrency: string;
  showLabels?: boolean;
}

export function TripleCurrencyDisplay({
  amount,
  baseCurrency,
  originCurrency,
  destinationCurrency,
  settlementCurrency,
  showLabels = false
}: TripleCurrencyDisplayProps) {
  const conversions = useMultiCurrencyConversion(amount, baseCurrency, [
    originCurrency,
    destinationCurrency,
    settlementCurrency
  ]);

  const uniqueCurrencies = useMemo(() => {
    const currencies = [
      { code: originCurrency, label: 'Origin', amount: conversions[originCurrency] },
      { code: destinationCurrency, label: 'Destination', amount: conversions[destinationCurrency] },
      { code: settlementCurrency, label: 'Settlement', amount: conversions[settlementCurrency] }
    ];
    
    // Remove duplicates
    const seen = new Set<string>();
    return currencies.filter(c => {
      if (seen.has(c.code)) return false;
      seen.add(c.code);
      return true;
    });
  }, [originCurrency, destinationCurrency, settlementCurrency, conversions]);

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 text-sm">
        {uniqueCurrencies.map((currency, index) => (
          <Tooltip key={currency.code}>
            <TooltipTrigger asChild>
              <span className={`
                ${index === 0 ? 'font-semibold' : ''}
                ${currency.label === 'Settlement' ? 'text-blue-600' : ''}
              `}>
                {formatCurrency(currency.amount || 0, currency.code)}
                {showLabels && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ({currency.label})
                  </span>
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{currency.label} Currency</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
```

### 6.3 Currency Selector Component
```typescript
// src/components/currency/CurrencySelector.tsx
import { useState, useEffect } from 'react';
import { Check, Globe } from 'lucide-react';
import { currencyService } from '@/services/CurrencyService';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface CurrencySelectorProps {
  value: string;
  onChange: (currency: string) => void;
  showAutoDetected?: boolean;
  detectionMethod?: string;
}

export function CurrencySelector({
  value,
  onChange,
  showAutoDetected,
  detectionMethod
}: CurrencySelectorProps) {
  const [open, setOpen] = useState(false);
  const [currencies, setCurrencies] = useState<Array<{ code: string; name: string; symbol: string }>>([]);

  useEffect(() => {
    currencyService.getAllCurrencies().then(setCurrencies);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span>{value}</span>
            {showAutoDetected && detectionMethod && detectionMethod !== 'default' && (
              <span className="text-xs text-muted-foreground">
                (Auto-detected)
              </span>
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search currency..." />
          <CommandEmpty>No currency found.</CommandEmpty>
          <CommandGroup>
            {currencies.map((currency) => (
              <CommandItem
                key={currency.code}
                value={currency.code}
                onSelect={(currentValue) => {
                  onChange(currentValue.toUpperCase());
                  setOpen(false);
                }}
              >
                <Check
                  className={`mr-2 h-4 w-4 ${
                    value === currency.code ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <div className="flex justify-between w-full">
                  <span>{currency.code}</span>
                  <span className="text-muted-foreground">{currency.symbol}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

## Phase 7: Migration

### 7.1 Data Migration Script
```typescript
// scripts/migrate-multi-currency.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function migrateMultiCurrency() {
  console.log('Starting multi-currency migration...');
  
  try {
    // 1. Insert company records
    await insertCompanies();
    
    // 2. Set up routing rules
    await setupRoutingRules();
    
    // 3. Insert fixed exchange rates
    await insertFixedRates();
    
    // 4. Migrate recent quotes
    await migrateQuotes();
    
    // 5. Create historical rate locks
    await createHistoricalRateLocks();
    
    // 6. Update payment transactions
    await updatePaymentTransactions();
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

async function insertCompanies() {
  const companies = [
    {
      code: 'NP',
      name: 'iwishBag Nepal',
      country_code: 'NP',
      base_currency: 'NPR',
      supported_currencies: ['NPR', 'INR'],
      payment_gateways: ['khalti', 'esewa']
    },
    {
      code: 'IN',
      name: 'iwishBag India',
      country_code: 'IN',
      base_currency: 'INR',
      supported_currencies: ['INR', 'USD'],
      payment_gateways: ['payu', 'razorpay']
    },
    {
      code: 'SG',
      name: 'iwishBag Singapore',
      country_code: 'SG',
      base_currency: 'USD',
      supported_currencies: ['USD', 'EUR', 'GBP', 'SGD', 'AED', 'CAD', 'AUD'],
      payment_gateways: ['stripe', 'paypal']
    }
  ];

  const { error } = await supabase
    .from('companies')
    .insert(companies);
    
  if (error) throw error;
  console.log('✓ Companies inserted');
}

async function setupRoutingRules() {
  const rules = [
    // India origin rules
    { origin_country: 'IN', destination_country: 'US', handling_company_code: 'IN', priority: 1 },
    { origin_country: 'IN', destination_country: 'GB', handling_company_code: 'IN', priority: 1 },
    { origin_country: 'IN', destination_country: 'CA', handling_company_code: 'IN', priority: 1 },
    
    // Nepal destination rules
    { origin_country: 'US', destination_country: 'NP', handling_company_code: 'NP', priority: 1 },
    { origin_country: 'GB', destination_country: 'NP', handling_company_code: 'NP', priority: 1 },
    { origin_country: 'IN', destination_country: 'NP', handling_company_code: 'NP', priority: 1 },
    
    // India destination rules
    { origin_country: 'US', destination_country: 'IN', handling_company_code: 'IN', priority: 1 },
    { origin_country: 'GB', destination_country: 'IN', handling_company_code: 'IN', priority: 1 },
    { origin_country: 'CA', destination_country: 'IN', handling_company_code: 'IN', priority: 1 },
  ];

  const { error } = await supabase
    .from('company_routing_rules')
    .insert(rules);
    
  if (error) throw error;
  console.log('✓ Routing rules configured');
}

async function insertFixedRates() {
  const fixedRates = [
    {
      from_currency: 'INR',
      to_currency: 'NPR',
      rate: 1.6,
      is_fixed: true,
      source: 'fixed'
    },
    {
      from_currency: 'NPR',
      to_currency: 'INR',
      rate: 0.625,
      is_fixed: true,
      source: 'fixed'
    }
  ];

  const { error } = await supabase
    .from('direct_exchange_rates')
    .insert(fixedRates);
    
  if (error) throw error;
  console.log('✓ Fixed exchange rates inserted');
}

async function migrateQuotes() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Get quotes to migrate
  const { data: quotes, error: fetchError } = await supabase
    .from('quotes')
    .select('*')
    .gte('created_at', sixMonthsAgo.toISOString())
    .order('created_at', { ascending: true });

  if (fetchError) throw fetchError;

  console.log(`Found ${quotes?.length || 0} quotes to migrate`);

  // Update in batches
  const batchSize = 100;
  for (let i = 0; i < (quotes?.length || 0); i += batchSize) {
    const batch = quotes!.slice(i, i + batchSize);
    
    const updates = batch.map(quote => {
      // Determine handling company
      let handlingCompany = 'SG';
      if (quote.origin_country === 'IN' || quote.product_url?.includes('flipkart')) {
        handlingCompany = 'IN';
      } else if (quote.destination_country === 'NP') {
        handlingCompany = 'NP';
      } else if (quote.destination_country === 'IN') {
        handlingCompany = 'IN';
      }

      // Determine settlement currency
      let settlementCurrency = 'USD';
      if (handlingCompany === 'NP') settlementCurrency = 'NPR';
      else if (handlingCompany === 'IN') settlementCurrency = 'INR';

      return {
        id: quote.id,
        handling_company_code: handlingCompany,
        settlement_currency: settlementCurrency,
        company_routing_metadata: {
          migrated: true,
          migration_date: new Date().toISOString(),
          determined_by: 'migration_script'
        }
      };
    });

    // Update quotes
    for (const update of updates) {
      const { error } = await supabase
        .from('quotes')
        .update({
          handling_company_code: update.handling_company_code,
          settlement_currency: update.settlement_currency,
          company_routing_metadata: update.company_routing_metadata
        })
        .eq('id', update.id);
        
      if (error) console.error(`Failed to update quote ${update.id}:`, error);
    }

    console.log(`✓ Migrated batch ${i / batchSize + 1} of ${Math.ceil((quotes?.length || 0) / batchSize)}`);
  }
}

async function createHistoricalRateLocks() {
  // Create rate locks for paid quotes
  const { data: paidQuotes, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('status', 'paid')
    .not('exchange_rate', 'is', null)
    .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString());

  if (error) throw error;

  for (const quote of paidQuotes || []) {
    await supabase
      .from('exchange_rate_locks')
      .insert({
        quote_id: quote.id,
        from_currency: 'USD',
        to_currency: quote.currency || 'USD',
        locked_rate: quote.exchange_rate,
        market_rate: quote.exchange_rate,
        lock_duration_hours: 48,
        expires_at: new Date(new Date(quote.updated_at).getTime() + 48 * 60 * 60 * 1000),
        status: 'used',
        order_value_usd: quote.final_total
      });
  }

  console.log(`✓ Created ${paidQuotes?.length || 0} historical rate locks`);
}

async function updatePaymentTransactions() {
  // Update payment transactions with company information
  const { error } = await supabase.rpc('update_payment_transactions_company', {});
  
  if (error) throw error;
  console.log('✓ Payment transactions updated');
}

// Run migration
migrateMultiCurrency();
```

### 7.2 Cleanup Script
```typescript
// scripts/cleanup-legacy-code.ts
import * as fs from 'fs';
import * as path from 'path';

const DEPRECATED_PATTERNS = [
  /getCountryToCurrencyMapping/g,
  /hardcodedCurrencyMap/g,
  /countryToCurrency/g,
  /COUNTRY_CURRENCY_MAP/g
];

const FILES_TO_UPDATE = [
  'src/lib/currencyUtils.ts',
  'src/components/forms/QuoteForm.tsx',
  'src/hooks/useQuoteCalculation.ts',
  'src/pages/admin/ExchangeRates.tsx'
];

function cleanupFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  let updatedContent = content;
  
  DEPRECATED_PATTERNS.forEach(pattern => {
    if (pattern.test(updatedContent)) {
      console.log(`Found deprecated pattern in ${filePath}`);
      // Add deprecation comments
      updatedContent = updatedContent.replace(
        pattern,
        `/** @deprecated Use CurrencyService instead */ $&`
      );
    }
  });
  
  fs.writeFileSync(filePath, updatedContent);
}

FILES_TO_UPDATE.forEach(cleanupFile);
```

## Phase 8: Monitoring & Alerts

### 8.1 Monitoring Service
```typescript
// src/services/MonitoringService.ts
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/services/LoggingService';

export interface Alert {
  id: string;
  type: 'fx_risk' | 'settlement' | 'rate_lock' | 'purchase_ready';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  metadata?: Record<string, any>;
  created_at: Date;
}

export class MonitoringService {
  private static instance: MonitoringService;
  
  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  async checkDailyAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    // Check FX exposure
    const fxAlerts = await this.checkFxExposure();
    alerts.push(...fxAlerts);
    
    // Check pending settlements
    const settlementAlerts = await this.checkPendingSettlements();
    alerts.push(...settlementAlerts);
    
    // Check expiring rate locks
    const rateLockAlerts = await this.checkExpiringRateLocks();
    alerts.push(...rateLockAlerts);
    
    // Check purchase readiness
    const readinessAlerts = await this.checkPurchaseReadiness();
    alerts.push(...readinessAlerts);
    
    // Log all alerts
    alerts.forEach(alert => {
      logger.warn(`Alert: ${alert.title}`, {
        alert_id: alert.id,
        type: alert.type,
        severity: alert.severity,
        metadata: alert.metadata
      });
    });
    
    return alerts;
  }

  private async checkFxExposure(): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    // Calculate total exposure by currency pair
    const { data: exposure } = await supabase.rpc('calculate_fx_exposure');
    
    if (exposure) {
      Object.entries(exposure).forEach(([pair, amount]) => {
        if (amount > 100000) {
          alerts.push({
            id: `fx_${pair}_${Date.now()}`,
            type: 'fx_risk',
            severity: amount > 500000 ? 'critical' : 'high',
            title: `High FX Exposure: ${pair}`,
            message: `Exposure of ${amount.toLocaleString()} detected for ${pair}`,
            metadata: { currency_pair: pair, amount },
            created_at: new Date()
          });
        }
      });
    }
    
    return alerts;
  }

  private async checkPendingSettlements(): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    const { data: settlements } = await supabase
      .from('settlements')
      .select('*')
      .eq('status', 'pending')
      .lt('settlement_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    
    if (settlements && settlements.length > 0) {
      alerts.push({
        id: `settlement_pending_${Date.now()}`,
        type: 'settlement',
        severity: settlements.length > 5 ? 'high' : 'medium',
        title: 'Pending Settlements',
        message: `${settlements.length} settlements pending approval for over a week`,
        metadata: { count: settlements.length },
        created_at: new Date()
      });
    }
    
    return alerts;
  }

  private async checkExpiringRateLocks(): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const next24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const { data: expiringLocks } = await supabase
      .from('exchange_rate_locks')
      .select('*')
      .eq('status', 'active')
      .lt('expires_at', next24Hours.toISOString());
    
    if (expiringLocks && expiringLocks.length > 0) {
      alerts.push({
        id: `rate_lock_expiring_${Date.now()}`,
        type: 'rate_lock',
        severity: 'low',
        title: 'Rate Locks Expiring Soon',
        message: `${expiringLocks.length} exchange rate locks expiring in next 24 hours`,
        metadata: { count: expiringLocks.length },
        created_at: new Date()
      });
    }
    
    return alerts;
  }

  private async checkPurchaseReadiness(): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    const { data: readiness } = await supabase.rpc('get_purchase_readiness');
    
    readiness?.forEach(company => {
      if (company.ready_to_purchase > 10 && company.ready_to_purchase > company.total_pending * 0.8) {
        alerts.push({
          id: `purchase_ready_${company.company_code}_${Date.now()}`,
          type: 'purchase_ready',
          severity: 'medium',
          title: `High Purchase Volume: ${company.company_code}`,
          message: `${company.ready_to_purchase} orders ready for purchase (${company.total_amount.toLocaleString()} ${company.currency})`,
          metadata: {
            company: company.company_code,
            count: company.ready_to_purchase,
            amount: company.total_amount
          },
          created_at: new Date()
        });
      }
    });
    
    return alerts;
  }

  // Track company routing decisions
  trackCompanyRouting(
    quoteId: string,
    company: string,
    reason: string,
    metadata?: Record<string, any>
  ) {
    logger.info('Company routing applied', {
      quote_id: quoteId,
      company,
      reason,
      metadata,
      timestamp: new Date()
    });
  }

  // Monitor exchange rate changes
  async monitorExchangeRates() {
    const { data: rates } = await supabase
      .from('direct_exchange_rates')
      .select('*')
      .eq('is_fixed', false)
      .order('created_at', { ascending: false });
    
    // Check for significant changes
    // Implementation depends on your threshold requirements
  }
}

export const monitoringService = MonitoringService.getInstance();
```

### 8.2 Alert Dashboard Component
```typescript
// src/components/admin/AlertDashboard.tsx
import { useQuery } from '@tanstack/react-query';
import { monitoringService } from '@/services/MonitoringService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bell, TrendingUp, Clock, DollarSign } from 'lucide-react';

export function AlertDashboard() {
  const { data: alerts } = useQuery({
    queryKey: ['daily-alerts'],
    queryFn: () => monitoringService.checkDailyAlerts(),
    refetchInterval: 5 * 60 * 1000 // Refresh every 5 minutes
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'fx_risk': return <TrendingUp className="h-4 w-4" />;
      case 'settlement': return <DollarSign className="h-4 w-4" />;
      case 'rate_lock': return <Clock className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'default';
    }
  };

  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      <h3 className="text-lg font-semibold">System Alerts</h3>
      {alerts.map(alert => (
        <Alert key={alert.id} variant={getVariant(alert.severity)}>
          {getIcon(alert.type)}
          <AlertTitle>{alert.title}</AlertTitle>
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
```

## Testing Strategy

### Unit Tests
```typescript
// src/__tests__/company-routing.test.ts
describe('Company Routing Service', () => {
  it('routes Indian purchases to IN company', async () => {
    const decision = await companyRoutingService.determineHandlingCompany(
      'IN',
      'US',
      'flipkart'
    );
    expect(decision.company).toBe('IN');
    expect(decision.reason).toBe('purchase_source');
  });

  it('routes Nepal destinations to NP company', async () => {
    const decision = await companyRoutingService.determineHandlingCompany(
      'US',
      'NP'
    );
    expect(decision.company).toBe('NP');
    expect(decision.reason).toBe('destination_country');
  });

  it('defaults to SG company for other routes', async () => {
    const decision = await companyRoutingService.determineHandlingCompany(
      'US',
      'GB'
    );
    expect(decision.company).toBe('SG');
    expect(decision.reason).toBe('default');
  });
});

describe('Exchange Rate Service', () => {
  it('uses fixed INR-NPR rate', async () => {
    const rate = await exchangeRateService.getExchangeRate('INR', 'NPR');
    expect(rate).toBe(1.6);
  });

  it('calculates lock duration based on order value', async () => {
    const lock = await exchangeRateService.lockRateForQuote(
      'test-quote-id',
      5000, // $5000 order
      'USD',
      'INR'
    );
    expect(lock.expiresAt.getTime() - Date.now()).toBeGreaterThan(47 * 60 * 60 * 1000);
  });
});
```

### Integration Tests
```typescript
// src/__tests__/integration/quote-flow.test.ts
describe('Quote Creation with Company Routing', () => {
  it('creates quote with correct company assignment', async () => {
    const quoteData = {
      origin_country: 'IN',
      destination_country: 'US',
      purchase_source: 'amazon.in',
      items: [{ 
        item_price: 100,
        item_weight: 1,
        quantity: 1
      }]
    };

    const quote = await quoteService.createQuote(quoteData);
    
    expect(quote.handling_company_code).toBe('IN');
    expect(quote.settlement_currency).toBe('INR');
    expect(quote.company_routing_metadata).toMatchObject({
      determined_by: 'purchase_source'
    });
  });
});
```

## Rollback Plan

### Database Rollback
```sql
-- Create rollback script
BEGIN;

-- Remove new columns
ALTER TABLE quotes 
DROP COLUMN IF EXISTS handling_company_code,
DROP COLUMN IF EXISTS locked_exchange_rate_id,
DROP COLUMN IF EXISTS settlement_currency,
DROP COLUMN IF EXISTS company_routing_metadata;

-- Drop new tables
DROP TABLE IF EXISTS settlement_line_items;
DROP TABLE IF EXISTS settlements;
DROP TABLE IF EXISTS exchange_rate_locks;
DROP TABLE IF EXISTS company_routing_rules;
DROP TABLE IF EXISTS direct_exchange_rates;
DROP TABLE IF EXISTS company_admins;
DROP TABLE IF EXISTS companies;

-- Restore old constraints
ALTER TABLE profiles 
ADD CONSTRAINT profiles_preferred_display_currency_check 
CHECK (preferred_display_currency IN ('USD', 'EUR', 'GBP', 'INR', 'NPR'));

COMMIT;
```

### Code Rollback
```bash
# Revert to previous git commit
git revert --no-commit HEAD~10..HEAD
git commit -m "Rollback: Multi-currency implementation"

# Or use specific tag
git checkout v1.0.0-pre-multicurrency
```

## Success Metrics

### Technical Metrics
- [ ] All tests passing (unit, integration, e2e)
- [ ] No increase in error rates
- [ ] Performance maintained or improved
- [ ] Zero data loss during migration

### Business Metrics
- [ ] 90% reduction in manual currency tracking time
- [ ] 100% accurate company routing
- [ ] FX margins captured as designed
- [ ] Real-time visibility of purchase readiness
- [ ] Weekly settlement process < 30 minutes

### User Experience Metrics
- [ ] Currency detection accuracy > 80%
- [ ] Page load times maintained
- [ ] No disruption to existing workflows
- [ ] Positive feedback from admin users

---

This implementation guide provides a complete roadmap for implementing the multi-currency system. Follow each phase sequentially, test thoroughly, and maintain rollback capability throughout the process.