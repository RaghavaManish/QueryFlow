#!/bin/sh
# Render deploy build script for Vite React frontend

# Install dependencies
npm install --legacy-peer-deps

# Build the frontend
npm run build

# Show output directory for debugging
ls -l dist

echo "If deploying on Render, set the publish directory to: dist"
