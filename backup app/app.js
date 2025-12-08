/**
 * Agent MG - Renderer Application Logic
 * Handles UI interactions and step navigation
 */

// ==============================
// State Management
// ==============================
const state = {
  currentStep: 1,
  totalSteps: 6,
  traceId: '---',
  ollamaConnected: false,
  ollamaModels: [],

  // Step data
  sheetData: null,
  selectedRow: null,
  lanes: null,
  laneResults: null,
  profile: null,
  quests: null,

  // UI state
  isProcessing: false,
  logs: [],
  sortBy: 'name',
  sortDir: 'asc',
  allProfiles: [], // Cache for all LarpGothic profiles

  // AI Assistant state
  aiProcessing: false,
  aiCommand: null,
  aiResult: null,
  aiResultsFeed: [], // Feed of all AI results in current session

  // Operator / MG State
  mgProfiles: [],
  activeMgProfile: null,
  factionHistory: {},
  charHistory: {},
  promptHistory: [],
  showPromptHistory: false,
  executionStatus: 'idle', // 'idle', 'running', 'paused'
  executionQueue: [],
  selectedPersonality: 'default_mg', // Default personality

  // Streaming State
  streamData: {
    active: false,
    cardIndex: -1,
    content: '',
    thoughtContent: '',
    isThinking: false,
    thinkStartTime: 0,
    thinkDuration: 0,
    timerInterval: null
  },

  // Prompt Configuration state
  promptParts: {
    role: '',
    goal: '',
    context: '',
    dod: '',
    useCoT: false,
    negative: '',
    examples: ''
  },
  promptConfig: {
    contexts: {
      geography: true,
      system: true,
      aspirations: false,
      weaknesses: false,
      quests: true
    },
    style: 'auto',
    fewShotCount: 2,
    responseLength: 'medium',
    usePlaceholders: true,
    focus: {
      faction: null,
      theme: null
    }
  },

  // UI State for new minimalist interface
  ui: {
    dropdowns: {
      quickActions: false,
      context: false,
      model: false,
      personality: false
    }
  }
};

// Quick Actions Definitions
const QUICK_ACTIONS = [
  {
    group: 'Questy', items: [
      { id: 'main_quest', icon: '⭐', label: 'Quest główny' },
      { id: 'side_quest', icon: '📌', label: 'Quest poboczny' },
      { id: 'redemption_quest', icon: '⚖️', label: 'Quest odkupienia' },
      { id: 'group_quest', icon: '🤝', label: 'Quest grupowy' },
    ]
  },
  {
    group: 'Analiza', items: [
      { id: 'extract_traits', icon: '🔍', label: 'Cechy' },
      { id: 'analyze_relations', icon: '👥', label: 'Relacje' },
      { id: 'summarize', icon: '📝', label: 'Podsumuj' },
    ]
  },
  {
    group: 'Pomysły', items: [
      { id: 'story_hooks', icon: '🎣', label: 'Hooki' },
      { id: 'potential_conflicts', icon: '⚔️', label: 'Konflikty' },
      { id: 'npc_connections', icon: '🔗', label: 'NPC' },
    ]
  },
  {
    group: 'Szybkie', items: [
      { id: 'nickname', icon: '🏷️', label: 'Ksywka' },
      { id: 'faction_suggestion', icon: '🏴', label: 'Frakcja' },
      { id: 'secret', icon: '🤫', label: 'Sekret' },
    ]
  },
];

// Personality Presets
const PERSONALITY_PROMPTS = {
  'default_mg': {
    name: 'Surowy MG',
    icon: '📜',
    role: 'Jesteś Mistrzem Gry w systemie Gothic. Jesteś bezstronnym narratorem brutalnego świata.',
    goal: 'Tworzenie mrocznej, realistycznej narracji w klimacie dark fantasy. Stawianie wyzwań, nie ułatwianie rozgrywki.',
    context: 'Górnicza Dolina to więzienie otoczone Magiczną Barierą. Panuje tu prawo silniejszego. Zasoby są skąpe, magia rzadka. Frakcje (Stary Obóz, Nowy Obóz, Bractwo) walczą o wpływy.',
    dod: '- Używaj terminologii z gry (np. "kopacz", "magnat", "niezły gnat").\n- Odpowiadaj zwięźle (chyba że poproszono o opowiadanie).\n- Formatuj wynik używając Markdown.\n- Nie moralizuj, świat jest okrutny.',
    example: 'Gracz: "Gdzie znajdę miecz?"\nMG: "W Starym Obozie handluje nimi Fisk. Ale za darmo nic nie dostaniesz, kopaczu. Masz rudę?"'
  },
  'helper': {
    name: 'Pomocny Asystent',
    icon: '🤝',
    role: 'Jesteś kreatywnym asystentem Mistrza Gry. Twoim zadaniem jest burza mózgów i wsparcie techniczne.',
    goal: 'Dostarczanie ciekawych pomysłów na questy, postacie i zwroty akcji. Dbanie o spójność logiczną i lore.',
    context: 'System RPG oparty na grze Gothic. Potrzebujemy zbalansowanych wyzwań dla graczy na średnim poziomie doświadczenia.',
    dod: '- Proponuj 2-3 warianty rozwiązania problemu.\n- Wskazuj potencjalne konsekwencje wyborów.\n- Bądź otwarty na szalone pomysły graczy.',
    example: 'Gracz: "Potrzebuję quesa dla nowicjusza."\nAsystent: "1. Zaginiona dostawa ziela dla Cor Kaloma (śledztwo).\n2. Zbieranie ziela na bagnach (walka z błotnymi wężami).\n3. Przekonanie kopacza do wstąpienia do Bractwa (perswazja)."'
  },
  'gothic_fan': {
    name: 'Klimaciarz',
    icon: '🔥',
    role: 'Jesteś fanatykiem lore Gothic. Mówisz jak postać z gry (np. Wrzód, Diego lub Xardas zależnie od nastroju).',
    goal: 'Maksymalna immersja i "mięsistość" opisów. Używanie slangu i nawiązań.',
    context: 'Rozmowa toczy się przy ognisku lub w karczmie. Słychać lutnię w tle.',
    dod: '- Używaj potocznego języka z gry ("Słuchaj no", "Tak to właśnie wygląda").\n- Bądź szorstki, ale nie chamski (chyba że to pasuje).\n- Wplataj cytaty z gry.',
    example: 'Gracz: "Opisz mi Stary Obóz."\nKlimaciarz: "Zamek na środku, a wokół pierścień chat. Tu rządzi Gomez. Jak nie masz protekcji, to jesteś nikim. A w nocy... cóż, lepiej nie chodź sam do dzielnicy areny."'
  },
  'analyst': {
    name: 'Analityk',
    icon: '📊',
    role: 'Jesteś analitykiem systemowym mechaniki RPG.',
    goal: 'Optymalizacja mechaniki, balansowanie statystyk, szukanie luk w zasadach.',
    context: 'Analiza techniczna scenariusza i kart postaci.',
    dod: '- Odpowiadaj w punktach.\n- Skup się na cyfrach i logice.\n- Ignoruj "fluff" fabularny, jeśli nie wpływa na mechanikę.',
    example: 'Gracz: "Czy ten miecz jest zbalansowany? (Obr: 50, Wym: 30 Siły)"\nAnalityk: "Nie. Standardowy przelicznik to 1 Pkt Siły = 1-1.2 Pkt Obrażeń. Wymóg powinien wynosić ok. 40-45 Siły dla obrażeń 50."'
  }
};

// ==============================
// Step Definitions
// ==============================
const STEPS = [
  { id: 1, title: 'Krok 1: Źródło danych', key: 'source' },
  { id: 2, title: 'Krok 2: Ekstrakcja', key: 'extraction' },
  { id: 3, title: 'Krok 3: AI Processing', key: 'ai' },
  { id: 4, title: 'Krok 4: Scalanie profilu', key: 'merge' },
  { id: 5, title: 'Krok 5: Generowanie questów', key: 'quests' },
  { id: 6, title: 'Krok 6: Eksport', key: 'export' }
];

