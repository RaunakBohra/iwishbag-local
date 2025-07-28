# Quick Testing Guide - Photo Management & Storage Fees

## Test Data Created

We've created 3 test packages:
1. **TEST-FREE-001** - In free period (20 days left)
2. **TEST-WARN-001** - Warning period (2 days until fees)  
3. **TEST-FEES-001** - Already accruing fees (15 days = $15)

## 1. Test Photo Upload (Admin)

### Steps:
1. Go to: http://localhost:8082/admin/warehouse
2. Click "Package Management" tab
3. Find any of the TEST packages
4. Click the Camera icon
5. Upload 2-3 photos:
   - Select different photo types
   - Add captions
   - Click "Upload Photos"
6. Verify photos appear
7. Try deleting a photo

### What to Check:
- Photos upload successfully
- Photo count badge updates
- Delete functionality works
- Different photo types save correctly

## 2. Test Photo Viewing (Customer)

### Steps:
1. Go to: http://localhost:8082/dashboard/package-forwarding
2. Look for packages with photo badges
3. Click "Photos (N)" button
4. In the gallery:
   - Navigate between photos
   - Try download button
   - Check thumbnails work

### What to Check:
- Gallery opens properly
- Navigation arrows work
- Photos display correctly
- Download functionality

## 3. Test Storage Fee Alerts (Customer)

### Steps:
1. Go to: http://localhost:8082/dashboard/package-forwarding
2. Look at the top of the page for alerts

### You Should See:
- **Storage Fee Alert** showing:
  - TEST-FEES-001 has $15.00 in unpaid fees
  - TEST-WARN-001 approaching fees (2 days left)
- Package cards showing:
  - "15 days stored" on TEST-FEES-001
  - "Storage fees apply" badge
  - Different colors for warning states

## 4. Test Storage Fee Management (Admin)

### Steps:
1. Go to: http://localhost:8082/admin/warehouse
2. Click "Financial" tab

### Test These Features:

#### A. Manual Calculation
- Click "Run Daily Calculation"
- Should show "Processed 3 packages, created 0 new fees" (since we already calculated)

#### B. Configuration
- Click "Configure"
- Try changing:
  - Free Days: 30 → 45
  - Daily Rate: $1.00 → $1.50
- Save and verify changes

#### C. Fee Waiving
- Find TEST-FEES-001 in the list
- Click "Waive"
- Enter reason: "Testing waive feature"
- Verify fees are waived

#### D. Extend Exemption
- Find TEST-WARN-001
- Click "Extend"
- Add 30 days
- Enter reason: "Testing extension"
- Verify new date shows

### Analytics to Check:
- Total Revenue: $0 (unpaid)
- Unpaid Fees: $15.00
- Packages w/ Fees: 1
- Average Days Stored

## 5. Quick SQL Checks

```sql
-- View all test packages with fees
SELECT 
  rp.tracking_number,
  rp.package_description,
  sf.total_fee_usd,
  sf.is_paid,
  sf.notes
FROM received_packages rp
LEFT JOIN storage_fees sf ON rp.id = sf.package_id
WHERE rp.tracking_number LIKE 'TEST-%';

-- Check photo uploads
SELECT 
  rp.tracking_number,
  COUNT(pp.id) as photo_count,
  STRING_AGG(pp.photo_type, ', ') as photo_types
FROM received_packages rp
LEFT JOIN package_photos pp ON rp.id = pp.package_id
WHERE rp.tracking_number LIKE 'TEST-%'
GROUP BY rp.id, rp.tracking_number;

-- Check configuration
SELECT config_data FROM unified_configuration 
WHERE config_key = 'storage_fees';
```

## 6. Cleanup Test Data

When done testing, run:

```sql
-- Delete test storage fees
DELETE FROM storage_fees 
WHERE package_id IN (
  SELECT id FROM received_packages 
  WHERE tracking_number LIKE 'TEST-%'
);

-- Delete test photos
DELETE FROM package_photos
WHERE package_id IN (
  SELECT id FROM received_packages 
  WHERE tracking_number LIKE 'TEST-%'
);

-- Delete test packages
DELETE FROM received_packages 
WHERE tracking_number LIKE 'TEST-%';
```

## Common Issues

### Photos Not Uploading
- Check browser console for errors
- Verify storage bucket exists
- Check file size (max 10MB)

### Fees Not Showing
- Run manual calculation
- Check package dates
- Verify configuration is set

### Customer Alerts Missing
- Ensure you're logged in
- Check you have packages
- Refresh the page

## Success Indicators

✅ Photos upload and display correctly
✅ Storage fee alerts appear for customers
✅ Admin can manage fees (waive/extend)
✅ Configuration changes apply
✅ Analytics show correct numbers
✅ Package cards show storage status