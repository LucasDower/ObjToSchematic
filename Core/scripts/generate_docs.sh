#!/bin/sh

echo "Generating docs..."
cd ..
npx typedoc --entryPointStrategy expand ./src