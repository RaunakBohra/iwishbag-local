#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting local development environment...${NC}"

# Kill any existing processes
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
pkill -f "supabase functions serve" 2>/dev/null
pkill -f "ngrok" 2>/dev/null

# Start Supabase functions in background
echo -e "${YELLOW}Starting Supabase functions...${NC}"
npx supabase functions serve --no-verify-jwt &
SUPABASE_PID=$!

# Wait for Supabase to start
sleep 5

# Start ngrok for the functions endpoint
echo -e "${YELLOW}Starting ngrok tunnel...${NC}"
ngrok http 54321 --log-level=info --log=stdout &
NGROK_PID=$!

# Wait for ngrok to start
sleep 5

# Get ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | grep -o 'https://[^"]*' | head -1)

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Local development environment is ready!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "Supabase Functions: http://localhost:54321/functions/v1/"
echo -e "Ngrok URL: ${NGROK_URL}/functions/v1/"
echo ""
echo -e "${YELLOW}Use this URL for webhooks:${NC}"
echo -e "${NGROK_URL}/functions/v1/airwallex-webhook"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Stopping services...${NC}"
    kill $SUPABASE_PID 2>/dev/null
    kill $NGROK_PID 2>/dev/null
    pkill -f "supabase functions serve" 2>/dev/null
    pkill -f "ngrok" 2>/dev/null
    echo -e "${GREEN}Services stopped.${NC}"
    exit 0
}

# Set up trap to cleanup on Ctrl+C
trap cleanup INT

# Keep script running
while true; do
    sleep 1
done