/**
 * @module step-templates
 * @description Szablony HTML dla poszczególnych kroków aplikacji
 * ES6 Module - Faza 2 modularizacji + Faza 6 Refactor
 */

import { state } from './state.js';
// We assume OLLAMA_MODELS is available globally or we might need to import it if used in templates.
// In app.js it was a global constant. We should probably export it from models-db.js if we want to be pure.
// For now, let's assume global access or simple undefined check until fixed.

// ==============================
// Step Content Templates
// ==============================

/**
 * Step 1: Source - Data source selection
 */
/**
 * Step 1: Source - Data source selection (Minimalist & Aesthetic Redesign)
 */
export function sourceTemplate() {
  return `
    <div class="minimal-container">
      <div class="minimal-header">
        <h2 class="minimal-title">Wybierz Źródło</h2>
        <p class="minimal-subtitle">Określ skąd mam pobrać dane do analizy.</p>
      </div>

      <div class="minimal-source-wrapper">
        <div class="minimal-select-container">
          <select class="minimal-select" id="dataSource">
            <option value="larpgothic">🔥 Baza Postaci (LarpGothic API)</option>
            <option value="sheets">📊 Arkusz Zgłoszeń (Google Sheets)</option>
            <option value="local">📁 Lokalny plik JSON</option>
          </select>
        </div>
      </div>
      
      <div class="minimal-search-container">
        <span class="search-icon">🔍</span>
        <input type="text" class="minimal-search-input" id="searchName" 
               placeholder="Wpisz imię, gildię lub zawód..." 
               oninput="handleSearchInput()" autocomplete="off">
        <button class="filter-icon-btn" id="tagsFilterBtn" onclick="toggleTagsDrawer()" title="Pokaż/Ukryj Tagi">
            ⚙️ Filtry
        </button>
        <div id="searchSuggestions" class="search-suggestions" style="display: none; top: 100%;"></div>
      </div>

      <div id="tagsDrawer" class="tags-drawer">
         <div class="tag-category">
            <div class="tag-category-title">⚖️ Za co siedzi</div>
            <div class="tag-cloud">
               <button class="tag-chip" onclick="searchByTag('kradzież')">🗡️ Kradzież</button>
               <button class="tag-chip" onclick="searchByTag('przemyt')">📦 Przemyt</button>
               <button class="tag-chip" onclick="searchByTag('zabójstwo')">💀 Zabójstwo</button>
               <button class="tag-chip" onclick="searchByTag('oszustwo')">🎭 Oszustwo</button>
               <button class="tag-chip" onclick="searchByTag('bójka')">👊 Bójka</button>
            </div>
         </div>
         
         <div class="tag-category">
            <div class="tag-category-title">💼 Zawód</div>
            <div class="tag-cloud">
               <button class="tag-chip" onclick="searchByTag('górnik')">⛏️ Górnik</button>
               <button class="tag-chip" onclick="searchByTag('kowal')">🔨 Kowal</button>
               <button class="tag-chip" onclick="searchByTag('handlarz')">💎 Handlarz</button>
               <button class="tag-chip" onclick="searchByTag('łowca')">🏹 Łowca</button>
               <button class="tag-chip" onclick="searchByTag('najemnik')">⚔️ Najemnik</button>
               <button class="tag-chip" onclick="searchByTag('strażnik')">🛡️ Strażnik</button>
            </div>
         </div>
         
         <div class="tag-category">
            <div class="tag-category-title">⚠️ Wady</div>
            <div class="tag-cloud">
               <button class="tag-chip" onclick="searchByTag('alkoholik')">🍺 Pijak</button>
               <button class="tag-chip" onclick="searchByTag('hazardzista')">🎲 Hazard</button>
               <button class="tag-chip" onclick="searchByTag('chciwość')">🤑 Chciwy</button>
               <button class="tag-chip" onclick="searchByTag('gniew')">😠 Porywczy</button>
            </div>
         </div>
      </div>

      <div class="minimal-footer-stats" id="searchStats">
        ${state.allProfiles.length > 0 ? `✓ Dostępnych ${state.allProfiles.length} profili` : '⏳ Ładowanie bazy postaci...'}
      </div>
      
      <div class="floating-action-container">
         <button class="floating-btn" onclick="loadDataSource()">
            Załaduj Dane →
         </button>
      </div>
    </div>
  `;
}

