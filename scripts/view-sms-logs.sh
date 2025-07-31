#!/bin/bash

# View SMS Edge Function logs with different options

echo "📱 SMS Edge Function Log Viewer"
echo "================================"
echo "1. View last 20 logs"
echo "2. Search logs by phone number"
echo "3. View all errors"
echo "4. View specific OTP logs"
echo "5. Watch live logs"
echo "================================"
read -p "Choose option (1-5): " choice

case $choice in
  1)
    echo -e "\n📋 Last 20 SMS logs:"
    docker ps --format "table {{.Names}}" | grep edge_runtime | while read container; do
      docker logs "$container" 2>&1 | grep -E "(SMS AUTH HOOK|OTP:|Message:|Twilio)" | tail -20
    done
    ;;
  2)
    read -p "Enter phone number: " phone
    echo -e "\n📱 Logs for $phone:"
    docker ps --format "table {{.Names}}" | grep edge_runtime | while read container; do
      docker logs "$container" 2>&1 | grep "$phone" | tail -10
    done
    ;;
  3)
    echo -e "\n❌ Recent errors:"
    docker ps --format "table {{.Names}}" | grep edge_runtime | while read container; do
      docker logs "$container" 2>&1 | grep -E "(Error|error|failed|Failed)" | tail -10
    done
    ;;
  4)
    echo -e "\n🔐 Recent OTPs generated:"
    docker ps --format "table {{.Names}}" | grep edge_runtime | while read container; do
      docker logs "$container" 2>&1 | grep "Generated OTP:" | tail -10
    done
    ;;
  5)
    echo -e "\n👀 Watching live logs (Ctrl+C to stop)..."
    docker ps --format "table {{.Names}}" | grep edge_runtime | while read container; do
      docker logs -f "$container" 2>&1 | grep -E "(SMS|OTP|phone|Twilio)"
    done
    ;;
esac