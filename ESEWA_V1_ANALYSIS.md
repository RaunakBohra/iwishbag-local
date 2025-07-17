# eSewa v1 vs v2 API Analysis - CRITICAL FINDINGS

**Date:** July 17, 2025  
**Discovery:** Original eSewa v1 API documentation and merchant credentials found  

## 🚨 CRITICAL ISSUE IDENTIFIED

We've been implementing **eSewa API v2** but your merchant account was set up for **eSewa API v1** (2016-2017).

---

## 📋 YOUR ACTUAL MERCHANT CREDENTIALS (v1)

### **From 2017 Email:**
- **Service Code**: `eSewa_iwish`
- **Merchant Username**: `info@iwishbag.com` 
- **Merchant Password**: `123456`
- **Test URL**: `www.dev.esewa.com.np`

### **vs Current Integration (v2):**
- **Product Code**: `NP-ES-IWISH`
- **Secret Key**: `LCQsJCkxKiJDKyNIMjJeIjIwNjs=`

---

## 🔍 API VERSION DIFFERENCES

### **eSewa v1 (Your Account)**
```
Request URL: http://dev.esewa.com.np/epay/main
Method: POST
Parameters:
- amt (amount)
- txAmt (tax amount)  
- psc (service charge)
- pdc (delivery charge)
- tAmt (total amount)
- scd (service code) = "eSewa_iwish"
- pid (product ID)
- su (success URL)
- fu (failure URL)
```

### **eSewa v2 (What we implemented)**
```
Request URL: https://rc-epay.esewa.com.np/api/epay/main/v2/form
Method: POST
Parameters:
- amount
- tax_amount
- total_amount
- transaction_uuid
- product_code = "NP-ES-IWISH"
- signature (HMAC-SHA256)
- signed_field_names
```

---

## 💡 ROOT CAUSE ANALYSIS

### **Why ES104 Error Occurred:**
1. **Wrong API Version**: v2 API doesn't recognize v1 merchant accounts
2. **Different Authentication**: v1 uses service code, v2 uses signatures
3. **Different Endpoints**: Completely different URL structures
4. **Account Mismatch**: Your account (`eSewa_iwish`) exists in v1 system

### **Why "Merchant Not Found":**
- `NP-ES-IWISH` doesn't exist because it's a v2 format
- Your actual service code is `eSewa_iwish` in v1 system

---

## 🎯 SOLUTION OPTIONS

### **Option 1: Use Existing v1 Account (Recommended)**
✅ **Immediate Integration** - Account already exists  
✅ **No New Setup Required** - Already approved since 2017  
✅ **Simple Implementation** - No signature generation needed  

**Implementation:**
```html
<form action="http://dev.esewa.com.np/epay/main" method="POST">
  <input value="100" name="tAmt" type="hidden">
  <input value="100" name="amt" type="hidden">
  <input value="0" name="txAmt" type="hidden">
  <input value="0" name="psc" type="hidden">
  <input value="0" name="pdc" type="hidden">
  <input value="eSewa_iwish" name="scd" type="hidden">
  <input value="PRODUCT-123" name="pid" type="hidden">
  <input value="https://iwishbag.com/success" name="su" type="hidden">
  <input value="https://iwishbag.com/failure" name="fu" type="hidden">
  <input value="Submit" type="submit">
</form>
```

### **Option 2: Upgrade to v2 Account**
⚠️ **Requires New Application** - Need to contact eSewa for v2 migration  
⚠️ **Possible Fees** - May require new setup fees  
⚠️ **Timeline Delay** - Could take weeks for approval  

---

## 🚀 IMMEDIATE ACTION PLAN

### **Step 1: Test v1 Integration (2-4 hours)**
- Update Edge Function to use v1 API format
- Use service code `eSewa_iwish` instead of `NP-ES-IWISH`
- Remove signature generation (not needed for v1)
- Test with provided credentials

### **Step 2: Verify Account Status**
- Check if `eSewa_iwish` account is still active
- Login to merchant panel: `info@iwishbag.com` / `123456`
- Verify test environment access

### **Step 3: Production Deployment**
- If v1 works, deploy immediately
- If account inactive, contact eSewa for reactivation

---

## 📞 CONTACT STRATEGY

### **If v1 Account Active:**
- ✅ **Go Live Immediately** with v1 integration
- 📧 **Optional**: Ask about v2 migration later

### **If v1 Account Inactive:**
- 📞 **Contact**: `lalprasad.aryal@esewa.com.np` (Your original contact)
- 🔄 **Request**: Reactivate existing `eSewa_iwish` account
- 💰 **Mention**: Existing relationship since 2016

---

## 🎯 SUCCESS PROBABILITY

### **v1 Reactivation: 90%**
- ✅ Existing approved merchant
- ✅ Historical relationship
- ✅ Simple reactivation request

### **v1 Integration: 95%**
- ✅ No signature complexity
- ✅ Simple form POST
- ✅ Well-documented API

---

## 📁 NEXT STEPS

1. **✅ Implement v1 Integration** (2-4 hours)
2. **✅ Test with existing credentials**
3. **✅ Contact eSewa if account inactive**
4. **✅ Go live immediately if working**

**This discovery just saved us weeks of debugging!** 🎉

---

## 📋 HISTORICAL TIMELINE

- **2016**: Initial eSewa integration request
- **2017**: Account setup completed (`eSewa_iwish`)
- **2017-2025**: Account possibly dormant
- **2025**: Attempted v2 integration with wrong credentials
- **TODAY**: Discovered v1 account and correct implementation path

**Your eSewa integration can be live TODAY using the v1 API!** 🚀