# Weight Unit System for Shipping Routes

## Overview

The shipping routes system now supports different weight units (kg/lb) per route, providing flexibility for different shipping regions and carrier preferences.

## How It Works

### 1. Route Configuration
- **Admin sets weight unit** per shipping route (kg or lb)
- **Default**: All routes use 'kg' unless specified otherwise
- **Storage**: Weight unit is stored in `shipping_routes.weight_unit` column

### 2. Weight Input & Storage
- **Input**: All weights are entered in kg (standard input unit)
- **Storage**: Weights are stored in kg in the database
- **Display**: Weights are converted and displayed in the route's unit when available

### 3. Quote Calculation
- **Conversion**: System automatically converts input weight (kg) to route's unit for calculation
- **Shipping Cost**: Calculated using the converted weight in the route's unit
- **Fallback**: If no route-specific method, uses country settings (always kg)

### 4. Admin Display
- **Quote Detail Page**: Shows weights in route's unit with clear indicators
- **Item Cards**: Weight input fields show route's unit in labels
- **Visual Indicators**: 
  - "(Route Unit)" for converted weights
  - "(Route)" for compact displays
  - Original weight shown for reference when converted

## Implementation Details

### Database Schema
```sql
ALTER TABLE shipping_routes 
ADD COLUMN weight_unit TEXT NOT NULL DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lb'));
```

### Weight Conversion
- **kg to lb**: Multiply by 2.20462
- **lb to kg**: Divide by 2.20462
- **Same unit**: No conversion needed

### Components
- **WeightDisplay**: Reusable component for consistent weight display
- **AdminQuoteDetailPage**: Shows quote and item weights in route's unit
- **EditableAdminQuoteItemCard**: Weight input with route unit labels
- **ShippingRouteManager**: Weight unit selection in route forms

## User Experience

### For Admins
1. **Route Creation**: Select weight unit (kg/lb) when creating shipping routes
2. **Quote Management**: See weights in route's unit with clear indicators
3. **Input Clarity**: Weight fields show the expected unit
4. **Transparency**: Original weight shown when conversion occurs

### For Customers
- **No Change**: Customer experience remains the same
- **Accurate Pricing**: Shipping costs calculated using appropriate weight units
- **Consistent Display**: Weights shown in standard units

## Benefits

1. **Regional Flexibility**: Support for different weight units per region
2. **Carrier Compatibility**: Match carrier preferences for weight units
3. **Accurate Pricing**: More precise shipping calculations
4. **Clear Communication**: Transparent weight unit display
5. **Backward Compatibility**: Existing routes default to kg

## Future Enhancements

- **Customer Display**: Option to show weights in customer's preferred unit
- **Multiple Units**: Support for additional weight units (oz, g, etc.)
- **Unit Preferences**: User preferences for weight unit display
- **Bulk Operations**: Weight unit conversion for bulk imports/exports 