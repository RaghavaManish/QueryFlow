#!/bin/sh
# Render deploy build script for Vite React frontend

# Install dependencies
npm install --legacy-peer-deps

# Build the frontend
npm run build

# (Optional) Move build output if needed
# mv dist/* public/
