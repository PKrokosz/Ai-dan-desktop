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

export function handleSearchInput(event) {
    const input = document.getElementById('searchName');
    const suggestionsPanel = document.getElementById('searchSuggestions');

    if (!input || !suggestionsPanel || !window.state.allProfiles || window.state.allProfiles.length === 0) return;

    // Handle Keyboard Navigation
    if (event && (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === 'Tab')) {
        const items = suggestionsPanel.querySelectorAll('.suggestion-item:not(.no-results)');
        if (items.length > 0) {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                window.state.ui.suggestionIndex = Math.min(window.state.ui.suggestionIndex + 1, items.length - 1);
                updateSuggestionHighlight(items);
                return;
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                window.state.ui.suggestionIndex = Math.max(window.state.ui.suggestionIndex - 1, -1);
                updateSuggestionHighlight(items);
                return;
            }
            if (event.key === 'Enter' || event.key === 'Tab') {
                if (window.state.ui.suggestionIndex >= 0) {
                    event.preventDefault();
                    items[window.state.ui.suggestionIndex].click();
                    if (event.key === 'Enter') loadDataSource();
                    return;
                }
            }
        }
    }

    const query = input.value.toLowerCase().trim();
    window.state.ui.suggestionIndex = -1; // Reset highlight

    if (query.length < 2) {
        suggestionsPanel.style.display = 'none';
        return;
    }

    // Filter ALL profiles based on Expanded Fields
    const matches = window.state.allProfiles.filter(p => {
        const name = (p['Imie postaci'] || '').toLowerCase();
        const guild = (p['Gildia'] || '').toLowerCase();
        const region = (p['Region'] || '').toLowerCase();
        const group = (p['StoryGroup'] || '').toLowerCase();
        const city = (p['Miejscowosc'] || '').toLowerCase();

        // Match in Tags
        const tags = (p.Tags || []).map(t => t.name.toLowerCase());

        // Match in Storyline Data (Enriched fields)
        const lore = `${p['Fabuła_Opis'] || ''} ${p['Fabuła_SłowaKluczowe'] || ''} ${p['Fabuła_Wątki'] || ''} ${p['Fabuła_Notatki'] || ''}`.toLowerCase();

        return name.includes(query) ||
            guild.includes(query) ||
            region.includes(query) ||
            group.includes(query) ||
            city.includes(query) ||
            tags.some(t => t.includes(query)) ||
            lore.includes(query);
    }).slice(0, 15); // Show top 15 matches

    if (matches.length === 0) {
        suggestionsPanel.innerHTML = '<div class="suggestion-item no-results">Brak wyników dla "' + query + '"</div>';
        suggestionsPanel.style.display = 'block';
        return;
    }

    suggestionsPanel.innerHTML = matches.map(p => `
    <div class="suggestion-item" onclick="window.AppModules.selectSuggestion('${p['Imie postaci']}')">
      <div class="suggestion-name">${p['Imie postaci']}</div>
      <div class="suggestion-meta">
        ${p['Gildia']} • ${p['Region']}
        ${p['StoryGroup'] ? `<br><small style="opacity: 0.6">${p['StoryGroup']}</small>` : ''}
      </div>
    </div>
  `).join('');

    suggestionsPanel.style.display = 'block';
}

function updateSuggestionHighlight(items) {
    items.forEach((item, idx) => {
        if (idx === window.state.ui.suggestionIndex) {
            item.classList.add('active');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('active');
        }
    });
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

    const t = tagName.toLowerCase();

    // Camp Filtering Logic (Map camp tag to multiple guilds)
    const CAMP_GUILDS = {
        'stary obóz': ['kopacz', 'cień', 'strażnik', 'magnat', 'służba'],
        'nowy obóz': ['kret', 'szkodnik', 'najemnik', 'mag wody'],
        'bractwo': ['nowicjusz', 'strażnik świątynny', 'guru'],
    };

    // Filter profiles
    const matches = window.state.allProfiles.filter(p => {
        // 1. Direct tag match
        if (p.Tags && Array.isArray(p.Tags)) {
            const hasTag = p.Tags.some(tag => tag.name.toLowerCase() === t);
            if (hasTag) return true;
        }

        // 2. Camp-to-Guild match
        if (CAMP_GUILDS[t]) {
            const guild = (p['Gildia'] || '').toLowerCase();
            return CAMP_GUILDS[t].some(g => guild.includes(g));
        }

        return false;
    });

    if (matches.length > 0) {
        window.state.sheetData = { success: true, rows: matches };
        if (window.addLog) window.addLog('success', `Znaleziono ${matches.length} postaci dla filtra "${tagName}"`);
        window.state.currentStep = 2;
        if (window.renderStep) window.renderStep();
    } else {
        if (window.addLog) window.addLog('warn', `Brak postaci dla filtra "${tagName}". Próbuję wyszukiwanie pełnotekstowe...`);
        // Fallback to full-text search
        document.getElementById('searchName').value = tagName;
        loadDataSource();
    }
}

