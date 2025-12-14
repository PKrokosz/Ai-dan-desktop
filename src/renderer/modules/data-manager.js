/**
 * @module data-manager
 * @description Manages data loading, sorting, filtering, and selection state.
 */

// ==============================
// LarpGothic Auto-fetch & Suggestions
// ==============================

export async function preloadData() {
    if (window.addLog) window.addLog('info', 'Autopobieranie bazy LarpGothic...');
    try {
        const result = await window.electronAPI.fetchLarpGothic({});
        if (result.success) {
            window.state.allProfiles = deduplicateProfiles(result.rows);
            if (window.addLog) window.addLog('success', `Pobrano ${result.rows.length} profili w tle.`);
            updateSearchStats();
        }
    } catch (e) {
        if (window.addLog) window.addLog('warn', 'Nie udało się pobrać bazy w tle.');
    }
}

export function updateSearchStats() {
    const stats = document.getElementById('searchStats');
    if (stats && window.state.allProfiles) {
        stats.textContent = `Dostępnych ${window.state.allProfiles.length} profili`;
    }
}

export function handleSearchInput() {
    const input = document.getElementById('searchName');
    const suggestionsPanel = document.getElementById('searchSuggestions');

    if (!input || !suggestionsPanel || !window.state.allProfiles || window.state.allProfiles.length === 0) return;

    const query = input.value.toLowerCase().trim();

    if (query.length < 2) {
        suggestionsPanel.style.display = 'none';
        return;
    }

    // Filter ALL profiles
    const matches = window.state.allProfiles.filter(p => {
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
    <div class="suggestion-item" onclick="window.AppModules.selectSuggestion('${p['Imie postaci']}')">
      <span class="suggestion-name">${p['Imie postaci']}</span>
      <span class="suggestion-meta">${p['Gildia']} • ${p['Region']}</span>
    </div>
  `).join('');

    suggestionsPanel.style.display = 'block';
}

export function selectSuggestion(name) {
    const input = document.getElementById('searchName');
    const suggestionsPanel = document.getElementById('searchSuggestions');

    if (input) input.value = name;
    if (suggestionsPanel) suggestionsPanel.style.display = 'none';
}

export function hideSuggestions() {
    const suggestionsPanel = document.getElementById('searchSuggestions');
    if (suggestionsPanel) suggestionsPanel.style.display = 'none';
}

export function searchByTag(tagName) {
    if (window.addLog) window.addLog('info', `Szukam postaci z tagiem: ${tagName}`);

    if (window.state.allProfiles.length === 0) {
        if (window.addLog) window.addLog('warn', 'Brak załadowanych profili. Poczekaj na załadowanie danych.');
        return;
    }

    // Filter profiles that have this tag
    const matches = window.state.allProfiles.filter(p => {
        if (p.Tags && Array.isArray(p.Tags)) {
            return p.Tags.some(t => t.name === tagName);
        }
        return false;
    });

    if (matches.length > 0) {
        window.state.sheetData = { success: true, rows: matches };
        if (window.addLog) window.addLog('success', `Znaleziono ${matches.length} postaci z tagiem "${tagName}"`);
        window.state.currentStep = 2;
        if (window.renderStep) window.renderStep();
    } else {
        if (window.addLog) window.addLog('warn', `Brak postaci z tagiem "${tagName}". Próbuję wyszukiwanie pełnotekstowe...`);
        // Fallback to full-text search
        document.getElementById('searchName').value = tagName;
        loadDataSource();
    }
}

// ==============================
// Data Loading
// ==============================

export async function loadDataSource() {
    const source = document.getElementById('dataSource')?.value || 'larpgothic';
    const searchName = document.getElementById('searchName')?.value || '';

    if (window.addLog) window.addLog('info', `Ładowanie danych z: ${source}...`);
    if (window.setProgress) window.setProgress(0, 'Ładowanie...');

    let result;

    if (source === 'larpgothic') {
        // Use cached data if available for local filtering
        if (window.state.allProfiles.length > 0) {
            if (window.addLog) window.addLog('info', 'Używam pobranej bazy do lokalnego filtrowania...');
            const query = searchName.toLowerCase();

            const filtered = window.state.allProfiles.filter(p => {
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
        if (window.addLog) window.addLog('warn', 'Lokalne pliki - nie zaimplementowano');
        return;
    }

    if (result.success) {
        window.state.sheetData = { ...result, rows: deduplicateProfiles(result.rows) };
        if (window.addLog) window.addLog('success', `Załadowano/przefiltrowano ${result.rows.length} wierszy`);
        if (window.setProgress) window.setProgress(100, 'Dane gotowe');

        // Navigate to extraction step if data loaded
        if (result.rows.length > 0) {
            window.state.currentStep = 2;
            if (window.renderStep) window.renderStep();
        } else {
            if (window.addLog) window.addLog('warn', 'Brak wyników dla podanego wyszukiwania.');
        }
    } else {
        if (window.addLog) window.addLog('error', `Błąd ładowania: ${result.error || 'Nieznany błąd'}`);
    }
}

// ==============================
// Sorting & Selection
// ==============================

export function getSortedRows() {
    if (!window.state.sheetData || !window.state.sheetData.rows) return [];

    // Add original index to each row for proper selection
    const rowsWithIndex = window.state.sheetData.rows.map((row, i) => ({ ...row, _originalIndex: i }));

    return rowsWithIndex.sort((a, b) => {
        let valA, valB;

        switch (window.state.sortBy) {
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

        if (window.state.sortDir === 'asc') {
            return valA.localeCompare(valB, 'pl');
        } else {
            return valB.localeCompare(valA, 'pl');
        }
    });
}

export function sortData(column) {
    if (window.state.sortBy === column) {
        // Toggle direction
        window.state.sortDir = window.state.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
        window.state.sortBy = column;
        window.state.sortDir = 'asc';
    }
    if (window.renderStep) window.renderStep();
}

export function selectRow(index) {
    // Issue #7: Save scroll position to prevent list jump
    const scrollContainer = document.getElementById('characterTableContainer');
    const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

    // Issue #12: Save/Restore Character Session
    // Save previous session if exists
    if (window.state.selectedRow !== null && window.state.selectedRow !== index && window.state.sheetData?.rows) {
        const oldChar = window.state.sheetData.rows[window.state.selectedRow];
        if (oldChar) {
            const oldId = oldChar.id || oldChar['Imie postaci'];
            if (!window.state.characterSessions) window.state.characterSessions = {};

            window.state.characterSessions[oldId] = {
                feed: [...(window.state.aiResultsFeed || [])],
                result: window.state.aiResult
            };
        }
    }

    // Switch selection
    window.state.selectedRow = index;

    // Restore new session or clear
    const newChar = window.state.sheetData.rows[index];
    if (newChar) {
        const newId = newChar.id || newChar['Imie postaci'];
        if (!window.state.characterSessions) window.state.characterSessions = {};

        const session = window.state.characterSessions[newId];
        if (session) {
            window.state.aiResultsFeed = [...session.feed];
            window.state.aiResult = session.result;
        } else {
            // New session - clear previous context
            window.state.aiResultsFeed = [];
            window.state.aiResult = null;
        }
    }

    if (window.renderStep) window.renderStep();

    // Issue #7: Restore scroll position
    const newScrollContainer = document.getElementById('characterTableContainer');
    if (newScrollContainer) {
        newScrollContainer.scrollTop = scrollTop;
    }

    if (window.addLog) window.addLog('info', `Wybrano postać: ${window.state.sheetData.rows[index]['Imie postaci'] || 'bez nazwy'}`);
}

// Local Helper
function deduplicateProfiles(rows) {
    if (!rows || rows.length === 0) return [];

    // 1. Sort by ID descending (newest first) to prioritize latest entries
    const sorted = [...rows].sort((a, b) => parseInt(b.id || 0) - parseInt(a.id || 0));

    // 2. Group by Name (case-insensitive)
    const byName = new Map();
    sorted.forEach(row => {
        const name = (row['Imie postaci'] || '').trim();
        if (!name) return;

        // Normalize name key
        const key = name.toLowerCase();

        if (!byName.has(key)) {
            byName.set(key, { name: name, entries: [] });
        }
        byName.get(key).entries.push(row);
    });

    // 3. Select best entry for each name
    const result = [];
    byName.forEach(group => {
        // For now, just take the first one (newest ID)
        result.push(group.entries[0]);
    });

    return result;
}
