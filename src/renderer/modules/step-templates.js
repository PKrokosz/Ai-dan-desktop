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
      <h3 class="card-title">Pobrane zgłoszenia</h3>
      ${state.sheetData ? `
        <div class="table-controls" style="margin-bottom: 10px; display: flex; gap: 10px; align-items: center;">
          <span style="color: var(--text-dim); font-size: 12px;">Sortuj:</span>
          <button class="btn btn-small ${state.sortBy === 'name' ? 'active' : ''}" onclick="sortData('name')">Imię</button>
          <button class="btn btn-small ${state.sortBy === 'guild' ? 'active' : ''}" onclick="sortData('guild')">Gildia</button>
          <button class="btn btn-small ${state.sortBy === 'region' ? 'active' : ''}" onclick="sortData('region')">Region</button>
          <span style="color: var(--text-dim); font-size: 11px; margin-left: auto;">${state.sheetData.rows.length} postaci</span>
        </div>
        <div id="characterTableContainer" style="max-height: 400px; overflow-y: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Wybierz</th>
              <th style="cursor:pointer" onclick="sortData('name')">Imię postaci ${sortInd('name')}</th>
              <th style="cursor:pointer" onclick="sortData('guild')">Gildia ${sortInd('guild')}</th>
              <th style="cursor:pointer" onclick="sortData('region')">Region ${sortInd('region')}</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr onclick="selectRow(${row._originalIndex !== undefined ? row._originalIndex : state.sheetData.rows.indexOf(row)})" class="${state.selectedRow === (row._originalIndex !== undefined ? row._originalIndex : state.sheetData.rows.indexOf(row)) ? 'selected' : ''}">
                <td><input type="radio" name="rowSelect" ${state.selectedRow === (row._originalIndex !== undefined ? row._originalIndex : state.sheetData.rows.indexOf(row)) ? 'checked' : ''}></td>
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
 * Step 4: Merge - Merged profile view
 */
export function mergeTemplate() {
  return `
    <div class="card">
      <h3 class="card-title">Scalony profil postaci</h3>
      ${state.profile ? `
        <pre style="font-size: 12px; max-height: 400px; overflow: auto;">${JSON.stringify(state.profile, null, 2)}</pre>
        <button class="btn btn-secondary" style="margin-top: 15px;" onclick="editProfile()">Edytuj ręcznie</button>
      ` : '<p style="color: var(--text-muted);">Profil zostanie wygenerowany po przetworzeniu AI.</p>'}
    </div>
  `;
}

/**
 * Step 5: Quests - Generated quests view
 */
export function questsTemplate() {
  return `
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
  `;
}

/**
 * Step 6: Export - Export options
 */
export function exportTemplate() {
  return `
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
  `;
}

/**
 * Settings: AI settings panel
 */
export function settingsTemplate() {
  return `
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
  merge: mergeTemplate,
  quests: questsTemplate,
  export: exportTemplate,
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
