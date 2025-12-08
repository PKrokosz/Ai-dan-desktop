# Agent MG - Asystent Mistrza Gry

<!-- Profesjonalne narzędzie desktopowe dla Mistrzów Gry w grach LARP -->

> ⚠️ **Projekt w aktywnej fazie rozwoju (Beta)**  
> Aplikacja jest ciągle rozbudowywana. Zachęcamy do zgłaszania problemów przez [GitHub Issues](https://github.com/PKrokosz/Ai-dan-desktop/issues) lub bezpośrednio w prywatnych wiadomościach.  
> Efektywność modeli AI zależy od sprzętu (RAM, GPU) i jest wciąż optymalizowana.

---

## 📋 Spis treści

- [O Projekcie](#-o-projekcie)
- [Funkcjonalności](#-funkcjonalności)
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
| Lokalne modele | Obsługa `phi4-mini`, `mistral`, `gemma` i innych |
| Konfigurowalne prompty | Pełna kontrola nad instrukcjami dla AI |
| Szybkie akcje | Predefiniowane polecenia (generuj quest, opisz postać, itp.) |
| Temperatura | Suwak kreatywności 0.0–1.0 |

### 🧪 Testbench (Panel testowy)

| Co robi | Jak |
|---------|-----|
| Testy modeli | Kategorie: Logika, Kreatywność, Stabilność Językowa |
| Porównania | Uruchom ten sam test na wielu modelach |
| Raporty | Wyniki PASS/FAIL z czasem generowania |

### 🔍 Wyszukiwarka Wiedzy (Lore)

| Co robi | Jak |
|---------|-----|
| Przeszukiwanie Excela | Znajdź wzmianki o postaciach w plikach źródłowych |
| Kontekst | Podgląd wierszy z pełnym kontekstem |

---

## 📖 Jak używać

### Podstawowy workflow

1. **Źródło danych** → Wczytaj Excel/PDF z postaciami
2. **Ekstrakcja** → Wybierz postać do pracy
3. **AI Processing** → Użyj czatu do generowania treści
4. **Scalanie** → Połącz wyniki
5. **Eksport** → Zapisz do pliku

### Szybkie akcje AI

- Kliknij **[+]** przy polu tekstowym
- Wybierz akcję (np. "Generuj quest", "Opisz wygląd")
- AI wygeneruje treść na podstawie kontekstu postaci

### Zmiana modelu

- Kliknij przycisk **Model** w panelu wpisywania
- Wybierz model z listy dostępnych
- Różne modele = różna jakość i szybkość

---

## 🛠️ Instalacja

### Wymagania

- Windows 10/11
- [Ollama](https://ollama.com/) zainstalowana lokalnie
- Minimum 8GB RAM (16GB+ zalecane dla większych modeli)

### Szybki start (Testerzy)

```bash
# 1. Pobierz instalator z Releases
# 2. Uruchom Ollama
ollama serve

# 3. Pobierz zalecane modele (wymagane)
ollama pull phi4-mini
ollama pull mistral

# 4. Model embeddingowy (opcjonalny - dla wyszukiwania semantycznego)
ollama pull nomic-embed-text
```

> **💡 Uwaga o modelach embeddingowych:**  
> Model `nomic-embed-text` jest **opcjonalny**. Bez niego aplikacja działa normalnie.  
> Potrzebny tylko do zaawansowanego wyszukiwania podobnych treści (Vector Store).

### Dla deweloperów

```bash
npm install
npm run dev     # tryb deweloperski
npm run build   # budowanie .exe
```

---

## ⚠️ Znane problemy

| Problem | Rozwiązanie |
|---------|-------------|
| Pierwsze uruchomienie AI wolne | Model ładuje się do RAM — poczekaj |
| Brak odpowiedzi AI | Sprawdź czy Ollama działa (`ollama serve`) |
| Model nie znaleziony | Upewnij się, że pobrałeś model (`ollama pull nazwa`) |

---

## 💬 Wsparcie i feedback

Projekt jest w fazie beta — Twój feedback jest bezcenny!

- **GitHub Issues**: [Zgłoś problem lub sugestię](https://github.com/PKrokosz/Ai-dan-desktop/issues)
- **Prywatne wiadomości**: Skontaktuj się bezpośrednio z autorem
- **Pull Requests**: Mile widziane!

### Uwagi dotyczące AI

- Jakość odpowiedzi zależy od wybranego modelu
- Większe modele = lepsza jakość, ale wolniejsze działanie
- Efektywność mocno zależy od specyfikacji sprzętu (RAM, GPU)
- Eksperymentuj z temperaturą (niższa = bardziej stabilne, wyższa = bardziej kreatywne)

---

## 📄 Licencja

MIT — Projekt otwartoźródłowy.
