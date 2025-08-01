# Quotes V2 Demo Guide - How to Test Everything

## 🚀 Access the Demo

1. **Open your browser to:** `http://localhost:8083/demo/quotes-v2`

## 📋 What You'll See

The demo page shows a list of quotes with all the new V2 features. Each quote card displays:

### Quote Information:
- Quote number/ID
- Customer name and email
- Status and Version number
- Share token (the unique code for sharing)
- Validity period (how many days the quote is valid)
- Email sent status (✅ or ❌)
- Reminder count (how many reminders sent)
- Viewed timestamp (when customer last viewed)
- Expiry date

### Action Buttons (for each quote):

1. **🔗 Share Button**
   - Click this to copy the share link to clipboard
   - The link will look like: `http://localhost:8083/quote/view/wROkWpREAEpq`
   - This link works without login (public access)

2. **👁️ Track View Button**
   - Simulates a customer viewing the quote
   - Updates the "Viewed" timestamp in real-time
   - You'll see a toast notification when tracked

3. **🔔 Reminder Button**
   - Increments the reminder count
   - Only works for quotes with status "sent"
   - Shows how many reminders have been sent

4. **🕐 New Version Button**
   - Creates a revision/new version of the quote
   - Original quote remains unchanged
   - New quote gets version number 2, 3, etc.

## 🧪 Step-by-Step Testing

### 1. Create a Test Quote
- Click the **"Create Test Quote"** button at the top
- This creates a quote with all V2 features enabled

### 2. Test Share Tokens
- Find the **Share** button on any quote
- Click it to copy the share link
- Open the link in an incognito/private browser window
- The quote should be viewable without login

### 3. Test View Tracking
- Click the **Track View** button
- Watch the "Viewed" field update with current timestamp
- This simulates what happens when a customer opens the share link

### 4. Test Reminders
- Click the **Reminder** button
- Watch the "Reminders" count increase
- Note: Button is disabled if quote status isn't "sent"

### 5. Test Version Control
- Click the **New Version** button
- Check the database for the new revision
- The new quote will have:
  - `version: 2` (or higher)
  - `parent_quote_id: [original quote ID]`
  - `revision_reason: "Testing revision system"`

## 📊 Where to See the Data

### In the Demo UI:
All information is displayed directly on each quote card in the demo

### In the Database:
```sql
-- See all quotes with V2 fields
SELECT 
  id,
  quote_number,
  share_token,
  validity_days,
  expires_at,
  viewed_at,
  reminder_count,
  version,
  parent_quote_id,
  email_sent
FROM quotes_v2
ORDER BY created_at DESC;

-- See quote versions/history
SELECT 
  id,
  version,
  parent_quote_id,
  revision_reason,
  created_at
FROM quotes_v2
WHERE parent_quote_id IS NOT NULL
   OR id IN (SELECT parent_quote_id FROM quotes_v2 WHERE parent_quote_id IS NOT NULL)
ORDER BY version;

-- See active (non-expired) quotes
SELECT * FROM active_quotes;
```

### In the Browser Console:
Open Developer Tools (F12) to see:
- Share link URLs when copied
- API responses
- Any errors

## 🎯 What Success Looks Like

✅ **Share Token Works**: 
- You can copy a share link
- Opening it in private browser shows the quote
- No login required

✅ **View Tracking Works**:
- "Viewed" timestamp updates when you click Track View
- Toast notification confirms tracking

✅ **Reminders Work**:
- Reminder count increases
- Last reminder timestamp updates

✅ **Version Control Works**:
- New versions are created with incrementing version numbers
- Parent-child relationship is maintained

## 🛠️ Troubleshooting

### Can't see the demo page?
1. Make sure server is running: `npm run dev`
2. Go to: `http://localhost:8083/demo/quotes-v2`
3. Check console for errors

### Buttons not working?
1. Open browser console (F12)
2. Look for error messages
3. Check network tab for failed API calls

### Share link not working?
1. Make sure you're using the full URL with domain
2. Check that share_token exists in the database
3. Verify RLS policies are active

## 💡 Next Steps

Once you've verified everything works in the demo:
1. Integrate share links into your email templates
2. Add the view tracking to your public quote page
3. Set up automated reminder emails
4. Create UI for viewing quote history/versions