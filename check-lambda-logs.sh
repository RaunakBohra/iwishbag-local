#!/bin/bash

echo "📋 Checking Lambda function logs..."
echo "=================================="
echo ""

# Get the last 10 log events
aws logs filter-log-events \
  --log-group-name /aws/lambda/iwishbag-process-incoming-email \
  --start-time $(date -u -v-10M +%s)000 \
  --limit 10 \
  --query 'events[*].[timestamp,message]' \
  --output text 2>/dev/null | while IFS=$'\t' read -r timestamp message; do
    if [ ! -z "$timestamp" ]; then
      date_formatted=$(date -r $((timestamp/1000)) "+%Y-%m-%d %H:%M:%S")
      echo "[$date_formatted] $message"
    fi
done

if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo "No recent logs found. The Lambda hasn't been triggered yet."
  echo ""
  echo "This is normal if no external emails have been sent to:"
  echo "  - support@mail.iwishbag.com"
  echo "  - info@mail.iwishbag.com"
  echo "  - noreply@mail.iwishbag.com"
fi