// Global Keyboard Listener for Search Bar (ensure it handles keys correctly)
document.addEventListener('keydown', (e) => {
    if (e.target.id === 'searchName') {
        handleSearchInput(e);
    }
});

// Input event listener for typing (triggers suggestions on each keystroke)
document.addEventListener('input', (e) => {
    if (e.target.id === 'searchName') {
        handleSearchInput(e);
    }
});

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

                // Advanced Prefix Search (e.g. "gildia:cień")
                if (query.includes(':')) {
                    const parts = query.split(/\s+/); // Split by spaces
                    return parts.every(part => {
                        if (part.includes(':')) {
                            const [key, val] = part.split(':');
                            if (!val) return true;

                            // Map prefixes to fields
                            if (['gildia', 'guild', 'g'].includes(key)) return (p['Gildia'] || '').toLowerCase().includes(val);
                            if (['region', 'reg', 'r'].includes(key)) return (p['Region'] || '').toLowerCase().includes(val);
                            if (['id'].includes(key)) return (p['id'] || '').toString() === val;
                            if (['grupa', 'group', 'story', 's'].includes(key)) return (p['StoryGroup'] || '').toLowerCase().includes(val);
                            if (['imie', 'name', 'n'].includes(key)) return (p['Imie postaci'] || '').toLowerCase().includes(val);
                            if (['tag', 't'].includes(key)) return (p.Tags || []).some(t => t.name.toLowerCase().includes(val));

                            return false; // Unknown prefix fails match
                        }
                        // Non-prefixed part = Global Search
                        return (p['Imie postaci']?.toLowerCase().includes(part)) ||
                            (p['Gildia']?.toLowerCase().includes(part)) ||
                            (p['Region']?.toLowerCase().includes(part));
                    });
                }

                // Default Global Search (OR)
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

    // Filter logic integrated into sorting
    const filteredRows = rowsWithIndex.filter(row => {
        // 1. Guild Filter
        if (window.state.filterGuild && window.state.filterGuild !== 'all') {
            const g = (row['Gildia'] || '').toLowerCase();
            const f = window.state.filterGuild.toLowerCase();
            // Simple string matching for now (e.g. 'mag' matches 'Mag Ognia')
            if (!g.includes(f)) return false;
        }

        // 2. Story Group Filter
        if (window.state.filterGroup && window.state.filterGroup !== 'all') {
            const rowGroup = (row['StoryGroup'] || '').toLowerCase();
            if (rowGroup !== window.state.filterGroup.toLowerCase()) return false;
        }

        return true;
    });

    return filteredRows.sort((a, b) => {
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
            case 'seniority': // New Sort
                // Parse seniority from text (simplified heuristic again, mirroring extraction)
                const getSen = (r) => {
                    const txt = ((r['O postaci'] || '') + (r['Fakty'] || '')).toLowerCase();
                    const m = txt.match(/(\d+)\.?\s*(edycja|raz)/);
                    if (m) return parseInt(m[1]);
                    if (txt.includes('weteran')) return 5;
                    return 0;
                };
                valA = getSen(a);
                valB = getSen(b);
                break;
            default:
                valA = a['Imie postaci'] || '';
                valB = b['Imie postaci'] || '';
        }

        if (window.state.sortDir === 'asc') {
            if (valA < valB) return -1;
            if (valA > valB) return 1;
            return 0;
        } else {
            if (valA < valB) return 1;
            if (valA > valB) return -1;
            return 0;
        }
    });
}

