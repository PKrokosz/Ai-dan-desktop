# Setup script for creating LarpGothic specialized models (Windows)
# Run this after installing ollama and downloading llama3

Write-Host "Setting up LarpGothic models..." -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Quest Generator
Write-Host "Creating larpgothic:quest..." -ForegroundColor Yellow
ollama create larpgothic:quest -f "$ScriptDir\Modelfile.quest"

# Traits Extractor
Write-Host "Creating larpgothic:traits..." -ForegroundColor Yellow
ollama create larpgothic:traits -f "$ScriptDir\Modelfile.traits"

# Intrigue Analyzer
Write-Host "Creating larpgothic:intrigue..." -ForegroundColor Yellow
ollama create larpgothic:intrigue -f "$ScriptDir\Modelfile.intrigue"

Write-Host ""
Write-Host "Setup complete! Available models:" -ForegroundColor Green
ollama list | Where-Object { $_ -match "larpgothic" }