// ==============================
// Step Content Templates
// ==============================
const stepTemplates = {
  source: () => `
    <div class="card">
      <h3 class="card-title">📊 Źródło danych</h3>
      <div class="form-group">
        <label class="form-label">Wybierz źródło</label>
        <select class="form-select" id="dataSource">
          <option value="larpgothic">🔥 LarpGothic API (baza postaci)</option>
          <option value="sheets">Google Sheets (tabela zgłoszeń)</option>
          <option value="local">Lokalny plik JSON</option>
        </select>
      </div>
      
      <div class="form-group larpgothic-search" style="margin-top: 15px;">
        <label class="form-label">Szukaj postać lub wybierz tag poniżej</label>
        <div style="position: relative;">
          <input type="text" class="form-input" id="searchName" placeholder="Wpisz imię, gildię, zawód..." oninput="handleSearchInput()" autocomplete="off">
          <div id="searchSuggestions" class="search-suggestions" style="display: none;"></div>
        </div>
      </div>

      <div class="form-group" style="margin-top: 15px;">
        <label class="form-label" style="margin-bottom: 10px;">🏷️ Szybkie tagi dla MG</label>
        
        <div class="tag-row" style="margin-bottom: 8px;">
          <span style="font-size: 11px; color: var(--text-dim); margin-right: 8px;">⚖️ Za co siedzi:</span>
          <button class="tag-btn" onclick="searchByTag('kradzież')">🗡️ Kradzież</button>
          <button class="tag-btn" onclick="searchByTag('przemyt')">📦 Przemyt</button>
          <button class="tag-btn" onclick="searchByTag('zabójstwo')">💀 Zabójstwo</button>
          <button class="tag-btn" onclick="searchByTag('oszustwo')">🎭 Oszustwo</button>
          <button class="tag-btn" onclick="searchByTag('bójka')">👊 Bójka</button>
        </div>
        
        <div class="tag-row" style="margin-bottom: 8px;">
          <span style="font-size: 11px; color: var(--text-dim); margin-right: 8px;">💼 Zawód:</span>
          <button class="tag-btn" onclick="searchByTag('górnik')">⛏️ Górnik</button>
          <button class="tag-btn" onclick="searchByTag('kowal')">🔨 Kowal</button>
          <button class="tag-btn" onclick="searchByTag('handlarz')">💎 Handlarz</button>
          <button class="tag-btn" onclick="searchByTag('łowca')">🏹 Łowca</button>
          <button class="tag-btn" onclick="searchByTag('najemnik')">⚔️ Najemnik</button>
          <button class="tag-btn" onclick="searchByTag('strażnik')">🛡️ Strażnik</button>
        </div>
        
        <div class="tag-row">
          <span style="font-size: 11px; color: var(--text-dim); margin-right: 8px;">⚠️ Wady:</span>
          <button class="tag-btn" onclick="searchByTag('alkoholik')">🍺 Pijak</button>
          <button class="tag-btn" onclick="searchByTag('hazardzista')">🎲 Hazard</button>
          <button class="tag-btn" onclick="searchByTag('chciwość')">🤑 Chciwy</button>
          <button class="tag-btn" onclick="searchByTag('gniew')">😠 Porywczy</button>
        </div>
      </div>

      <div id="searchStats" style="font-size: 11px; color: var(--text-dim); margin-top: 10px; text-align: right;">
        ${state.allProfiles.length > 0 ? `✓ Dostępnych ${state.allProfiles.length} profili` : '⏳ Ładowanie bazy postaci...'}
      </div>
      
      <button class="btn btn-primary" style="margin-top: 15px;" onclick="loadDataSource()">Załaduj dane</button>
    </div>
  `,

  settings: () => `
    <div class="card" id="system-specs-card" style="margin-bottom: 20px;">
      <h3 class="card-title">🖥️ Specyfikacja komputera</h3>
      <div id="system-specs-content" class="specs-loading">
        <p style="color: var(--text-dim);">Wykrywam specyfikację...</p>
      </div>
    </div>
    
    <div class="card">
      <h3 class="card-title">📁 Lokalizacja modeli</h3>
      <div class="form-group">
        <label class="form-label">Folder z modelami (OLLAMA_MODELS)</label>
        <div style="display: flex; gap: 10px;">
          <input type="text" class="form-input" id="modelPathInput" readonly placeholder="Domyślna (Systemowa)">
          <button class="btn btn-secondary" onclick="pickModelPath()">📂 Zmień</button>
        </div>
        <div style="margin-top: 10px;">
            <label class="context-checkbox">
            <input type="checkbox" id="moveModelsCheck" checked>
            <span>Przenieś istniejące modele do nowego folderu</span>
            </label>
        </div>
        <button class="btn btn-primary btn-sm" style="margin-top: 10px;" onclick="changeModelPath()">Zapisz i Restartuj Ollama</button>
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">🎯 Konfiguracja modeli AI</h3>
      
      <div class="form-group">
        <label class="form-label">Filtruj po dostępnym VRAM/RAM (GB)</label>
        <select class="form-select" id="vramFilter" onchange="filterModelsByVram(this.value)">
          <option value="2">≤ 2 GB (CPU-only, mało RAM)</option>
          <option value="4">≤ 4 GB (CPU 8GB RAM / GTX 1650)</option>
          <option value="6">≤ 6 GB (CPU 16GB RAM / RTX 2060)</option>
          <option value="8" selected>≤ 8 GB (RTX 3060, RTX 4060)</option>
          <option value="12">≤ 12 GB (RTX 3060 12GB, RTX 4070)</option>
          <option value="16">≤ 16 GB (RTX 4080)</option>
          <option value="24">≤ 24 GB (RTX 3090, RTX 4090)</option>
          <option value="48">≤ 48 GB (A6000, 2x RTX 3090)</option>
          <option value="999">Pokaż wszystkie</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Model do ekstrakcji (JSON, strukturyzacja)</label>
        <select class="form-select" id="modelExtraction">
          <option value="">-- Wybierz model --</option>
        </select>
        <div class="model-hint" id="hintExtraction"></div>
      </div>

      <div class="form-group">
        <label class="form-label">Model do generowania (questy, narracja)</label>
        <select class="form-select" id="modelGeneration">
          <option value="">-- Wybierz model --</option>
        </select>
        <div class="model-hint" id="hintGeneration"></div>
      </div>

      <div id="modelCategories" class="model-categories"></div>
      
      <div style="margin-top: 20px;">
        <button class="btn btn-secondary" onclick="checkOllama()">🔄 Odśwież status Ollama</button>
      </div>
    </div>
  `,

  extraction: () => `
    <div class="card">
      <h3 class="card-title">Pobrane zgłoszenia</h3>
      ${state.sheetData ? `
        <div class="table-controls" style="margin-bottom: 10px; display: flex; gap: 10px; align-items: center;">
          <span style="color: var(--text-dim); font-size: 12px;">Sortuj:</span>
          <button class="btn btn-small ${state.sortBy === 'name' ? 'active' : ''}" onclick="sortData('name')">Imię</button>
          <button class="btn btn-small ${state.sortBy === 'guild' ? 'active' : ''}" onclick="sortData('guild')">Gildia</button>
          <button class="btn btn-small ${state.sortBy === 'region' ? 'active' : ''}" onclick="sortData('region')">Region</button>
          <span style="color: var(--text-dim); font-size: 11px; margin-left: auto;">${state.sheetData.rows.length} postaci</span>
        </div>
        <div style="max-height: 400px; overflow-y: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Wybierz</th>
              <th style="cursor:pointer" onclick="sortData('name')">Imię postaci ${state.sortBy === 'name' ? (state.sortDir === 'asc' ? '▲' : '▼') : ''}</th>
              <th style="cursor:pointer" onclick="sortData('guild')">Gildia ${state.sortBy === 'guild' ? (state.sortDir === 'asc' ? '▲' : '▼') : ''}</th>
              <th style="cursor:pointer" onclick="sortData('region')">Region ${state.sortBy === 'region' ? (state.sortDir === 'asc' ? '▲' : '▼') : ''}</th>
            </tr>
          </thead>
          <tbody>
            ${getSortedRows().map((row, i) => `
              <tr onclick="selectRow(${row._originalIndex})" class="${state.selectedRow === row._originalIndex ? 'selected' : ''}">
                <td><input type="radio" name="rowSelect" ${state.selectedRow === row._originalIndex ? 'checked' : ''}></td>
                <td>${row['Imie postaci'] || '-'}</td>
                <td>${row['Gildia'] || '-'}</td>
                <td>${row['Region'] || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        </div>
      ` : '<p class="text-muted">Brak danych. Wróć do kroku 1.</p>'}
    </div>
    
    ${state.selectedRow !== null ? renderProfileDetails(state.sheetData.rows[state.selectedRow]) : ''}
  `,

  ai: () => renderMinimalistAIPanel(),
  _legacy_ai: () => `
    ${state.selectedRow !== null && state.sheetData?.rows?.[state.selectedRow] ? `
    <!-- Karta wybranej postaci -->
    ${renderProfileDetails(state.sheetData.rows[state.selectedRow])}
    
    <!-- Panel Wyszukiwania Wzmianek (Excel) -->
    <div class="card" style="margin-top: 20px; border-left: 4px solid var(--gold);">
      <h3 class="card-title" style="display: flex; align-items: center; gap: 8px;">
        🔍 Przeszukiwanie Podsumowań (Excel)
      </h3>
      <p style="color: var(--text-dim); margin-bottom: 15px; font-size: 12px;">
        Sprawdź czy inne postacie wspominają o tej postaci w swoich podsumowaniach.
      </p>
      
      <div style="display: flex; gap: 10px; align-items: center;">
         <button class="btn btn-primary" onclick="runExcelSearch()" id="btnExcelSearch">
           🔎 Szukaj wzmianek o "${state.sheetData.rows[state.selectedRow]['Imie postaci']}"
         </button>
         <span id="excelSearchStatus" style="font-size: 12px; color: var(--text-dim);"></span>
      </div>

      <div id="excelSearchResults" style="margin-top: 15px; display: none;">
        <!-- Results will be injected here -->
      </div>
    </div>

    <!-- Panel poleceń AI -->
    <div class="card" style="margin-top: 20px;">
      <h3 class="card-title" style="display: flex; justify-content: space-between; align-items: center;">
        <span>🤖 Asystent AI dla Mistrza Gry</span>
        <div style="display: flex; gap: 10px;">
          ${state.executionStatus === 'idle' ?
        `<button class="btn btn-sm btn-primary" onclick="runAllSequentially()" title="Uruchom wszystkie polecenia po kolei">▶ Wykonuj po kolei</button>` :
        state.executionStatus === 'running' ?
          `<button class="btn btn-sm btn-warning" onclick="togglePause()" title="Wstrzymaj wykonywanie">⏸ Wstrzymaj (${state.executionQueue.length})</button>` :
          `<button class="btn btn-sm btn-success" onclick="togglePause()" title="Wznów wykonywanie">▶ Wznów (${state.executionQueue.length})</button>`
      }
          <button class="btn btn-sm btn-secondary" onclick="togglePromptHistory()">📜 Historia Promptów</button>
        </div>
      </h3>
      <p style="color: var(--text-dim); margin-bottom: 20px; font-size: 12px;">
        Wybierz polecenie AI żeby wygenerować treść dla tej postaci
      </p>
      

        


        <!-- Styl narracyjny -->
        <div style="margin-bottom: 15px;">
          <label class="form-label" style="margin-bottom: 8px; display: block;">🎭 Styl narracyjny</label>
          <div class="style-radios">
            <label class="style-radio ${state.promptConfig?.style === 'political' ? 'active' : ''}">
              <input type="radio" name="narrativeStyle" value="political" ${state.promptConfig?.style === 'political' ? 'checked' : ''} onchange="updatePromptConfig('style', 'political')">
              <span>🕵️ Intryga Polityczna</span>
            </label>
            <label class="style-radio ${state.promptConfig?.style === 'mystical' ? 'active' : ''}">
              <input type="radio" name="narrativeStyle" value="mystical" ${state.promptConfig?.style === 'mystical' ? 'checked' : ''} onchange="updatePromptConfig('style', 'mystical')">
              <span>🔮 Magia i Kulty</span>
            </label>
            <label class="style-radio ${state.promptConfig?.style === 'personal' ? 'active' : ''}">
              <input type="radio" name="narrativeStyle" value="personal" ${state.promptConfig?.style === 'personal' ? 'checked' : ''} onchange="updatePromptConfig('style', 'personal')">
              <span>💰 Osobiste Cele</span>
            </label>
            <label class="style-radio ${state.promptConfig?.style === 'action' ? 'active' : ''}">
              <input type="radio" name="narrativeStyle" value="action" ${state.promptConfig?.style === 'action' ? 'checked' : ''} onchange="updatePromptConfig('style', 'action')">
              <span>⚔️ Akcja i Przetrwanie</span>
            </label>
            <label class="style-radio ${!state.promptConfig?.style || state.promptConfig?.style === 'auto' ? 'active' : ''}">
              <input type="radio" name="narrativeStyle" value="auto" ${!state.promptConfig?.style || state.promptConfig?.style === 'auto' ? 'checked' : ''} onchange="updatePromptConfig('style', 'auto')">
              <span>🎲 Automatyczny</span>
            </label>
          </div>
        </div>

        <!-- Parametry -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 15px;">
          <div>
            <label class="form-label" style="font-size: 11px;">Przykłady (few-shot)</label>
            <select class="form-select" style="font-size: 12px;" onchange="updatePromptConfig('fewShotCount', parseInt(this.value))">
              <option value="0" ${state.promptConfig?.fewShotCount === 0 ? 'selected' : ''}>0</option>
              <option value="1" ${state.promptConfig?.fewShotCount === 1 ? 'selected' : ''}>1</option>
              <option value="2" ${!state.promptConfig?.fewShotCount || state.promptConfig?.fewShotCount === 2 ? 'selected' : ''}>2</option>
              <option value="3" ${state.promptConfig?.fewShotCount === 3 ? 'selected' : ''}>3</option>
            </select>
          </div>
          <div>
            <label class="form-label" style="font-size: 11px;">Długość odpowiedzi</label>
            <select class="form-select" style="font-size: 12px;" onchange="updatePromptConfig('responseLength', this.value)">
              <option value="short" ${state.promptConfig?.responseLength === 'short' ? 'selected' : ''}>Krótka</option>
              <option value="medium" ${!state.promptConfig?.responseLength || state.promptConfig?.responseLength === 'medium' ? 'selected' : ''}>Średnia</option>
              <option value="long" ${state.promptConfig?.responseLength === 'long' ? 'selected' : ''}>Długa</option>
            </select>
          </div>
          <div>
            <label class="form-label" style="font-size: 11px;">Placeholdery</label>
            <label class="context-checkbox" style="margin-top: 6px;">
              <input type="checkbox" ${state.promptConfig?.usePlaceholders !== false ? 'checked' : ''} onchange="updatePromptConfig('usePlaceholders', this.checked)">
              <span style="font-size: 11px;">[insert ...]</span>
            </label>
          </div>
        </div>

        <!-- Fokus opcjonalny -->
        <details style="margin-top: 10px;">
          <summary style="cursor: pointer; color: var(--gold-soft); font-size: 12px;">🎯 Fokus (opcjonalne zawężenie)</summary>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; padding: 10px; background: var(--bg-dark); border-radius: 6px;">
            <div>
              <label class="form-label" style="font-size: 11px;">Frakcja</label>
              <select class="form-select" style="font-size: 11px;" onchange="updatePromptConfig('focus.faction', this.value || null)">
                <option value="">-- Dowolna --</option>
                <option value="SO" ${state.promptConfig?.focus?.faction === 'SO' ? 'selected' : ''}>Stary Obóz</option>
                <option value="NO" ${state.promptConfig?.focus?.faction === 'NO' ? 'selected' : ''}>Nowy Obóz</option>
                <option value="BS" ${state.promptConfig?.focus?.faction === 'BS' ? 'selected' : ''}>Bractwo Śniącego</option>
              </select>
            </div>
            <div>
              <label class="form-label" style="font-size: 11px;">Motyw</label>
              <select class="form-select" style="font-size: 11px;" onchange="updatePromptConfig('focus.theme', this.value || null)">
                <option value="">-- Dowolny --</option>
                <option value="revenge" ${state.promptConfig?.focus?.theme === 'revenge' ? 'selected' : ''}>🗡️ Zemsta</option>
                <option value="wealth" ${state.promptConfig?.focus?.theme === 'wealth' ? 'selected' : ''}>💰 Bogactwo</option>
                <option value="power" ${state.promptConfig?.focus?.theme === 'power' ? 'selected' : ''}>👑 Władza</option>
                <option value="escape" ${state.promptConfig?.focus?.theme === 'escape' ? 'selected' : ''}>🚪 Ucieczka</option>
                <option value="redemption" ${state.promptConfig?.focus?.theme === 'redemption' ? 'selected' : ''}>⚖️ Odkupienie</option>
              </select>
            </div>
          </div>
        </details>
      </div>
      </details>
      

        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
          <div class="form-group" style="margin: 0;">
            <label class="form-label">Model Ollama</label>
            <select class="form-select" id="aiModelSelect" onchange="state.selectedModel = this.value">
              ${state.ollamaModels && state.ollamaModels.length > 0
        ? state.ollamaModels.map(m => `
                    <option value="${m.name}" ${state.selectedModel === m.name ? 'selected' : ''}>${m.name}</option>
                  `).join('')
        : '<option value="">Brak modeli - zainstaluj w Ollama</option>'
      }
            </select>
            <div class="model-hint">Wybierz model do wykonania zadania</div>
          </div>
          
          <div class="form-group" style="margin: 0;">
            <label class="form-label">Temperatura</label>
            <input type="range" id="aiTemperature" min="0" max="100" value="${(state.aiTemperature || 0.7) * 100}" 
                   style="width: 100%;" onchange="state.aiTemperature = this.value / 100; document.getElementById('tempValue').textContent = (this.value / 100).toFixed(1)">
            <div class="model-hint">Kreatywność: <span id="tempValue">${(state.aiTemperature || 0.7).toFixed(1)}</span> (0 = precyzyjny, 1 = kreatywny)</div>
          </div>
        </div>
        
        <div class="form-group" style="margin: 0; background: var(--bg-dark); padding: 10px; border-radius: 6px; border: 1px solid var(--border-subtle);">
          <label class="form-label" style="color: var(--gold-soft); margin-bottom: 10px;">🛠️ Konstruktor Promptu</label>
          
          
          <!-- Templates -->
          <div style="margin-bottom: 15px; border-bottom: 1px dashed var(--border-subtle); padding-bottom: 10px;">
            <div style="display: flex; gap: 5px; align-items: flex-end;">
              <div style="flex: 1;">
                <label class="form-label" style="font-size: 11px;">📂 Szablony</label>
                <select class="form-select" style="font-size: 12px; padding: 4px;" onchange="applyPromptTemplate(this.value)">
                  <option value="">-- Wybierz szablon --</option>
                  ${(state.promptTemplates || []).map((t, i) => `<option value="${i}">${t.name}</option>`).join('')}
                </select>
              </div>
              <button class="btn btn-sm" onclick="savePromptTemplate()" title="Zapisz obecny jako nowy szablon">💾</button>
              <button class="btn btn-sm btn-danger" onclick="deletePromptTemplate(document.querySelector('select[onchange^=applyPromptTemplate]').value)" title="Usuń wybrany">🗑️</button>
            </div>
          </div>

          <!-- Role -->
          <div style="margin-bottom: 8px;">
            <label class="form-label" style="font-size: 11px;">🎭 Rola (Kim jest AI?)</label>
            <input type="text" class="form-input" placeholder="Np. Jesteś ekspertem od lore Gothic, cynicznym magiem wody..." 
                   value="${state.promptParts?.role || ''}" 
                   oninput="updatePromptPart('role', this.value)"
                   style="font-size: 12px;">
          </div>

          <!-- Context -->
          <div style="margin-bottom: 8px;">
            <label class="form-label" style="font-size: 11px;">🌍 Kontekst (Tło sytuacyjne)</label>
            <textarea class="form-input" rows="2" placeholder="Np. Postać należy do Starego Obozu, trwa wojna z orkami..."
                      oninput="updatePromptPart('context', this.value)"
                      style="font-size: 12px; resize: vertical;">${state.promptParts?.context || ''}</textarea>
          </div>

          <!-- Goal -->
          <div style="margin-bottom: 8px;">
            <label class="form-label" style="font-size: 11px;">🎯 Cel (Co ma zrobić?)</label>
            <textarea class="form-input" rows="2" placeholder="Np. Stwórz opis wyglądu, napisz dialog, wymyśl quest..."
                      oninput="updatePromptPart('goal', this.value)"
                      style="font-size: 12px; resize: vertical;">${state.promptParts?.goal || ''}</textarea>
          </div>

          <!-- DoD -->
          <div style="margin-bottom: 10px;">
            <label class="form-label" style="font-size: 11px;">✅ Definition of Done (Wymagania)</label>
            <textarea class="form-input" rows="2" placeholder="Np. Odpowiedź w punktach, styl mroczny, max 500 znaków..."
                      oninput="updatePromptPart('dod', this.value)"
                      style="font-size: 12px; resize: vertical;">${state.promptParts?.dod || ''}</textarea>
          </div>

          <!-- Advanced / Optimizations -->
          <details style="margin-bottom: 15px; border-top: 1px solid var(--border-subtle); padding-top: 10px;">
             <summary style="cursor: pointer; color: var(--gold-soft); font-size: 12px; font-weight: 500;">⚡ Zaawansowane / Optymalizacja (dla małych modeli)</summary>
             <div style="padding-top: 10px;">
               
               <!-- CoT Toggle -->
               <div style="margin-bottom: 10px;">
                 <label class="context-checkbox">
                   <input type="checkbox" onchange="updatePromptPart('useCoT', this.checked)" ${state.promptParts?.useCoT ? 'checked' : ''}>
                   <span style="font-size: 11px;">🧠 Włącz "Chain of Thought" (Myśl krok po kroku)</span>
                 </label>
                 <div class="model-hint">Pomaga małym modelom (np. Phi-3, Mistral) w logice i rozumowaniu.</div>
               </div>

               <!-- Negative Prompt -->
               <div style="margin-bottom: 10px;">
                 <label class="form-label" style="font-size: 11px;">🚫 Negatywny Prompt (Czego unikać?)</label>
                 <textarea class="form-input" rows="1" placeholder="Np. Nie używaj list, nie bądź uprzejmy, bez wstępu..."
                           oninput="updatePromptPart('negative', this.value)"
                           style="font-size: 12px; resize: vertical;">${state.promptParts?.negative || ''}</textarea>
               </div>

               <!-- Examples -->
               <div style="margin-bottom: 5px;">
                  <label class="form-label" style="font-size: 11px;">🧪 Przykłady (Few-Shot)</label>
                  <textarea class="form-input" rows="2" placeholder="Input: Pytanie... Output: Odpowiedź..."
                            oninput="updatePromptPart('examples', this.value)"
                            style="font-size: 12px; resize: vertical;">${state.promptParts?.examples || ''}</textarea>
                  <div class="model-hint">Podanie 1-2 przykładów drastycznie poprawia jakość słabych modeli.</div>
               </div>
             </div>
          </details>

          <div style="display: flex; justify-content: flex-end;">
            <button class="btn btn-primary btn-sm" onclick="runCustomPrompt()" ${state.aiProcessing ? 'disabled' : ''}>
              🚀 Uruchom prompt
            </button>
          </div>
        </div>
      </div>
      </details>
      

      

      <!-- Feed wyników AI -->
      <div class="ai-results-feed" id="aiFeedContainer">
        ${state.aiResultsFeed && state.aiResultsFeed.length > 0 ?
        state.aiResultsFeed.map((item, index) => `
            <div class="ai-card ${item.isNew ? 'new-result-glow' : ''}" id="ai-card-${index}">
              <div class="ai-card-header">
                <div style="display: flex; align-items: center; gap: 8px;">
                   <span style="font-size: 16px;">🤖</span>
                   <strong style="color: var(--gold-bright); font-size: 14px;">AI: ${item.command}</strong>
                   <span style="font-size: 11px; color: var(--text-dim); margin-left: 8px;">${new Date(item.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="ai-result-actions">
                  <button class="btn btn-sm" onclick="copyToClipboard('${item.content.replace(/'/g, "\\'")}')" title="Kopiuj">📋</button>
                  <button class="btn btn-sm btn-primary" onclick="saveSpecificResult(${index})" title="Zapisz ten wynik">💾 Zapisz</button>
                </div>
              </div>
              <div class="ai-card-content">${item.content}</div>
            </div>
          `).join('')
        : ''}
      </div>

      <!-- Loading indicator (at the bottom) -->
      ${state.aiProcessing ? `
      <div class="ai-loading" id="aiLoadingIndicator" style="margin-top: 20px; text-align: center; padding: 20px;">
        <div class="spinner"></div>
        <p style="color: var(--gold-soft); margin-top: 10px;">⏳ AI przetwarza... (${state.aiCommand || ''})</p>
      </div>
      ` : ''}
    ` : `
    <div class="card">
      <h3 class="card-title">🤖 Asystent AI</h3>
      <p style="color: var(--text-muted);">
        ⚠️ Najpierw wybierz postać w Kroku 2 (Ekstrakcja).
      </p>
      <button class="btn btn-secondary" onclick="state.currentStep = 2; renderStep();">
        ← Wróć do Kroku 2
      </button>
    </div>
    `}
  `,

  merge: () => `
    <div class="card">
      <h3 class="card-title">Scalony profil postaci</h3>
      ${state.profile ? `
        <pre style="font-size: 12px; max-height: 400px; overflow: auto;">${JSON.stringify(state.profile, null, 2)}</pre>
        <button class="btn btn-secondary" style="margin-top: 15px;" onclick="editProfile()">Edytuj ręcznie</button>
      ` : '<p style="color: var(--text-muted);">Profil zostanie wygenerowany po przetworzeniu AI.</p>'}
    </div>
  `,

  quests: () => `
    <div class="card">
      <h3 class="card-title">Wygenerowane questy</h3>
      ${state.quests && state.quests.length > 0 ? `
        ${state.quests.map((quest, i) => `
          <div class="quest-card" style="padding: 15px; margin-bottom: 10px; background: var(--bg-dark); border-radius: 8px;">
            <h4 style="color: var(--gold-bright); margin-bottom: 8px;">${quest.title || `Quest ${i + 1}`}</h4>
            <p style="color: var(--text-muted); font-size: 13px;">${quest.synopsis || 'Brak opisu'}</p>
          </div>
        `).join('')}
      ` : `
        <p style="color: var(--text-muted); margin-bottom: 20px;">
          Questy zostaną wygenerowane przez model Mistral na podstawie profilu.
        </p>
        <button class="btn btn-primary" onclick="generateQuests()">Generuj questy</button>
      `}
    </div>
  `,

  export: () => `
    <div class="card">
      <h3 class="card-title">Eksport wyników</h3>
      <div class="form-group">
        <label class="form-label">Format eksportu</label>
        <select class="form-select" id="exportFormat">
          <option value="html">HTML (karty do przeglądarki)</option>
          <option value="json">JSON (surowe dane)</option>
          <option value="both">Oba formaty</option>
        </select>
      </div>
      
      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <button class="btn btn-primary" onclick="exportResults()">Eksportuj</button>
        <button class="btn btn-secondary" onclick="openOutputFolder()">Otwórz folder</button>
      </div>
    </div>
    
    <div class="card">
      <h3 class="card-title">Podsumowanie</h3>
      <ul style="color: var(--text-muted); line-height: 2;">
        <li>Postać: <strong style="color: var(--text-primary);">${state.profile?.core_identity?.character_name || '-'}</strong></li>
        <li>Wygenerowane questy: <strong style="color: var(--text-primary);">${state.quests?.length || 0}</strong></li>
        <li>Trace ID: <strong style="color: var(--gold);">${state.traceId}</strong></li>
      </ul>
    </div>
  `,

  testbench: () => getTestbenchTemplate()
};

// Update card style for thinking
const thinkingStyle = document.createElement('style');
thinkingStyle.textContent = `
  .thinking-block {
      background: rgba(0,0,0,0.2);
      border-left: 2px solid var(--gold-soft);
      margin: 10px 0;
      border-radius: 4px;
      overflow: hidden;
  }
  .thinking-header {
      padding: 6px 10px;
      font-size: 11px;
      color: var(--gold-soft);
      background: rgba(0,0,0,0.1);
      border-bottom: 1px solid rgba(255,215,0,0.1);
      display: flex;
      justify-content: space-between;
  }
  .thinking-content {
      padding: 10px;
      color: var(--text-dim);
      font-size: 12px;
      font-style: italic;
      font-family: monospace;
      white-space: pre-wrap;
  }
`;
document.head.appendChild(thinkingStyle);

// Add lane-item styles dynamically
const laneStyles = document.createElement('style');
laneStyles.textContent = `
  .lanes-progress { margin-bottom: 20px; }
  .lane-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid var(--border-subtle);
  }
  .lane-indicator { font-size: 14px; }
  .lane-name { flex: 1; }
  .lane-status { font-size: 12px; color: var(--text-dim); }
  .lane-item.processing .lane-indicator::before { content: '◐'; color: var(--gold); }
  .lane-item.done .lane-indicator::before { content: '✓'; color: var(--success); }
  .lane-item.done .lane-status { color: var(--success); }
  tr.selected { background: var(--gold-glow) !important; }
  
  /* Model selector styles */
  .model-hint { font-size: 11px; color: var(--text-dim); margin-top: 4px; }
  .model-categories { margin-top: 20px; }
  .model-category { margin-bottom: 15px; }
  .model-category-header {
    display: flex; align-items: center; gap: 8px;
    padding: 10px; cursor: pointer;
    background: var(--bg-card); border-radius: 8px;
    border: 1px solid var(--border-subtle);
  }
  .model-category-header:hover { background: var(--bg-hover); }
  .model-category-header .arrow { transition: transform 0.2s; }
  .model-category-header.open .arrow { transform: rotate(90deg); }
  .model-category-title { flex: 1; font-weight: 500; }
  .model-category-count { font-size: 11px; color: var(--text-dim); }
  .model-category-body { display: none; padding: 10px 0 0 20px; }
  .model-category-body.open { display: block; }
  .model-item {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px; margin: 4px 0;
    background: var(--bg-dark); border-radius: 6px;
    font-size: 13px;
  }
  .model-item-name { flex: 1; }
  .model-item-sizes { font-size: 11px; color: var(--text-dim); }
  .model-item-tags { display: flex; gap: 4px; }
  .model-tag {
    font-size: 9px; padding: 2px 6px;
    background: var(--gold-glow); color: var(--gold);
    border-radius: 4px;
  }
  .model-item-btn { 
    padding: 4px 10px; font-size: 11px;
    background: var(--bg-panel); border: 1px solid var(--border-subtle);
    color: var(--text-muted); border-radius: 4px; cursor: pointer;
  }
  .model-item-btn:hover { background: var(--gold); color: var(--bg-dark); }
  .model-item-btn.installed { background: var(--success); color: white; border-color: var(--success); }
  
  /* Search suggestions panel */
  .search-suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: 8px;
    max-height: 300px;
    overflow-y: auto;
    z-index: 100;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }
  .suggestion-item {
    padding: 10px 12px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-subtle);
  }
  .suggestion-item:last-child { border-bottom: none; }
  .suggestion-item:hover { background: var(--bg-hover); }
  .suggestion-item.no-results { 
    color: var(--text-dim); 
    justify-content: center;
    cursor: default;
  }
  .suggestion-name { font-weight: 500; color: var(--text-primary); }
  .suggestion-meta { font-size: 11px; color: var(--text-dim); }
  
  /* Tag buttons for semantic search */
  .tag-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  .tag-btn {
    padding: 4px 10px;
    font-size: 11px;
    background: var(--bg-dark);
    border: 1px solid var(--border-subtle);
    color: var(--text-muted);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .tag-btn:hover {
    background: var(--gold-glow);
    border-color: var(--gold);
    color: var(--gold);
  }
  .tag-btn:active {
    transform: scale(0.95);
  }
  
  /* AI Assistant styles */
  .ai-section {
    margin-bottom: 20px;
    padding: 15px;
    background: var(--bg-dark);
    border-radius: 8px;
    border: 1px solid var(--border-subtle);
  }
  .ai-section-title {
    color: var(--gold-soft);
    font-size: 13px;
    font-weight: 500;
    margin: 0 0 12px 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .ai-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .ai-btn {
    padding: 8px 14px;
    font-size: 12px;
    background: var(--bg-panel);
    border: 1px solid var(--border);
    color: var(--text-muted);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .ai-btn:hover:not(:disabled) {
    background: var(--gold-glow);
    border-color: var(--gold);
    color: var(--gold-bright);
  }
  .ai-btn:active:not(:disabled) {
    transform: scale(0.97);
  }
  .ai-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* AI Result panel */
  .ai-result-panel {
    background: var(--bg-dark);
    border: 1px solid var(--gold-glow);
    border-radius: 8px;
    padding: 15px;
  }
  .ai-result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border-subtle);
  }
  .ai-result-actions {
    display: flex;
    gap: 8px;
  }
  .ai-result-content {
    font-size: 13px;
    line-height: 1.6;
    color: var(--text-primary);
    white-space: pre-wrap;
    max-height: 400px;
    overflow-y: auto;
  }
  .btn-sm {
    padding: 5px 10px;
    font-size: 11px;
  }
  
  /* Spinner */
  .spinner {
    width: 30px;
    height: 30px;
    border: 3px solid var(--border);
    border-top-color: var(--gold);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Hover reveal for AI message actions */
  .ai-message:hover .ai-message-actions {
    opacity: 1 !important;
  }

  /* Character Overlay */
  .character-overlay {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 400px;
    max-height: 80vh;
    background: var(--bg-panel);
    border: 1px solid var(--gold);
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.7);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    resize: both;
  }
  .overlay-header {
    padding: 10px 15px;
    background: var(--bg-dark);
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: move;
    user-select: none;
  }
  .overlay-title {
    font-weight: bold;
    color: var(--gold-bright);
    font-size: 14px;
    display: flex; align-items: center; gap: 8px;
  }
  .overlay-close {
    cursor: pointer;
    color: var(--text-dim);
    font-size: 16px;
    transition: color 0.2s;
  }
  .overlay-close:hover { color: var(--gold); }
  .overlay-content {
    padding: 15px;
    overflow-y: auto;
    font-size: 13px;
    line-height: 1.6;
    color: var(--text-primary);
  }
  .overlay-section {
    margin-bottom: 15px;
  }
  .overlay-section h4 {
    margin: 0 0 5px 0;
    color: var(--gold-soft);
    font-size: 12px;
    text-transform: uppercase;
    border-bottom: 1px solid var(--border-subtle);
    padding-bottom: 2px;
  }
  
  /* Link styles */
  .char-link {
    color: var(--gold);
    cursor: pointer;
    border-bottom: 1px dashed var(--gold-soft);
    transition: all 0.2s;
  }
  .char-link:hover {
    color: var(--gold-bright);
    background: rgba(255, 215, 0, 0.1);
    border-bottom-style: solid;
  }
  .source-link {
    cursor: pointer;
    transition: color 0.2s;
  }
  .source-link:hover {
    color: var(--gold-bright) !important;
    text-decoration: underline;
  }
`;
document.head.appendChild(laneStyles);

// ==============================
// UI Functions
// ==============================
function renderStep() {
  const step = STEPS[state.currentStep - 1];
  document.getElementById('stepTitle').textContent = step.title;

  // Ensure footer is visible
  const footer = document.querySelector('.content-footer');
  if (footer) footer.style.display = 'flex';

  const template = stepTemplates[step.key];
  document.getElementById('stepContent').innerHTML = template ? template() : '<p>Step not implemented</p>';

  // Update sidebar
  document.querySelectorAll('.step-item').forEach((el, i) => {
    el.classList.remove('active', 'completed');
    if (i + 1 === state.currentStep) {
      el.classList.add('active');
    } else if (i + 1 < state.currentStep) {
      el.classList.add('completed');
    }
  });

  // Update nav buttons
  document.getElementById('btnPrev').disabled = state.currentStep === 1;
  document.getElementById('btnNext').textContent = state.currentStep === state.totalSteps ? 'Zakończ' : 'Dalej ▶';

  // Initialize model selectors on step 1
  if (state.currentStep === 1) {
    setTimeout(async () => {
      await loadSystemSpecs();
      renderModelCategories();
      populateModelSelects();

      // Add event listener for VRAM filter
      document.getElementById('vramFilter')?.addEventListener('change', filterModelsByVram);
    }, 50);
  }
}

function showSettings() {
  // Render settings template
  const content = document.getElementById('stepContent');
  const title = document.getElementById('stepTitle');

  if (content && title) {
    title.textContent = '⚙️ Ustawienia AI';
    content.innerHTML = stepTemplates.settings();

    // Highlight settings item in sidebar
    document.querySelectorAll('.step-item').forEach(el => el.classList.remove('active'));
    document.querySelector('.settings-item')?.classList.add('active');

    // Initialize settings view
    setTimeout(async () => {
      await loadSystemSpecs();

      // Load current model path
      try {
        const currentPath = await window.electronAPI.getModelsPath();
        const input = document.getElementById('modelPathInput');
        if (input) input.value = currentPath || 'Domyślna (Systemowa)';
      } catch (e) {
        console.error('Failed to load model path', e);
      }

      renderModelCategories();
      populateModelSelects();
    }, 50);
  }
}

function showTestbench() {
  // Render testbench template
  const content = document.getElementById('stepContent');
  const title = document.getElementById('stepTitle');

  if (content && title) {
    title.textContent = '🧪 Model Testbench';
    content.innerHTML = stepTemplates.testbench();

    // Highlight testbench item in sidebar
    document.querySelectorAll('.step-item').forEach(el => el.classList.remove('active'));
    document.querySelector('.testbench-item')?.classList.add('active');

    //Initialize testbench view
    setTimeout(() => {
      initTestbenchView();
    }, 50);
  }
}

function setProgress(percent, text) {
  document.getElementById('progressFill').style.width = `${percent}%`;
  document.getElementById('progressText').textContent = text;
}

function addLog(level, message) {
  const time = new Date().toLocaleTimeString('pl-PL');
  const logContent = document.getElementById('logContent');
  const entry = document.createElement('div');
  entry.className = `log-entry log-${level}`;
  entry.innerHTML = `<span class="log-time">${time}</span><span class="log-msg">${message}</span>`;
  logContent.appendChild(entry);
  logContent.scrollTop = logContent.scrollHeight;

  state.logs.push({ time, level, message });
}

// ==============================
// Ollama Models Database (inline)
// ==============================
const OLLAMA_MODELS = {
  vramBySize: {
    '0.5b': 1, '1b': 2, '1.5b': 2, '2b': 2, '3b': 3, '4b': 4, '7b': 8, '8b': 8,
    '13b': 16, '14b': 16, '27b': 24, '30b': 24, '32b': 24, '70b': 48, '72b': 48
  },
  categories: {
    reasoning: {
      name: '🧠 Reasoning / Thinking',
      desc: 'Modele które "myślą" zanim odpowiedzą - lepsze do trudnych zadań',
      models: [
        { id: 'deepseek-r1', name: 'DeepSeek R1', sizes: ['1.5b', '7b', '8b', '14b', '32b', '70b'], tags: ['thinking'], desc: 'Bardzo mądry, pokazuje tok rozumowania' },
        { id: 'qwq', name: 'QwQ', sizes: ['32b'], tags: ['thinking'], desc: 'Chiński model myślący, świetny do matematyki' },
        { id: 'phi4-reasoning', name: 'Phi-4 Reasoning', sizes: ['14b'], tags: ['thinking'], desc: 'Microsoft, dobry stosunek jakości do rozmiaru' },
        { id: 'openthinker', name: 'OpenThinker', sizes: ['7b', '32b'], tags: ['thinking'], desc: 'Open source model myślący' },
        { id: 'exaone-deep', name: 'EXAONE Deep', sizes: ['7.8b', '32b'], tags: ['thinking'], desc: 'Koreański, dobry do analizy' }
      ]
    },
    general: {
      name: '💬 General Purpose',
      desc: 'Do wszystkiego - chatowanie, pisanie, Q&A',
      models: [
        { id: 'llama3.3', name: 'Llama 3.3', sizes: ['70b'], tags: ['tools'], desc: 'Najnowszy od Meta, bardzo mądry' },
        { id: 'llama3.2', name: 'Llama 3.2', sizes: ['1b', '3b'], tags: [], desc: 'Mały i szybki, dobry na start' },
        { id: 'llama3.1', name: 'Llama 3.1', sizes: ['8b', '70b'], tags: ['tools'], desc: 'Sprawdzony klasyk, stabilny' },
        { id: 'qwen3', name: 'Qwen 3', sizes: ['0.6b', '1.7b', '4b', '8b', '14b', '30b', '32b'], tags: ['tools', 'thinking'], desc: '🔥 Najlepszy chiński model, mega wszechstronny' },
        { id: 'qwen2.5', name: 'Qwen 2.5', sizes: ['0.5b', '1.5b', '3b', '7b', '14b', '32b', '72b'], tags: ['tools'], desc: 'Stabilna wersja, świetny do wielu zadań' },
        { id: 'gemma3', name: 'Gemma 3', sizes: ['1b', '4b', '12b', '27b'], tags: [], desc: 'Od Google, lekki i szybki' },
        { id: 'phi4', name: 'Phi-4', sizes: ['14b'], tags: [], desc: 'Microsoft, świetny na średnim sprzęcie' },
        { id: 'phi4-mini', name: 'Phi-4 Mini', sizes: ['3.8b'], tags: [], desc: '⭐ Polecany! Mały ale sprytny' },
        { id: 'mistral', name: 'Mistral', sizes: ['7b'], tags: [], desc: 'Francuski klasyk, szybki i dobry' },
        { id: 'mistral-nemo', name: 'Mistral Nemo', sizes: ['12b'], tags: ['tools'], desc: 'Nowszy Mistral z toolsami' }
      ]
    },
    coding: {
      name: '💻 Coding',
      desc: 'Specjaliści od programowania i kodu',
      models: [
        { id: 'qwen2.5-coder', name: 'Qwen 2.5 Coder', sizes: ['0.5b', '1.5b', '3b', '7b', '14b', '32b'], tags: ['tools'], desc: '⭐ Najlepszy do kodu, bardzo precyzyjny' },
        { id: 'deepseek-coder-v2', name: 'DeepSeek Coder V2', sizes: ['16b'], tags: [], desc: 'Chiński spec od kodu' },
        { id: 'codellama', name: 'Code Llama', sizes: ['7b', '13b', '34b', '70b'], tags: [], desc: 'Meta, dobry do dopełniania kodu' },
        { id: 'codegemma', name: 'CodeGemma', sizes: ['2b', '7b'], tags: [], desc: 'Google, lekki do kodu' },
        { id: 'starcoder2', name: 'StarCoder 2', sizes: ['3b', '7b', '15b'], tags: [], desc: 'BigCode, wiele języków programowania' },
        { id: 'codestral', name: 'Codestral', sizes: ['22b'], tags: [], desc: 'Mistral dla programistów' }
      ]
    },
    vision: {
      name: '👁️ Vision',
      desc: 'Widzą i rozumieją obrazki',
      models: [
        { id: 'llama3.2-vision', name: 'Llama 3.2 Vision', sizes: ['11b', '90b'], tags: ['vision'], desc: 'Meta, analizuje zdjęcia' },
        { id: 'llava', name: 'LLaVA', sizes: ['7b', '13b', '34b'], tags: ['vision'], desc: 'Rozpoznaje co jest na obrazku' },
        { id: 'llava-llama3', name: 'LLaVA Llama3', sizes: ['8b'], tags: ['vision'], desc: 'Nowsza wersja z Llama3' },
        { id: 'qwen3-vl', name: 'Qwen3-VL', sizes: ['2b', '4b', '8b', '30b'], tags: ['vision', 'tools'], desc: '⭐ Najlepszy do obrazów, wielozadaniowy' },
        { id: 'moondream', name: 'Moondream', sizes: ['2b'], tags: ['vision'], desc: 'Malutki ale widzi!' }
      ]
    },
    embedding: {
      name: '📊 Embedding',
      desc: 'Do wyszukiwania i RAG (nie do chatowania)',
      models: [
        { id: 'nomic-embed-text', name: 'Nomic Embed', sizes: ['137m'], tags: ['embedding'], desc: 'Popularny do wyszukiwania' },
        { id: 'mxbai-embed-large', name: 'MxBai Embed', sizes: ['335m'], tags: ['embedding'], desc: 'Duży embedding, dokładniejszy' },
        { id: 'bge-m3', name: 'BGE-M3', sizes: ['567m'], tags: ['embedding'], desc: 'Multilingual, wiele języków' },
        { id: 'all-minilm', name: 'All-MiniLM', sizes: ['23m', '33m'], tags: ['embedding'], desc: 'Maluteńki, szybki' }
      ]
    },
    roleplay: {
      name: '🎭 Roleplay / Uncensored',
      desc: 'Do kreatywnego pisania, bez cenzury',
      models: [
        { id: 'dolphin3', name: 'Dolphin 3', sizes: ['8b'], tags: [], desc: 'Bez filtrów, kreatywny' },
        { id: 'dolphin-llama3', name: 'Dolphin Llama3', sizes: ['8b', '70b'], tags: [], desc: 'Llama3 bez cenzury' },
        { id: 'llama2-uncensored', name: 'Llama2 Uncensored', sizes: ['7b', '70b'], tags: [], desc: 'Klasyk bez ograniczeń' },
        { id: 'nous-hermes2', name: 'Nous Hermes 2', sizes: ['10.7b', '34b'], tags: ['tools'], desc: 'Do storytellingu' },
        { id: 'hermes3', name: 'Hermes 3', sizes: ['8b', '70b'], tags: ['tools'], desc: 'Nowszy, lepszy do RP' }
      ]
    },
    small: {
      name: '🪶 Small / Edge',
      desc: 'Leciutkie, działają nawet na słabym sprzęcie',
      models: [
        { id: 'tinyllama', name: 'TinyLlama', sizes: ['1.1b'], tags: [], desc: 'Malutki ale działa!' },
        { id: 'smollm2', name: 'SmolLM2', sizes: ['135m', '360m', '1.7b'], tags: [], desc: 'Mikro-model od HuggingFace' },
        { id: 'phi3:mini', name: 'Phi-3 Mini', sizes: ['3.8b'], tags: [], desc: 'Microsoft, mały i mądry' },
        { id: 'gemma3:1b', name: 'Gemma 3 1B', sizes: ['1b'], tags: [], desc: 'Google, ultra lekki' },
        { id: 'orca-mini', name: 'Orca Mini', sizes: ['3b', '7b', '13b'], tags: [], desc: 'Zoptymalizowany do szybkości' }
      ]
    }
  },
  getVram(sizeStr) {
    const key = sizeStr.replace(/[^0-9.bm]/gi, '').toLowerCase();
    if (this.vramBySize[key]) return this.vramBySize[key];
    const match = key.match(/(\d+\.?\d*)([mb])/i);
    if (!match) return 999;
    const num = parseFloat(match[1]);
    return match[2] === 'm' ? Math.ceil(num / 500) : Math.ceil(num * 1.2);
  },
  filterByVram(maxVram) {
    const result = {};
    for (const [catId, cat] of Object.entries(this.categories)) {
      const filtered = cat.models.filter(m => m.sizes.some(s => this.getVram(s) <= maxVram))
        .map(m => ({ ...m, sizes: m.sizes.filter(s => this.getVram(s) <= maxVram) }))
        .filter(m => m.sizes.length > 0);
      if (filtered.length > 0) result[catId] = { ...cat, models: filtered };
    }

    // Inject Local/Custom models (bypass VRAM filter)
    if (typeof state !== 'undefined' && state.ollamaModels && state.ollamaModels.length > 0) {
      const knownIds = new Set();
      // Collect known IDs
      for (const cat of Object.values(this.categories)) {
        cat.models.forEach(m => knownIds.add(m.id));
      }

      const customModels = state.ollamaModels.filter(m => {
        // Check if model matches any known ID (exact or base name)
        return !Array.from(knownIds).some(id => m.name === id || m.name.startsWith(id + ':'));
      });

      if (customModels.length > 0) {
        result['custom'] = {
          name: '📂 Lokalne / Inne',
          desc: 'Modele znalezione na dysku (spoza listy oficjalnej)',
          models: customModels.map(m => {
            const parts = m.name.split(':');
            const base = parts[0];
            const tag = parts[1] || 'latest';
            return {
              id: base,
              name: m.name,
              sizes: [tag],
              tags: ['local'],
              desc: 'Znaleziony lokalnie'
            };
          })
        };
      }
    }

    return result;
  }
};

// State for model selection
state.selectedModelExtraction = 'phi4-mini:latest';
state.selectedModelGeneration = 'mistral:latest';
state.currentVramFilter = 8;

// ==============================
// Model Selector Functions
// ==============================
function filterModelsByVram() {
  const vram = parseInt(document.getElementById('vramFilter')?.value || 8);
  state.currentVramFilter = vram;
  renderModelCategories();
  populateModelSelects();
  addLog('info', `Filtr VRAM: ≤${vram} GB`);
}

function renderModelCategories() {
  const container = document.getElementById('modelCategories');
  if (!container) return;

  const filtered = OLLAMA_MODELS.filterByVram(state.currentVramFilter);
  if (Object.keys(filtered).length === 0) {
    container.innerHTML = '<p style="color: var(--text-dim);">Brak modeli dla wybranego VRAM.</p>';
    return;
  }

  let html = '';
  for (const [catId, cat] of Object.entries(filtered)) {
    html += `
      <div class="model-category">
        <div class="model-category-header" data-category="${catId}">
          <span class="arrow">▶</span>
          <span class="model-category-title">${cat.name}</span>
          <span class="model-category-desc">${cat.desc || ''}</span>
          <span class="model-category-count">${cat.models.length} modeli</span>
        </div>
        <div class="model-category-body" id="cat-${catId}">
          ${cat.models.map(m => `
            <div class="model-item">
              <div class="model-item-info">
                <span class="model-item-name">${m.name}</span>
                <span class="model-item-desc">${m.desc || ''}</span>
              </div>
              <span class="model-item-tags">
                ${m.tags.map(t => `<span class="model-tag">${t}</span>`).join('')}
              </span>
              <div class="model-download-controls">
                <select class="model-size-select" data-model-id="${m.id}">
                  ${m.sizes.map(size => `<option value="${size}">${size}</option>`).join('')}
                </select>
                <button class="model-item-btn ${isModelInstalled(m.id) ? 'installed' : ''}" 
                        data-model-base="${m.id}">
                  ${isModelInstalled(m.id) ? '✓' : 'Pobierz'}
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  container.innerHTML = html;

  // Bind event listeners (CSP doesn't allow inline onclick)
  container.querySelectorAll('.model-category-header').forEach(header => {
    header.addEventListener('click', () => {
      const catId = header.dataset.category;
      toggleCategory(catId);
    });
  });

  container.querySelectorAll('.model-item-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modelBase = btn.dataset.modelBase;
      const select = btn.parentElement.querySelector('.model-size-select');
      const size = select ? select.value : 'latest';
      const modelName = `${modelBase}:${size}`;
      pullModel(modelName);
    });
  });
}

function toggleCategory(catId) {
  const header = document.querySelector(`#cat-${catId}`)?.previousElementSibling;
  const body = document.getElementById(`cat-${catId}`);
  if (header && body) {
    header.classList.toggle('open');
    body.classList.toggle('open');
  }
}

function populateModelSelects() {
  const selectExt = document.getElementById('modelExtraction');
  const selectGen = document.getElementById('modelGeneration');
  if (!selectExt || !selectGen) return;

  const filtered = OLLAMA_MODELS.filterByVram(state.currentVramFilter);
  const allModels = [];
  for (const cat of Object.values(filtered)) {
    for (const m of cat.models) {
      for (const size of m.sizes) {
        allModels.push({ id: `${m.id}:${size}`, name: `${m.name} (${size})`, vram: OLLAMA_MODELS.getVram(size) });
      }
    }
  }
  allModels.sort((a, b) => a.vram - b.vram);

  const options = allModels.map(m =>
    `<option value="${m.id}" ${isModelInstalled(m.id.split(':')[0]) ? 'data-installed="true"' : ''}>${m.name} - ${m.vram}GB</option>`
  ).join('');

  selectExt.innerHTML = '<option value="">-- Wybierz model --</option>' + options;
  selectGen.innerHTML = '<option value="">-- Wybierz model --</option>' + options;

  // Restore previous selections if still valid
  if (state.selectedModelExtraction) selectExt.value = state.selectedModelExtraction;
  if (state.selectedModelGeneration) selectGen.value = state.selectedModelGeneration;
}

function isModelInstalled(modelId) {
  return state.ollamaModels.some(m => m.name.startsWith(modelId));
}

// ==============================
// System Diagnostics
// ==============================
async function loadSystemSpecs() {
  const container = document.getElementById('system-specs-content');
  if (!container) return;

  try {
    addLog('info', 'Wykrywam specyfikację sprzętu...');
    const { specs, recommendation } = await window.electronAPI.getSystemSpecs();

    const modeIcon = recommendation.mode === 'gpu' ? '🎮' : '💻';
    const modeLabel = recommendation.mode === 'gpu' ? 'GPU' : 'CPU-only';

    container.innerHTML = `
      <div class="specs-grid">
        <div class="spec-item">
          <span class="spec-icon">🎮</span>
          <span class="spec-label">GPU</span>
          <span class="spec-value">${specs.gpu.name}</span>
          ${specs.gpu.vram ? `<span class="spec-detail">${specs.gpu.vram} GB VRAM</span>` : ''}
        </div>
        <div class="spec-item">
          <span class="spec-icon">🧮</span>
          <span class="spec-label">RAM</span>
          <span class="spec-value">${specs.ram.total} GB</span>
          <span class="spec-detail">${specs.ram.free} GB wolne</span>
        </div>
        <div class="spec-item">
          <span class="spec-icon">⚡</span>
          <span class="spec-label">CPU</span>
          <span class="spec-value">${specs.cpu.cores} rdzeni</span>
          <span class="spec-detail">${specs.cpu.model.substring(0, 30)}...</span>
        </div>
        <div class="spec-item recommendation">
          <span class="spec-icon">${modeIcon}</span>
          <span class="spec-label">Rekomendacja</span>
          <span class="spec-value">${modeLabel} ≤${recommendation.maxSize}GB</span>
          <span class="spec-detail">${recommendation.reason}</span>
        </div>
      </div >
      `;

    // Auto-set VRAM filter based on recommendation
    const vramFilter = document.getElementById('vramFilter');
    if (vramFilter) {
      vramFilter.value = recommendation.maxSize.toString();
      state.currentVramFilter = recommendation.maxSize;
      addLog('success', `Auto - filtr: ≤${recommendation.maxSize} GB(${recommendation.reason})`);
    }

  } catch (error) {
    container.innerHTML = `< p style = "color: var(--text-dim);" > Nie udało się wykryć specyfikacji</p > `;
    addLog('warn', 'Błąd detekcji sprzętu: ' + error.message);
  }
}

// Add styles for specs panel
const specsStyles = document.createElement('style');
specsStyles.textContent = `
      .specs - grid {
      display: grid;
      grid - template - columns: repeat(auto - fit, minmax(180px, 1fr));
      gap: 15px;
    }
  .spec - item {
      background: rgba(0, 0, 0, 0.3);
      padding: 12px 15px;
      border - radius: 8px;
      display: flex;
      flex - direction: column;
      gap: 4px;
    }
  .spec - item.recommendation {
      background: rgba(184, 138, 43, 0.15);
      border: 1px solid var(--border);
    }
  .spec - icon {
      font - size: 20px;
    }
  .spec - label {
      font - size: 11px;
      text - transform: uppercase;
      color: var(--text - dim);
      letter - spacing: 0.5px;
    }
  .spec - value {
      font - size: 14px;
      font - weight: 600;
      color: var(--text);
    }
  .spec - detail {
      font - size: 11px;
      color: var(--text - muted);
    }
    `;
document.head.appendChild(specsStyles);

// ==============================
// LarpGothic Auto-fetch & Suggestions
// ==============================

async function preloadData() {
  addLog('info', 'Autopobieranie bazy LarpGothic...');
  try {
    const result = await window.electronAPI.fetchLarpGothic({});
    if (result.success) {
      state.allProfiles = result.rows;
      addLog('success', `Pobrano ${result.rows.length} profili w tle.`);
      updateSearchStats();
      updateSuggestions();
    }
  } catch (e) {
    addLog('warn', 'Nie udało się pobrać bazy w tle.');
  }
}

function updateSearchStats() {
  const stats = document.getElementById('searchStats');
  if (stats) {
    stats.textContent = `Dostępnych ${state.allProfiles.length} profili`;
  }
}

function updateSuggestions() {
  // No longer needed - using dynamic search instead
}

function handleSearchInput() {
  const input = document.getElementById('searchName');
  const suggestionsPanel = document.getElementById('searchSuggestions');

  if (!input || !suggestionsPanel || state.allProfiles.length === 0) return;

  const query = input.value.toLowerCase().trim();

  if (query.length < 2) {
    suggestionsPanel.style.display = 'none';
    return;
  }

  // Filter ALL profiles
  const matches = state.allProfiles.filter(p => {
    const name = (p['Imie postaci'] || '').toLowerCase();
    const guild = (p['Gildia'] || '').toLowerCase();
    const region = (p['Region'] || '').toLowerCase();
    return name.includes(query) || guild.includes(query) || region.includes(query);
  }).slice(0, 15); // Show top 15 matches

  if (matches.length === 0) {
    suggestionsPanel.innerHTML = '<div class="suggestion-item no-results">Brak wyników dla "' + query + '"</div>';
    suggestionsPanel.style.display = 'block';
    return;
  }

  suggestionsPanel.innerHTML = matches.map(p => `
    <div class="suggestion-item" onclick="selectSuggestion('${p['Imie postaci']}')">
      <span class="suggestion-name">${p['Imie postaci']}</span>
      <span class="suggestion-meta">${p['Gildia']} • ${p['Region']}</span>
    </div>
  `).join('');

  suggestionsPanel.style.display = 'block';
}

function selectSuggestion(name) {
  const input = document.getElementById('searchName');
  const suggestionsPanel = document.getElementById('searchSuggestions');

  if (input) input.value = name;
  if (suggestionsPanel) suggestionsPanel.style.display = 'none';
}

function hideSuggestions() {
  const suggestionsPanel = document.getElementById('searchSuggestions');
  if (suggestionsPanel) suggestionsPanel.style.display = 'none';
}

function searchByTag(tagName) {
  addLog('info', `Szukam postaci z tagiem: ${tagName}`);

  if (state.allProfiles.length === 0) {
    addLog('warn', 'Brak załadowanych profili. Poczekaj na załadowanie danych.');
    return;
  }

  // Filter profiles that have this tag
  const matches = state.allProfiles.filter(p => {
    if (p.Tags && Array.isArray(p.Tags)) {
      return p.Tags.some(t => t.name === tagName);
    }
    return false;
  });

  if (matches.length > 0) {
    state.sheetData = { success: true, rows: matches };
    addLog('success', `Znaleziono ${matches.length} postaci z tagiem "${tagName}"`);
    state.currentStep = 2;
    renderStep();
  } else {
    addLog('warn', `Brak postaci z tagiem "${tagName}". Próbuję wyszukiwanie pełnotekstowe...`);
    // Fallback to full-text search
    document.getElementById('searchName').value = tagName;
    loadDataSource();
  }
}

// ==============================
// Operator / Game Master Functions
// ==============================

async function loadMgProfiles() {
  const result = await window.electronAPI.dataLoadMgProfiles();
  if (result.success) {
    state.mgProfiles = result.profiles;
    // Try to restore last used profile or set default
    const savedId = localStorage.getItem('activeMgProfileId');
    if (savedId) {
      const profile = state.mgProfiles.find(p => String(p.id) === String(savedId));
      if (profile) setOperator(profile);
    }

    // Also load histories in background
    window.electronAPI.dataLoadFactionHistory().then(r => {
      if (r.success) state.factionHistory = r.history;
    });
    window.electronAPI.dataLoadCharHistory().then(r => {
      if (r.success) state.charHistory = r.history;
    });
    window.electronAPI.dataLoadWorldContext().then(r => {
      if (r.success) state.worldContext = r.context;
    });

  } else {
    addLog('error', 'Błąd ładowania profili MG: ' + result.error);
  }
}

function setOperator(profile) {
  state.activeMgProfile = profile;
  localStorage.setItem('activeMgProfileId', profile.id);

  const widthEl = document.getElementById('currentOperatorName');
  if (widthEl) widthEl.textContent = profile.name;

  addLog('info', `Zmieniono operatora na: ${profile.name}`);
}

window.openOperatorModal = function () {
  const modalId = 'operatorModal';
  let modal = document.getElementById(modalId);

  if (!modal) {
    // Create modal if not exists
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 2000;
        backdrop-filter: blur(5px);
    `;
    modal.innerHTML = `
      <div class="modal-window" style="width: 800px; max-width: 90vw; background: var(--bg-panel); border: 1px solid var(--gold); border-radius: 8px; display: flex; flex-direction: column; height: 600px;">
        <div class="modal-header" style="padding: 15px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; background: var(--bg-dark);">
          <h2 style="margin:0; font-size: 18px; color: var(--gold);">👤 Wybierz Operatora (Mistrza Gry)</h2>
          <button class="btn-icon close-modal" style="background:none; border:none; color: var(--text-muted); cursor: pointer; font-size: 20px;">✕</button>
        </div>
        <div class="modal-content" style="flex: 1; overflow: hidden; padding: 20px;">
          <div class="matrix-grid">
            <div class="matrix-sidebar">
              <div class="matrix-list" id="mgProfileList"></div>
            </div>
            <div class="matrix-details" id="mgProfileDetails" style="overflow-y: auto; padding-right: 10px;">
              <p style="color: var(--text-dim); text-align: center; margin-top: 50px;">Wybierz profil z listy...</p>
            </div>
          </div>
        </div>
        <div class="modal-footer" style="padding: 15px; border-top: 1px solid var(--border); background: var(--bg-dark); display: flex; justify-content: flex-end; gap: 10px;">
          <button class="btn btn-secondary close-modal">Anuluj</button>
          <button class="btn btn-primary" id="btnApplyOperator">Wybierz Operatora</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Close handlers
    modal.querySelectorAll('.close-modal').forEach(b => {
      b.onclick = () => modal.remove();
    });

    modal.querySelector('#btnApplyOperator').onclick = () => {
      const selectedId = modal.dataset.selectedId;
      if (selectedId) {
        const profile = state.mgProfiles.find(p => String(p.id) === String(selectedId));
        if (profile) {
          setOperator(profile);
          modal.remove();
        }
      }
    };
  }

  // Render list
  const listEl = modal.querySelector('#mgProfileList');
  listEl.innerHTML = state.mgProfiles.map(p => `
    <div class="matrix-item ${state.activeMgProfile?.id === p.id ? 'active' : ''}" 
         onclick="renderMgDetails('${p.id}', this)">
      <div style="font-weight: 600;">${p.name}</div>
      <div style="font-size: 11px; color: var(--text-dim);">${p.role || 'MG'}</div>
    </div>
  `).join('');

  // Select current if exists
  if (state.activeMgProfile) {
    // Find the right item
    setTimeout(() => {
      const currentEl = Array.from(listEl.children).find(el => el.textContent.includes(state.activeMgProfile.name));
      if (currentEl) currentEl.click();
    }, 50);
  }
}

window.renderMgDetails = function (id, itemEl) {
  // Update UI active state
  document.querySelectorAll('.matrix-item').forEach(el => el.classList.remove('active'));
  itemEl.classList.add('active');

  const modal = document.getElementById('operatorModal');
  modal.dataset.selectedId = id;

  const profile = state.mgProfiles.find(p => String(p.id) === String(id));
  const detailsEl = modal.querySelector('#mgProfileDetails');

  if (!profile) return;

  // Helper for tags
  const renderTags = (text, cls) => {
    if (!text) return '<span style="color:var(--text-dim)">-</span>';
    return text.split(',').map(t => `<span class="tag ${cls}">${t.trim()}</span>`).join('');
  };

  detailsEl.innerHTML = `
    <h3 style="color: var(--gold); margin-bottom: 20px;">${profile.name} <span style="font-size:12px; color:var(--text-dim)">(${profile.role})</span></h3>
    
    <div class="stat-card">
      <div class="stat-title">💪 Mocne strony</div>
      <div class="tag-cloud">
        ${renderTags(profile.style_strengths, 'positive')}
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-title">⚠️ Słabsze strony (AI pomoże)</div>
      <div class="tag-cloud">
        ${renderTags(profile.style_weaknesses, 'negative')}
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-title">❤️ Preferencje</div>
      <div style="font-size: 13px; line-height: 1.5; color: var(--text-primary);">
        ${profile.preferences || 'Brak danych'}
      </div>
    </div>
  `;
}

// ==============================
// AI Assistant Functions
// ==============================

// Update prompt configuration
function updatePromptConfig(path, value) {
  const keys = path.split('.');
  let target = state.promptConfig;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!target[keys[i]]) {
      target[keys[i]] = {};
    }
    target = target[keys[i]];
  }

  target[keys[keys.length - 1]] = value;
  renderStep(); // Re-render to update UI
}

