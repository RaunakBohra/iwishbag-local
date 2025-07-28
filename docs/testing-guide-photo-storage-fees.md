# Testing Guide: Photo Management & Storage Fee Automation

## 1. Photo Management Testing

### A. Admin Photo Upload Testing

1. **Navigate to Admin Package Management**
   ```
   http://localhost:8082/admin/warehouse
   → Click "Package Management" tab
   ```

2. **Find a Test Package**
   - Look for any package in the list
   - Click the Camera icon button on any package row

3. **Test Photo Upload**
   - In the photo dialog, click "Select Photos"
   - Choose 2-3 test images from your computer
   - For each photo:
     - Select photo type (Package Front, Label, etc.)
     - Add optional caption
   - Click "Upload Photos"
   - Verify photos appear in "Existing Photos" section

4. **Test Photo Deletion**
   - Hover over an uploaded photo
   - Click the trash icon
   - Confirm photo is removed

### B. Customer Photo Viewing Testing

1. **Navigate to Package Forwarding**
   ```
   http://localhost:8082/dashboard/package-forwarding
   ```

2. **View Package Photos**
   - Find packages with photo count badges
   - Click "Photos (N)" button
   - Verify photo gallery opens
   - Test navigation between photos
   - Test download functionality

### C. Database Verification
```sql
-- Check if photos are stored correctly
SELECT 
  pp.*,
  rp.tracking_number
FROM package_photos pp
JOIN received_packages rp ON pp.package_id = rp.id
ORDER BY pp.created_at DESC
LIMIT 10;

-- Check photo counts per package
SELECT 
  rp.tracking_number,
  COUNT(pp.id) as photo_count
FROM received_packages rp
LEFT JOIN package_photos pp ON rp.id = pp.package_id
GROUP BY rp.id, rp.tracking_number
HAVING COUNT(pp.id) > 0;
```

## 2. Storage Fee Automation Testing

### A. Setup Test Data

1. **Create Packages with Different Storage Periods**

```sql
-- Create test packages with various storage durations
-- Package 1: In free period (10 days old)
INSERT INTO received_packages (
  id, tracking_number, customer_address_id, sender_name,
  weight_kg, dimensions, status, received_date,
  storage_fee_exempt_until
) VALUES (
  gen_random_uuid(),
  'TEST-FREE-PERIOD-001',
  (SELECT id FROM customer_addresses WHERE user_id = auth.uid() LIMIT 1),
  'Test Store - Free Period',
  2.5,
  '{"length": 30, "width": 20, "height": 15}',
  'received',
  NOW() - INTERVAL '10 days',
  NOW() + INTERVAL '20 days'
);

-- Package 2: About to accrue fees (28 days old)
INSERT INTO received_packages (
  id, tracking_number, customer_address_id, sender_name,
  weight_kg, dimensions, status, received_date,
  storage_fee_exempt_until
) VALUES (
  gen_random_uuid(),
  'TEST-APPROACHING-001',
  (SELECT id FROM customer_addresses WHERE user_id = auth.uid() LIMIT 1),
  'Test Store - Approaching Fees',
  3.0,
  '{"length": 40, "width": 30, "height": 20}',
  'received',
  NOW() - INTERVAL '28 days',
  NOW() + INTERVAL '2 days'
);

-- Package 3: Already accruing fees (45 days old)
INSERT INTO received_packages (
  id, tracking_number, customer_address_id, sender_name,
  weight_kg, dimensions, status, received_date,
  storage_fee_exempt_until
) VALUES (
  gen_random_uuid(),
  'TEST-ACCRUING-001',
  (SELECT id FROM customer_addresses WHERE user_id = auth.uid() LIMIT 1),
  'Test Store - Accruing Fees',
  1.5,
  '{"length": 25, "width": 15, "height": 10}',
  'received',
  NOW() - INTERVAL '45 days',
  NOW() - INTERVAL '15 days'
);

-- Package 4: Late fees (100 days old)
INSERT INTO received_packages (
  id, tracking_number, customer_address_id, sender_name,
  weight_kg, dimensions, status, received_date,
  storage_fee_exempt_until
) VALUES (
  gen_random_uuid(),
  'TEST-LATE-FEES-001',
  (SELECT id FROM customer_addresses WHERE user_id = auth.uid() LIMIT 1),
  'Test Store - Late Fees',
  4.0,
  '{"length": 50, "width": 40, "height": 30}',
  'received',
  NOW() - INTERVAL '100 days',
  NOW() - INTERVAL '70 days'
);
```

### B. Test Storage Fee Calculation

1. **Admin Panel Testing**
   ```
   http://localhost:8082/admin/warehouse
   → Click "Financial" tab
   ```

2. **Run Manual Calculation**
   - Click "Run Daily Calculation" button
   - Check the toast notification for results
   - Verify fee records are created

3. **Test Configuration Changes**
   - Click "Configure" button
   - Try changing:
     - Free Days: 30 → 45
     - Daily Rate: $1.00 → $1.50
     - Late Fee Threshold: 90 → 60 days
   - Save and verify changes apply

