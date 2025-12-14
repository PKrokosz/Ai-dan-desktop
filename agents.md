# AI-DAN Project Guidelines

> **Identity**: You are an intelligent coding agent (Sub-Agent) working on the AI-DAN Desktop project.
> **Primary Source of Truth**: ALWAYS refer to `p:/ai-dan-desktop/agents.md` when navigating `app.js`.

## 🗺️ Navigation Strategy

The project is in a **Hybrid State** (Monolith + Modules).

- **Legacy**: `src/renderer/app.js` (contains mix of logic and UI).
- **Modern**: `src/renderer/modules/` (contains extracted, clean ES6 modules).

### Critical Rules

1. **Check the Map**: Before analyzing `app.js`, read `agents.md` to see if a section is marked as "Legacy" or "Extracted".
2. **Avoid Duplication**: Do not suggest code that re-implements functionality already present in `src/renderer/modules/`.
3. **Refactoring**: When asked to refactor, prefer moving code to existing modules in `src/renderer/modules/` over creating new files, unless necessary.

## 🛠️ Tech Stack

- **Runtime**: Electron (Renderer Process)
- **Framework**: Vanilla JS (ES6 Modules) + native DOM
- **AI Backend**: Ollama (via `ollama-client.js` and IPC)

## 📍 Key Locations

- `src/renderer/modules/ai-core.js`: Core AI Logic
- `src/renderer/modules/state.js`: Global State Store
- `src/renderer/app.js`: Entry point & Legacy Glue Code
