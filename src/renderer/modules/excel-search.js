/**
 * @module excel-search
 * @description Wyszukiwanie wzmianek w Excel i testy
 * ES6 Module - Faza 7 modularizacji
 */

import { state } from './state.js';
import { addLog } from './ui-helpers.js';
import { linkifyNames } from './profile-renderer.js';

// ==============================
// Excel Search
// ==============================

/**
 * Search for mentions of character in Excel files
 */
export async function runExcelSearch() {
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
                    "...${highlightSearchText(r.context, characterName)}..."
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

/**
 * Highlight search term in text
 * @param {string} text - Text to search
 * @param {string} term - Term to highlight
 * @returns {string} HTML with highlights
 */
export function highlightSearchText(text, term) {
    if (!text) return '';
    let processed = text;
    if (term) {
        const highlightRegex = new RegExp(`(${term})`, 'gi');
        processed = processed.replace(highlightRegex, '<strong style="color: var(--gold-bright); background: rgba(255,215,0,0.1); border-radius: 2px; padding: 0 2px;">$1</strong>');
    }
    return linkifyNames(processed, term);
}

// ==============================
// Navigation Helpers
// ==============================

/**
 * Clear active state from sidebar
 */
export function clearActiveSteps() {
    document.querySelectorAll('.step-item').forEach(el => el.classList.remove('active'));
}

/**
 * Show advanced tests panel
 */
export function showAdvancedTests() {
    clearActiveSteps();
    document.querySelectorAll('.tests-item').forEach(el => el.classList.add('active'));

    const footer = document.querySelector('.content-footer');
    if (footer) footer.style.display = 'none';

    const container = document.getElementById('stepContent');
    const title = document.getElementById('stepTitle');

    if (title) title.textContent = 'Zaawansowane Testy';

    if (container && typeof getTestsPanelTemplate === 'function') {
        container.innerHTML = getTestsPanelTemplate();
    }

    if (typeof initTestsPanel === 'function') {
        initTestsPanel();
    }

    addLog('info', '📊 Advanced Tests panel opened');
}

// Make globally available
if (typeof window !== 'undefined') {
    window.runExcelSearch = runExcelSearch;
    window.highlightSearchText = highlightSearchText;
    window.clearActiveSteps = clearActiveSteps;
    window.showAdvancedTests = showAdvancedTests;
}