4. **Test Fee Waiving**
   - Find a package with fees in "Packages Approaching Storage Fees"
   - Click "Waive" button
   - Enter reason: "Test waiver"
   - Verify fees are marked as paid

5. **Test Exemption Extension**
   - Find a package approaching fees
   - Click "Extend" button
   - Add 30 additional days
   - Enter reason: "Customer requested extension"
   - Verify new exemption date

### C. Customer View Testing

1. **Check Storage Fee Alerts**
   ```
   http://localhost:8082/dashboard/package-forwarding
   ```
   - Look for storage fee alert at top of page
   - Verify it shows:
     - Packages approaching fees
     - Current unpaid fees
     - Progress bars for storage period

2. **Verify Package Cards**
   - Check packages show "Storage fees apply" badge
   - Verify "X days stored" information
   - Look for warning colors on packages near fee period

### D. Database Verification Queries

```sql
-- 1. Check storage fee configuration
SELECT * FROM unified_configuration WHERE config_key = 'storage_fees';

-- 2. View all storage fees
SELECT 
  sf.*,
  rp.tracking_number,
  rp.sender_name,
  ca.suite_number
FROM storage_fees sf
JOIN received_packages rp ON sf.package_id = rp.id
JOIN customer_addresses ca ON rp.customer_address_id = ca.id
ORDER BY sf.created_at DESC;

-- 3. Check packages approaching fees (7 day warning)
SELECT * FROM get_packages_approaching_fees(7);

-- 4. View unpaid fees by user
SELECT 
  ca.user_id,
  COUNT(DISTINCT sf.package_id) as packages_with_fees,
  SUM(sf.total_fee_usd) as total_unpaid
FROM storage_fees sf
JOIN received_packages rp ON sf.package_id = rp.id
JOIN customer_addresses ca ON rp.customer_address_id = ca.id
WHERE sf.is_paid = false
GROUP BY ca.user_id;

-- 5. Test the calculation function manually
SELECT * FROM calculate_and_create_storage_fees();
```

### E. Test Scenarios

1. **New Package Lifecycle**
   - Create a new package with received date 35 days ago
   - Run fee calculation
   - Verify 5 days of fees are created ($5.00)

2. **Fee Payment Flow**
   - Find package with unpaid fees
   - Note the fee amount
   - Create a quote including this package
   - Verify fees are linked to quote

3. **Edge Cases**
   - Package shipped before fee period
   - Package with extended exemption
   - Package with waived fees
   - Multiple packages consolidation with fees

## 3. Quick Test Checklist

### Photo Management ✓
- [ ] Upload photos as admin
- [ ] View photos as customer  
- [ ] Delete photos
- [ ] Navigate photo gallery
- [ ] Download photos

### Storage Fees ✓
- [ ] See packages in free period
- [ ] See packages approaching fees
- [ ] Run manual calculation
- [ ] View created fees
- [ ] Waive fees with reason
- [ ] Extend exemption period
- [ ] View customer alerts
- [ ] Change configuration

## 4. Troubleshooting

### Photos Not Showing
```sql
-- Check if storage bucket exists
SELECT * FROM storage.buckets WHERE id = 'package-photos';

-- Check photo records
SELECT * FROM package_photos WHERE package_id = 'your-package-id';
```

### Fees Not Calculating
```sql
-- Check packages eligible for fees
SELECT 
  id, tracking_number, 
  received_date,
  storage_fee_exempt_until,
  CURRENT_DATE - DATE(storage_fee_exempt_until) as days_past_free
FROM received_packages
WHERE status IN ('received', 'processing', 'ready_to_ship')
  AND storage_fee_exempt_until < CURRENT_DATE;

-- Check if fees already exist
SELECT * FROM storage_fees 
WHERE package_id = 'your-package-id'
ORDER BY created_at DESC;
```

### Reset Test Data
```sql
-- Delete test packages and their fees
DELETE FROM storage_fees 
WHERE package_id IN (
  SELECT id FROM received_packages 
  WHERE tracking_number LIKE 'TEST-%'
);

DELETE FROM received_packages 
WHERE tracking_number LIKE 'TEST-%';
```

## 5. Performance Testing

For bulk testing with many packages:

```sql
-- Create 100 test packages with varying storage times
DO $$
BEGIN
  FOR i IN 1..100 LOOP
    INSERT INTO received_packages (
      tracking_number, customer_address_id, sender_name,
      weight_kg, dimensions, status, received_date,
      storage_fee_exempt_until
    ) VALUES (
      'BULK-TEST-' || LPAD(i::text, 3, '0'),
      (SELECT id FROM customer_addresses LIMIT 1),
      'Bulk Test Store ' || i,
      (RANDOM() * 10 + 1)::numeric(10,2),
      '{"length": 30, "width": 20, "height": 15}',
      'received',
      NOW() - INTERVAL '1 day' * (20 + i),
      NOW() - INTERVAL '1 day' * (i - 10)
    );
  END LOOP;
END $$;

-- Run calculation and check performance
EXPLAIN ANALYZE SELECT * FROM calculate_and_create_storage_fees();
```

Remember to clean up test data after testing!