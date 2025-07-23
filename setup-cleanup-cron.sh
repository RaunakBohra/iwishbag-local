#!/bin/bash

# Setup cron job for file cleanup
# Run this script once to setup automated cleanup

# Create a cron job that runs cleanup daily at 2 AM
CRON_JOB="0 2 * * * cd /Users/raunakbohra/Desktop/global-wishlist-hub && node cleanup-orphaned-files.js >> cleanup.log 2>&1"

# Add to crontab
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Cron job added successfully!"
echo "📅 Cleanup will run daily at 2 AM"
echo "📋 Logs will be saved to cleanup.log"
echo ""
echo "To verify the cron job was added:"
echo "   crontab -l"
echo ""
echo "To remove the cron job:"
echo "   crontab -e"