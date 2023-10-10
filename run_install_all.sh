#!/bin/sh

echo "Installing Core..."
cd Core
npm install

echo "Installing Editor..."
cd ../Editor
npm install

echo "Installing Sandbox..."
cd ../Sandbox
npm install