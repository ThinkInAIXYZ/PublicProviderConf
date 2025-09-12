#!/bin/bash

# Test script to verify TypeScript compilation

echo "🧪 Testing TypeScript compilation..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Test compilation
echo "🔨 Building TypeScript..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful!"
    echo "📁 Output files generated in: dist/"
    
    # Test core functionality
    echo "\n🧪 Testing core functionality..."
    npx ts-node src/test-core.ts
    
    if [ $? -eq 0 ]; then
        echo "\n🎉 All tests passed! Migration complete."
    else
        echo "\n❌ Core functionality test failed"
        exit 1
    fi
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi