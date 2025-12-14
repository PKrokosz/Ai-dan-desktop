/**
 * @module api-functions
 * @description Funkcje API - Ollama, data loading, model management
 * ES6 Module - Faza 5 modularizacji
 */

import { state } from './state.js';
import { addLog, setProgress, renderStep } from './ui-helpers.js';
import { renderModelCategories, populateModelSelects } from './model-selector.js';

// ==============================
// Ollama Connection
// ==============================

/**
 * Check Ollama connection and update status
 */
export async function checkOllama() {
    addLog('info', 'Sprawdzam połączenie z Ollama...');
    const result = await window.electronAPI.checkOllama();

    const statusEl = document.getElementById('ollamaStatus');
    if (result.connected) {
        state.ollamaConnected = true;
        state.ollamaModels = result.models;
        if (statusEl) {
            statusEl.innerHTML = `<span class="status-dot online"></span> <span>Ollama: online (${result.models.length} modeli)</span>`;
        }
        addLog('success', `Ollama połączone: ${result.models.length} modeli dostępnych`);

        updateModelStatuses();

        if (state.currentStep === 1 || state.currentStep === 3) {
            if (typeof renderModelCategories === 'function') renderModelCategories();
            if (typeof populateModelSelects === 'function') populateModelSelects();
        }
    } else {
        if (statusEl) {
            statusEl.innerHTML = `<span class="status-dot offline"></span> <span>Ollama: offline</span>`;
        }
        addLog('error', `Ollama niedostępne: ${result.error}`);
    }
}

/**
 * Update model installation statuses
 */
