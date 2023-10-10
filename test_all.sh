#!/bin/sh

echo "Testing Core..."
npm run test --prefix Core

echo "Testing Editor..."
npm run test --prefix Editor

echo "Testing Sandbox..."
npm run test --prefix Sandbox