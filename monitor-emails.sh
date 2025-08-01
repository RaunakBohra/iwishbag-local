#!/bin/bash

echo "📧 Monitoring for new emails..."
echo "Send an email to support@mail.iwishbag.com now!"
echo "Press Ctrl+C to stop monitoring"
echo ""

INITIAL_COUNT=$(PGPASSWORD=postgres psql -h localhost -p 54322 -d postgres -U postgres -t -c "SELECT COUNT(*) FROM email_messages WHERE direction = 'received';" | xargs)
echo "Starting count: $INITIAL_COUNT received emails"
echo ""

while true; do
    CURRENT_COUNT=$(PGPASSWORD=postgres psql -h localhost -p 54322 -d postgres -U postgres -t -c "SELECT COUNT(*) FROM email_messages WHERE direction = 'received';" | xargs)
    
    if [ "$CURRENT_COUNT" -gt "$INITIAL_COUNT" ]; then
        echo "🎉 NEW EMAIL DETECTED!"
        echo ""
        PGPASSWORD=postgres psql -h localhost -p 54322 -d postgres -U postgres -c "SELECT direction, from_address, subject, created_at FROM email_messages WHERE direction = 'received' ORDER BY created_at DESC LIMIT 1;"
        break
    else
        echo "⏳ Waiting... (Current: $CURRENT_COUNT, Looking for: $((INITIAL_COUNT + 1)))"
        sleep 5
    fi
done