export function updateModelStatuses() {
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

// ==============================
// Model Download Queue
// ==============================

/**
 * Update download queue UI
 */
export function updateDownloadQueue() {
    let container = document.getElementById('download-queue');
    if (!container) {
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            container = document.createElement('div');
            container.id = 'download-queue';
            container.className = 'download-queue';
            progressBar.parentElement.insertBefore(container, progressBar);
        }
    }
    if (!container) return;

    const downloads = Object.entries(state.activeDownloads || {});
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

/**
 * Pull/download a model from Ollama
 * @param {string} modelName - Model name to download
 */
export async function pullModel(modelName) {
    addLog('info', `Pobieranie modelu ${modelName}...`);

    if (!state.activeDownloads) state.activeDownloads = {};
    state.activeDownloads[modelName] = { percent: 0, status: 'starting' };
    updateDownloadQueue();

    const result = await window.electronAPI.pullModel(modelName);

    delete state.activeDownloads[modelName];
    updateDownloadQueue();

    if (result.success) {
        addLog('success', `Model ${modelName} pobrany`);
        await checkOllama();
    } else {
        addLog('error', `Błąd pobierania: ${result.error}`);
    }
}

// ==============================
// Data Loading
// ==============================

/**
 * Deduplicate profiles by ID or name
 * @param {Array} profiles - Array of profiles
 * @returns {Array} Deduplicated profiles
 */
export function deduplicateProfiles(profiles) {
    if (!profiles) return [];
    const seen = new Set();
    return profiles.filter(p => {
        const key = p.id || p['Imie postaci'] || JSON.stringify(p);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/**
 * Load data from selected source
 */
export async function loadDataSource() {
    const source = document.getElementById('dataSource')?.value || 'larpgothic';
    const searchName = document.getElementById('searchName')?.value || '';

    addLog('info', `Ładowanie danych z: ${source}...`);
    setProgress(0, 'Ładowanie...');

    let result;

    if (source === 'larpgothic') {
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
            await new Promise(r => setTimeout(r, 200));
        } else {
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
        state.sheetData = { ...result, rows: deduplicateProfiles(result.rows) };
        addLog('success', `Załadowano/przefiltrowano ${result.rows.length} wierszy`);
        setProgress(100, 'Dane gotowe');

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

// ==============================
// Row Selection & Sorting
// ==============================

/**
 * Get sorted rows
 * @returns {Array} Sorted rows with original index
 */
export function getSortedRows() {
    if (!state.sheetData || !state.sheetData.rows) return [];

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

/**
 * Sort data by column
 * @param {string} column - Column to sort by
 */
export function sortData(column) {
    if (state.sortBy === column) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
        state.sortBy = column;
        state.sortDir = 'asc';
    }
    renderStep();
}

/**
 * Select a row/character
 * @param {number} index - Row index
 */
export function selectRow(index) {
    const scrollContainer = document.getElementById('characterTableContainer');
    const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

    // Save previous session
    if (state.selectedRow !== null && state.selectedRow !== index && state.sheetData?.rows) {
        const oldChar = state.sheetData.rows[state.selectedRow];
        if (oldChar) {
            const oldId = oldChar.id || oldChar['Imie postaci'];
            if (!state.characterSessions) state.characterSessions = {};
            state.characterSessions[oldId] = {
                feed: [...(state.aiResultsFeed || [])],
                result: state.aiResult
            };
        }
    }

    state.selectedRow = index;

    // Restore session
    const newChar = state.sheetData.rows[index];
    if (newChar) {
        const newId = newChar.id || newChar['Imie postaci'];
        if (!state.characterSessions) state.characterSessions = {};
        const session = state.characterSessions[newId];
        if (session) {
            state.aiResultsFeed = [...session.feed];
            state.aiResult = session.result;
        } else {
            state.aiResultsFeed = [];
            state.aiResult = null;
        }
    }

    renderStep();

    const newScrollContainer = document.getElementById('characterTableContainer');
    if (newScrollContainer) {
        newScrollContainer.scrollTop = scrollTop;
    }

    addLog('info', `Wybrano postać: ${state.sheetData.rows[index]['Imie postaci'] || 'bez nazwy'}`);
}

// ==============================
// Processing Functions
// ==============================

/**
 * Process AI lanes for selected character
 */
export async function processAI() {
    if (state.selectedRow === null) {
        addLog('warn', 'Najpierw wybierz postać w kroku 2');
        return;
    }

    state.isProcessing = true;
    renderStep();

    const lanes = ['historia', 'relacje', 'aspiracje', 'slabosci', 'umiejetnosci', 'geolore'];

    for (let i = 0; i < lanes.length; i++) {
        const lane = lanes[i];
        const el = document.getElementById(`lane-${lane}`);
        if (el) {
            el.classList.add('processing');
            el.querySelector('.lane-status').textContent = 'Przetwarzam...';
        }

        addLog('info', `[${i + 1}/${lanes.length}] Przetwarzam: ${lane}`);
        setProgress(Math.round((i / lanes.length) * 100), `Analizuję: ${lane}`);

        const result = await window.electronAPI.processLane(lane, state.sheetData?.rows[state.selectedRow]);

        if (result.success) {
            if (!state.laneResults) state.laneResults = [];
            state.laneResults.push(result);
        }

        if (el) {
            el.classList.remove('processing');
            el.classList.add('done');
            el.querySelector('.lane-status').textContent = 'Gotowe';
        }
    }

    const reduceResult = await window.electronAPI.reduceProfile(state.laneResults);
    state.profile = reduceResult.profile;

    state.isProcessing = false;
    setProgress(100, 'AI Processing zakończone');
    addLog('success', 'Wszystkie ścieżki przetworzone');
}

/**
 * Generate quests for current profile
 */
export async function generateQuests() {
    addLog('info', 'Generowanie questów...');
    setProgress(0, 'Generowanie questów...');

    const result = await window.electronAPI.generateQuests(state.profile);

    if (result.success) {
        state.quests = result.quests;
        addLog('success', `Wygenerowano ${result.quests.length} questów`);
        setProgress(100, 'Questy gotowe');
        renderStep();
    } else {
        addLog('error', `Błąd generowania: ${result.error}`);
    }
}

/**
 * Export results
 */
export async function exportResults() {
    const format = document.getElementById('exportFormat')?.value || 'json';
    addLog('info', `Eksportuję w formacie: ${format}...`);

    const result = await window.electronAPI.exportResults({
        profile: state.profile,
        quests: state.quests,
        format: format
    });

    if (result.success) {
        addLog('success', `Wyeksportowano do: ${result.path}`);
    } else {
        addLog('error', `Błąd eksportu: ${result.error}`);
    }
}

/**
 * Open output folder
 */
export async function openOutputFolder() {
    await window.electronAPI.openOutputFolder();
}

// Make globally available
if (typeof window !== 'undefined') {
    window.checkOllama = checkOllama;
    window.updateModelStatuses = updateModelStatuses;
    window.pullModel = pullModel;
    window.loadDataSource = loadDataSource;
    window.getSortedRows = getSortedRows;
    window.sortData = sortData;
    window.selectRow = selectRow;
    window.processAI = processAI;
    window.generateQuests = generateQuests;
    window.exportResults = exportResults;
    window.openOutputFolder = openOutputFolder;
    window.deduplicateProfiles = deduplicateProfiles;
}
