/**
 * @module step-templates
 * @description Szablony HTML dla poszczególnych kroków aplikacji
 * ES6 Module - Faza 2 modularizacji
 */

import { state } from './state.js';

// ==============================
// Step Content Templates
// ==============================

/**
 * Step 1: Source - Data source selection
 */
export function sourceTemplate() {
    return `
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
          <input type="text" class="form-input" id="searchName" 
                 placeholder="Wpisz imię, gildię, zawód..." 
                 oninput="handleSearchInput()" autocomplete="off">
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
  `;
}

/**
 * Step 2: Extraction - Character data extraction
 */
export function extractionTemplate() {
    if (!state.sheetData?.rows?.length) {
        return `
      <div class="empty-state">
        <p>Brak danych. Wróć do kroku 1 i załaduj dane.</p>
      </div>
    `;
    }

    // Use global renderProfileDetails if available
    const profileHtml = state.selectedRow !== null && window.renderProfileDetails
        ? window.renderProfileDetails(state.sheetData.rows[state.selectedRow])
        : '';

    return `
    <div class="data-preview">
      <div class="data-controls" style="margin-bottom: 20px;">
        <input type="text" id="searchName" placeholder="Wyszukaj postać..." 
               class="search-input" autocomplete="off" style="max-width: 400px;">
        <div id="searchSuggestions" class="suggestions-panel" style="display: none;"></div>
      </div>
      ${profileHtml}
    </div>
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
    
    <div class="card" style="margin-top: 20px;">
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
      <h3 class="card-title">⚙️ Ustawienia AI</h3>
      <p class="card-desc">Konfiguracja modeli i parametrów</p>
      <div id="modelsList">Ładowanie modeli...</div>
    </div>
  `;
}

/**
 * Testbench: Model testing panel (delegated)
 */
export function testbenchTemplate() {
    return window.getTestbenchTemplate ? window.getTestbenchTemplate() : '<p>Loading Testbench...</p>';
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
