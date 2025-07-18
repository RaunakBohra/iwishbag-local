# Markup System Guide

## Overview
The iwishBag platform provides a comprehensive markup system that allows you to add extra charges (percentages or fixed amounts) to specific routes or countries. This guide explains all available markup options and how to use them.

## 🎯 Markup Types Available

### **1. Route-Level Markups** (shipping_routes table)
Applied to specific origin → destination combinations

#### **A. New Enhanced Markups**
- **`markup_percentage`** - Additional percentage of item price
- **`markup_fixed_amount`** - Fixed amount in origin currency
- **`exchange_rate_markup`** - Additional exchange rate adjustment
- **`priority_fee`** - Priority processing fee
- **`markup_notes`** - Notes explaining the markup

#### **B. Legacy Shipping Costs** (still available)
- **`cost_percentage`** - Original percentage of item price
- **`base_shipping_cost`** - Base shipping cost
- **`cost_per_kg`** - Cost per kilogram

### **2. Country-Level Markups** (country_settings table)
Applied to ALL routes going TO a specific country

#### **Enhanced Country Markups**
- **`country_markup_percentage`** - Percentage applied to all routes to this country
- **`country_markup_fixed`** - Fixed fee for all routes to this country
- **`exchange_rate_adjustment`** - Exchange rate adjustment for this country
- **`country_markup_notes`** - Notes explaining the country markup

#### **Legacy Country Fees** (still available)
- **`payment_gateway_fixed_fee`** - Payment processing fixed fee
- **`payment_gateway_percent_fee`** - Payment processing percentage fee

### **3. Exchange Rate Adjustments** (hardcoded in update function)
- **Nepal (NP)**: +2 added to API exchange rate
- **India (IN)**: +3 added to API exchange rate

## 📊 How Markups Are Applied

### **Calculation Order**
1. **Base Item Price** (user input)
2. **Route-Level Markups** (shipping_routes)
3. **Country-Level Markups** (country_settings)
4. **Exchange Rate Conversion** (with any adjustments)
5. **Payment Gateway Fees** (country_settings)

### **Example Calculation**
For a $100 item, 1kg weight, US → China route:

```
Base Item Price:           $100.00
Route Markup (3.5%):       $3.50
Route Fixed Markup:        $15.00
Priority Fee:              $10.00
Country Markup (1.5%):     $1.50
Country Fixed Fee:         $5.00
Exchange Rate (7.19):      Convert to ¥927.77 CNY
Payment Gateway Fee:       Based on country settings
```

## 🖥️ Using the Admin Interface

### **Accessing Markup Management**
1. Navigate to: `/admin/shipping-routes`
2. Click the **"Markups"** tab
3. Choose between **"Route Markups"** or **"Country Markups"**

### **Route Markups Interface**
- **View All Routes**: See all shipping routes with their markups
- **Visual Indicators**: Routes with markups are highlighted
- **Edit Markup**: Click "Edit" to modify route-specific markups
- **Sample Calculation**: See markup impact on $100 item

### **Country Markups Interface**
- **View All Countries**: See all countries with their markups
- **Edit Country Markup**: Click "Edit" to modify country-wide markups
- **Exchange Rate Adjustments**: Modify exchange rate adjustments

## 🔧 Setting Up Markups

### **Route-Level Markup Example**
```sql
-- Add 3.5% markup + $15 fixed fee + $10 priority fee to US → China
UPDATE shipping_routes 
SET 
    markup_percentage = 3.5,
    markup_fixed_amount = 15.00,
    priority_fee = 10.00,
    markup_notes = 'High-demand route with priority handling'
WHERE origin_country = 'US' AND destination_country = 'CN';
```

### **Country-Level Markup Example**
```sql
-- Add 1.5% markup + $5 fixed fee to ALL routes going to China
UPDATE country_settings 
SET 
    country_markup_percentage = 1.5,
    country_markup_fixed = 5.00,
    country_markup_notes = 'Additional processing for China deliveries'
WHERE code = 'CN';
```

### **Exchange Rate Adjustment Example**
```sql
-- Add 0.5 to exchange rate for better margins
UPDATE shipping_routes 
SET 
    exchange_rate_markup = 0.5,
    markup_notes = 'Exchange rate adjustment for margin protection'
WHERE origin_country = 'JP' AND destination_country = 'NP';
```

## 💡 Common Use Cases

