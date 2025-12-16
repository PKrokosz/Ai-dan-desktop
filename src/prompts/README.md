# System Promptów (Standardization 2024)

Ten katalog zawiera zunifikowany system zarządzania promptami dla AI-DAN.
Wcześniejsze rozproszone definicje promptów (np. w `ipc-handlers.js`) zostały usunięte i przeniesione tutaj.

## Struktura Plików

### 1. `prompt-builder.js` (Core)

Główna klasa `PromptBuilder`. Służy do budowania kompletnego promptu systemowego z klocków:

- **Persona**: Rola AI (zdefiniowana w templates).
- **Styl**: Wytyczne stylistyczne (Gothic, żołnierski język).
- **Kontekst**: Lore, zasady gry, dane z profilu użytkownika.
- **Zadanie (Task)**: Konkretna instrukcja (np. "Wymyśl Quest", "Podsumuj Postać").
- **Format**: Wymuszenie JSON lub luźnego tekstu.

**Użycie:**

```javascript
const builder = new PromptBuilder();
builder.withUserProfile(profile);
builder.withLoreContext();
builder.withTask('main_quest');
const systemPrompt = builder.build();
```

### 2. `templates/system-prompts.js` (Definicje)

Zawiera surowe stringi i szablony:

- `SYSTEM_PROMPTS`: Stałe fragmenty (PERSONA, STYLE_GUIDE, RULES_OF_PLAY).
- `COMMAND_SCHEMAS`: Schematy JSON dla poszczególnych komend (QUEST, HOOK, TRAIT_ANALYSIS itp.).

**Ważne:** Jeśli chcesz zmienić zachowanie konkretnego typu zadania (np. jak wygląda wygenerowany Quest), edytuj odpowiedni schemat tutaj.

### 3. `prompt-config.js` (Konfiguracja)

Definicje stylów, motywów, frakcji i kontekstów RAG.
Zarządza tym, jakie pliki tekstowe (np. `geography.txt`) są ładowane do kontekstu.

### 4. `discovery-prompt.js` (Guided Flow)

Specjalistyczne prompty używane przez system *Guided Conversation Flow* (GCF).
Służą do diagnozy intencji użytkownika (`buildDiagnosisPrompt`) i ekstrakcji danych do formularzy.

### 5. `data/glossary.json`

Baza danych (słownik) używana do wstrzykiwania faktów o świecie (ceny, nazwy frakcji, lokacje) bezpośrednio do promptu.

## Dostępne Komendy (Tasks)

Obsługiwane przez `PromptBuilder.withTask(commandType)`:

| Komenda | Opis | Format Wyjściowy |
|---------|------|------------------|
| `main_quest` | Główny wątek fabularny | JSON (QUEST) |
| `side_quest` | Zadanie poboczne | JSON (QUEST) |
| `side_quest_repeatable` | Zadanie powtarzalne (Daily) | JSON (QUEST) |
| `group_quest` | Zadanie dla grupy graczy | JSON (QUEST) |
| `redemption_quest` | Zadanie odkupienia win | JSON (QUEST) |
| `story_hooks` | Zaczepki fabularne | JSON (HOOK) |
| `potential_conflicts` | Konflikty frakcyjne | JSON (HOOK) |
| `secret` | Sekret postaci | JSON (HOOK) |
| `npc_connections` | Powiązania z NPC | JSON (NPC_ENRICHMENT) |
| `nickname` | Propozycja ksywki | JSON (NPC_ENRICHMENT) |
| `faction_suggestion` | Sugestia frakcji | JSON (ADVISORY) |
| `advise` | Porada ogólna | JSON (ADVISORY) |
| `extract_traits` | Analiza psychologiczna | JSON (TRAIT_ANALYSIS) |
| `analyze_relations` | Analiza sojuszników/wrogów | JSON (RELATION_ANALYSIS) |
| `summarize` | Krótkie podsumowanie postaci | JSON (SUMMARIZATION) |
| `chat` / `custom` | Luźna rozmowa | Tekst (Markdown) |

## Jak dodać nowy typ promptu?

1. Zdefiniuj nowy schemat JSON (jeśli potrzebny) w `templates/system-prompts.js`.
2. Dodaj nowy `case` w `PromptBuilder.withTask()` w pliku `prompt-builder.js`.
3. Jeśli komenda ma zwracać JSON, upewnij się, że jest dodana do listy `jsonCommands` w `src/main/ipc-handlers.js` (lub handler automatycznie wykryje format jeśli używasz standardowego flow).
