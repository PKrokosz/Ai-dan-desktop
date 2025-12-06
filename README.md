# Agent MG - Asystent Mistrza Gry (Beta)

Profesjonalne narzędzie desktopowe wspierające Mistrzów Gry w tworzeniu i zarządzaniu postaciami do gier LARP. Aplikacja wykorzystuje lokalne modele AI (Ollama) do generowania narracji, questów i analizy relacji.

## 🌟 Główne Funkcje

### 1. Kreator Postaci (Wizard)
- **6-etapowy proces**: Od danych podstawowych po eksport.
- **Ekstrakcja danych**: Automatyczne pobieranie informacji z plików PDF i Excel (LarpGothic API).
- **Relacje**: Wizualizacja i edycja powiązań między postaciami.

### 2. Zaawansowane AI
- **Integracja z Ollama**: Obsługa modeli lokalnych (np. `phi4-mini`, `mistral`).
- **Konfigurowalne Prompty**: Pełna kontrola nad instrukcjami dla AI (System Prompt).
- **Wybór Modelu**: Możliwość zmiany modelu "w locie" dla różnych zadań.
- **Temperatura**: Suwak kreatywności (0.0 - 1.0).

### 3. Panel Testowy (Testbench)
Narzędzie do weryfikacji jakości odpowiedzi różnych modeli AI.
- **Kategorie testów**: Logika, Kreatywność, Stabilność Językowa (PL).
- **Porównywanie**: Uruchamianie tego samego testu na wielu modelach.
- **Raportowanie**: Wyniki PASS/FAIL z czasem generowania.

### 4. Wyszukiwarka Wiedzy (Lore)
- **Przeszukiwanie Excela**: Błyskawiczne znajdowanie wzmianek o postaciach w plikach źródłowych.
- **Kontekst**: Podgląd wierszy z plików Excel, gdzie występuje dana fraza.

---

## 📖 Instrukcja Obsługi

### Konfiguracja AI i Promptów
1. Otwórz panel AI (prawa strona interfejsu).
2. Wybierz model z listy rozwijanej (np. `phi4-mini`).
3. Kliknij **"Edytuj Prompt"** (ikona ołówka), aby otworzyć panel konfiguracji.
   - **System Prompt**: Zdefiniuj rolę AI (np. "Jesteś mrocznym kronikarzem...").
   - **User Prompt**: Szablon zadania z miejscami na zmienne (np. `{{character_name}}`).
   - **Temperatura**: Ustaw niższą (0.3) dla faktów, wyższą (0.8) dla opisów fabularnych.

### Używanie Testów (Testbench)
1. Przejdź do zakładki **Testy** (ikona probówki).
2. Zaznacz modele, które chcesz przetestować.
3. Wybierz kategorię testu (np. "Stabilność Językowa").
4. Kliknij **"Uruchom Testy"**.
5. Wyniki pojawią się w tabeli poniżej (ocena, czas, zużycie pamięci).

### Wyszukiwanie Informacji
1. Użyj skrótu `Ctrl+F` lub ikony lupy.
2. Wpisz nazwę postaci lub frazę.
3. Wyniki pokażą:
   - Profile postaci (z bazy).
   - Wzmianki w plikach Excel (Lore).
   - Powiązane dokumenty.

---

## 🛠️ Instalacja i Uruchomienie

### Wymagania
- System Windows 10/11
- Zainstalowana [Ollama](https://ollama.com/) (obsługa WSL2 wspierana)
- Node.js 18+ (tylko dla deweloperów)

### Dla Testerów (Wersja Beta)
1. Pobierz instalator `Agent MG Setup 1.0.0.exe`.
2. Zainstaluj aplikację.
3. Upewnij się, że Ollama działa w tle (`ollama serve`).
   - Wymagane modele: `ollama pull phi4-mini`, `ollama pull mistral`.

### Dla Deweloperów

```bash
# Instalacja zależności
npm install

# Konfiguracja środowiska
# Skopiuj .env.example jako .env i uzupełnij ścieżki
copy .env.example .env

# Uruchomienie trybu deweloperskiego
npm run dev

# Budowanie wersji produkcyjnej (.exe)
npm run build
```

## ⚠️ Znane Problemy (Beta)
- Pierwsze uruchomienie AI może trwać dłużej (ładowanie modelu do RAM).
- Wymagane stabilne połączenie z Ollama (domyślnie `http://127.0.0.1:11434` lub `0.0.0.0:11434` dla WSL).

## 📄 Licencja
MIT - Projekt otwartoźródłowy.