/**
 * Step 2: Extraction - Character data extraction
 */
export function extractionTemplate() {
  // Helper to get sort indicator
  const sortInd = (col) => state.sortBy === col ? (state.sortDir === 'asc' ? '▲' : '▼') : '';

  // Sort rows helper usage
  const rows = window.getSortedRows ? window.getSortedRows() : (state.sheetData?.rows || []);

  return `
    <div class="card">
      <h3 class="card-title">Pobrane zgłoszenia (Lore View)</h3>
      ${state.sheetData ? (() => {
      // Dynamic Group Options
      const uniqueGroups = [...new Set((state.sheetData.rows || [])
        .map(r => r.StoryGroup)
        .filter(g => g && g.trim().length > 0)
      )].sort();

      return `
        <!-- Filter Controls -->
        <div class="filter-controls" style="display: flex; gap: 10px; margin-bottom: 10px; padding: 10px; background: rgba(0,0,0,0.2); border: 1px solid var(--border-subtle);">
            <select onchange="window.AppModules.setFilters(this.value, undefined)" style="background: var(--bg-dark); color: var(--gold); border: 1px solid var(--border); padding: 5px; outline: none;">
                <option value="all" ${!state.filterGuild || state.filterGuild === 'all' ? 'selected' : ''}>Wszystkie Gildie</option>
                <option value="Mag" ${state.filterGuild === 'Mag' ? 'selected' : ''}>Magowie</option>
                <option value="Cień" ${state.filterGuild === 'Cień' ? 'selected' : ''}>Cienie</option>
                <option value="Strażnik" ${state.filterGuild === 'Strażnik' ? 'selected' : ''}>Strażnicy</option>
                <option value="Szkodnik" ${state.filterGuild === 'Szkodnik' ? 'selected' : ''}>Szkodnicy</option>
                <option value="Najemnik" ${state.filterGuild === 'Najemnik' ? 'selected' : ''}>Najemnicy</option>
                <option value="Bractwo" ${state.filterGuild === 'Bractwo' ? 'selected' : ''}>Bractwo</option>
                <option value="Kopacz" ${state.filterGuild === 'Kopacz' ? 'selected' : ''}>Kopacze</option>
                <option value="Guru" ${state.filterGuild === 'Guru' ? 'selected' : ''}>Guru</option>
                <option value="Magnat" ${state.filterGuild === 'Magnat' ? 'selected' : ''}>Magnaci</option>
            </select>

            <select onchange="window.AppModules.setFilters(undefined, this.value)" style="background: var(--bg-dark); color: var(--gold); border: 1px solid var(--border); padding: 5px; outline: none; min-width: 150px;">
                <option value="all" ${!state.filterGroup || state.filterGroup === 'all' ? 'selected' : ''}>Wszystkie Grupy</option>
                ${uniqueGroups.map(g => `<option value="${g}" ${state.filterGroup === g ? 'selected' : ''}>${g}</option>`).join('')}
            </select>
            
            <span style="color: var(--text-dim); font-size: 11px; margin-left: auto; align-self: center;">
               ${rows.length} / ${state.sheetData.rows.length}
            </span>
        </div>

        <!-- Sort Controls -->
        <div class="table-controls" style="margin-bottom: 10px; display: flex; gap: 10px; align-items: center;">
          <span style="color: var(--text-dim); font-size: 12px;">Sortuj:</span>
          <button class="btn btn-secondary btn-small ${state.sortBy === 'name' ? 'active' : ''}" onclick="sortData('name')">Imię</button>
          <button class="btn btn-secondary btn-small ${state.sortBy === 'guild' ? 'active' : ''}" onclick="sortData('guild')">Gildia</button>
          <button class="btn btn-secondary btn-small ${state.sortBy === 'seniority' ? 'active' : ''}" onclick="sortData('seniority')">Staż</button>
        </div>
        `;
    })() : ''}
        
        ${rows.length > 0 ? `
        <div id="characterTableContainer" style="max-height: 500px; overflow-y: auto; padding-right:5px;">
           <div class="lore-list-container" style="display: flex; flex-direction: column; gap: 8px;">
            ${rows.map((row, index) => {
      // Seniority Logic (Regex for "X edycja" or "X raz")
      // (We put this logic inline for immediate effect, ideally it moves to service)
      const rawText = ((row['O postaci'] || '') + (row['Fakty'] || '')).toLowerCase();
      const guild = (row['Gildia'] || '').toLowerCase();

      let seniorityLabel = null;
      let seniorityRaw = 0;
      const seniorityMatch = rawText.match(/(\d+)\.?\s*(edycja|raz)/i);
      if (seniorityMatch) {
        seniorityRaw = parseInt(seniorityMatch[1]);
        seniorityLabel = `${seniorityRaw}. Edycja`;
      } else if (rawText.includes('weteran') || rawText.includes('stary wyjadacz')) {
        seniorityLabel = 'Weteran';
      }

      // Badge Logic
      let badge = null;
      let guildClass = 'guild-neutral';

      // Guild colors
      if (guild.includes('mag') || guild.includes('ogień')) { guildClass = 'guild-mage'; badge = '🔥 Klasztor'; }
      else if (guild.includes('cień') || guild.includes('stary')) { guildClass = 'guild-shadow'; badge = '⛺ Stary Obóz'; }
      else if (guild.includes('szkodnik') || guild.includes('nowy')) { guildClass = 'guild-merc'; badge = '🌊 Nowy Obóz'; }
      else if (guild.includes('bractwo')) { guildClass = 'guild-sect'; badge = '🏯 Obóz Bractwa'; }

      // Specific Badge overrides
      if (rawText.includes('diego')) badge = '👥 Banda Diego';
      if (rawText.includes('lares')) badge = '🗡️ Banda Laresa';
      if (rawText.includes('krąg')) {
        const m = rawText.match(/(i|ii|iii|iv|v|vi|\d)\s*krąg/i);
        if (m) badge = `🔥 ${m[0].toUpperCase()}`;
      }

      // Skills with tooltips
      const skills = [];
      if (rawText.includes('alchemi')) skills.push({ icon: '⚗️', label: 'Alchemia' });
      if (rawText.includes('krad')) skills.push({ icon: '🧤', label: 'Kradzież' });
      if (rawText.includes('polowan')) skills.push({ icon: '🏹', label: 'Łowiectwo' });
      if (rawText.includes('handel')) skills.push({ icon: '💰', label: 'Handel' });
      if (rawText.includes('kowal')) skills.push({ icon: '🔨', label: 'Kowalstwo' });
      if (rawText.includes('magi')) skills.push({ icon: '✨', label: 'Magia' });

      const realIndex = row._originalIndex !== undefined ? row._originalIndex : state.sheetData.rows.indexOf(row);
      const isSelected = state.selectedRow === realIndex;

      return `
        <div class="lore-row ${guildClass} ${isSelected ? 'selected' : ''}" onclick="selectRow(${realIndex})" style="
             display: grid;
             grid-template-columns: 40px 180px 1fr 120px 110px;
             align-items: center;
             background: ${isSelected ? 'rgba(184, 138, 43, 0.15)' : 'rgba(20, 18, 14, 0.4)'};
             backdrop-filter: blur(4px);
             border: 1px solid ${isSelected ? '#b88a2b' : 'rgba(244, 217, 95, 0.08)'};
             border-left: 2px solid ${isSelected ? '#b88a2b' : 'rgba(244, 217, 95, 0.1)'};
             border-radius: 2px;
             padding: 8px 12px;
             cursor: pointer;
             transition: all 0.2s;
        ">
          <!-- Col 1: Select -->
          <div style="text-align:center;">
            <input type="radio" name="rowSelect" ${isSelected ? 'checked' : ''} style="accent-color:#b88a2b; cursor:pointer;">
          </div>

          <!-- Col 2: Identity -->
          <div style="display: flex; flex-direction: column; gap: 2px;">
              <span style="font-family: 'Cinzel', serif; font-size: 14px; color: #f2e5b5; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${row['Imie postaci'] || '-'}</span>
              <span style="font-size: 9px; color: #8a7d5c; text-transform: uppercase; letter-spacing: 1px;">${row['Gildia'] || '-'}</span>
          </div>

          <!-- Col 3: Context (Badges + Skills) -->
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              ${badge ? `<span class="lore-badge">${badge}</span>` : ''}
              ${seniorityLabel ? `<span class="lore-badge" style="border-color: rgba(255,255,255,0.2); color: #888;" title="Doświadczony Gracz: ${seniorityLabel}">${seniorityLabel}</span>` : ''}
              
              <div class="skill-icons" style="display:flex; gap:4px; margin-left: auto;">
                ${skills.map(s => `<span title="${s.label}" style="cursor:help; font-size:12px;">${s.icon}</span>`).join('')}
              </div>
          </div>

          <!-- Col 4: Region -->
          <div style="text-align: right; font-size: 10px; color: #666;">
              <span style="color: #8a7d5c;">${row['Region'] || 'Khorinis'}</span>
          </div>

          <!-- Col 5: Actions -->
          <div style="text-align: center; display: flex; gap: 4px; justify-content: center;">
              <button class="btn-icon spark-btn" title="Iskra: Losuj Hook" onclick="event.stopPropagation(); window.AppModules.triggerSpark(${realIndex})">
                ⚡
              </button>
              <button class="btn-icon spark-btn" title="Napisz List (Macierz)" onclick="event.stopPropagation(); window.AppModules.openLetterGenerator(${realIndex})" style="border-color: rgba(255,255,255,0.2);">
                ✉️
              </button>
              <button class="btn-icon spark-btn" title="Plotki (Co ludzie gadają?)" onclick="event.stopPropagation(); window.AppModules.generateGossip(${realIndex})" style="border-color: rgba(255,255,255,0.2);">
                👄
              </button>
          </div>
       </div>
    `;
    }).join('')}
           </div>
       </div>
    </div>
    ` : '<p class="text-muted" style="padding:20px; text-align:center;">Brak wczytanych danych. Wróć do kroku 1 i wczytaj plik Excel.</p>'}
    </div >

  ${state.selectedRow !== null && window.renderProfileDetails ? window.renderProfileDetails(state.sheetData.rows[state.selectedRow]) : ''}
`;
}

