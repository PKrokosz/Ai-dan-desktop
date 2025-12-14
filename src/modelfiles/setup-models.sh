#!/bin/bash
# Setup script for creating LarpGothic specialized models
# Run this after installing ollama and downloading llama3

echo "🎮 Setting up LarpGothic models..."

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Quest Generator
echo "📜 Creating larpgothic:quest..."
ollama create larpgothic:quest -f "$SCRIPT_DIR/Modelfile.quest"

# Traits Extractor
echo "🎭 Creating larpgothic:traits..."
ollama create larpgothic:traits -f "$SCRIPT_DIR/Modelfile.traits"

# Intrigue Analyzer
echo "🗡️ Creating larpgothic:intrigue..."
ollama create larpgothic:intrigue -f "$SCRIPT_DIR/Modelfile.intrigue"

echo ""
echo "✅ Setup complete! Available models:"
ollama list | grep larpgothic
