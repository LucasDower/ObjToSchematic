#!/bin/sh

echo "Building Core..."
npm run build --prefix Core

echo "Building Editor..."
npm run build --prefix Editor

echo "Building Sandbox..."
npm run build --prefix Sandbox