// Helper: Get optimized system prompt for specific models
function getModelSpecificSystemPrompt(modelName) {
  const name = modelName.toLowerCase();

  // Base instruction for language
  const base = "Jesteś pomocnym asystentem AI. Odpowiadaj zawsze w języku polskim.";

  if (name.includes('qwen')) {
    // Qwen likes its Identity but we can translate it or combine it.
    return "Jesteś Qwen, stworzonym przez Alibaba Cloud. " + base;
  }
  if (name.includes('mistral')) {
    // Mistral safe prompt translated + polish enforcement
    return "Zawsze pomagaj z szacunkiem i zgodnie z prawdą. " + base;
  }

  return base;
}

// Helper: Adjust prompt structure for specific models (Optimized for Ollama)
function applyModelOptimization(promptParts, modelName) {
  const name = modelName.toLowerCase();
  let system = getModelSpecificSystemPrompt(modelName);
  let userContent = '';

  // 1. Build the core content from parts using Polish labels
  if (promptParts.role) system += `\nROLA: ${promptParts.role}`;
  if (promptParts.context) system += `\nKONTEKST: ${promptParts.context}`;
  if (promptParts.dod) system += `\nWYMAGANIA: ${promptParts.dod}`;
  if (promptParts.negative) system += `\nOGRANICZENIA (CZEGO UNIKAĆ): ${promptParts.negative}`;

  if (promptParts.examples) userContent += `PRZYKŁADY (Few-Shot):\n${promptParts.examples}\n\n`;
  if (promptParts.goal) userContent += `CEL/ZADANIE:\n${promptParts.goal}\n\n`;

  if (promptParts.useCoT) {
    userContent += `\nPrzeanalizuj to krok po kroku (Chain of Thought).\n`; // Polish CoT trigger
  }

  // 2. Model specific tweaks

  // Mistral: Better to have system instructions inside [INST] along with user prompt if using raw mode,
  // but since we send to Ollama API which handles templating, we just ensure the content is rich.
  // However, specifically for Mistral, prepending system context to the User message often works better 
  // than relying on the optional 'system' parameter in some API versions.
  if (name.includes('mistral')) {
    return {
      system: null, // Disable separate system message to force prepend
      prompt: `${system}\n\n${userContent}`  // Prepend system to user
    };
  }

  return {
    system: system,
    prompt: userContent
  };
}