export function setFilters(guild, group) {
    if (guild !== undefined) window.state.filterGuild = guild;
    if (group !== undefined) window.state.filterGroup = group;
    if (window.renderStep) window.renderStep();
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

// ==============================
// Creative Spark (Iskra) ⚡
// ==============================
import { createModal } from './ui-modal-helper.js';

export function triggerSpark(index) {
    if (!window.state.sheetData || !window.state.sheetData.rows[index]) return;

    const char = window.state.sheetData.rows[index];
    const hook = generateHeuristicHook(char);

    // Format output with strict structure
    const outputHtml = `
      <div style="font-family: 'Courier New', monospace; color: var(--text-primary); padding: 10px;">
        <div style="margin-bottom: 20px; font-size: 14px; line-height: 1.8;">
           <span style="color: var(--gold-bright);">[KTO]</span> <span style="color: #fff; font-weight: bold;">${hook.kto}</span><br>
           <span style="color: var(--gold-bright);">[KOMU]</span> ${hook.komu}<br>
           <span style="color: var(--gold-bright);">[CO]</span> ${hook.co}<br>
           <span style="color: var(--gold-bright);">[KIEDY]</span> ${hook.kiedy}<br>
           <span style="color: var(--gold-bright);">[EFEKT]</span> ${hook.efekt}<br>
           <span style="color: #ff5555;">[GROŹBA]</span> ${hook.grozba}
        </div>
        
        <div style="font-style: italic; color: var(--text-dim); border-top: 1px solid var(--border-subtle); padding-top: 10px;">
           "Szybki Hook" wygenerowany na podstawie analizy gildii i statusu.
        </div>
      </div>
    `;

    createModal('spark-modal', `⚡ Iskra Fabularna: ${char['Imie postaci']}`, outputHtml);
}

function generateHeuristicHook(char) {
    const guild = (char['Gildia'] || '').toLowerCase();
    const name = char['Imie postaci'] || 'Postać';

    // Arrays for randomization
    const targets = ['Thorus', 'Gomez', 'Cor Kalom', 'Lee', 'Lares', 'Diego', 'Fisk', 'Wrzód', 'Sędzia', 'Kowal Huno'];
    const actions = [
        'Musi dostarczyć 50 bryłek rudy',
        'Ma znaleźć zaginionego kopacza',
        'Musi ukraść pierścień strażnika',
        'Ma zabić ścierwojada przy bramie',
        'Musi przekazać tajny list',
        'Ma śledzić podejrzanego nowicjusza',
        'Musi odpracować dług (zbieranie ziela)'
    ];
    const deadlines = ['Do świtu', 'Przed zmianą warty', 'Natychmiast', 'W ciągu godziny', 'Do jutra', 'Zanim wróci konwój'];
    const rewards = ['Ochrona przed strażą', 'Mieszek złota (10 bryłek)', 'Dobre słowo u Magnata', 'Mikstura lecząca', 'Przydział ryżu', 'Lepszy kilof'];
    const threats = ['Wypadek w kopalni', 'Wizyta w karcerze', 'Brak przydziału wody', 'Gniew Magnatów', 'Pobicie przez straż', 'Zesłanie na bagna'];

    // Heuristic Context Adjustments
    let potentialTargets = targets;
    if (guild.includes('nowy') || guild.includes('szkodnik')) potentialTargets = ['Lee', 'Lares', 'Lewus', 'Ryżowy Książę', 'Cronos'];
    if (guild.includes('bractwo') || guild.includes('sekta')) potentialTargets = ['Y' + 'Berion', 'Cor Kalom', 'Cor Angar', 'Baal Lukor', 'Fortuno']; // 'Y' + 'Berion' to avoid lint issues? No, YBerion is fine.

    return {
        kto: name,
        komu: pickRandom(potentialTargets),
        co: pickRandom(actions),
        kiedy: pickRandom(deadlines),
        efekt: pickRandom(rewards),
        grozba: pickRandom(threats) // Threat
    };
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
