/**
 * @module search-functions
 * @description Funkcje wyszukiwania i autocomplete
 * ES6 Module - Faza 5 modularizacji
 */

import { state } from './state.js';
import { addLog, renderStep } from './ui-helpers.js';

// ==============================
// Search Stats
// ==============================

/**
 * Update search stats display
 */
export function updateSearchStats() {
    const stats = document.getElementById('searchStats');
    if (stats) {
        stats.textContent = `Dostępnych ${state.allProfiles.length} profili`;
    }
}

/**
 * Update suggestions (deprecated - using dynamic search)
 */
export function updateSuggestions() {
    // No longer needed - using dynamic search instead
}

// ==============================
// Search Input Handler
// ==============================

/**
 * Handle search input and show suggestions
 */
export function handleSearchInput() {
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
    }).slice(0, 15);

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

/**
 * Select a suggestion from dropdown
 * @param {string} name - Character name
 */
export function selectSuggestion(name) {
    const input = document.getElementById('searchName');
    const suggestionsPanel = document.getElementById('searchSuggestions');

    if (input) input.value = name;
    if (suggestionsPanel) suggestionsPanel.style.display = 'none';
}

/**
 * Hide suggestions panel
 */
export function hideSuggestions() {
    const suggestionsPanel = document.getElementById('searchSuggestions');
    if (suggestionsPanel) suggestionsPanel.style.display = 'none';
}

// ==============================
// Tag Search
// ==============================

/**
 * Search characters by tag
 * @param {string} tagName - Tag name to search
 */
export function searchByTag(tagName) {
    addLog('info', `Szukam postaci z tagiem: ${tagName}`);

    if (state.allProfiles.length === 0) {
        addLog('warn', 'Brak załadowanych profili. Poczekaj na załadowanie danych.');
        return;
    }

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
        const searchInput = document.getElementById('searchName');
        if (searchInput) searchInput.value = tagName;
        if (typeof loadDataSource === 'function') loadDataSource();
    }
}

// ==============================
// Preload Data
// ==============================

/**
 * Preload all profiles for fast searching
 */
export async function preloadData() {
    addLog('info', 'Autopobieranie bazy LarpGothic...');
    try {
        const result = await window.electronAPI.fetchLarpGothic({});
        if (result.success) {
            // Deduplicate
            const seen = new Set();
            state.allProfiles = result.rows.filter(p => {
                const key = p.id || p['Imie postaci'];
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            // Cache all character names for linkify
            state.allCharacterNames = state.allProfiles.map(p => p['Imie postaci']).filter(Boolean);

            addLog('success', `Pobrano ${result.rows.length} profili w tle.`);
            updateSearchStats();
        }
    } catch (e) {
        addLog('warn', 'Nie udało się pobrać bazy w tle.');
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.updateSearchStats = updateSearchStats;
    window.handleSearchInput = handleSearchInput;
    window.selectSuggestion = selectSuggestion;
    window.hideSuggestions = hideSuggestions;
    window.searchByTag = searchByTag;
    window.preloadData = preloadData;
}