// Helper: Build dynamic context based on Operator and Faction History
function buildDynamicContext(profile, commandType) {
  let context = [];

  // 1. Operator Style (Tone & Preferences)
  if (state.activeMgProfile) {
    const mg = state.activeMgProfile;
    context.push(`--- GAME MASTER STYLE (${mg.name}) ---`);
    if (mg.style_strengths) context.push(`STRENGTHS TO LEVERAGE: ${mg.style_strengths}`);
    if (mg.style_weaknesses) context.push(`AREAS TO SUPPORT WITH AI: ${mg.style_weaknesses}`);
    if (mg.preferences) context.push(`PREFERENCES: ${mg.preferences}`);
    context.push('--- DIRECTIVE: Adapt the output to match the Game Master text style and preferences above ---');
  }

  // 2. World Context (Lore, Weaknesses, Plots)
  if (state.worldContext) {
    const { weaknesses, plots, world, factions } = state.worldContext;

    // A. Weakness Analysis (Specific request from user)
    // "Czy wszystkie dokumenty są wykorzystywane odpowiednio? ... jak analziować słabosci"
    const weaknessCommands = ['extract_traits', 'potential_conflicts', 'story_hooks', 'secret', 'redemption_quest'];
    if (weaknessCommands.includes(commandType)) {
      context.push('--- LORE CONTEXT: WEAKNESSES & THREATS ---');
      context.push(weaknesses); // Injects "Słabości i Zagrożenia..."
    }

    // B. Plot & Intrigue Context
    const plotCommands = ['main_quest', 'side_quest', 'group_quest', 'potential_conflicts'];
    if (plotCommands.includes(commandType)) {
      context.push('--- LORE CONTEXT: PLOTS & INTRIGUES ---');
      context.push(plots); // Injects "Intrygi i Ambicje..."
    }

    // C. Faction Context
    const guild = profile['Gildia'] || '';
    if (guild && factions) {
      // Simple heuristic: if guild name is found in faction text, include relevant chunk?
      // For now, let's include the whole Faction System context if command is faction-related
      if (['faction_suggestion', 'main_quest', 'analyze_relations', 'potential_conflicts'].includes(commandType)) {
        context.push('--- LORE CONTEXT: FACTIONS SYSTEM ---');
        context.push(factions);
      }
    }

    // D. General World Context
    if (commandType === 'nickname' || commandType === 'story_hooks') {
      context.push('--- LORE CONTEXT: WORLD & GEOGRAPHY ---');
      context.push(world);
    }
  } else {
    // Fallback if world context not loaded yet
    const guild = profile['Gildia'] || '';
    if (guild && state.factionHistory) {
      let relevantFactionKey = Object.keys(state.factionHistory).find(k =>
        guild.toLowerCase().includes(k.replace('Fabuła ', '').toLowerCase())
      );
      if (relevantFactionKey && state.factionHistory[relevantFactionKey]?.length) {
        context.push(`--- FACTION ROSTER (${relevantFactionKey}) ---`);
        context.push(`(Contains list of ${state.factionHistory[relevantFactionKey].length} members)`);
      }
    }
  }

  return context.join('\n\n');
}

