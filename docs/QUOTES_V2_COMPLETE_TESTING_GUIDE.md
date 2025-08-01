# Complete Testing Guide for Quotes V2 System

Follow this step-by-step guide to test every feature of the V2 system.

## 🚀 Prerequisites

1. **Start your dev server**
   ```bash
   npm run dev
   ```

2. **Open browser to**: http://localhost:8083

## 📋 Step-by-Step Testing Guide

### Step 1: Access the Demo Page
1. Navigate to: **http://localhost:8083/demo/quotes-v2**
2. You should see the "Quotes V2 System Demo" page
3. Look for the blue instruction box at the top

✅ **What to verify**: Demo page loads with instructions

---

### Step 2: Create a Test Quote
1. Click the **"Create Test Quote"** button
2. Wait for success toast notification
3. A new quote card should appear

✅ **What to verify**: 
- Quote has a share token (shown in gray box)
- Status shows as "sent" (blue text)
- Version shows as "1"

---

### Step 3: Test Share Token System
1. Find the **Share** button on your quote
2. Click it
3. Check for "Share link copied!" toast
4. Look at the green success box at bottom

✅ **What to verify**:
- Link format: `http://localhost:8083/quote/view/[12-char-token]`
- Clipboard contains the link (try pasting somewhere)

---

### Step 4: Test Public Quote View
1. Take the copied share link
2. Open it in a **new incognito/private browser window**
3. You should see the quote without logging in

✅ **What to verify**:
- Quote displays with all details
- No login required
- Shows items, costs, and total
- Has "Approve Quote" and "Request Changes" buttons

---

### Step 5: Test View Tracking
1. Back in the demo page
2. Click **"Track View"** button
3. Watch the "Last Viewed" field

✅ **What to verify**:
- Changes from "Never viewed" to current timestamp
- Timestamp shown in green
- Toast notification confirms tracking

---

### Step 6: Test Reminder System
1. Make sure quote status is "sent" (blue)
2. If status is "draft", click **"Send Quote"** first
3. Click **"Reminder"** button
4. Watch the orange reminder counter

✅ **What to verify**:
- Counter increases from 0 → 1
- Success message appears
- Can click again to increase to 2, then 3
- Button disables after 3 reminders

---

### Step 7: Test Version Control
1. Click **"New Version"** button
2. Check the success message for new ID
3. Refresh the page to see both versions

✅ **What to verify**:
- Success message with new revision ID
- Original quote still exists
- New quote has version 2

---

### Step 8: Test Quote Expiry
1. Check the "Expires" field on quotes
2. Note the expiry date (7 days from creation)
3. Look for any red "expired" status

✅ **What to verify**:
- Expiry date is set
- Shows remaining validity days
- Expired quotes show in red

---

### Step 9: Test Integration Dashboard
1. Navigate to: **http://localhost:8083/demo/quotes-v2-integration**
2. Check the stats cards at top
3. Browse the tabs

✅ **What to verify**:
- Stats show: Active Quotes, Emails Sent, Quotes Viewed, Reminders
- Recent Quotes tab shows quotes with email component
- Automation tab has maintenance tools
- Integration Guide tab has code examples

---

### Step 10: Test Email Sending Component
1. In the Integration Dashboard
2. Find a quote in "Recent Quotes" tab
3. Look for the "Quote Delivery" card
4. Click **"Send Quote Email"**

✅ **What to verify**:
- Share link is displayed
- Copy button works
- "Preview Quote Page" opens the public view
- Console shows email that would be sent

---

### Step 11: Test Automation Tools
1. In Integration Dashboard → Automation tab
2. Click **"Run Daily Maintenance"**
3. Check the alert for results

✅ **What to verify**:
- Shows expired quotes marked
- Shows quotes needing reminders
- No errors in execution

---

### Step 12: Test GitHub Actions (Automated)
1. Go to your GitHub repository
2. Click **Actions** tab
3. Find and run:
   - "Send Quote Reminders"
   - "Check Expired Quotes"

✅ **What to verify**:
- Workflows run without errors
- Check logs for processed quotes
- Summary shows statistics

---

### Step 13: Database Verification
Run these SQL queries in Supabase SQL Editor:

```sql
-- Check all V2 fields exist
SELECT 
  share_token,
  validity_days,
  expires_at,
  sent_at,
  viewed_at,
  email_sent,
  reminder_count,
  version,
  parent_quote_id
FROM quotes_v2
ORDER BY created_at DESC
LIMIT 5;

-- Check active quotes view
SELECT * FROM active_quotes LIMIT 5;

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN (
  'generate_quote_share_token',
  'is_quote_expired',
  'track_quote_view',
  'send_quote_reminder',
  'create_quote_revision'
);
```

✅ **What to verify**:
- All columns exist and have data
- Functions return 5 rows
- No errors in queries

---

## 🎯 Feature Checklist

Use this to track what you've tested:

### Core Features
- [ ] Share tokens generate automatically
- [ ] Public quote view works without login
- [ ] View tracking updates timestamp
- [ ] Reminders increment counter
- [ ] Version control creates revisions
- [ ] Expiry dates calculate correctly

### Communication
- [ ] Email component shows share link
- [ ] Copy to clipboard works
- [ ] Preview opens public view
- [ ] Email templates render (check console)

### Automation
- [ ] Daily maintenance runs
- [ ] GitHub Actions execute
- [ ] Expired quotes get marked
- [ ] Reminders queue properly

### UI/UX
- [ ] Demo page is intuitive
- [ ] Integration dashboard helpful
- [ ] Public quote view professional
- [ ] Toast notifications clear

---

## 🔍 Troubleshooting

### Issue: Share button doesn't work
- Check browser console for errors
- Verify clipboard permissions
- Try manual copy from token display

### Issue: Reminder button disabled
- Quote must have status "sent"
- Click "Send Quote" first
- Check if already at 3 reminders

### Issue: Version creation fails
- Check browser console
- Verify database connection
- Try refreshing page

### Issue: GitHub Actions fail
- Check secrets are set correctly
- Review workflow logs
- Test scripts locally first

---

## 📊 Success Criteria

You've successfully tested V2 when:
1. ✅ Created quotes with share tokens
2. ✅ Viewed quote publicly via share link
3. ✅ Tracked views and sent reminders
4. ✅ Created quote revisions
5. ✅ Ran automation successfully
6. ✅ All database queries return data

---

## 🎉 Next Steps

After testing, you're ready to:
1. Integrate into production quote forms
2. Set up real email sending
3. Configure daily automation
4. Monitor quote metrics

Need help? Check the other guides:
- QUOTES_V2_INTEGRATION_GUIDE.md
- GITHUB_ACTIONS_SETUP.md
- QUOTES_V2_DEMO_GUIDE.md