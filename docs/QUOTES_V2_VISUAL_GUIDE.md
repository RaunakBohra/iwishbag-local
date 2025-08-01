# Quotes V2 - Visual Feature Guide

## 🎯 Where to Find Everything

### 1. Access the Demo Page
```
http://localhost:8083/demo/quotes-v2
```

## 📊 Feature Breakdown

### Share Button (🔗)
**What it does:**
- Generates a public URL like: `http://localhost:8083/quote/view/wROkWpREAEpq`
- Copies link to clipboard automatically
- No login required to view the quote

**What you'll see:**
- Toast notification: "Share link copied!"
- Green success message showing the full URL
- The share token is displayed in each quote card

### Track View Button (👁️)
**What it does:**
- Simulates a customer viewing the quote
- Updates the `viewed_at` timestamp in database
- This happens automatically when someone opens a share link

**What you'll see:**
- "Last Viewed" changes from "Never viewed" to current timestamp
- Green text shows the exact viewing time
- Toast notification confirms tracking

### Reminder Button (🔔)
**What it does:**
- Increments the reminder counter
- Updates `last_reminder_at` timestamp
- In production, this would trigger an email

**What you'll see:**
- Orange badge with number increases (0 → 1 → 2 → 3)
- Success message: "Reminder sent! This would trigger an email to the customer."
- Button is disabled if quote status isn't "sent"

### New Version Button (🕐)
**What it does:**
- Creates a complete copy of the quote
- Sets version number (1 → 2 → 3 etc)
- Links to parent quote via `parent_quote_id`
- Original quote remains unchanged

**What you'll see:**
- Success message with new revision ID
- Version number in the quote card
- Check database to see full version history

## 🔍 Visual Indicators

### Quote Status
- **Draft** - Gray text
- **Sent** - Blue text  
- **Approved** - Green text
- **Expired** - Red text

### Timestamps
- **Never viewed** - Gray italic text
- **Viewed** - Green text with exact timestamp
- **Expired** - Red text warning

### Counters
- **Reminders** - Orange badge with number
- **Version** - Small text "Version 1", "Version 2" etc

## 💾 Database Verification

After testing, verify in the database:

```sql
-- See all quote activity
SELECT 
  id,
  quote_number,
  share_token,
  viewed_at,
  reminder_count,
  version,
  parent_quote_id
FROM quotes_v2
ORDER BY created_at DESC;

-- Track reminder history
SELECT 
  id,
  reminder_count,
  last_reminder_at
FROM quotes_v2
WHERE reminder_count > 0;

-- See version control in action
SELECT 
  id,
  version,
  parent_quote_id,
  revision_reason,
  created_at
FROM quotes_v2
WHERE version > 1
OR id IN (SELECT parent_quote_id FROM quotes_v2)
ORDER BY created_at;
```

## 🎉 Success Checklist

✅ **Share System Works When:**
- You see the share token in the quote card
- Clicking Share copies a full URL
- The URL opens without login (test in incognito)

✅ **Tracking Works When:**
- "Never viewed" changes to a timestamp
- Multiple views update the timestamp
- Database shows `viewed_at` populated

✅ **Reminders Work When:**
- Counter increases from 0 to 1, 2, 3...
- `last_reminder_at` updates in database
- System respects quote status rules

✅ **Versions Work When:**
- New quotes have incrementing version numbers
- `parent_quote_id` links versions together
- Original quote stays unchanged

## 🚨 Common Issues

### "Share button doesn't copy"
- Check browser permissions for clipboard
- Look for the green success message
- Try manual copy from the displayed token

### "View tracking not updating"
- Refresh the page after clicking
- Check browser console for errors
- Verify the quote exists in database

### "Can't send reminders"
- Quote must have status = 'sent'
- Check if quote is expired
- Look for error toast messages

### "Version not creating"
- Check browser console for errors
- Verify you have write permissions
- Look for the new ID in success message