async function runAI(commandType) {
  if (state.aiProcessing) {
    addLog('warn', 'AI już przetwarza poprzednie polecenie...');
    return;
  }

  const profile = state.sheetData?.rows?.[state.selectedRow];
  if (!profile) {
    addLog('error', 'Brak wybranej postaci do przetworzenia.');
    return;
  }

  // Get selected model from UI or use first available
  const modelSelect = document.getElementById('aiModelSelect');
  const selectedModel = modelSelect?.value || state.selectedModel || (state.ollamaModels?.[0]?.name);

  if (!selectedModel) {
    addLog('error', 'Brak modelu AI. Zainstaluj model w Ollama.');
    return;
  }

  const commandLabels = {
    'extract_traits': 'Wyciąganie cech',
    'analyze_relations': 'Analiza relacji',
    'summarize': 'Podsumowanie',
    'main_quest': 'Główny quest',
    'side_quest': 'Quest poboczny',
    'redemption_quest': 'Quest odkupienia',
    'group_quest': 'Quest grupowy',
    'story_hooks': 'Hooki fabularne',
    'potential_conflicts': 'Możliwe konflikty',
    'npc_connections': 'Powiązania z NPC',
    'nickname': 'Generowanie ksywki',
    'faction_suggestion': 'Sugestia frakcji',
    'secret': 'Wymyślanie sekretu'
  };

  addLog('info', `🤖 Uruchamiam AI: ${commandLabels[commandType] || commandType} (model: ${selectedModel})`);

  state.aiProcessing = true;
  state.aiCommand = commandLabels[commandType] || commandType;
  state.aiResult = null;
  renderStep();

  try {
    // Build Dynamic Context (Operator + Faction + Char History)
    const dynamicContext = buildDynamicContext(profile, commandType);

    const optimized = applyModelOptimization({
      role: 'You are an expert Game Master assistant for Gothic RPG.',
      context: `${'Gothic 1 setting, The Colony, dark fantasy atmosphere.'}\n\n${dynamicContext}`,
      dod: 'Keep it consistent with Gothic lore.',
      negative: '',
      examples: '',
      goal: commandLabels[commandType] || commandType,
      useCoT: false
    }, selectedModel);

    const options = {
      model: selectedModel,
      temperature: state.aiTemperature || 0.7,
      promptConfig: state.promptConfig, // Pass prompt configuration
      system: optimized.system // Pass optimized system prompt
    };

    // Note: for standard commands we still depend on backend construction, 
    // but passing 'system' override allows us to influence it.

    const result = await window.electronAPI.aiCommand(commandType, profile, options);

    if (result.success) {
      state.aiResult = result.text || JSON.stringify(result.result, null, 2);

      // Clear isNew flag for all previous items
      state.aiResultsFeed.forEach(item => item.isNew = false);

      // Push new result to feed
      const newItemIndex = state.aiResultsFeed.length;
      state.aiResultsFeed.push({
        id: newItemIndex,
        command: commandLabels[commandType] || commandType,
        content: state.aiResult,
        model: selectedModel,
        timestamp: new Date(),
        isNew: true // Mark for glow animation
      });

      // Save history
      state.promptHistory.push({
        type: 'standard',
        command: commandLabels[commandType] || commandType,
        model: selectedModel,
        prompt: result.prompt,
        response: state.aiResult,
        timestamp: new Date()
      });

      addLog('success', `✓ AI: ${commandLabels[commandType]} zakończone`);

      // Refresh history if visible
      if (state.showPromptHistory) {
        renderPromptHistory();
      }

      // After render, auto-scroll to new card
      setTimeout(() => {
        const newCard = document.getElementById(`ai-card-${newItemIndex}`);
        if (newCard) {
          newCard.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, 100);

    } else {
      state.aiResult = `❌ Błąd: ${result.error}`;
      addLog('error', `AI błąd: ${result.error}`);
    }
  } catch (error) {
    state.aiResult = `❌ Błąd połączenia: ${error.message}`;
    addLog('error', `AI błąd: ${error.message}`);
  }

  state.aiProcessing = false;
  state.aiCommand = null;
  renderStep();
}

// Run custom prompt from user
// Update prompt parts from UI
function updatePromptPart(part, value) {
  if (state.promptParts) {
    state.promptParts[part] = value;
  }
}

// Run custom prompt from user
async function runCustomPrompt() {
  if (state.aiProcessing) {
    addLog('warn', 'AI już przetwarza poprzednie polecenie...');
    return;
  }

  const profile = state.sheetData?.rows?.[state.selectedRow];
  if (!profile) {
    addLog('error', 'Brak wybranej postaci do przetworzenia.');
    return;
  }

  const parts = state.promptParts;
  const hasStructured = parts.role || parts.goal || parts.context || parts.dod;

  if (!hasStructured) {
    addLog('warn', 'Wypełnij przynajmniej jedno pole promptu (Rola, Cel, Kontekst lub DoD).');
    return;
  }

  // Get selected model
  const modelSelect = document.getElementById('aiModelSelect');
  const selectedModel = modelSelect?.value || state.selectedModel || (state.ollamaModels?.[0]?.name);

  if (!selectedModel) {
    addLog('error', 'Brak modelu AI. Zainstaluj model w Ollama.');
    return;
  }

  // Optimize for specific model
  const optimized = applyModelOptimization(parts, selectedModel);

  // Replace {POSTAC} placeholder if present in manually typed goal/context
  const profileData = JSON.stringify(profile, null, 2);
  let finalPrompt = optimized.prompt.replace(/\{POSTAC\}/gi, profileData);

  // If {POSTAC} was NOT used, append profile data
  if (!optimized.prompt.includes('{POSTAC}')) {
    finalPrompt += `\n\nDANE POSTACI:\n${profileData}`;
  }

  addLog('info', `🚀 Uruchomiam własny prompt (model: ${selectedModel})`);

  state.aiProcessing = true;
  state.aiCommand = 'Własny prompt';
  state.aiResult = null;
  renderStep();

  try {
    const options = {
      model: selectedModel,
      temperature: state.aiTemperature || 0.7,
      customPrompt: finalPrompt,
      system: optimized.system // Optimized system prompt
    };

    const result = await window.electronAPI.aiCommand('custom', profile, options);

    if (result.success) {
      state.aiResult = result.text || JSON.stringify(result.result, null, 2);

      // Save history
      state.promptHistory.push({
        type: 'custom',
        command: 'Własny prompt',
        model: selectedModel,
        prompt: result.prompt,
        response: state.aiResult,
        timestamp: new Date()
      });

      addLog('success', '✓ Własny prompt wykonany');

      // Refresh history if visible
      // Refresh history if visible
      if (state.showPromptHistory) {
        renderPromptHistory();
      }
    } else {
      state.aiResult = `❌ Błąd: ${result.error}`;
      addLog('error', `AI błąd: ${result.error}`);
    }
  } catch (error) {
    state.aiResult = `❌ Błąd połączenia: ${error.message}`;
    addLog('error', `AI błąd: ${error.message}`);
  }

  state.aiProcessing = false;
  state.aiCommand = null;
  renderStep();
}




function syncHistoryPanelVisibility() {
  const panel = document.getElementById('globalPromptHistoryPanel');
  if (panel) {
    // Force flex if showPromptHistory is true (matches CSS)
    panel.style.display = state.showPromptHistory ? 'flex' : 'none';
    if (state.showPromptHistory) {
      renderPromptHistory();
    }
  }
}

async function runAllSequentially() {
  if (state.aiProcessing) {
    addLog('warn', 'AI jest zajęte...');
    return;
  }

  // Open history panel to show progress
  state.showPromptHistory = true;
  syncHistoryPanelVisibility(); // NOW we actually show the panel

  // Initialize Queue
  state.executionQueue = [
    'extract_traits', 'analyze_relations', 'summarize',
    'main_quest', 'side_quest', 'redemption_quest', 'group_quest',
    'story_hooks', 'potential_conflicts', 'npc_connections',
    'nickname', 'faction_suggestion', 'secret'
  ];
  state.executionStatus = 'running';

  addLog('info', `🚀 Rozpoczynam sekwencyjne wykonywanie ${state.executionQueue.length} poleceń...`);
  renderStep();

  await processQueue();
}


async function processQueue() {
  while (state.executionQueue.length > 0 && state.executionStatus === 'running') {
    // Safety check navigation
    if (state.currentStep !== 3) {
      state.executionStatus = 'idle';
      state.executionQueue = [];
      break;
    }

    // Get next command
    const cmd = state.executionQueue.shift();
    renderStep(); // Update counter in button

    await runAI(cmd);

    // Check if paused during execution
    if (state.executionStatus === 'paused') {
      addLog('info', '⏸ Wstrzymano wykonywanie kolejki.');
      break;
    }

    // Small delay
    await new Promise(r => setTimeout(r, 500));
  }

  if (state.executionQueue.length === 0) {
    state.executionStatus = 'idle';
    addLog('success', '🏁 Zakończono sekwencyjne wykonywanie poleceń!');
  }

  renderStep();
}

function togglePause() {
  if (state.executionStatus === 'running') {
    state.executionStatus = 'paused';
    renderStep();
  } else if (state.executionStatus === 'paused') {
    state.executionStatus = 'running';
    addLog('info', '▶ Wznawiam wykonywanie kolejki...');
    renderStep();
    processQueue();
  }
}


function copyAIResult() {
  if (!state.aiResult) return;

  navigator.clipboard.writeText(state.aiResult).then(() => {
    addLog('success', '📋 Skopiowano do schowka');
  }).catch(err => {
    addLog('error', `Błąd kopiowania: ${err.message}`);
  });
}

// Helper function for copying specific content to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    addLog('success', '📋 Skopiowano do schowka');
  }).catch(err => {
    addLog('error', `Błąd kopiowania: ${err.message}`);
  });
}

// Helper function for saving a specific result from the feed
function saveSpecificResult(index) {
  const item = state.aiResultsFeed[index];
  if (!item) return;

  // Initialize profile if not exists
  if (!state.profile) {
    state.profile = {};
  }

  // Append AI result to profile
  if (!state.profile.aiGeneratedContent) {
    state.profile.aiGeneratedContent = [];
  }

  state.profile.aiGeneratedContent.push({
    timestamp: item.timestamp.toISOString(),
    command: item.command,
    content: item.content
  });

  addLog('success', `💾 Zapisano wynik "${item.command}" do profilu`);
}

function saveAIResult() {
  if (!state.aiResult) return;

  // Initialize profile if not exists
  if (!state.profile) {
    state.profile = {};
  }

  // Append AI result to profile
  if (!state.profile.aiGeneratedContent) {
    state.profile.aiGeneratedContent = [];
  }

  state.profile.aiGeneratedContent.push({
    timestamp: new Date().toISOString(),
    content: state.aiResult
  });

  addLog('success', '💾 Zapisano do profilu');
}




function togglePromptHistory() {
  state.showPromptHistory = !state.showPromptHistory;
  syncHistoryPanelVisibility();
}


function renderPromptHistory() {
  if (!state.showPromptHistory) return;

  const container = document.getElementById('globalPromptHistoryContent');
  if (!container) return;

  if (!state.promptHistory || state.promptHistory.length === 0) {
    container.innerHTML = '<p style="color: var(--text-dim); font-size: 13px; text-align: center; padding: 20px;">Brak historii. Wykonaj polecenie AI.</p>';
    return;
  }

  container.innerHTML = state.promptHistory.map((item, index) => {
    // Show request and response
    const date = new Date(item.timestamp).toLocaleTimeString();

    // Check if collapsed (default collapsed except last)
    const isExpanded = index === state.promptHistory.length - 1;

    return `
      <div class="history-item" style="margin-bottom: 15px; border-bottom: 1px dashed var(--border-subtle); padding-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
           <span style="color: var(--gold-soft); font-weight: bold; font-size: 13px;">${item.command}</span>
           <span style="color: var(--text-dim); font-size: 11px;">${date} (${item.model})</span>
        </div>
        
        <details ${isExpanded ? 'open' : ''}>
          <summary style="cursor: pointer; font-size: 12px; color: var(--text-muted); margin-bottom: 5px;">Pokaż szczegóły</summary>
          
          <div style="background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px; margin-bottom: 5px;">
             <strong style="font-size: 11px; color: var(--text-dim);">PROMPT:</strong>
             <pre style="white-space: pre-wrap; font-size: 11px; color: var(--text-muted); margin: 5px 0 0 0; max-height: 100px; overflow-y: auto;">${item.prompt.replace(/</g, '&lt;')}</pre>
          </div>
          
          <div>
             <strong style="font-size: 11px; color: var(--text-dim);">RESPONSE:</strong>
             <div style="font-size: 13px; color: var(--text-primary); margin-top: 5px; white-space: pre-wrap;">${item.response.replace(/</g, '&lt;')}</div>
          </div>
        </details>
      </div>
    `;
  }).join('');
}


// ==============================
// Prompt Templates System
// ==============================

function loadPromptTemplates() {
  const stored = localStorage.getItem('mg_prompt_templates');
  state.promptTemplates = stored ? JSON.parse(stored) : [
    { name: 'Kreatywny Opis', parts: { role: 'Pisarz fantasy', goal: 'Opisz wygląd postaci w mrocznym stylu', dod: 'Używaj metafor, max 3 zdania' } },
    { name: 'Generowanie Questu', parts: { role: 'Mistrz Gry', goal: 'Stwórz quest dla postaci', dod: 'Format: Tytuł, Cel, Zagrożenie, Nagroda' } }
  ];
}

window.savePromptTemplate = function () {
  const name = prompt('Podaj nazwę szablonu:');
  if (!name) return;

  const newTemplate = {
    name: name,
    parts: { ...state.promptParts }
  };

  state.promptTemplates.push(newTemplate);
  localStorage.setItem('mg_prompt_templates', JSON.stringify(state.promptTemplates));
  addLog('success', `Zapisano szablon: ${name}`);
  renderStep();
};

window.deletePromptTemplate = function (index) {
  if (confirm('Czy na pewno usunąć ten szablon?')) {
    state.promptTemplates.splice(index, 1);
    localStorage.setItem('mg_prompt_templates', JSON.stringify(state.promptTemplates));
    addLog('info', 'Szablon usunięty');
    renderStep();
  }
};

window.applyPromptTemplate = function (index) {
  const template = state.promptTemplates[index];
  if (template) {
    state.promptParts = { ...template.parts };
    addLog('info', `Załadowano szablon: ${template.name}`);
    renderStep();
  }
};

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
  const input = document.getElementById('searchName');
  const suggestionsPanel = document.getElementById('searchSuggestions');

  if (input && suggestionsPanel && !input.contains(e.target) && !suggestionsPanel.contains(e.target)) {
    suggestionsPanel.style.display = 'none';
  }
});

// Close suggestions on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideSuggestions();
  }
});

function renderProfileDetails(row) {
  if (!row) return '';

  // Helper to safely highlight text
  const h = (text) => highlightText(text || '', row);

  return `
    <div class="card profile-details-card" style="margin-top: 20px; border-left: 4px solid var(--gold-primary); background: linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(30,30,30,0.4) 100%);">
      <div class="profile-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 15px;">
        <div>
          <h3 class="card-title" style="font-size: 20px; margin-bottom: 5px; color: var(--gold-bright); text-shadow: 0 0 10px rgba(255, 215, 0, 0.2);">
            👤 ${h(row['Imie postaci'] || 'Nieznany')}
          </h3>
          <div style="display: flex; gap: 10px; font-size: 12px; color: var(--text-dim);">
            <span class="badge" style="background: var(--bg-dark); border: 1px solid var(--gold-soft); color: var(--gold); padding: 2px 8px; border-radius: 4px;">${h(row['Gildia'] || '-')}</span>
            <span class="badge" style="background: var(--bg-dark); border: 1px solid var(--border); color: var(--text-muted); padding: 2px 8px; border-radius: 4px;">${h(row['Region'] || '-')} / ${h(row['Miejscowosc'] || '-')}</span>
          </div>
        </div>
      </div>
      
      <div class="profile-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <div class="info-block">
           <h4 style="color: var(--gold-soft); font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid var(--border-subtle);">⚔️ Cechy i Umiejętności</h4>
           <p style="font-size: 13px; line-height: 1.5; margin-bottom: 6px;"><strong style="color: var(--text-muted);">Słabości:</strong> ${h(row['Slabosci'] || '-')}</p>
           <p style="font-size: 13px; line-height: 1.5;"><strong style="color: var(--text-muted);">Umiejętności:</strong> ${h(row['Umiejetnosci'] || '-')}</p>
        </div>
        <div class="info-block">
           <h4 style="color: var(--gold-soft); font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid var(--border-subtle);">📍 Lokalizacja</h4>
           <p style="font-size: 13px; line-height: 1.5; margin-bottom: 6px;"><strong style="color: var(--text-muted);">Region:</strong> ${h(row['Region'] || '-')}</p>
           <p style="font-size: 13px; line-height: 1.5;"><strong style="color: var(--text-muted);">Miasto:</strong> ${h(row['Miejscowosc'] || '-')}</p>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h4 style="color: var(--gold-soft); font-size: 12px; display: flex; align-items: center; gap: 8px; margin-bottom: 10px; border-bottom: 1px solid var(--border); padding-bottom: 5px;">
           📜 Historia i Pochodzenie
        </h4>
        <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 6px; border: 1px solid var(--border-subtle); color: var(--text-primary); line-height: 1.6; font-size: 13px; max-height: 300px; overflow-y: auto;">
          ${h(row['O postaci'] || row['Jak zarabiala na zycie, kim byla'] || 'Brak opisu historii.')}
        </div>
      </div>
      
      <div class="profile-lists" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
        ${row['Fakty'] ? `
        <div>
          <h4 style="color: var(--gold-soft); font-size: 12px; margin-bottom: 8px; border-bottom: 1px solid var(--border-subtle);">📋 Fakty</h4>
          <p style="color: var(--text-muted); font-size: 13px; line-height: 1.6;">${h(row['Fakty'])}</p>
        </div>` : ''}

        ${row['Znajomi, przyjaciele i wrogowie'] ? `
        <div>
          <h4 style="color: var(--gold-soft); font-size: 12px; margin-bottom: 8px; border-bottom: 1px solid var(--border-subtle);">👥 Znajomi i Wrogowie</h4>
          <p style="color: var(--text-muted); font-size: 13px; line-height: 1.6;">${h(row['Znajomi, przyjaciele i wrogowie'])}</p>
        </div>` : ''}

        ${row['Wina'] ? `
        <div>
          <h4 style="color: var(--gold-soft); font-size: 12px; margin-bottom: 8px; border-bottom: 1px solid var(--border-subtle);">⚖️ Wina (wyrok)</h4>
          <p style="color: var(--text-muted); font-size: 13px; line-height: 1.6;">${h(row['Wina'])}</p>
        </div>` : ''}

        ${row['Przyszlosc'] ? `
        <div>
          <h4 style="color: var(--gold-soft); font-size: 12px; margin-bottom: 8px; border-bottom: 1px solid var(--border-subtle);">🔮 Przyszłość / Cele</h4>
          <p style="color: var(--text-muted); font-size: 13px; line-height: 1.6;">${h(row['Przyszlosc'])}</p>
        </div>` : ''}
        
        ${row['Questy'] ? `
        <div style="grid-column: 1 / -1;">
          <h4 style="color: var(--gold-soft); font-size: 12px; margin-bottom: 8px; border-bottom: 1px solid var(--border-subtle);">🎯 Questy</h4>
          <p style="color: var(--text-muted); font-size: 13px; line-height: 1.6;">${h(row['Questy'])}</p>
        </div>` : ''}
      </div>

      ${row['Podsumowanie'] ? `
      <div style="margin-top: 20px; padding-top: 15px; border-top: 1px dashed var(--border);">
        <h4 style="color: var(--gold-soft); font-size: 12px; margin-bottom: 8px;">📝 Podsumowanie</h4>
        <p style="color: var(--text-muted); font-size: 13px; line-height: 1.6; font-style: italic;">${h(row['Podsumowanie'])}</p>
      </div>` : ''}

      ${(row['Discord'] || row['Facebook']) ? `
      <div style="margin-top: 20px; display: flex; gap: 15px; font-size: 12px; border-top: 1px solid var(--border-subtle); padding-top: 10px;">
        ${row['Discord'] ? `<span style="color: var(--text-dim);">💬 Discord: <strong style="color: var(--text-muted);">${h(row['Discord'])}</strong></span>` : ''}
        ${row['Facebook'] ? `<span style="color: var(--text-dim);">📘 FB: <a href="${row['Facebook']}" target="_blank" style="color: var(--gold-soft);">Profil</a></span>` : ''}
      </div>` : ''}
    </div>
  `;
}

// ==============================
// API Functions
// ==============================
async function checkOllama() {
  addLog('info', 'Sprawdzam połączenie z Ollama...');
  const result = await window.electronAPI.checkOllama();

  const statusEl = document.getElementById('ollamaStatus');
  if (result.connected) {
    state.ollamaConnected = true;
    state.ollamaModels = result.models;
    statusEl.innerHTML = `<span class="status-dot online"></span> <span>Ollama: online (${result.models.length} modeli)</span>`;
    addLog('success', `Ollama połączone: ${result.models.length} modeli dostępnych`);

    // Update model statuses
    updateModelStatuses();

    // Refresh model lists (to show discovered local models)
    if (state.currentStep === 1 || state.currentStep === 3) {
      renderModelCategories();
      populateModelSelects();
    }
  } else {
    statusEl.innerHTML = `<span class="status-dot offline"></span> <span>Ollama: offline</span>`;
    addLog('error', `Ollama niedostępne: ${result.error} `);
  }
}

function updateModelStatuses() {
  const hasModel = (name) => state.ollamaModels.some(m => m.name === name);

  const status1 = document.getElementById('modelStatus1');
  const status2 = document.getElementById('modelStatus2');

  if (status1) {
    status1.textContent = hasModel('phi4-mini:latest') ? '✓ Zainstalowany' : 'Brak';
    status1.classList.toggle('installed', hasModel('phi4-mini:latest'));
  }
  if (status2) {
    status2.textContent = hasModel('mistral:latest') ? '✓ Zainstalowany' : 'Brak';
    status2.classList.toggle('installed', hasModel('mistral:latest'));
  }
}

// Active downloads tracking
state.activeDownloads = {};

function updateDownloadQueue() {
  let container = document.getElementById('download-queue');
  if (!container) {
    // Create download queue container if it doesn't exist
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
      container = document.createElement('div');
      container.id = 'download-queue';
      container.className = 'download-queue';
      progressBar.parentElement.insertBefore(container, progressBar);
    }
  }
  if (!container) return;

  const downloads = Object.entries(state.activeDownloads);
  if (downloads.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = downloads.map(([modelName, data]) => `
    <div class="download-item" data-model="${modelName}">
      <span class="download-name">${modelName}</span>
      <div class="download-progress-bar">
        <div class="download-progress-fill" style="width: ${data.percent}%"></div>
      </div>
      <span class="download-percent">${data.percent}%</span>
    </div>
  `).join('');
}

