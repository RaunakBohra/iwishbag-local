#!/bin/bash
# Cloudflare Pages build script
# This ensures npm install works with legacy peer deps

echo "🚀 Starting Cloudflare Pages build..."
echo "📦 Installing dependencies with legacy peer deps..."
npm install --legacy-peer-deps

echo "🔨 Building application..."
npm run build

echo "✅ Build complete!"