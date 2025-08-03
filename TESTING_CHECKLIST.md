# Multi-Country Smart Product Intelligence Testing Checklist

## Phase 1: Database Schema Testing
### Database Tables Creation
- [ ] `product_classifications` table created successfully
- [ ] `country_configs` table created successfully  
- [ ] `customs_valuation_overrides` table created successfully
- [ ] All foreign key constraints working
- [ ] All indexes created and functional
- [ ] RLS policies applied correctly

### Data Integrity Testing
- [ ] Insert test data for India HSN codes
- [ ] Insert test data for Nepal HS codes
- [ ] Insert test data for USA HTS codes (future)
- [ ] Verify JSONB structure validation
- [ ] Test unique constraints
- [ ] Test data relationships

### Migration Testing
- [ ] Migration runs without errors
- [ ] Migration is reversible
- [ ] No data loss during migration
- [ ] Existing functionality unaffected

## Phase 2: Smart Suggestion Services Testing
### ProductIntelligenceService
- [ ] Country detection working correctly
- [ ] HSN/HS code suggestions accurate
- [ ] Weight estimation logic functional
- [ ] Category mapping correct
- [ ] Customs rate calculation accurate

### Multi-Country Support
- [ ] India HSN system integration
- [ ] Nepal HS system integration
- [ ] Default/fallback behavior
- [ ] Country-specific rate application

### Service Integration
- [ ] Integration with existing QuoteCalculator
- [ ] No breaking changes to current API
- [ ] Backward compatibility maintained
- [ ] Performance within acceptable limits

## Phase 3: UI Components Testing
### Enhanced Product Form
- [ ] Smart suggestions displayed correctly
- [ ] Manual override functionality working
- [ ] Category selection UI functional
- [ ] HSN/HS code input validation
- [ ] Weight recommendation display

### User Experience
- [ ] Loading states for suggestions
- [ ] Error handling for failed suggestions
- [ ] Optional vs required field handling
- [ ] Responsive design across devices
- [ ] Accessibility compliance

### Admin vs Customer Views
- [ ] Admin sees all intelligence features
- [ ] Customer sees appropriate suggestions
- [ ] Permission-based feature access
- [ ] Different UI flows tested

## Phase 4: Integration Testing
### Quote Calculator Integration
- [ ] Enhanced quotes calculated correctly
- [ ] Customs valuation flexibility working
- [ ] Multi-country rates applied properly
- [ ] Total calculation accuracy maintained

### End-to-End Workflows
- [ ] Create quote with smart suggestions
- [ ] Modify quote with manual overrides
- [ ] Calculate shipping with new data
- [ ] Process payment with enhanced quotes
- [ ] Admin review of intelligent quotes

### Performance Testing
- [ ] Database query performance acceptable
- [ ] UI response times within limits
- [ ] Memory usage optimized
- [ ] No memory leaks detected

## Regression Testing
### Existing Functionality
- [ ] Current quote calculator unchanged
- [ ] Existing HSN codes still work
- [ ] Volumetric weight calculations intact
- [ ] Discount system unaffected
- [ ] Payment processing unchanged

### Data Integrity
- [ ] Existing quotes remain valid
- [ ] Historical data preserved
- [ ] No orphaned records created
- [ ] Audit trails maintained

## Security Testing
### Access Control
- [ ] RLS policies prevent unauthorized access
- [ ] Admin-only features protected
- [ ] Customer data isolation maintained
- [ ] API endpoints secured properly

### Data Validation
- [ ] Input sanitization working
- [ ] SQL injection prevention
- [ ] XSS protection in place
- [ ] CSRF protection maintained

## Manual Test Scenarios

### Scenario 1: India Customer Quote
1. Create quote for India destination
2. Add product with suggested HSN code
3. Verify customs rate applied correctly
4. Test manual HSN override
5. Calculate total and verify accuracy

### Scenario 2: Nepal Customer Quote  
1. Create quote for Nepal destination
2. Add product with suggested HS code
3. Verify customs rate applied correctly
4. Test weight estimation suggestion
5. Calculate total and verify accuracy

### Scenario 3: Admin Override Testing
1. Login as admin
2. Create quote with manual overrides
3. Test customs valuation flexibility
4. Verify admin-specific features
5. Save quote and verify data integrity

### Scenario 4: Backward Compatibility
1. Load existing quote without smart features
2. Verify calculation remains same
3. Add item to existing quote
4. Verify new items get suggestions
5. Ensure no existing data modified

### Scenario 5: Performance Testing
1. Create quote with 10+ items
2. Measure suggestion response time
3. Test with slow network conditions
4. Verify UI remains responsive
5. Check for memory leaks

## Automated Testing Requirements
- [ ] Unit tests for all new services
- [ ] Integration tests for database operations
- [ ] Component tests for UI elements
- [ ] E2E tests for complete workflows
- [ ] Performance benchmarks established

## Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest) 
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers tested

## Environment Testing
- [ ] Development environment
- [ ] Local Supabase instance
- [ ] Staging environment (if available)
- [ ] Production readiness verified

## Rollback Plan
- [ ] Database migration rollback tested
- [ ] Feature flag implementation
- [ ] Graceful degradation working
- [ ] Emergency disable mechanism

---

## Testing Commands

```bash
# Database testing
npm run test:db

# Unit testing
npm run test:unit

# Integration testing  
npm run test:integration

# E2E testing
npm run test:e2e

# Performance testing
npm run test:performance

# Type checking
npm run typecheck

# Linting
npm run lint

# Build verification
npm run build
```

## Test Data Requirements
- Sample HSN codes for India (electronics, clothing, books)
- Sample HS codes for Nepal (similar categories)
- Test products with known weights/dimensions
- Test customers in different countries
- Admin and regular user accounts

## Success Criteria
- All automated tests pass
- Manual test scenarios complete successfully
- Performance benchmarks met
- No regression in existing functionality
- User experience improved with smart suggestions
- Database integrity maintained
- Security requirements satisfied