### **1. High-Demand Routes**
For popular routes like US → India, US → China:
- **Markup Percentage**: 2-5%
- **Fixed Amount**: $10-25
- **Priority Fee**: $5-15
- **Reasoning**: High demand, priority handling

### **2. Difficult/Remote Countries**
For challenging destinations:
- **Country Markup**: 3-7%
- **Fixed Fee**: $15-50
- **Exchange Rate Adjustment**: +0.5 to +2.0
- **Reasoning**: Additional processing, higher risk

### **3. Premium Services**
For express or priority routes:
- **Priority Fee**: $10-50
- **Markup Percentage**: 5-10%
- **Reasoning**: Faster processing, premium service

### **4. Currency Volatility Protection**
For volatile currencies:
- **Exchange Rate Markup**: +0.5 to +2.0
- **Country Markup**: 2-5%
- **Reasoning**: Protect against currency fluctuations

## 📈 Markup Strategies

### **Route-Based Strategy**
- **High Volume Routes**: Lower percentage, higher fixed fee
- **Low Volume Routes**: Higher percentage, lower fixed fee
- **Express Routes**: Significant priority fees

### **Country-Based Strategy**
- **Developed Countries**: Lower markups (1-3%)
- **Developing Countries**: Medium markups (3-7%)
- **Challenging Countries**: Higher markups (5-15%)

### **Dynamic Pricing**
- **Peak Season**: Increase markups temporarily
- **Off-Season**: Reduce markups to encourage volume
- **Currency Events**: Adjust exchange rate markups

## 🔍 Monitoring & Analysis

### **Key Metrics to Track**
- **Markup Revenue**: Total revenue from markups
- **Route Profitability**: Profit margins by route
- **Customer Impact**: Order volume changes after markup changes
- **Conversion Rates**: Quote-to-order conversion by markup level

### **Recommended Reviews**
- **Monthly**: Review route-level markups
- **Quarterly**: Review country-level markups
- **As Needed**: Adjust for currency volatility, market changes

## ⚠️ Important Notes

### **Currency Considerations**
- **Route markups** are in origin currency
- **Country markups** are in destination currency
- **Exchange rate markups** affect the conversion rate

### **Stacking Effects**
- All markups stack (add together)
- Higher markups = higher prices = potentially lower conversion
- Balance markup revenue with order volume

### **Testing Recommendations**
- Test markup changes on low-volume routes first
- Monitor conversion rates after markup changes
- Have rollback plan for markup adjustments

## 🛠️ Technical Implementation

### **Database Schema**
```sql
-- Route-level markups
ALTER TABLE shipping_routes ADD COLUMN markup_percentage NUMERIC(5,2) DEFAULT 0;
ALTER TABLE shipping_routes ADD COLUMN markup_fixed_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE shipping_routes ADD COLUMN exchange_rate_markup NUMERIC(5,4) DEFAULT 0;
ALTER TABLE shipping_routes ADD COLUMN priority_fee NUMERIC(10,2) DEFAULT 0;
ALTER TABLE shipping_routes ADD COLUMN markup_notes TEXT;

-- Country-level markups
ALTER TABLE country_settings ADD COLUMN country_markup_percentage NUMERIC(5,2) DEFAULT 0;
ALTER TABLE country_settings ADD COLUMN country_markup_fixed NUMERIC(10,2) DEFAULT 0;
ALTER TABLE country_settings ADD COLUMN exchange_rate_adjustment NUMERIC(5,4) DEFAULT 0;
ALTER TABLE country_settings ADD COLUMN country_markup_notes TEXT;
```

### **API Integration**
The markup system integrates with the existing quote calculation system. All markups are automatically applied when:
- Calculating shipping costs
- Generating customer quotes
- Processing orders

### **Frontend Integration**
The markup system is accessible through:
- **Admin Interface**: `/admin/shipping-routes` → "Markups" tab
- **Route Management**: Individual route editing
- **Country Management**: Country-wide settings

## 📞 Support & Troubleshooting

### **Common Issues**
1. **Markups not applying**: Check database column values
2. **Wrong currency**: Verify origin/destination currency settings
3. **Calculation errors**: Review markup stacking logic

### **Getting Help**
- Check the admin interface for current markup settings
- Review the database for markup values
- Test with sample calculations before going live

---

*This markup system provides powerful flexibility for pricing optimization while maintaining transparency and control over your shipping costs and profit margins.*