/**
 * Step 3: AI Processing - AI panel (delegated to renderMinimalistAIPanel)
 */
export function aiTemplate() {
  return window.renderMinimalistAIPanel ? window.renderMinimalistAIPanel() : '<p>Loading AI Panel...</p>';
}







/**
 * Settings: AI settings panel
 */
export function settingsTemplate() {
  return `
  < div class="card" id = "system-specs-card" style = "margin-bottom: 20px;" >
      <h3 class="card-title">🖥️ Specyfikacja komputera</h3>
      <div id="system-specs-content" class="specs-loading">
        <p style="color: var(--text-dim);">Wykrywam specyfikację...</p>
      </div>
    </div >
    
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
`;
}

/**
 * Testbench: Model testing panel (delegated)
 */
import { getTestbenchTemplate } from './testbench.js';
export function testbenchTemplate() {
  return getTestbenchTemplate();
}

// ==============================
// Step Templates Map
// ==============================
export const stepTemplates = {
  source: sourceTemplate,
  extraction: extractionTemplate,
  ai: aiTemplate,

  settings: settingsTemplate,
  testbench: testbenchTemplate
};

/**
 * Get template by step key
 * @param {string} key - Step key
 * @returns {string} HTML template
 */
export function getStepTemplate(key) {
  const templateFn = stepTemplates[key];
  return templateFn ? templateFn() : `<p>Template "${key}" not found</p>`;
}

// Missing exports required by index.js
export function mergeTemplate() {
  return `<div class="card"><h3 class="card-title">Scalanie (Legacy)</h3><p>Ten moduł został zintegrowany z krokiem Ekstrakcji.</p></div>`;
}

export function questsTemplate() {
  return `<div class="card"><h3 class="card-title">Questy (Legacy)</h3><p>Generowanie questów odbywa się w panelu AI.</p></div>`;
}

export function exportTemplate() {
  return `<div class="card"><h3 class="card-title">Eksport (Legacy)</h3><p>Funkcje eksportu są dostępne w menu głównym.</p></div>`;
}