async function pullModel(modelName) {
  addLog('info', `Pobieranie modelu ${modelName}...`);

  // Add to active downloads
  state.activeDownloads[modelName] = { percent: 0, status: 'starting' };
  updateDownloadQueue();

  const result = await window.electronAPI.pullModel(modelName);

  // Remove from active downloads
  delete state.activeDownloads[modelName];
  updateDownloadQueue();

  if (result.success) {
    addLog('success', `Model ${modelName} pobrany`);
    await checkOllama(); // Refresh model list
  } else {
    addLog('error', `Błąd pobierania: ${result.error}`);
  }
}

async function loadDataSource() {
  const source = document.getElementById('dataSource')?.value || 'larpgothic';
  const searchName = document.getElementById('searchName')?.value || '';

  addLog('info', `Ładowanie danych z: ${source}...`);
  setProgress(0, 'Ładowanie...');

  let result;

  if (source === 'larpgothic') {
    // Use cached data if available for local filtering
    if (state.allProfiles.length > 0) {
      addLog('info', 'Używam pobranej bazy do lokalnego filtrowania...');
      const query = searchName.toLowerCase();

      const filtered = state.allProfiles.filter(p => {
        if (!query) return true;
        return (p['Imie postaci']?.toLowerCase().includes(query)) ||
          (p['Gildia']?.toLowerCase().includes(query)) ||
          (p['Region']?.toLowerCase().includes(query));
      });

      result = { success: true, rows: filtered };
      await new Promise(r => setTimeout(r, 200)); // Brief delay for UX
    } else {
      // Fallback to API if cache empty
      const search = searchName ? { name: searchName } : {};
      result = await window.electronAPI.fetchLarpGothic(search);
    }
  } else if (source === 'sheets') {
    result = await window.electronAPI.fetchSheets();
  } else {
    addLog('warn', 'Lokalne pliki - nie zaimplementowano');
    return;
  }

  if (result.success) {
    state.sheetData = result;
    addLog('success', `Załadowano/przefiltrowano ${result.rows.length} wierszy`);
    setProgress(100, 'Dane gotowe');

    // Navigate to extraction step if data loaded
    if (result.rows.length > 0) {
      state.currentStep = 2;
      renderStep();
    } else {
      addLog('warn', 'Brak wyników dla podanego wyszukiwania.');
    }
  } else {
    addLog('error', `Błąd ładowania: ${result.error || 'Nieznany błąd'}`);
  }
}

// Sorting functions
function getSortedRows() {
  if (!state.sheetData || !state.sheetData.rows) return [];

  // Add original index to each row for proper selection
  const rowsWithIndex = state.sheetData.rows.map((row, i) => ({ ...row, _originalIndex: i }));

  return rowsWithIndex.sort((a, b) => {
    let valA, valB;

    switch (state.sortBy) {
      case 'name':
        valA = (a['Imie postaci'] || '').toLowerCase();
        valB = (b['Imie postaci'] || '').toLowerCase();
        break;
      case 'guild':
        valA = (a['Gildia'] || '').toLowerCase();
        valB = (b['Gildia'] || '').toLowerCase();
        break;
      case 'region':
        valA = (a['Region'] || '').toLowerCase();
        valB = (b['Region'] || '').toLowerCase();
        break;
      default:
        valA = a['Imie postaci'] || '';
        valB = b['Imie postaci'] || '';
    }

    if (state.sortDir === 'asc') {
      return valA.localeCompare(valB, 'pl');
    } else {
      return valB.localeCompare(valA, 'pl');
    }
  });
}

function sortData(column) {
  if (state.sortBy === column) {
    // Toggle direction
    state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    state.sortBy = column;
    state.sortDir = 'asc';
  }
  renderStep();
}

function selectRow(index) {
  state.selectedRow = index;
  renderStep();
  addLog('info', `Wybrano postać: ${state.sheetData.rows[index]['Imie postaci'] || 'bez nazwy'}`);
}

async function processAI() {
  if (!state.selectedRow === null) {
    addLog('warn', 'Najpierw wybierz postać w kroku 2');
    return;
  }

  state.isProcessing = true;
  renderStep();

  const lanes = ['historia', 'relacje', 'aspiracje', 'slabosci', 'umiejetnosci', 'geolore'];

  for (let i = 0; i < lanes.length; i++) {
    const lane = lanes[i];
    const el = document.getElementById(`lane - ${lane} `);
    if (el) {
      el.classList.add('processing');
      el.querySelector('.lane-status').textContent = 'Przetwarzam...';
    }

    addLog('info', `[${i + 1}/${lanes.length}]Przetwarzam: ${lane}`);
    setProgress(Math.round((i / lanes.length) * 100), `Analizuję: ${lane}`);

    const result = await window.electronAPI.processLane(lane, state.sheetData?.rows[state.selectedRow]);

    if (result.success) {
      if (!state.laneResults) state.laneResults = [];
      state.laneResults.push(result);

      // Save extraction history
      state.promptHistory.push({
        type: 'extraction',
        command: `Ekstrakcja: ${lane}`,
        model: 'extraction',
        prompt: result.prompt,
        response: typeof result.result === 'object' ? JSON.stringify(result.result, null, 2) : result.result,
        timestamp: new Date()
      });

      // Refresh history if visible
      if (state.showPromptHistory) {
        renderPromptHistory();
      }
    }

    if (el) {
      el.classList.remove('processing');
      el.classList.add('done');
      el.querySelector('.lane-status').textContent = 'Gotowe';
    }
  }

  // Reduce profile
  const reduceResult = await window.electronAPI.reduceProfile(state.laneResults);
  state.profile = reduceResult.profile;

  state.isProcessing = false;
  setProgress(100, 'AI Processing zakończone');
  addLog('success', 'Wszystkie ścieżki przetworzone');
}

async function generateQuests() {
  addLog('info', 'Generowanie questów...');
  setProgress(0, 'Generowanie questów...');

  const result = await window.electronAPI.generateQuests(state.profile);
  state.quests = result.quests;

  setProgress(100, 'Questy wygenerowane');
  addLog('success', `Wygenerowano ${state.quests.length} questów`);
  renderStep();
}

async function exportResults() {
  addLog('info', 'Eksportowanie wyników...');

  const result = await window.electronAPI.renderCards(state.profile, state.quests);

  if (result.success) {
    addLog('success', `Wyeksportowano do: ${result.outputPath}`);
  }
}

async function openOutputFolder() {
  await window.electronAPI.openOutputFolder();
}

function editProfile() {
  addLog('info', 'Edycja profilu - funkcja w trakcie implementacji');
  // TODO: Implement profile editor modal
}

// ==============================
// Navigation
// ==============================
document.getElementById('btnNext').addEventListener('click', () => {
  if (state.currentStep < state.totalSteps) {
    state.currentStep++;
    renderStep();
  }
});

document.getElementById('btnPrev').addEventListener('click', () => {
  if (state.currentStep > 1) {
    const previousStep = state.currentStep;
    state.currentStep--;

    // Odśwież krok 2 gdy użytkownik się cofa - resetuj wybór i dane AI
    if (state.currentStep === 2) {
      state.selectedRow = null;
      state.aiResult = null;
      state.aiProcessing = false;
      addLog('info', 'Powrót do ekstrakcji - widok odświeżony');
    }

    renderStep();
  }
});

// Sidebar clicks
document.querySelectorAll('.step-item').forEach(el => {
  el.addEventListener('click', () => {
    const step = parseInt(el.dataset.step);
    if (step <= state.currentStep + 1) { // Allow going forward one step or back
      const previousStep = state.currentStep;
      state.currentStep = step;

      // Odśwież krok 2 gdy użytkownik nawiguje do niego - resetuj wybór i dane AI
      if (state.currentStep === 2 && previousStep !== 2) {
        state.selectedRow = null;
        state.aiResult = null;
        state.aiProcessing = false;
        addLog('info', 'Nawigacja do ekstrakcji - widok odświeżony');
      }

      renderStep();
    }
  });
});

