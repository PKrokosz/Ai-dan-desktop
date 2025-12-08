# 🗺️ Mapa nawigacji po `app.js`

> **Plik**: `src/renderer/app.js`  
> **Rozmiar**: 4408 linii, 173 KB  
> **Ostatnia aktualizacja**: 2025-12-08

---

## 📑 Spis Treści Modułów

| # | Moduł | Linie | Słowa kluczowe |
|---|-------|-------|----------------|
| 1 | [State Management](#-state-management) | 1-96 | `state`, config, UI state |
| 2 | [Quick Actions & Presets](#-quick-actions--presets) | 97-169 | `QUICK_ACTIONS`, `PERSONALITY_PROMPTS` |
| 3 | [Step Definitions & Templates](#-step-definitions--templates) | 170-707 | `STEPS`, `stepTemplates`, routing |
| 4 | [Dynamic CSS Styles](#-dynamic-css-styles) | 708-1045 | thinking, lanes, model selectors |
| 5 | [UI Functions](#-ui-functions) | 1047-1155 | `renderStep`, `showSettings`, progress |
| 6 | [Ollama Models Database](#-ollama-models-database) | 1156-1307 | `OLLAMA_MODELS`, VRAM, categories |
| 7 | [Model Selector Functions](#-model-selector-functions) | 1308-1424 | filter, populate, toggle |
| 8 | [System Diagnostics](#-system-diagnostics) | 1426-1526 | specs, GPU, hardware |
| 9 | [Search & Suggestions](#-search--suggestions) | 1527-1631 | preload, autocomplete, tags |
| 10 | [Operator/MG Functions](#-operatormg-functions) | 1632-1792 | profiles, modal, selection |
| 11 | [AI Assistant Core](#-ai-assistant-core) | 1793-2364 | prompts, `runAI`, streaming |
| 12 | [Prompt Templates System](#-prompt-templates-system) | 2365-2428 | save, load, apply templates |
| 13 | [Profile Renderer](#-profile-renderer) | 2429-2516 | character details, linkify |
| 14 | [API Functions](#-api-functions) | 2517-2812 | Ollama, data loading, export |
| 15 | [Navigation](#-navigation) | 2813-2861 | step nav, sidebar clicks |
| 16 | [Initialization](#-initialization) | 2862-2962 | `init()`, startup logic |
| 17 | [Profile Styles & Render](#-profile-styles--render) | 2963-3157 | CSS grid, cards, tags |
| 18 | [Character Overlay](#-character-overlay) | 3158-3467 | linkify, overlay, drag |
| 19 | [Ollama Setup Check](#-ollama-setup-check) | 3468-3649 | install, modal, global exports |
| 20 | [Excel Search & Tests](#-excel-search--tests) | 3650-3773 | `runExcelSearch`, test panels |
| 21 | [Custom Model Path](#-custom-model-path) | 3774-3835 | pick, change path |
| 22 | [Streaming Handler](#-streaming-handler) | 3836-3956 | chunks, timer, UI update |
| 23 | [Minimalist AI Panel](#-minimalist-ai-panel) | 3957-4216 | Claude-style, dropdowns |
| 24 | [Slash Commands](#-slash-commands) | 4217-4408 | `/quest`, custom prompts |

---

## 📌 Szczegółowy Index Funkcji

### 🧠 State Management

**Linie: 1-96**

Centralny obiekt `state` przechowujący:

- `currentStep`, `totalSteps` - nawigacja kroków
- `traceId` - ID śledzenia
- `ollamaConnected`, `ollamaModels` - status Ollama
- `sheetData`, `selectedRow`, `profile` - dane postaci
- `lanes`, `laneResults` - przetwarzanie
- `aiChat` - historia chatu AI z thinking state
- `promptParts`, `promptConfig` - konfiguracja promptów
- `ui.dropdowns` - stan UI minimalistycznego

---

### ⚡ Quick Actions & Presets

**Linie: 97-169**

```
QUICK_ACTIONS (99-131)     → Przyciski szybkich akcji (Questy, Persona, Szybkie)
PERSONALITY_PROMPTS (132-169) → Presety osobowości AI:
  - default_mg → Surowy MG
  - helper → Pomocny Asystent  
  - gothic_fan → Klimaciarz
  - analyst → Analityk Statystyk
```

---

### 📋 Step Definitions & Templates

**Linie: 170-707**

```
STEPS (174-181)            → Definicje 6 kroków aplikacji
stepTemplates (187-707)    → HTML templates dla każdego kroku:
  - source() [188-245]     → Wybór źródła danych
  - settings() [247-313]   → Panel ustawień (legacy)
  - extraction() [315-352] → Ekstrakcja danych
  - ai() [354]             → Stub dla nowego AI
  - _legacy_ai() [355-648] → Stary panel AI (legacy)
  - merge() [650-658]      → Łączenie wyników
  - quests() [660-677]     → Generowanie questów
  - export() [679-705]     → Eksport danych
  - testbench() [707]      → Panel testów
```

---

### 🎨 Dynamic CSS Styles

**Linie: 708-1045**

Wstrzykiwane style CSS dla:

- `thinkingStyle` (709-754) → GPT-style thinking collapsed
- `laneStyles` (755-1045) → lanes, model selectors, AI chat, character overlay

---

### 🖥️ UI Functions

**Linie: 1047-1155**

```
renderStep() [1047-1086]   → Główna funkcja renderowania kroków
showSettings() [1088-1118] → Pokazywanie panelu ustawień
showTestbench() [1120-1138]→ Panel testów
setProgress() [1140-1143]  → Aktualizacja paska postępu
addLog() [1145-1155]       → Dodawanie logów do konsoli
```

---

### 🤖 Ollama Models Database

**Linie: 1156-1307**

```
OLLAMA_MODELS (1159-1300)  → Baza modeli z:
  - vramBySize → mapowanie rozmiarów na VRAM
  - categories → reasoning, general, coding, vision, roleplay, small
  - getVram() [1249-1256]  → Obliczanie VRAM dla rozmiaru
  - filterByVram() [1257-1300] → Filtrowanie modeli po VRAM

State:
  - selectedModelExtraction [1304] → Model do ekstrakcji
  - selectedModelGeneration [1305] → Model do generowania
  - currentVramFilter [1306] → Aktywny filtr VRAM
```

---

### 🔧 Model Selector Functions

**Linie: 1308-1424**

```
filterModelsByVram() [1308-1317]     → Filtruje po VRAM slider
renderModelCategories() [1319-1383]  → Renderuje kategorie modeli
toggleCategory() [1385-1392]         → Rozwija/zwija kategorię
populateModelSelects() [1394-1420]   → Wypełnia selecty modelami
isModelInstalled() [1422-1424]       → Sprawdza czy model zainstalowany
```

---

### 💻 System Diagnostics

**Linie: 1426-1526**

```
loadSystemSpecs() [1426-1481]  → Ładuje info o GPU, CPU, RAM
specsStyles (1483-1526)        → Style dla panelu specyfikacji
```

---

### 🔍 Search & Suggestions

**Linie: 1527-1631**

Autouzupełnianie wyszukiwania postaci:

```
preloadData() [1528-1541]        → Pobiera dane do cache
updateSearchStats() [1543-1548]  → Statystyki wyszukiwania
updateSuggestions() [1550-1552]  → Aktualizuje sugestie
handleSearchInput() [1554-1589]  → Handler inputa
selectSuggestion() [1591-1597]   → Wybór sugestii
hideSuggestions() [1599-1602]    → Ukrywa panel
searchByTag() [1604-1631]        → Wyszukiwanie po tagach
```

---

### 👤 Operator/MG Functions

**Linie: 1632-1792**

Zarządzanie profilami Mistrzów Gry:

```
loadMgProfiles() [1637-1662]     → Ładuje profile z API
setOperator() [1664-1672]        → Ustawia aktywnego operatora
openOperatorModal() [1674-1747]  → Modal wyboru operatora
renderMgDetails() [1749-1792]    → Renderuje szczegóły MG
```

---

### 🧠 AI Assistant Core

**Linie: 1793-2364**

**GŁÓWNY MODUŁ AI** - najważniejszy do modyfikacji:

```
updatePromptConfig() [1798-1812]         → Aktualizuje config promptów
getModelSpecificSystemPrompt() [1814-1831] → System prompt per model
applyModelOptimization() [1833-1869]     → Optymalizacja per model
buildDynamicContext() [1871-1935]        → Buduje kontekst dynamiczny

runAI() [1937-2061]                      → ⭐ GŁÓWNA FUNKCJA AI
  - Buduje prompt z części
  - Wysyła do Ollama przez IPC
  - Obsługuje streaming

updatePromptPart() [2063-2069]           → Aktualizuje część prompta
runCustomPrompt() [2071-2162]            → Wykonuje custom prompt użytkownika

syncHistoryPanelVisibility() [2167-2176] → Sync panelu historii
runAllSequentially() [2178-2201]         → Batch processing
processQueue() [2204-2235]               → Przetwarzanie kolejki
togglePause() [2237-2247]                → Pauza/wznowienie

copyAIResult() [2250-2258]               → Kopiuje wynik AI
copyToClipboard() [2260-2267]            → Helper do clipboard
saveSpecificResult() [2269-2291]         → Zapisuje konkretny wynik
saveAIResult() [2293-2312]               → Zapis do pliku

togglePromptHistory() [2317-2320]        → Toggle historii
renderPromptHistory() [2323-2364]        → Renderuje historię promptów
```

---

### 📝 Prompt Templates System

**Linie: 2365-2428**

```
loadPromptTemplates() [2371-2377]   → Ładuje zapisane szablony
savePromptTemplate() [2379-2392]    → Zapisuje nowy szablon
deletePromptTemplate() [2394-2401]  → Usuwa szablon
applyPromptTemplate() [2403-2410]   → Aplikuje szablon

Event Listeners (2411-2428)         → Click/keydown dla sugestii
```

---

### 👥 Profile Renderer

**Linie: 2429-2516**

```
renderProfileDetails() [2429-2516]  → Renderuje detale postaci
  - h() [2432-2433]                 → Helper do highlight tekstu
```

---

### 🌐 API Functions

**Linie: 2517-2812**

```
checkOllama() [2518-2544]           → Sprawdza połączenie z Ollama
updateModelStatuses() [2546-2560]   → Aktualizuje statusy modeli
updateDownloadQueue() [2565-2594]   → Kolejka pobierania modeli
pullModel() [2596-2615]             → Pobiera model z Ollama

loadDataSource() [2617-2668]        → Ładuje dane z Excel/JSON
getSortedRows() [2670-2704]         → Sortuje wiersze
sortData() [2706-2715]              → Sortowanie data
selectRow() [2717-2721]             → Wybór wiersza

processAI() [2723-2781]             → Przetwarza AI (batch)
generateQuests() [2783-2793]        → Generuje questy
exportResults() [2795-2803]         → Eksport wyników
openOutputFolder() [2805-2807]      → Otwiera folder output
editProfile() [2809-2812]           → Edycja profilu
```

---

### 🧭 Navigation

**Linie: 2813-2861**

Event listenery dla nawigacji step (Next/Back buttons, sidebar clicks).

---

### 🚀 Initialization

**Linie: 2862-2962**

```
init() [2862-2962]  → Główna funkcja inicjalizacji:
  - Sprawdza Ollama
  - Ładuje system specs
  - Renderuje pierwszy krok
  - Setup event listeners
```

---

### 🎭 Profile Styles & Render

**Linie: 2963-3157**

`profileStyles` - CSS dla kart profili:

- `.profile-grid` - siatka 12-kolumnowa
- `.profile-card` - karty z animacją
- Obszary: hero, story, facts, traits, goals, relations, crime
- Tagi: guild, region, crime
- Responsive breakpoints

---

### 🪟 Character Overlay

**Linie: 3158-3467**

```
renderProfileDetails() [3158-3308]  → Nowa wersja renderera
  - getVal() [3162-3165]            → Safe value getter
  - renderList() [3204-3210]        → Renderuje listę

linkifyNames() [3310-3360]          → Linkuje imiona w tekście
  - escapeRegExp() [3334-3336]      → Escape regex chars

openCharacterOverlay() [3362-3462]  → Otwiera overlay postaci
  - renderOverlayContent() [3386-3418] → Renderuje zawartość
  - setupDrag() [3423-3442]         → Przeciąganie overlay

closeCharacterOverlay() [3464-3467] → Zamyka overlay
```

---

### ⚙️ Ollama Setup Check

**Linie: 3468-3649**

```
checkOllamaSetup() [3469-3490]     → Sprawdza czy Ollama zainstalowana
showOllamaSetupModal() [3492-3528]→ Modal instalacji
installOllama() [3530-3553]       → Instaluje Ollama

setupStyles (3556-3618)           → Style dla modalu setup

Window exports (3622-3649)        → Eksporty do window.*
```

---

### 🔎 Excel Search & Tests

**Linie: 3650-3773**

```
runExcelSearch() [3651-3711]      → Wyszukiwanie w danych Excel
highlightText() [3713-3721]       → Podświetlanie tekstu
clearActiveSteps() [3723-3726]    → Czyści aktywne kroki
showAdvancedTests() [3728-3754]   → Panel zaawansowanych testów

Window exports (3755-3773)        → Eksporty funkcji testowych
```

---

### 📁 Custom Model Path

**Linie: 3774-3835**

```
pickModelPath() [3775-3787]       → Wybór ścieżki modeli
changeModelPath() [3789-3813]     → Zmiana ścieżki

init() call (3818)                → Wywołanie inicjalizacji
Stream handlers (3821-3835)       → Handlery dla streamingu AI
```

---

### 📡 Streaming Handler

**Linie: 3836-3956**

```
handleAIStreamChunk() [3837-3889] → Obsługa chunków streamu
updateThinkingTimer() [3891-3894] → Timer "myślenia" AI
updateStreamUI() [3896-3946]      → Aktualizacja UI podczas streamu

Delayed inits (3949-3956):
  - loadMgProfiles() po 1000ms
  - loadPromptTemplates() po 500ms
```

---

### 🎯 Minimalist AI Panel

**Linie: 3957-4216**

Nowy UI w stylu Claude:

```
toggleDropdown() [3958-3977]           → Toggle dropdownów
renderMinimalistAIPanel() [3982-4211]  → ⭐ GŁÓWNY RENDER NOWEGO UI
  - Character info card
  - Chat messages z thinking
  - Quick actions
  - Context dropdowns
  - Model selector
  - Input bar
```

---

### ⌨️ Slash Commands

**Linie: 4217-4408**

```
updatePromptPart() [4217-4223]    → Override dla promptów
SLASH_COMMANDS (4224-4235)        → Mapowanie slash commands:
  /quest, /q → quest_main
  /side → side_quest
  /hook → story_hooks
  /secret → secret
  /analiza, /cechy, /frakcja, /ksywka

runCustomPrompt() [4237-4399]     → ⭐ OVERRIDE głównej funkcji
  - Parsuje slash commands
  - Buduje dynamiczny prompt
  - Wysyła do Ollama
  - Obsługuje streaming response

copyToClipboard() [4401-4407]     → Helper kopiowania
```

---

## 🔗 Mapa Powiązań

```
┌─────────────────────────────────────────────────────────────────┐
│                         INITIALIZATION                           │
│  init() → checkOllama() → loadSystemSpecs() → renderStep()      │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                         UI RENDERING                             │
│  renderStep() → stepTemplates[key]() → renderMinimalistAIPanel() │
└─────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │ Character    │ │ Model        │ │ Operator     │
            │ Overlay      │ │ Selector     │ │ Panel        │
            │              │ │              │ │              │
            │linkifyNames()│ │filterByVram()│ │loadMgProfiles│
            │openOverlay() │ │pullModel()   │ │setOperator() │
            └──────────────┘ └──────────────┘ └──────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                         AI PROCESSING                            │
│  runCustomPrompt() → buildDynamicContext() → window.electronAPI  │
│                          ↓                                       │
│  handleAIStreamChunk() → updateStreamUI() → renderMinimalistAI() │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATA FLOW                                │
│  loadDataSource() → getSortedRows() → selectRow() → processAI() │
│                          ↓                                       │
│  exportResults() ← saveAIResult() ← copyAIResult()               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏷️ Quick Reference Tags

### Gdy szukasz

| Szukam... | Przejdź do | Linie |
|-----------|------------|-------|
| Jak wysłać prompt do AI | `runAI()` lub `runCustomPrompt()` | 1937, 4237 |
| Jak renderuje się chat | `renderMinimalistAIPanel()` | 3982 |
| Obsługa streamingu | `handleAIStreamChunk()` | 3837 |
| Modele Ollama | `OLLAMA_MODELS` | 1159 |
| Stan aplikacji | `state` | 9 |
| Overlay postaci | `openCharacterOverlay()` | 3362 |
| Slash commands | `SLASH_COMMANDS`, `runCustomPrompt()` | 4224, 4237 |
| Inicjalizacja | `init()` | 2862 |
| Style CSS dynamiczne | `laneStyles`, `profileStyles` | 755, 2970 |
| Eksport danych | `exportResults()` | 2795 |

---

## ⚠️ Uwagi do refaktoryzacji

1. **Duplikaty funkcji**: `renderProfileDetails()` jest zdefiniowane dwukrotnie (2429 i 3158)
2. **Duplikaty funkcji**: `updatePromptPart()` zdefiniowane 2x (2063, 4217)
3. **Duplikaty funkcji**: `runCustomPrompt()` zdefiniowane 2x (2071, 4237)
4. **Duplikaty funkcji**: `copyToClipboard()` zdefiniowane 2x (2260, 4401)
5. **Legacy code**: `_legacy_ai()` (355-648) - stary panel AI do usunięcia
6. **Duży plik**: Warto rozdzielić na moduły ES6

---

*Wygenerowano automatycznie przez Antigravity AI*
