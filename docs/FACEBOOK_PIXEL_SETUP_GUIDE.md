# 📊 Facebook Pixel Setup Guide for iwishBag

## 🎯 What is Facebook Pixel?

Facebook Pixel tracks user actions on your website to:
- Measure advertising effectiveness
- Build custom audiences for retargeting
- Optimize ads for people likely to take action
- Track cart abandonment recovery success

## 📋 Step-by-Step Setup

### Step 1: Access Facebook Business Manager

1. **Go to:** [Facebook Business Manager](https://business.facebook.com/)
2. **Sign in** with your Facebook account
3. **Select your business** (or create one if needed)

### Step 2: Navigate to Events Manager

1. **Click the menu** (9 dots) in top-left corner
2. **Select "Events Manager"**
3. **If you don't see it:** Go to "All Tools" → "Measure & Report" → "Events Manager"

### Step 3: Find or Create Your Pixel

#### Option A: If You Already Have a Pixel
1. **Look for existing pixels** in the list
2. **Click on the pixel name**
3. **Copy the Pixel ID** (15-digit number at the top)

#### Option B: If You Need to Create a Pixel
1. **Click "Add"** → **"Facebook Pixel"**
2. **Name your pixel:** "iwishBag Pixel"
3. **Enter website URL:** `iwishbag.com` or your domain
4. **Click "Create Pixel"**
5. **Copy the Pixel ID** shown

### Step 4: Get Your Pixel ID

Your Pixel ID will look like: `123456789012345` (15 digits)

**Copy this number exactly!**

## 🔧 Configuration in Your Project

### Step 5: Update Environment Variables

1. **Open your `.env` file**
2. **Find this line:**
   ```bash
   VITE_FACEBOOK_PIXEL_ID=000000000000000
   ```
3. **Replace with your actual Pixel ID:**
   ```bash
   VITE_FACEBOOK_PIXEL_ID=123456789012345
   ```

### Step 6: Restart Development Server

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

## ✅ Verify Setup is Working

### Test 1: Check Browser Console

1. **Open your site:** http://localhost:8082
2. **Open browser console** (F12)
3. **Look for:** `[Analytics] ✅ Facebook Pixel initialized`

### Test 2: Use Facebook Pixel Helper

1. **Install:** [Facebook Pixel Helper Chrome Extension](https://chrome.google.com/webstore/detail/facebook-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc)
2. **Visit your site**
3. **Click the extension icon**
4. **Should show:** Your Pixel ID and "Pixel fired correctly"

### Test 3: Facebook Events Manager

1. **Go back to Events Manager**
2. **Click your pixel**
3. **Go to "Test Events" tab**
4. **Visit your website**
5. **Should see real-time events** like PageView

## 🧪 Test Events You'll See

Once configured, you'll automatically track:

### Page Events
- **PageView:** Every page visit
- **ViewContent:** Product/quote views

### Ecommerce Events
- **AddToCart:** When items added to cart
- **InitiateCheckout:** When checkout starts
- **AddPaymentInfo:** When payment method selected
- **Purchase:** When orders completed

### Custom Events (Cart Abandonment)
- **CartAbandoned:** When carts are abandoned
- **EmailSent:** When recovery emails sent
- **EmailClicked:** When recovery emails clicked

## 🔧 Advanced Configuration Options

### Custom Conversions

In Facebook Events Manager, you can create:

1. **Purchase Conversions**
   - Event: Purchase
   - Value: Order amount
   - Currency: INR/NPR

2. **Cart Abandonment Recovery**
   - Event: Custom (CartRecovered)
   - Track recovery success rate

3. **Quote Request Conversions**
   - Event: Custom (QuoteRequested)
   - Track quote-to-purchase funnel

### Audience Building

Create custom audiences for:

1. **Website Visitors:** All site visitors (30/60/90 days)
2. **Cart Abandoners:** People who added to cart but didn't purchase
3. **Purchasers:** Customers who completed orders
4. **High-Value Customers:** Orders above certain amount

## 🎯 Expected Results

### Immediate (After Setup)
- ✅ Pixel tracking active
- ✅ Real-time events in Facebook
- ✅ Custom audience building starts

### Within 1-2 Weeks
- 📊 Sufficient data for ad optimization
- 🎯 Retargeting campaigns possible
- 📈 Cart abandonment recovery attribution

### Within 1 Month
- 🚀 Optimized ad campaigns
- 💰 Lower customer acquisition costs
- 📊 Full funnel analytics

## 🛡️ Privacy Compliance

### GDPR Compliance
Your implementation includes:
- ✅ Pixel only loads after user consent
- ✅ No personal data in events
- ✅ Respects browser Do Not Track

### Data Protection
- Events use hashed identifiers
- No sensitive information tracked
- Compliant with Facebook's data policies

## 🆘 Troubleshooting

### Pixel Not Firing?
1. **Check Pixel ID** is correct in .env
2. **Restart dev server** after .env changes
3. **Clear browser cache**
4. **Check console** for JavaScript errors

### Events Not Showing?
1. **Wait 2-3 minutes** for events to appear
2. **Check Test Events tab** in Events Manager
3. **Verify Pixel Helper** shows green checkmark
4. **Test on incognito window**

### Still Having Issues?
1. **Check browser console** for errors
2. **Verify .env file** has correct format
3. **Test with Pixel Helper extension**
4. **Contact Facebook Support** if pixel issues persist

## 🎉 Next Steps After Setup

1. **Create lookalike audiences** from purchasers
2. **Set up retargeting campaigns** for cart abandoners  
3. **Track ROI** of cart abandonment recovery
4. **Optimize ads** based on pixel data
5. **Scale successful campaigns**

---

**Ready to get your Pixel ID?** Follow steps 1-4 above, then update your `.env` file! 🚀