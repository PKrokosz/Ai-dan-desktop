# Agent MG - Asystent Mistrza Gry

<!-- Profesjonalne narzędzie desktopowe dla Mistrzów Gry w grach LARP -->

> ⚠️ **Projekt w aktywnej fazie rozwoju (Beta)**  
> Aplikacja jest ciągle rozbudowywana. Zachęcamy do zgłaszania problemów przez [GitHub Issues](https://github.com/PKrokosz/Ai-dan-desktop/issues) lub bezpośrednio w prywatnych wiadomościach.  
> Efektywność modeli AI zależy od sprzętu (RAM, GPU) i jest wciąż optymalizowana.

---

## 📋 Spis treści

- [O Projekcie](#-o-projekcie)
- [Funkcjonalności](#-funkcjonalności)
- [Integracja Gothic API](#-integracja-gothic-api)
- [Modele AI](#-modele-ai)
- [Konfiguracja (ConfigHub)](#-konfiguracja-confighub)
- [Testowanie postaci](#-testowanie-postaci)
- [Jak używać](#-jak-używać)
- [Instalacja](#️-instalacja)
- [Znane problemy](#️-znane-problemy)
- [Wsparcie i feedback](#-wsparcie-i-feedback)

---

## 🎯 O Projekcie

**Agent MG** to desktopowe narzędzie wspierające Mistrzów Gry (MG) w tworzeniu i zarządzaniu postaciami do gier LARP. Aplikacja wykorzystuje **lokalne modele AI** (przez Ollama) do generowania narracji, questów i analizy relacji między postaciami.

### Dla kogo?

- Mistrzowie Gry planujący sesje LARP
- Twórcy narracji i fabularnych backstory'ów
- Osoby chcące eksperymentować z lokalnymi modelami AI w kontekście RPG

---

## ✨ Funkcjonalności

### 🧙 Kreator Postaci

| Co robi | Jak |
|---------|-----|
| Ekstrakcja danych | Automatycznie pobiera informacje z plików PDF i Excel |
| 6-etapowy wizard | Prowadzi od danych podstawowych po eksport |
| Relacje | Wizualizacja i edycja powiązań między postaciami |

### 🤖 AI Chat (Ollama)

| Co robi | Jak |
|---------|-----|
| Lokalne modele | Obsługa `ministral-3`, `gemma3`, `phi4` i innych |
| Konfigurowalne prompty | Pełna kontrola nad instrukcjami dla AI |
| Szybkie akcje | Predefiniowane polecenia (generuj quest, opisz postać, itp.) |
| Streaming | Odpowiedzi wyświetlane w czasie rzeczywistym |
| GPT-style UI | Bąbelki czatu z zaokrąglonymi rogami, user po prawej |

### 🧪 Model Testbench

| Co robi | Jak |
|---------|-----|
| Testy modeli | Kategorie: Logika, Kreatywność, Stabilność Językowa |
| Porównania | Uruchom ten sam test na wielu modelach |
| Raporty | Wyniki PASS/FAIL z czasem generowania |

### 🔍 Wyszukiwarka Wiedzy (RAG)

| Co robi | Jak |
|---------|-----|
| Vector Store | Semantyczne wyszukiwanie w dokumentacji |
| Przeszukiwanie Excela | Znajdź wzmianki o postaciach w plikach źródłowych |
| Kontekst | Automatyczne dołączanie relevantnych informacji do promptów |

---

## 🌐 Integracja Gothic API

Aplikacja integruje się z **LarpGothic API** do pobierania danych o postaciach zarejestrowanych na grę.

### Funkcje

| Funkcja | Opis |
|---------|------|
| Pobieranie profili | Automatyczne ładowanie wszystkich postaci z API |
| Synchronizacja | Odświeżanie danych przy starcie aplikacji |
| Filtrowanie | Wyszukiwanie postaci po nazwie, gildii, itp. |

### Konfiguracja API

Endpoint API jest konfigurowalny w **ConfigHub** → zakładka "API".

---

## 🧠 Modele AI

### Wymagane modele

```bash
# Model do czatu (wybierz jeden lub więcej)
ollama pull ministral-3        # Szybki, dobra jakość polskiego
ollama pull gemma3:4b          # Dobra równowaga jakość/szybkość
ollama pull phi4               # Microsoft, dobra logika

# Model embeddingowy (WYMAGANY dla RAG/Vector Store)
ollama pull nomic-embed-text   # 274MB, niezbędny dla wyszukiwania semantycznego
```

### Tabela porównawcza modeli

| Model | Rozmiar | Polski | Szybkość | Użycie |
|-------|---------|--------|----------|--------|
| `ministral-3` | ~3GB | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Główny do czatu |
| `gemma3:4b` | ~4GB | ⭐⭐⭐ | ⭐⭐⭐⭐ | Alternatywa |
| `phi4` | ~8GB | ⭐⭐⭐ | ⭐⭐⭐ | Logika, analiza |
| `nomic-embed-text` | 274MB | - | ⭐⭐⭐⭐⭐ | Embeddingi (RAG) |

> **💡 Model embeddingowy:**  
> `nomic-embed-text` jest **wymagany** dla funkcji wyszukiwania semantycznego (RAG).
> Bez niego Vector Store nie będzie działał poprawnie.

---

## ⚙️ Konfiguracja (ConfigHub)

ConfigHub to centralne miejsce konfiguracji aplikacji (dostępne z sidebaru).

### Zakładki

| Zakładka | Ustawienia |
|----------|------------|
| **Modele** | Wybór domyślnego modelu, ścieżka do modeli Ollama |
| **API** | Endpoint Gothic API, timeout |
| **Prompty** | Edycja system promptów, stylów odpowiedzi |
| **RAG** | Włącz/wyłącz wyszukiwanie semantyczne, limit dokumentów |
| **Zaawansowane** | Debug mode, trace logging |

### Lokalizacja pliku konfiguracji

```
%APPDATA%/agent-mg/config.json
```

---

## 🧪 Testowanie postaci

### Character Testbench (18 kroków)

Automatyczny test formatowania i spójności odpowiedzi AI dla wybranej postaci.

#### Co testuje

| Kategoria | Przykładowe testy |
|-----------|-------------------|
| **Formatowanie** | Markdown, listy, nagłówki |
| **Spójność** | Ksywki, nazwy, relacje |
| **Język** | Polski bez anglicyzmów |
| **Kontekst** | Znajomość lore, frakcji |
| **Questy** | Generowanie questów głównych/pobocznych |

#### Jak uruchomić

1. Wybierz postać w panelu AI
2. Kliknij przycisk **🧪 Test Postaci** w pasku narzędzi
3. Poczekaj na wykonanie 18 kroków (widoczny progress bar)
4. Po zakończeniu kliknij link do raportu HTML

#### Raport HTML

Po zakończeniu testu generowany jest szczegółowy raport:

- **Karta postaci** - podsumowanie profilu
- **Wyniki testów** - 18 kroków z odpowiedziami AI
- **Analityka** - średni czas odpowiedzi, długość, itp.
- **Lokalizacja:** `output/test_report.html`

---

## 📖 Jak używać

### Podstawowy workflow

1. **Źródło danych** → Wczytaj Excel/PDF z postaciami LUB pobierz z Gothic API
2. **Ekstrakcja** → Wybierz postać do pracy
3. **AI Processing** → Użyj czatu do generowania treści
4. **Testowanie** → Uruchom Character Test dla weryfikacji
5. **Eksport** → Zapisz do pliku lub wygeneruj raport

### Szybkie akcje AI

- Kliknij **⚡ Szybkie Akcje** w pasku czatu
- Wybierz akcję (np. "Generuj quest", "Opisz wygląd")
- AI wygeneruje treść na podstawie kontekstu postaci

### Zmiana modelu

- Kliknij przycisk **🧠 Model** w panelu wpisywania
- Wybierz model z listy dostępnych
- Różne modele = różna jakość i szybkość

---

## 🛠️ Instalacja

### Wymagania

- Windows 10/11
- [Ollama](https://ollama.com/) zainstalowana lokalnie
- Minimum 8GB RAM (16GB+ zalecane dla większych modeli)
- ~5GB miejsca na dysku (modele)

### 👶 Instrukcja "Krok po Kroku" (Dla nietechnicznych)

1. **Zainstaluj Node.js**
    - Wejdź na [nodejs.org](https://nodejs.org/)
    - Pobierz wersję **LTS**
    - Zainstaluj (klikaj "Next" aż do końca)

2. **Zainstaluj Git** (opcjonalne)
    - Wejdź na [git-scm.com](https://git-scm.com/)
    - Pobierz i zainstaluj

3. **Zainstaluj Ollama + modele**

    ```bash
    # Po instalacji Ollama:
    ollama pull ministral-3       # Model do czatu
    ollama pull nomic-embed-text  # Model embeddingowy (WYMAGANY!)
    ```

4. **Uruchom aplikację**

    ```bash
    git clone https://github.com/PKrokosz/Ai-dan-desktop.git
    cd Ai-dan-desktop
    npm install
    npm start
    ```

### Dla deweloperów

```bash
npm install
npm run dev     # tryb deweloperski (hot reload)
npm run build   # budowanie .exe
```

---

## ⚠️ Znane problemy

| Problem | Rozwiązanie |
|---------|-------------|
| Pierwsze uruchomienie AI wolne | Model ładuje się do RAM — poczekaj 30-60s |
| Brak odpowiedzi AI | Sprawdź czy Ollama działa (`ollama serve`) |
| Model nie znaleziony | `ollama pull nazwa_modelu` |
| RAG nie działa | Upewnij się że masz `nomic-embed-text` |
| Duży plik vector-store.json | Normalny dla dużych baz wiedzy (~70MB) |

---

## 💬 Wsparcie i feedback

Projekt jest w fazie beta — Twój feedback jest bezcenny!

- **GitHub Issues**: [Zgłoś problem lub sugestię](https://github.com/PKrokosz/Ai-dan-desktop/issues)
- **Pull Requests**: Mile widziane!

### Uwagi dotyczące AI

- Jakość odpowiedzi zależy od wybranego modelu
- Większe modele = lepsza jakość, ale wolniejsze działanie
- Efektywność mocno zależy od specyfikacji sprzętu (RAM, GPU)
- Eksperymentuj z temperaturą (niższa = stabilne, wyższa = kreatywne)

---

## 📄 Licencja

MIT — Projekt otwartoźródłowy.