// ==============================
// Initialization
// ==============================
async function init() {
  // Get trace ID
  state.traceId = await window.electronAPI.getTraceId();
  document.getElementById('traceId').textContent = state.traceId.slice(-12);

  // Load all character names for auto-linking
  try {
    const namesResult = await window.electronAPI.getAllCharacterNames();
    if (namesResult.success) {
      state.allCharacterNames = namesResult.names;
      // Create persistent History Panel
      const historyPanel = document.createElement('div');
      historyPanel.id = 'globalPromptHistoryPanel';
      historyPanel.className = 'card';
      historyPanel.style.display = 'none';
      historyPanel.style.marginTop = '20px';
      historyPanel.style.border = '1px solid var(--border)';
      historyPanel.style.background = 'var(--bg-dark)';
      historyPanel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
      <h3 class="card-title" style="margin: 0;">📜 Historia Promptów</h3>
      <button class="btn btn-sm" onclick="togglePromptHistory()" title="Zamknij" style="padding: 4px 10px; font-size: 16px;">✕</button>
    </div>
    <div id="globalPromptHistoryContent" style="max-height: 500px; overflow-y: auto; padding-right: 5px;"></div>
  `;

      // Insert after stepContent
      const stepContent = document.getElementById('stepContent');
      if (stepContent && stepContent.parentNode) {
        stepContent.parentNode.insertBefore(historyPanel, stepContent.nextSibling);
      }

      addLog('info', `Załadowano ${state.allCharacterNames.length} imion do linkowania.`);
    }
  } catch (e) {
    console.error('Failed to load character names', e);
  }

  // Check if Ollama is installed
  await checkOllamaSetup();

  // Check Ollama connection
  await checkOllama();

  // Auto-fetch LarpGothic profiles in background
  preloadData();

  // Setup logs panel toggle
  const btnToggleLogs = document.getElementById('btnToggleLogs');
  const logPanel = document.getElementById('logPanel');
  const logContent = document.getElementById('logContent');

  if (btnToggleLogs && logPanel && logContent) {
    btnToggleLogs.addEventListener('click', () => {
      const isCollapsed = logPanel.classList.toggle('collapsed');
      btnToggleLogs.textContent = isCollapsed ? '▲' : '▼';
      logContent.style.display = isCollapsed ? 'none' : 'block';
    });
  }

  // Listen for progress events
  window.electronAPI.onProgress((data) => {
    setProgress(data.progress, data.message);
  });

  // Listen for log events
  window.electronAPI.onLog((data) => {
    addLog(data.level, data.message);
  });

  // Listen for Ollama install status
  window.electronAPI.onOllamaInstallStatus((data) => {
    addLog('info', `[Installer] ${data.message} `);
    const statusEl = document.getElementById('ollama-setup-status');
    if (statusEl) statusEl.textContent = data.message;
  });

  window.electronAPI.onOllamaInstallProgress((data) => {
    setProgress(data.percent, `Pobieranie Ollama: ${data.percent}% `);
    const progressEl = document.getElementById('ollama-setup-progress');
    if (progressEl) progressEl.style.width = `${data.percent}% `;
  });

  // Listen for model pull progress
  window.electronAPI.onModelPullProgress((data) => {
    // Update individual download progress
    if (state.activeDownloads[data.modelName]) {
      state.activeDownloads[data.modelName].percent = data.percent;
      state.activeDownloads[data.modelName].status = data.status;
      updateDownloadQueue();
    }
    addLog('info', `Pull: ${data.percent}% - ${data.status || ''}`);
  });

  // Render initial step
  renderStep();
  addLog('info', 'Aplikacja gotowa');
}

// ... (Ollama Setup Helper functions omitted for brevity if unchanged, but included in previous context) ...

// Updated Render Profile Details to linkify text
// Initial CSS injection for the profile view
// Initial CSS injection for the profile view
const profileStyles = document.createElement('style');
profileStyles.textContent = `
  /* Main Grid Container */
  .profile-grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    grid-gap: 25px;
    padding: 20px;
    opacity: 0;
    animation: fade-in-up 0.6s ease-out forwards;
  }

  /* Entrance Animation */
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Card Base Style */
  .profile-card {
    background: var(--bg-card); /* Fallback */
    background: linear-gradient(145deg, rgba(30, 30, 35, 0.9), rgba(20, 20, 25, 0.95));
    border: 1px solid var(--border-subtle);
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    backdrop-filter: blur(10px);
  }

  .profile-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(0,0,0,0.5);
    border-color: var(--gold-soft);
  }

  /* Card Header styling */
  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 215, 0, 0.1);
  }

  .card-title {
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--gold-bright);
    font-weight: 600;
    margin: 0;
  }

  .card-icon {
    font-size: 16px;
  }

  /* Card Content */
  .card-content {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-primary);
    flex: 1;
  }

  /* Specific Areas */
  .area-hero { grid-column: span 12; }
  .area-story { grid-column: span 8; }
  .area-facts { grid-column: span 4; }
  .area-traits { grid-column: span 6; }
  .area-goals { grid-column: span 6; }
  .area-relations { grid-column: span 6; }
  .area-crime { grid-column: span 6; }

  /* Hero Card Specifics */
  .hero-card {
    background: linear-gradient(90deg, rgba(255, 215, 0, 0.05), transparent);
    border-left: 4px solid var(--gold);
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .hero-name {
    font-size: 28px;
    font-weight: 700;
    color: var(--gold-bright);
    margin: 0;
    text-shadow: 0 2px 10px rgba(255, 215, 0, 0.2);
  }
  
  .hero-sub {
    color: var(--text-dim);
    font-size: 13px; 
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .hero-meta {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  /* Tags/Badges */
  .c-tag {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .tag-guild { background: rgba(184, 138, 43, 0.2); color: #ffd700; border: 1px solid rgba(184, 138, 43, 0.4); }
  .tag-region { background: rgba(255, 255, 255, 0.05); color: #aaa; border: 1px solid rgba(255, 255, 255, 0.1); }
  .tag-crime { background: rgba(255, 50, 50, 0.15); color: #ff6b6b; border: 1px solid rgba(255, 50, 50, 0.3); }

  /* Crime Card Specifics */
  .crime-card {
    background: linear-gradient(145deg, rgba(40, 20, 20, 0.9), rgba(30, 20, 20, 0.95));
    border-color: rgba(255, 50, 50, 0.2);
  }
  .crime-card:hover { border-color: #ff6b6b; }

  /* List Styling (Relations/Facts) */
  .styled-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .styled-list li {
    position: relative;
    padding-left: 15px;
    margin-bottom: 6px;
    color: var(--text-muted);
  }
  .styled-list li::before {
    content: "•";
    color: var(--gold-soft);
    position: absolute;
    left: 0;
    top: 0px;
  }

  /* Trait Sections */
  .trait-section {
    margin-bottom: 12px;
  }
  .trait-label {
    font-size: 11px;
    color: var(--text-dim);
    text-transform: uppercase;
    margin-bottom: 4px;
    display: block;
  }
  .trait-text {
    font-size: 13px;
    color: var(--text-primary);
  }

  /* Responsive Adjustments */
  @media (max-width: 1200px) {
    .area-story { grid-column: span 12; }
    .area-facts { grid-column: span 12; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  }
  @media (max-width: 800px) {
    .profile-grid { grid-template-columns: 1fr; }
    /* Reset all spans to 1 column */
    .area-hero, .area-story, .area-facts, .area-traits, .area-goals, .area-relations, .area-crime { grid-column: span 1; }
    .area-facts { display: block; }
    .hero-card { flex-direction: column; align-items: flex-start; gap: 10px; }
    .hero-meta { justify-content: flex-start; }
  }
`;
document.head.appendChild(profileStyles);

// Updated Render Profile Details with FULL Data Coverage
window.renderProfileDetails = function (profile) {
  if (!profile) return '';

  const getVal = (key, fallback = '-') => {
    const val = profile[key];
    return (val && val !== 'NULL' && val.trim() !== '') ? val : fallback;
  };

  // Basic Info
  const name = getVal('Imie postaci', 'Bez imienia');
  const guild = getVal('Gildia', 'Bez gildii');
  const region = getVal('Region', 'Region nieznany');
  const city = getVal('Miejscowosc', '');
  const id = profile['id'] || '?';

  // Thematic
  const crime = getVal('Wina (za co skazany)', getVal('Wina')); // Try both keys
  const crimeText = highlightText(crime === '-' ? 'Brak danych o wyroku' : crime, '');

  // Narrative
  const story = highlightText(getVal('O postaci', 'Brak historii.'), '');
  const profession = getVal('Jak zarabiala na zycie, kim byla', '');

  // Details
  const facts = highlightText(getVal('Fakty', ''), '');
  const relations = highlightText(getVal('Znajomi, przyjaciele i wrogowie', 'Brak danych'), '');
  const goals = highlightText(getVal('Przyszlosc', 'Brak sprecyzowanych planów'), '');

  // Traits
  const talents = highlightText(getVal('Umiejetnosci', 'Brak danych'), '');
  const weaknesses = highlightText(getVal('Slabosci', 'Brak danych'), '');

  // Combine profession into story if exists
  let mainStoryHtml = `<p>${story}</p>`;
  if (profession && profession !== '-') {
    mainStoryHtml = `
      <div style="margin-bottom:12px; padding-bottom:12px; border-bottom:1px dashed var(--border-subtle);">
        <strong style="color:var(--gold-soft); font-size:12px; text-transform:uppercase;">📅 Teraźniejszość / Zajęcie</strong>
        <p style="margin-top:4px;">${highlightText(profession, '')}</p>
      </div>
      <strong style="color:var(--gold-soft); font-size:12px; text-transform:uppercase;">📜 Historia</strong>
      ${mainStoryHtml}
    `;
  }

  // Helper for facts list
  const renderList = (text) => {
    if (!text || text === '-') return '<p class="text-muted">Brak danych.</p>';
    const items = text.split('. ').filter(f => f.trim().length > 3);
    if (items.length <= 1) return `<p>${text}</p>`;
    return `<ul class="styled-list">${items.map(f => `<li>${f.trim().endsWith('.') ? f : f + '.'}</li>`).join('')}</ul>`;
  };

  return `
    <div class="profile-grid">
      
      <!-- HERO CARD (Top) -->
      <div class="profile-card hero-card area-hero">
        <div>
          <h2 class="hero-name">${name}</h2>
          <div class="hero-sub">
             <span>🆔 ${id}</span>
             ${city ? `<span>🏘️ ${city}</span>` : ''}
          </div>
        </div>
        <div class="hero-meta">
          <span class="c-tag tag-guild">🛡️ ${guild}</span>
          <span class="c-tag tag-region">🌍 ${region}</span>
        </div>
      </div>

      <!-- STORY CARD (Main Content) -->
      <div class="profile-card area-story" style="animation-delay: 0.1s;">
        <div class="card-header">
          <span class="card-icon">📖</span>
          <h3 class="card-title">Opowieść</h3>
        </div>
        <div class="card-content">
          ${mainStoryHtml}
        </div>
      </div>

      <!-- FACTS CARD (Side Content) -->
      <div class="profile-card area-facts" style="animation-delay: 0.15s;">
        <div class="card-header">
          <span class="card-icon">💡</span>
          <h3 class="card-title">Fakty</h3>
        </div>
        <div class="card-content">
           ${renderList(facts)}
        </div>
      </div>

      <!-- TRAITS CARD -->
      <div class="profile-card area-traits" style="animation-delay: 0.2s;">
        <div class="card-header">
          <span class="card-icon">⭐</span>
          <h3 class="card-title">Cechy i Umiejętności</h3>
        </div>
        <div class="card-content">
           <div class="trait-section">
             <span class="trait-label" style="color:#77ff77;">✨ Umiejętności</span>
             <div class="trait-text">${talents}</div>
           </div>
           <div class="trait-section" style="margin-top:15px;">
             <span class="trait-label" style="color:#ff7777;">⚠️ Słabości</span>
             <div class="trait-text">${weaknesses}</div>
           </div>
        </div>
      </div>

      <!-- GOALS CARD -->
      <div class="profile-card area-goals" style="animation-delay: 0.25s;">
        <div class="card-header">
          <span class="card-icon">🎯</span>
          <h3 class="card-title">Przyszłość i Cele</h3>
        </div>
        <div class="card-content">
          ${goals}
        </div>
      </div>

      <!-- RELATIONS CARD -->
      <div class="profile-card area-relations" style="animation-delay: 0.3s;">
        <div class="card-header">
          <span class="card-icon">🤝</span>
          <h3 class="card-title">Relacje</h3>
        </div>
        <div class="card-content">
          ${relations}
        </div>
      </div>

      <!-- CRIME CARD (Thematic) -->
      <div class="profile-card crime-card area-crime" style="animation-delay: 0.35s;">
        <div class="card-header">
          <span class="card-icon">⚖️</span>
          <h3 class="card-title" style="color:#ff8888;">Wina (Wyrok)</h3>
        </div>
        <div class="card-content">
          <div style="display:flex; justify-content:space-between; align-items:center;">
             <span style="font-style:italic;">"${crimeText}"</span>
             <span class="c-tag tag-crime" style="margin-left:10px; white-space:nowrap;">Skazaniec</span>
          </div>
        </div>
      </div>

    </div>
  `;
}

// Updated Linkify to use state.allCharacterNames
// Updated Linkify to use single-pass regex (prevent nesting)
function linkifyNames(text, excludeName = '') {
  // 1. Get names source
  const sourceNames = state.allCharacterNames || (state.sheetData?.rows?.map(p => p['Imie postaci']));
  if (!sourceNames || sourceNames.length === 0) return text;

  // 2. Cache sorted names (longest first)
  if (!state.sortedGlobalNamesCache && state.allCharacterNames) {
    state.sortedGlobalNamesCache = state.allCharacterNames
      .filter(n => n && n.length > 2)
      .sort((a, b) => b.length - a.length); // Sort by length DESC
  }

  // 3. Prepare list for regex
  const namesList = state.sortedGlobalNamesCache || sourceNames.filter(n => n && n.length > 2).sort((a, b) => b.length - a.length);

  // Filter out the excluded name
  const filteredNames = excludeName
    ? namesList.filter(n => n.toLowerCase() !== excludeName.toLowerCase())
    : namesList;

  if (filteredNames.length === 0) return text;

  // 4. Create a single master regex.
  // Escape special regex chars in names
  const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = filteredNames.map(escapeRegExp).join('|');

  // Regex explains:
  // (?<![\w\u00C0-\u017F])  -> Negative lookbehind: Not preceded by a word char (supports PL chars)
  // (${pattern})            -> Capture group 1: The name itself
  // (?![\w\u00C0-\u017F])   -> Negative lookahead: Not followed by a word char
  // (?![^<]*>)              -> Lookahead: Not followed by closing '>' without opening '<' (simple check for "not inside tag")

  // NOTE: (?![^<]*>) protects against matching inside standard HTML attributes/tags in most simple cases.
  // It checks that there isn't a closing '>' ahead of us that doesn't have an opening '<' before it.

  try {
    const regex = new RegExp(`(?<![\\w\\u00C0-\\u017F])(${pattern})(?![\\w\\u00C0-\\u017F])(?![^<]*>)`, 'gi');

    return text.replace(regex, (match) => {
      // Clean match for argument passing
      const safeMatch = match.replace(/'/g, "\\'");
      return `<span class="char-link" onclick="event.stopPropagation(); openCharacterOverlay('${safeMatch}')">${match}</span>`;
    });
  } catch (e) {
    console.error("Regex error in linkifyNames", e);
    return text; // Fallback to raw text if regex fails (e.g. too complex)
  }
}

// Async Open Character Overlay
async function openCharacterOverlay(name) {
  if (!name) return;

  // Try to find in current sheetData first (fastest)
  let profile = state.sheetData?.rows?.find(p => p['Imie postaci']?.toLowerCase() === name.toLowerCase());

  let isFetching = false;

  if (!profile) {
    // Not found locally. Show loading overlay.
    isFetching = true;
    // create placeholder profile for loading state
    profile = { 'Imie postaci': name, 'Gildia': 'Ładowanie...', 'O postaci': 'Pobieranie danych...' };
  }

  // Remove existing
  closeCharacterOverlay();

  // Create Overlay Elements
  const overlay = document.createElement('div');
  overlay.id = 'charOverlay';
  overlay.className = 'character-overlay';

  // Function to render content with robust key checking
  const renderOverlayContent = (p) => {
    const pName = p['Imie postaci'] || p['name'] || p['Imie'] || 'Nieznana';
    const pGuild = p['Gildia'] || p['guild'] || 'Nieznana';
    const pStory = p['O postaci'] || p['about'] || p['history'];
    const pFacts = p['Fakty'] || p['facts'];
    const pId = p['id'] || '?';
    const pRegion = p['Region'] || p['region'] || '-';

    return `
      <div class="overlay-header" id="overlayHeader">
        <div class="overlay-title">
           <span>👤</span> ${pName} <span style="font-weight:normal; color:var(--text-dim); font-size:11px;">(${pGuild})</span>
        </div>
        <div class="overlay-close" onclick="closeCharacterOverlay()">✕</div>
      </div>
      <div class="overlay-content" id="overlayBody">
        ${pStory ? `
        <div class="overlay-section">
           <h4>Historia</h4>
           <div>${highlightText(pStory, '')}</div>
        </div>` : ''}
        ${pFacts ? `
        <div class="overlay-section">
           <h4>Fakty</h4>
           <div>${highlightText(pFacts, '')}</div>
        </div>` : ''}
        <div style="font-size: 11px; color: var(--text-dim); margin-top: 10px;">
           ID: ${pId} | Region: ${pRegion}
        </div>
      </div>
    `;
  };

  overlay.innerHTML = renderOverlayContent(profile);
  document.body.appendChild(overlay);

  // Setup Dragging
  const setupDrag = () => {
    const header = document.getElementById('overlayHeader');
    if (!header) return;
    let isDragging = false;
    let offset = { x: 0, y: 0 };
    header.onmousedown = function (e) {
      isDragging = true;
      offset.x = overlay.offsetLeft - e.clientX;
      offset.y = overlay.offsetTop - e.clientY;
    };
    document.onmousemove = function (e) {
      if (isDragging) {
        e.preventDefault();
        overlay.style.left = (e.clientX + offset.x) + 'px';
        overlay.style.top = (e.clientY + offset.y) + 'px';
      }
    };
    document.onmouseup = function () { isDragging = false; };
  }
  setupDrag();

  // If we were fetching, do the call now
  if (isFetching) {
    try {
      const apiResult = await window.electronAPI.getProfileByName(name);
      if (apiResult.success && apiResult.profile) {
        // Update overlay with real data
        overlay.innerHTML = renderOverlayContent(apiResult.profile);
        setupDrag(); // Re-attach drag listeners to new header
      } else {
        const body = document.getElementById('overlayBody');
        if (body) body.innerHTML = `<p style="color: var(--text-muted);">Nie znaleziono szczegółowych danych tej postać w bazie.</p>`;
      }
    } catch (e) {
      const body = document.getElementById('overlayBody');
      if (body) body.innerHTML = `<p style="color: var(--warning);">Błąd pobierania danych: ${e.message}</p>`;
    }
  }
}

function closeCharacterOverlay() {
  const overlay = document.getElementById('charOverlay');
  if (overlay) overlay.remove();
}

// ==============================
// Ollama Setup Check
// ==============================
async function checkOllamaSetup() {
  addLog('info', 'Sprawdzam instalację Ollama...');

  const { installed, running } = await window.electronAPI.checkOllamaInstalled();

  if (!installed) {
    addLog('warn', 'Ollama nie jest zainstalowana');
    showOllamaSetupModal();
    return false;
  }

  if (!running) {
    addLog('info', 'Ollama zainstalowana, uruchamiam serwis...');
    await window.electronAPI.startOllama();
  }

  addLog('success', 'Ollama gotowa');
  return true;
}

function showOllamaSetupModal() {
  const modal = document.createElement('div');
  modal.id = 'ollama-setup-modal';
  modal.innerHTML = `
      < div class="setup-modal-backdrop" >
        <div class="setup-modal">
          <div class="setup-modal-header">
            <span class="setup-icon">🦙</span>
            <h2>Instalacja Ollama</h2>
          </div>
          <div class="setup-modal-body">
            <p>Ollama jest wymagana do działania Agent MG.<br>Kliknij poniżej aby automatycznie zainstalować.</p>

            <div class="setup-progress-container" style="display: none;">
              <div class="setup-progress-bar">
                <div class="setup-progress-fill" id="ollama-setup-progress"></div>
              </div>
              <p id="ollama-setup-status" class="setup-status">Przygotowywanie...</p>
            </div>

            <div id="setup-buttons">
              <button class="btn btn-primary" id="btn-install-ollama">
                📥 Zainstaluj Ollama
              </button>
              <a href="https://ollama.com/download" target="_blank" class="btn btn-secondary">
                Pobierz ręcznie
              </a>
            </div>
          </div>
        </div>
    </div >
      `;
  document.body.appendChild(modal);

  // Add event listener after element is in DOM
  document.getElementById('btn-install-ollama').addEventListener('click', installOllama);
}

async function installOllama() {
  const buttonsEl = document.getElementById('setup-buttons');
  const progressEl = document.querySelector('.setup-progress-container');

  if (buttonsEl) buttonsEl.style.display = 'none';
  if (progressEl) progressEl.style.display = 'block';

  addLog('info', 'Rozpoczynam instalację Ollama...');

  const result = await window.electronAPI.installOllama();

  if (result.success) {
    addLog('success', 'Ollama zainstalowana pomyślnie!');
    const modal = document.getElementById('ollama-setup-modal');
    if (modal) modal.remove();
    await checkOllama();
  } else {
    addLog('error', `Błąd instalacji: ${result.error} `);
    const statusEl = document.getElementById('ollama-setup-status');
    if (statusEl) statusEl.textContent = `Błąd: ${result.error} `;
    if (buttonsEl) buttonsEl.style.display = 'flex';
    if (progressEl) progressEl.style.display = 'none';
  }
}

// Add modal styles
const setupStyles = document.createElement('style');
setupStyles.textContent = `
      .setup - modal - backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align - items: center;
      justify - content: center;
      z - index: 1000;
    }
  .setup - modal {
      background: var(--bg - panel);
      border: 1px solid var(--border);
      border - radius: 16px;
      padding: 40px;
      max - width: 450px;
      text - align: center;
      box - shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }
  .setup - modal - header {
      margin - bottom: 25px;
    }
  .setup - icon {
      font - size: 48px;
      display: block;
      margin - bottom: 15px;
    }
  .setup - modal h2 {
      color: var(--gold - bright);
      margin: 0;
      font - size: 1.5em;
    }
  .setup - modal - body p {
      color: var(--text - muted);
      margin - bottom: 25px;
      line - height: 1.6;
    }
    #setup - buttons {
      display: flex;
      gap: 15px;
      justify - content: center;
    }
  .setup - progress - container {
      margin - bottom: 20px;
    }
  .setup - progress - bar {
      height: 10px;
      background: var(--bg - dark);
      border - radius: 5px;
      overflow: hidden;
      margin - bottom: 10px;
    }
  .setup - progress - fill {
      height: 100 %;
      width: 0 %;
      background: linear - gradient(90deg, var(--gold - soft), var(--gold - bright));
      transition: width 0.3s;
    }
  .setup - status {
      font - size: 13px;
      color: var(--text - dim);
    }
    `;
document.head.appendChild(setupStyles);

// Make functions available globally for onclick handlers
window.installOllama = installOllama;
window.filterModelsByVram = filterModelsByVram;
window.toggleCategory = toggleCategory;
window.pullModel = pullModel;
window.checkOllama = checkOllama;
window.loadDataSource = loadDataSource;
window.selectRow = selectRow;
window.sortData = sortData;
window.editProfile = editProfile;
window.generateQuests = generateQuests;
window.exportResults = exportResults;
window.openOutputFolder = openOutputFolder;
window.handleSearchInput = handleSearchInput;
window.renderProfileDetails = renderProfileDetails;
window.showSettings = showSettings;
window.showTestbench = showTestbench;
window.selectSuggestion = selectSuggestion;
window.searchByTag = searchByTag;
// AI Assistant functions
window.runAI = runAI;
window.runCustomPrompt = runCustomPrompt;
window.updatePromptPart = updatePromptPart;
window.copyAIResult = copyAIResult;
window.saveAIResult = saveAIResult;
window.copyToClipboard = copyToClipboard;
window.saveSpecificResult = saveSpecificResult;
window.runExcelSearch = runExcelSearch;

async function runExcelSearch() {
  const profile = state.sheetData?.rows?.[state.selectedRow];
  if (!profile) return;

  const characterName = profile['Imie postaci'];
  const btn = document.getElementById('btnExcelSearch');
  const status = document.getElementById('excelSearchStatus');
  const resultsContainer = document.getElementById('excelSearchResults');

  if (btn) btn.disabled = true;
  if (status) status.innerHTML = '<span class="spinner" style="width: 12px; height: 12px; display: inline-block; border-width: 2px;"></span> Szukanie...';
  if (resultsContainer) {
    resultsContainer.style.display = 'none';
    resultsContainer.innerHTML = '';
  }

  addLog('info', `Rozpoczynam szukanie wzmianek o: ${characterName}`);

  try {
    const response = await window.electronAPI.searchExcelMentions(characterName);

    if (response.success) {
      const results = response.results || [];
      addLog('success', `Znaleziono ${results.length} wzmianek.`);

      if (status) status.textContent = `Znaleziono: ${results.length}`;
      if (resultsContainer) {
        resultsContainer.style.display = 'block';
        if (results.length === 0) {
          resultsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">Brak wzmianek w innych podsumowaniach.</p>';
        } else {
          resultsContainer.innerHTML = `
            <div style="max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;">
              ${results.map(r => `
                <div style="background: var(--bg-dark); padding: 10px; border-radius: 6px; border: 1px solid var(--border-subtle);">
                  <div style="font-weight: bold; color: var(--gold-soft); margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 5px;">
                    <span class="source-link" onclick="openCharacterOverlay('${r.sourceName.replace(/'/g, "\\'")}')" title="Pokaż kartę postaci">
                       👤 ${r.sourceName}
                    </span>
                    <span style="color: var(--text-dim); font-weight: normal; font-size: 11px;">(w polu: ${r.field})</span>
                  </div>
                  <div style="font-size: 12px; color: var(--text-primary); line-height: 1.4;">
                    "...${highlightText(r.context, characterName)}..."
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        }
      }
    } else {
      addLog('error', `Błąd szukania: ${response.error}`);
      if (status) status.textContent = 'Błąd wyszukiwania';
    }
  } catch (err) {
    console.error(err);
    addLog('error', `Błąd: ${err.message}`);
  } finally {
    if (btn) btn.disabled = false;
  }
}

function highlightText(text, term) {
  if (!text) return '';
  let processed = text;
  if (term) {
    const highlightRegex = new RegExp(`(${term})`, 'gi');
    processed = processed.replace(highlightRegex, '<strong style="color: var(--gold-bright); background: rgba(255,215,0,0.1); border-radius: 2px; padding: 0 2px;">$1</strong>');
  }
  return linkifyNames(processed, term);
}

// Helper to clear active classes from sidebar
function clearActiveSteps() {
  document.querySelectorAll('.step-item').forEach(el => el.classList.remove('active'));
}

// Show Advanced Tests panel
function showAdvancedTests() {
  clearActiveSteps();
  document.querySelectorAll('.tests-item').forEach(el => el.classList.add('active'));

  // Hide footer
  const footer = document.querySelector('.content-footer');
  if (footer) footer.style.display = 'none';

  const container = document.getElementById('stepContent');
  const title = document.getElementById('stepTitle');

  if (title) title.textContent = 'Zaawansowane Testy';

  if (container) {
    container.innerHTML = getTestsPanelTemplate();
  } else {
    console.error('Element #stepContent not found!');
    return;
  }

  if (typeof initTestsPanel === 'function') {
    initTestsPanel();
  }

  addLog('info', '📊 Advanced Tests panel opened');
}

window.showAdvancedTests = showAdvancedTests;
window.showTestPanel = showTestPanel;
window.runContextLimitsTest = runContextLimitsTest;
window.loadContextLimitsCache = loadContextLimitsCache;
window.runMemoryUsageTest = runMemoryUsageTest;
window.loadMemoryUsageCache = loadMemoryUsageCache;
window.runConsistencyTest = runConsistencyTest;
window.loadConsistencyCache = loadConsistencyCache;
window.runPromptSensitivityTest = runPromptSensitivityTest;
window.loadPromptSensitivityCache = loadPromptSensitivityCache;
window.runInstructionFollowingTest = runInstructionFollowingTest;
window.loadInstructionFollowingCache = loadInstructionFollowingCache;
window.runHallucinationTest = runHallucinationTest;
window.loadHallucinationCache = loadHallucinationCache;
window.runLatencyTest = runLatencyTest;
window.loadLatencyCache = loadLatencyCache;
window.runCostEfficiencyTest = runCostEfficiencyTest;
window.loadCostEfficiencyCache = loadCostEfficiencyCache;

// ==============================
// Custom Model Path Logic
// ==============================
async function pickModelPath() {
  try {
    const path = await window.electronAPI.pickModelsPath();
    if (path) {
      document.getElementById('modelPathInput').value = path;
    }
  } catch (error) {
    addLog('error', 'Błąd wyboru folderu: ' + error.message);
  }
}

async function changeModelPath() {
  const newPath = document.getElementById('modelPathInput').value;
  const moveModels = document.getElementById('moveModelsCheck').checked;

  if (!newPath || newPath === 'Domyślna (Systemowa)') {
    addLog('warn', 'Wybierz folder docelowy');
    return;
  }

  // eslint-disable-next-line no-restricted-globals
  if (!confirm(`Czy na pewno chcesz zmienić folder modeli na:\n${newPath}\n\nOllama zostanie zrestartowana.`)) {
    return;
  }

  addLog('info', 'Zmieniam lokalizację modeli... (to może chwilę potrwać)');
  const result = await window.electronAPI.setModelsPath(newPath, moveModels);

  if (result.success) {
    addLog('success', 'Lokalizacja modeli zmieniona! Ollama zrestartowana.');
    // Refresh connection
    checkOllama();
  } else {
    addLog('error', 'Błąd zmiany lokalizacji: ' + result.error);
  }
}

window.pickModelPath = pickModelPath;
window.changeModelPath = changeModelPath;

init();

// Initialize Streaming Handler
if (window.electronAPI && window.electronAPI.onAIStream) {
  window.electronAPI.onAIStream((data) => {
    handleAIStreamChunk(data);
  });
}

// Initialize Status Handler
if (window.electronAPI && window.electronAPI.onAIStatus) {
  window.electronAPI.onAIStatus((data) => {
    state.processingStatus = data.status;
    // Update UI dynamically
    const statusEl = document.getElementById('processingStatusText');
    if (statusEl) statusEl.textContent = data.status;
  });
}

function handleAIStreamChunk(data) {
  const { chunk, isDone, stats } = data;

  // Safety check
  if (state.streamData.cardIndex === -1) return;

  // Update raw content
  if (!isDone && chunk) {
    state.streamData.content += chunk;

    // Check for <think> tags
    if (chunk.includes('<think>')) {
      state.streamData.isThinking = true;
      state.streamData.thinkStartTime = Date.now();
      // Start timer
      if (state.streamData.timerInterval) clearInterval(state.streamData.timerInterval);
      state.streamData.timerInterval = setInterval(() => {
        const elapsed = ((Date.now() - state.streamData.thinkStartTime) / 1000).toFixed(1);
        updateThinkingTimer(elapsed);
      }, 100);
    }

    if (chunk.includes('</think>')) {
      state.streamData.isThinking = false;
      if (state.streamData.timerInterval) {
        clearInterval(state.streamData.timerInterval);
        state.streamData.timerInterval = null;
      }
    }
  }

  // Update UI directly (DOM manipulation for performance)
  updateStreamUI(state.streamData.cardIndex, state.streamData.content, state.streamData.isThinking);

  if (isDone) {
    // Finalize
    if (state.streamData.timerInterval) clearInterval(state.streamData.timerInterval);

    // Update state feed with collecting content
    if (state.aiResultsFeed[state.streamData.cardIndex]) {
      state.aiResultsFeed[state.streamData.cardIndex].content = state.streamData.content;
      state.aiResultsFeed[state.streamData.cardIndex].isStreaming = false;
    }

    state.aiProcessing = false;
    state.streamData.active = false;
    state.streamData.cardIndex = -1;

    // Re-render to ensure clean state
    renderStep();
    addLog('success', '✓ Wygenerowano odpowiedź (Stream)');
  }
}

function updateThinkingTimer(elapsed) {
  const timerEl = document.getElementById('thinking-timer');
  if (timerEl) timerEl.textContent = elapsed + 's';
}

function updateStreamUI(index, fullContent, isThinking) {
  const contentEl = document.querySelector(`#ai-card-${index} .ai-card-content`);
  const statusEl = document.querySelector(`#ai-card-${index} .stream-status`);

  if (contentEl) {
    // Simple formatter to handle <think> hiding/showing
    // We replace <think> content with a UI block
    let displayHtml = fullContent
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/&lt;think&gt;/g, '<div class="thinking-block"><div class="thinking-header">🧠 Myślę... <span id="thinking-timer">0.0s</span></div><div class="thinking-content">')
      .replace(/&lt;\/think&gt;/g, '</div></div>');

    // Handle newlines
    displayHtml = displayHtml.replace(/\n/g, '<br>');

    // Bold markdown
    displayHtml = displayHtml.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    contentEl.innerHTML = displayHtml;
  }

  if (statusEl) {
    statusEl.textContent = isThinking ? '🧠 Myśli...' : '✍️ Pisze...';
  }
}

// Initialize Operator Data
setTimeout(() => loadMgProfiles(), 1000);

// Initialize Templates
setTimeout(() => loadPromptTemplates(), 500);

// ==========================================
// NEW MINIMALIST UI (CLAUDE STYLE)
// ==========================================

function toggleDropdown(name, forceState = null) {
  if (!state.ui) state.ui = { dropdowns: {} };
  if (!state.ui.dropdowns) state.ui.dropdowns = {};

  if (forceState !== null) {
    state.ui.dropdowns[name] = forceState;
  } else {
    // Close others if opening one
    const wasOpen = state.ui.dropdowns[name];
    Object.keys(state.ui.dropdowns).forEach(k => state.ui.dropdowns[k] = false);
    state.ui.dropdowns[name] = !wasOpen;
  }
  renderStep();

  // Focus input after closing logic if needed
  if (state.ui.dropdowns[name] === false) {
    const input = document.getElementById('mainPromptInput');
    if (input) input.focus();
  }
}

// Make it global
window.toggleDropdown = toggleDropdown;

const renderMinimalistAIPanel = () => {
  // Ensure UI state exists
  if (!state.ui) state.ui = { dropdowns: {} };
  if (!state.ui.dropdowns) state.ui.dropdowns = {};

  return `
    ${state.selectedRow !== null && state.sheetData?.rows?.[state.selectedRow] ? `
    <!-- Karta wybranej postaci -->
    ${renderProfileDetails(state.sheetData.rows[state.selectedRow])}
    
    <!-- Excel Search Panel (preserved) -->
    <div class="card" style="margin-top: 20px; border-left: 4px solid var(--gold);">
       <h3 class="card-title" style="display: flex; align-items: center; gap: 8px;">
         🔍 Przeszukiwanie Podsumowań (Excel)
       </h3>
       <div style="display: flex; gap: 10px; align-items: center;">
          <button class="btn btn-primary" onclick="runExcelSearch()" id="btnExcelSearch">
            🔎 Szukaj wzmianek o "${state.sheetData.rows[state.selectedRow]['Imie postaci']}"
          </button>
          <span id="excelSearchStatus" style="font-size: 12px; color: var(--text-dim);"></span>
       </div>
       <div id="excelSearchResults" style="margin-top: 15px; display: none;"></div>
    </div>
    
    <!-- AI SECTION WRAPPER (Fix sticky overlap) -->
    <div class="ai-workspace-wrapper" style="position: relative; z-index: 5; margin-top: 20px;">

        <!-- FEED WYNIKÓW (SCROLLABLE, ABOVE INPUT BAR) -->
        <div class="ai-results-feed" id="aiFeedContainer" style="padding-bottom: 150px; min-height: 400px; display: flex; flex-direction: column; justify-content: flex-end;">
            <!-- Centered Content Container (GPT-style) -->
            <div style="max-width: 900px; margin: 0 auto; padding: 0 32px; width: 100%;">

            <!-- Processing Status (dynamic) -->
            ${state.aiProcessing ? `
            <div id="processingStatus" style="padding: 16px 0; color: var(--text-dim); font-size: 13px; display: flex; align-items: center; gap: 8px;">
                <span class="spinner-small" style="width: 16px; height: 16px; border: 2px solid var(--gold-soft); border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></span>
                <span id="processingStatusText">${state.processingStatus || 'Przetwarzam...'}</span>
            </div>
            ` : ''}

            ${state.aiResultsFeed && state.aiResultsFeed.length > 0 ?
        state.aiResultsFeed.map((item, index) => `
                ${item.type === 'user' ? `
                <!-- USER MESSAGE: Right-aligned bubble -->
                <div class="chat-message user-message" id="ai-card-${index}" style="display: flex; justify-content: flex-end; padding: 12px 0; margin: 8px 0;">
                    <div style="background: #2563eb; color: white; padding: 12px 16px; border-radius: 18px 18px 4px 18px; max-width: 70%; font-size: 14px; line-height: 1.5;">
                        ${item.content}
                    </div>
                </div>
                ` : `
                <!-- AI MESSAGE: Plain text, no bubble, left-aligned -->
                <div class="chat-message ai-message" id="ai-card-${index}" style="padding: 12px 0; margin: 8px 0;">
                    <div class="ai-card-content" style="color: #e5e7eb; font-size: 15px; line-height: 1.7;">
                        ${item.content || ''}
                    </div>
                    ${!item.isStreaming ? `
                    <div class="ai-message-actions" style="display: flex; gap: 8px; margin-top: 12px; opacity: 0; transition: opacity 0.2s;">
                        <button class="btn btn-sm" onclick="copyToClipboard('${item.content.replace(/'/g, "\\'")}')">📋</button>
                        <button class="btn btn-sm" onclick="saveSpecificResult(${index})">💾</button>
                    </div>
                    ` : ''}
                </div>
                `}`).join('')
        : `<div style="text-align: center; padding: 40px; color: var(--text-dim); opacity: 0.7;">
                 <p style="font-size: 32px; margin-bottom: 10px;">💬</p>
                 <p>Wybierz szybką akcję [+] lub wpisz polecenie...</p>
               </div>`}

            <!-- Loading Indicator -->
            ${state.aiProcessing ? `
            <div class="ai-loading" id="aiLoadingIndicator" style="margin: 20px 0; text-align: center;">
              <div class="spinner"></div>
              <p style="color: var(--gold-soft); margin-top: 10px; font-size: 12px;">Przetwarzanie... (${state.aiCommand || ''})</p>
            </div>
            ` : ''}
            </div><!-- Close centered container -->
        </div>

        <!-- STICKY INPUT BAR -->
        <div class="ai-input-bar">
          <div class="ai-input-container">
            
            <!-- QUICK ACTIONS DROPDOWN [+] -->
            <div class="ai-dropdown-menu ${state.ui.dropdowns?.quickActions ? 'show' : ''}" style="bottom: 70px; left: 0;">
              <div class="ai-dropdown-header">Szybkie Akcje</div>
              ${QUICK_ACTIONS.map(group => `
                <div class="ai-dropdown-section">
                  <div class="ai-dropdown-header" style="color: var(--gold-dim); font-size: 10px; padding-left: 8px;">${group.group}</div>
                  ${group.items.map(item => `
                    <div class="ai-dropdown-item" onclick="runAI('${item.id}'); toggleDropdown('quickActions', false);">
                      <span class="ai-item-icon">${item.icon}</span>
                      <span class="ai-item-label">${item.label}</span>
                    </div>
                  `).join('')}
                </div>
              `).join('')}
            </div>

            <!-- CONTEXT DROPDOWN [📚] -->
            <div class="ai-dropdown-menu ${state.ui.dropdowns?.context ? 'show' : ''}" style="bottom: 70px; left: 40px; width: 280px;">
              <div class="ai-dropdown-header">Kontekst i Ustawienia</div>
              
              <div class="ai-dropdown-section">
                <label class="ai-dropdown-item" onclick="event.stopPropagation()">
                  <input type="checkbox" ${state.promptConfig?.contexts?.geography !== false ? 'checked' : ''} onchange="updatePromptConfig('contexts.geography', this.checked)">
                  <span>🌍 Geografia i Lore</span>
                </label>
                <label class="ai-dropdown-item" onclick="event.stopPropagation()">
                  <input type="checkbox" ${state.promptConfig?.contexts?.system !== false ? 'checked' : ''} onchange="updatePromptConfig('contexts.system', this.checked)">
                  <span>⚖️ System i Frakcje</span>
                </label>
                <label class="ai-dropdown-item" onclick="event.stopPropagation()">
                  <input type="checkbox" ${state.promptConfig?.contexts?.quests !== false ? 'checked' : ''} onchange="updatePromptConfig('contexts.quests', this.checked)">
                  <span>📜 Schematy Questów</span>
                </label>
              </div>

              <div class="ai-dropdown-section">
                 <div class="ai-dropdown-header" style="padding-left: 0;">Styl Narracji</div>
                 <select class="form-select" style="font-size: 11px; margin-bottom: 5px;" onchange="updatePromptConfig('style', this.value)">
                    <option value="auto" ${!state.promptConfig?.style || state.promptConfig?.style === 'auto' ? 'selected' : ''}>Automatyczny</option>
                    <option value="political" ${state.promptConfig?.style === 'political' ? 'selected' : ''}>Intryga Polityczna</option>
                    <option value="mystical" ${state.promptConfig?.style === 'mystical' ? 'selected' : ''}>Magia i Kulty</option>
                    <option value="action" ${state.promptConfig?.style === 'action' ? 'selected' : ''}>Akcja</option>
                 </select>
              </div>

              <div class="ai-dropdown-section">
                <div class="ai-dropdown-header">Temperatura: <span id="tempValue">${(state.aiTemperature || 0.7).toFixed(1)}</span></div>
                <div class="ai-range-container">
                  <input type="range" min="0" max="100" value="${(state.aiTemperature || 0.7) * 100}" 
                         style="width: 100%;" 
                         oninput="document.getElementById('tempValue').textContent = (this.value/100).toFixed(1)"
                         onchange="state.aiTemperature = this.value / 100; renderStep();">
                </div>
                <div style="display:flex; justify-content:space-between; font-size:9px; color:var(--text-dim);">
                   <span>Precyzja</span><span>Kreatywność</span>
                </div>
              </div>
            </div>

            <!-- MODEL DROPDOWN [🧠] -->
            <div class="ai-dropdown-menu ${state.ui.dropdowns?.model ? 'show' : ''}" style="bottom: 70px; left: 100px;">
              <div class="ai-dropdown-header">Wybierz Model</div>
              <div class="ai-dropdown-section">
                ${state.ollamaModels && state.ollamaModels.length > 0
        ? state.ollamaModels.map(m => `
                    <div class="ai-dropdown-item ${state.selectedModel === m.name ? 'active' : ''}" 
                         onclick="state.selectedModel = '${m.name}'; toggleDropdown('model', false); renderStep();">
                      <span class="ai-item-icon">🧠</span>
                      <span class="ai-item-label">${m.name}</span>
                      ${state.selectedModel === m.name ? '✓' : ''}
                    </div>
                  `).join('')
        : '<div style="padding: 10px; color: var(--text-dim);">Brak modeli</div>'}
              </div>
            </div>



            <!-- PERSONALITY DROPDOWN [🎭] -->
            <div class="ai-dropdown-menu ${state.ui.dropdowns?.personality ? 'show' : ''}" style="bottom: 70px; left: 180px;">
              <div class="ai-dropdown-header">Osobowość AI</div>
              <div class="ai-dropdown-section">
                ${Object.entries(PERSONALITY_PROMPTS).map(([key, p]) => `
                    <div class="ai-dropdown-item ${state.selectedPersonality === key ? 'active' : ''}" 
                         onclick="state.selectedPersonality = '${key}'; toggleDropdown('personality', false); renderStep();">
                      <span class="ai-item-icon">${p.icon}</span>
                      <span class="ai-item-label">${p.name}</span>
                      ${state.selectedPersonality === key ? '✓' : ''}
                    </div>
                  `).join('')}
              </div>
            </div>

            <!-- INPUT AREA -->
            <textarea class="ai-prompt-input" id="mainPromptInput"
                      placeholder="Wpisz polecenie... (/ dla skrótów)"
                      rows="1"
                      oninput="this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px'; updatePromptPart('dod', this.value);"
                      onkeydown="if(event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); runCustomPrompt(); }">${state.promptParts?.dod || ''}</textarea>
            
            <!-- TOOLBAR -->
            <div class="ai-toolbar">
              <div class="ai-toolbar-left">
                <button class="ai-quick-btn ${state.ui.dropdowns?.quickActions ? 'active' : ''}" 
                        onclick="toggleDropdown('quickActions')" title="Szybkie akcje">
                  +
                </button>
                
                <button class="ai-tool-btn ${state.ui.dropdowns?.context ? 'active' : ''}" 
                        onclick="toggleDropdown('context')" title="Kontekst">
                  <span>📚 Kontekst</span>
                </button>

                <button class="ai-tool-btn ${state.ui.dropdowns?.model ? 'active' : ''}" 
                        onclick="toggleDropdown('model')" title="Model">
                  <span>🧠 ${state.selectedModel ? state.selectedModel.split(':')[0] : 'Model'}</span>
                </button>

                <button class="ai-tool-btn ${state.ui.dropdowns?.personality ? 'active' : ''}" 
                        onclick="toggleDropdown('personality')" title="Osobowość">
                  <span>${PERSONALITY_PROMPTS[state.selectedPersonality]?.icon || '🎭'} ${PERSONALITY_PROMPTS[state.selectedPersonality]?.name || 'Osobowość'}</span>
                </button>
              </div>

              <button class="ai-submit-btn ${state.promptParts?.dod ? 'ready' : ''}" 
                      onclick="runCustomPrompt()" title="Wyślij">
                ▶
              </button>
            </div>

          </div>
        </div>

    </div> <!-- WRAPPER END -->

    ` : `
    <div class="card">
      <h3 class="card-title">🤖 Asystent AI</h3>
      <p style="color: var(--text-muted);">
        ⚠️ Najpierw wybierz postać w Kroku 2 (Ekstrakcja).
      </p>
      <button class="btn btn-secondary" onclick="state.currentStep = 2; renderStep();">
        ← Wróć do Kroku 2
      </button>
    </div>
    `}
  `;
};

// ==========================================
// Slash Commands Logic & Overrides
// ==========================================

window.updatePromptPart = function (part, value) {
  if (!state.promptParts) state.promptParts = {};
  state.promptParts[part] = value;
  // Don't re-render whole step on every keypress (laggy), just update state
  // Only render if needed (e.g. toggles)
  if (typeof value === 'boolean') renderStep();
};

const SLASH_COMMANDS = {
  '/quest': 'quest_main',
  '/q': 'quest_main',
  '/side': 'side_quest',
  '/hook': 'story_hooks',
  '/secret': 'secret',
  '/analiza': 'analyze_relations',
  '/cechy': 'extract_traits',
  '/frakcja': 'faction_suggestion',
  '/ksywka': 'nickname'
};

// Override runCustomPrompt
window.runCustomPrompt = async function () {
  if (state.aiProcessing) {
    addLog('warn', 'AI już przetwarza...');
    return;
  }

  const promptText = (state.promptParts?.dod || '').trim();
  if (!promptText) {
    addLog('warn', 'Wpisz polecenie.');
    return;
  }

  // Check Slash Command
  const lower = promptText.toLowerCase();
  const slashAction = Object.entries(SLASH_COMMANDS).find(([key]) => lower.startsWith(key));

  if (slashAction) {
    const [cmd, actionId] = slashAction;
    addLog('info', `⚡ Wykryto skrót: ${cmd} -> ${actionId}`);

    // Clear input
    updatePromptPart('dod', '');
    const el = document.getElementById('mainPromptInput');
    if (el) el.value = '';

    await runAI(actionId);
    return;
  }

  // Normal Prompt Execution
  const profile = state.sheetData?.rows?.[state.selectedRow];
  if (!profile) {
    addLog('error', 'Brak wybranej postaci.');
    return;
  }

  state.aiProcessing = true;
  state.aiCommand = "Własny prompt";
  renderStep();

  try {
    // Prepare Context
    const contextConfig = state.promptConfig?.contexts || {};

    // Construct Structured System Prompt
    const persona = PERSONALITY_PROMPTS[state.selectedPersonality] || PERSONALITY_PROMPTS['default_mg'];

    let systemPrompt = `### ROLA ###\n${persona.role}\n\n`;
    systemPrompt += `### CEL ###\n${persona.goal}\n\n`;

    systemPrompt += `### KONTEKST ###\n${persona.context || ''} `;
    if (contextConfig.geography) systemPrompt += "Używaj nazw geograficznych z Górniczej Doliny (Gothic 1). ";
    if (contextConfig.system) systemPrompt += "Uwzględnij mechanikę i realia Starego, Nowego Obozu i Bractwa. ";
    // Add context from profile metadata if available
    if (profile['Gildia']) systemPrompt += ` Postać należy do gildii: ${profile['Gildia']}.`;
    systemPrompt += "\n\n";

    if (persona.dod) {
      systemPrompt += `### DEFINITION OF DONE (ZASADY) ###\n${persona.dod}\n\n`;
    }

    if (persona.example) {
      systemPrompt += `### PRZYKŁAD (ONE-SHOT) ###\n${persona.example}\n\n`;
    }

    const modelName = state.selectedModel || (state.ollamaModels?.[0]?.name) || 'mistral:latest';

    // 1. Add User Message immediately
    state.aiResultsFeed.forEach(item => item.isNew = false);
    state.aiResultsFeed.push({
      type: 'user',
      content: promptText,
      timestamp: new Date(),
      isNew: true
    });

    // 2. Add AI Placeholder
    const newItemIndex = state.aiResultsFeed.length;
    state.aiResultsFeed.push({
      itemType: 'ai',
      command: 'Asystent',
      content: '',
      timestamp: new Date(),
      isNew: true,
      isStreaming: true
    });

    // Init Stream State
    state.streamData = {
      active: true,
      cardIndex: newItemIndex,
      content: '',
      isThinking: false,
      thinkStartTime: 0
    };

    renderStep(); // Render initial placeholder + user message

    const result = await window.electronAPI.aiCommand(
      'custom',
      profile,
      {
        customPrompt: promptText,
        model: modelName,
        system: systemPrompt,
        promptConfig: { responseLength: 'medium' },
        stream: true,
        temperature: state.aiTemperature || 0.7
      }
    );

    renderStep(); // Render initial placeholder

    // Scroll to placeholder
    setTimeout(() => {
      const card = document.getElementById(`ai-card-${newItemIndex}`);
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);

    /* Promise handling handled by stream events now, but we check for immediate error */
    if (!result.success && result.error) {
      addLog('error', `Błąd startu AI: ${result.error}`);
      state.aiProcessing = false;
      renderStep();
    }
    /* 
        if (result.success) {
          // Clear old new flags
          state.aiResultsFeed.forEach(item => item.isNew = false);
    
          const newItemIndex = state.aiResultsFeed.length;
          state.aiResultsFeed.push({
            command: promptText,
            content: result.text,
            timestamp: new Date(),
            isNew: true
          });
          addLog('success', '✓ Wygenerowano odpowiedź');
    
          // Auto scroll
          setTimeout(() => {
            const card = document.getElementById(`ai-card-${newItemIndex}`);
            if (card) card.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }, 100);
        } else {
          addLog('error', `Błąd AI: ${result.error}`);
        } 
    */
  } catch (e) {
    state.aiResult = `❌ Błąd: ${e.message}`;
    addLog('error', `Błąd: ${e.message}`);
  }

  state.aiProcessing = false;
  state.aiCommand = null;
  // Clear input after success
  updatePromptPart('dod', '');
  const el = document.getElementById('mainPromptInput');
  if (el) el.value = '';

  renderStep();
};

window.copyToClipboard = function (text) {
  navigator.clipboard.writeText(text).then(() => {
    addLog('success', '📋 Skopiowano do schowka');
  }).catch(err => {
    addLog('error', `Błąd kopiowania: ${err.message}`);
  });
};
