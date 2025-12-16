/**
 * @module testbench
 * @description Compact Pipeline Validator - Focuses on verifying AI commands.
 * ES6 Module
 */

import { addLog } from './ui-helpers.js';
import { runFullPipelineTest, stopPipelineTest, TEST_SEQUENCE } from './automated-test.js';

// ==============================
// Template
// ==============================

// ==============================
// Constants
// ==============================

// ==============================
// Template
// ==============================

export function getTestbenchTemplate() {
  return `
    <div class="card" style="margin-bottom: 20px;">
      <h3 class="card-title">🧪 Pipeline Validator</h3>
      <p style="color: var(--text-dim); margin-bottom: 15px; font-size: 13px;">
        Narzędzie walidacji komend zdefiniowanych w <code>pipeline_map.md</code>.
        Uruchamia sekwencję testową na aktualnie wybranym modelu i postaci.
      </p>
      
      <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 15px;">
          <div class="form-group" style="flex: 1; min-width: 250px;">
            <label class="form-label">Wybierz postać testową</label>
            <select class="form-select" id="testbenchProfileSelect" onchange="window.AppModules.selectTestProfile(this.value)">
                <option value="">-- Wybierz postać --</option>
            </select>
          </div>

          <div class="form-group" style="flex: 1; min-width: 250px;">
            <label class="form-label">Wybierz model do testów</label>
            <select class="form-select" id="testbenchModelSelect" onchange="state.selectedModel = this.value">
                <option value="">Wybierz model...</option>
            </select>
            <div id="testbench-model-hint" style="font-size: 11px; color: var(--gold); margin-top: 4px; display: none;"></div>
          </div>
      </div>

      <div class="action-bar" style="display: flex; gap: 10px; margin-bottom: 20px; align-items: center;">
          <button class="btn btn-primary" id="btnStartPipeline" onclick="window.AppModules.runTestbench()">
             ▶ Uruchom Walidację Pipeline'u
          </button>
          <button class="btn btn-secondary" id="btnStopPipeline" onclick="window.AppModules.cancelTestbench()" disabled>
             ⏹ Zatrzymaj
          </button>
          
          <div id="testbench-global-status" style="margin-left: 15px; font-size: 13px; color: var(--text-dim); display: none;">
             <span class="spinner-small" style="display: inline-block; width: 12px; height: 12px; border: 2px solid var(--text-dim); border-top-color: var(--gold); border-radius: 50%; animation: spin 1s linear infinite; margin-right: 8px;"></span>
             <span>Inicjalizacja...</span>
          </div>
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">📋 Raport Walidacji</h3>
      <div class="table-container" style="max-height: 500px; overflow-y: auto;">
          <table class="data-table" id="pipelineTable" style="width: 100%; border-collapse: collapse;">
              <thead>
                  <tr style="text-align: left; background: var(--bg-darker);">
                      <th style="padding: 10px;">ID</th>
                      <th>Komenda / Input</th>
                      <th>Status</th>
                      <th>Wynik</th>
                  </tr>
              </thead>
              <tbody id="pipelineTableBody">
                  ${renderRows()}
              </tbody>
          </table>
      </div>
    </div>
  `;
}

function renderRows() {
  const results = state.testbenchResults || {};

  return TEST_SEQUENCE.map((item, index) => {
    // Input content preview logic
    let inputPreview = '';
    if (item.inputField && state.selectedRow !== null && state.sheetData?.rows?.[state.selectedRow]) {
      const content = state.sheetData.rows[state.selectedRow][item.inputField] || '';
      if (content) {
        inputPreview = `<div class="input-preview-box" title="Oryginalna treść z pola: ${item.inputField}">${content.substring(0, 80)}${content.length > 80 ? '...' : ''}</div>`;
      }
    }

    // Check for saved result
    const saved = results[index] || { status: 'pending', result: null };

    let statusHtml = '<span class="status-badge pending">Oczekuje</span>';
    let rowStyle = 'border-bottom: 1px solid var(--border-subtle);';
    let resultHtml = '-';

    if (saved.status === 'running') {
      statusHtml = '<span style="color: var(--gold);">⏳ Przetwarzanie...</span>';
      rowStyle += ' background: rgba(255, 215, 0, 0.05);';
    } else if (saved.status === 'success') {
      statusHtml = '<span style="color: var(--success);">✅ OK</span>';
      resultHtml = formatResultHtml(index, saved.result);
    } else if (saved.status === 'error') {
      statusHtml = '<span style="color: var(--error);">❌ Błąd</span>';
      rowStyle += ' background: rgba(255, 0, 0, 0.05);';
      resultHtml = saved.result || 'Error';
    }

    return `
        <tr id="test-row-${index}" style="${rowStyle}">
            <td style="padding: 8px; color: var(--text-dim);">#${index + 1}</td>
            <td style="padding: 8px;">
                <div style="font-weight: bold;">${item.label}</div>
                <div style="font-size: 11px; color: var(--text-dim); font-family: monospace;">${item.cmd}</div>
                ${inputPreview}
            </td>
            <td style="padding: 8px;" id="test-status-${index}">
                ${statusHtml}
            </td>
            <td style="padding: 8px; font-size: 11px; max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" id="test-result-${index}">
                ${resultHtml}
            </td>
        </tr>
    `;
  }).join('');
}

function formatResultHtml(index, resultText) {
  if (!resultText) return '-';
  const shortText = resultText.substring(0, 80) + '...';
  // Escape HTML logic for full text
  const fullText = resultText.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const resultId = `res-content-${index}`;

  return `
        <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="color: var(--text-muted);">${shortText}</span>
            <button class="btn btn-sm" style="font-size: 10px; padding: 2px 6px;" onclick="const el = document.getElementById('${resultId}'); el.style.display = el.style.display === 'none' ? 'block' : 'none'">
                👁️ Pokaż
            </button>
        </div>
        <div id="${resultId}" style="display: none; margin-top: 8px; padding: 8px; background: var(--bg-dark); border: 1px solid var(--border-subtle); border-radius: 4px; white-space: pre-wrap; font-family: monospace; font-size: 11px; color: var(--text-primary); max-height: 300px; overflow-y: auto;">
            ${fullText}
        </div>
    `;
}

// ==============================
// Logic
// ==============================

import { state } from './state.js';

let cachedTestProfiles = [];

export function selectTestProfile(profileId) {
  // Search in cached profiles or all profiles
  let profile = cachedTestProfiles.find(p => p.id === profileId);

  // If not in cache (shouldn't happen if selected from dropdown), try finding in allProfiles
  if (!profile && state.allProfiles) {
    const rawProfile = state.allProfiles.find(p => (p.id || p['Imie postaci']) === profileId);
    if (rawProfile) {
      profile = {
        id: rawProfile.id || rawProfile['Imie postaci'],
        name: rawProfile['Imie postaci'],
        data: rawProfile
      };
    }
  }

  if (profile) {
    // Mock state data for the test context
    state.sheetData = { rows: [profile.data] };
    state.selectedRow = 0;
    addLog('info', `Wybrano postać testową: ${profile.name}`);

    // Refresh table to show correct input previews
    // But do not wipe results if we are just verifying inputs? Maybe reset?
    // Usually selecting new profile implies new test.
    // state.testbenchResults = {}; // Optional: auto-reset? Let's leave manual reset for button.

    const tableBody = document.getElementById('pipelineTableBody');
    if (tableBody) tableBody.innerHTML = renderRows();
  }
}

export function initTestbenchView() {
  // Populate model select
  const selectModel = document.getElementById('testbenchModelSelect');
  if (selectModel) {
    selectModel.innerHTML = '<option value="">-- Wybierz model --</option>';
    if (state.ollamaModels && state.ollamaModels.length > 0) {
      state.ollamaModels.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.name;
        opt.textContent = `${m.name} (${(m.size / 1024 / 1024 / 1024).toFixed(1)} GB)`;
        if (state.selectedModel === m.name) opt.selected = true;
        selectModel.appendChild(opt);
      });
    }
  }

  // Populate profile select with REAL data
  const selectProfile = document.getElementById('testbenchProfileSelect');
  if (selectProfile) {
    selectProfile.innerHTML = '<option value="">-- Wybierz postać --</option>';

    // 1. Check if we have data
    if (!state.allProfiles || state.allProfiles.length === 0) {
      const opt = document.createElement('option');
      opt.disabled = true;
      opt.textContent = 'Brak danych - załaduj w Kroku 1';
      selectProfile.appendChild(opt);
    } else {
      // 2. Select 5 random profiles if not already cached
      if (cachedTestProfiles.length === 0) {
        const shuffled = [...state.allProfiles].sort(() => 0.5 - Math.random());
        cachedTestProfiles = shuffled.slice(0, 5).map(p => ({
          id: p.id || p['Imie postaci'], // fallback ID
          name: `${p['Imie postaci']} (${p['Gildia'] || 'Nieznana'})`,
          data: p
        }));
      }

      // 3. Render options
      cachedTestProfiles.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        selectProfile.appendChild(opt);
      });
    }

    // Helper: styling for input preview box
    if (!document.getElementById('testbench-styles')) {
      const style = document.createElement('style');
      style.id = 'testbench-styles';
      style.textContent = `
              .input-preview-box {
                  margin-top: 5px;
                  padding: 4px 6px;
                  background: rgba(0, 100, 255, 0.1);
                  border-left: 3px solid #0066ff;
                  color: var(--text-dim);
                  font-size: 10px;
                  border-radius: 0 4px 4px 0;
                  max-width: 100%;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
              }
          `;
      document.head.appendChild(style);
    }
  }
}

export function runTestbench() {
  const btnStart = document.getElementById('btnStartPipeline');
  const btnStop = document.getElementById('btnStopPipeline');
  const globalStatus = document.getElementById('testbench-global-status');
  const statusText = globalStatus ? globalStatus.querySelector('span:last-child') : null;

  if (state.selectedRow === null || state.selectedRow === undefined) {
    addLog('error', 'Wybierz najpierw postać testową!');
    return;
  }

  if (btnStart) btnStart.disabled = true;
  if (btnStop) btnStop.disabled = false;

  // Show immediate feedback
  if (globalStatus) {
    globalStatus.style.display = 'flex';
    if (statusText) statusText.textContent = 'Przygotowywanie...';
  }

  // Initialize persistence if missing
  state.testbenchResults = {};

  // Reset UI
  // Deprecated: we now rely on renderRows re-rendering based on state.testbenchResults
  const tableBody = document.getElementById('pipelineTableBody');
  if (tableBody) tableBody.innerHTML = renderRows(); // Refreshes with empty results

  runFullPipelineTest((index, status, resultText) => {
    if (index === -1) {
      // Global status update
      if (status === 'completed') {
        if (btnStart) btnStart.disabled = false;
        if (btnStop) btnStop.disabled = true;
        if (globalStatus) globalStatus.style.display = 'none';
      }
      return;
    }

    // CAPTURE METADATA from the latest feed item
    // runFullPipelineTest calls this callback with resultText which is content.
    // We want to find the corresponding item in state.aiResultsFeed to get system/prompt.
    // The test runs sequentially, so we can look at the latest item in feed
    // that matches the logic (or simply the last one).
    let metadata = {};
    const lastFeedItem = state.aiResultsFeed && state.aiResultsFeed.length > 0
      ? state.aiResultsFeed[state.aiResultsFeed.length - 1]
      : null;

    if (lastFeedItem && lastFeedItem.command === TEST_SEQUENCE[index].label) {
      metadata = {
        system: lastFeedItem.system,
        prompt: lastFeedItem.prompt,
        model: lastFeedItem.model
      };
    } else if (lastFeedItem) {
      // Fallback: If command label didn't perfectly match (e.g. truncated), try assuming it's the last one
      metadata = {
        system: lastFeedItem.system,
        prompt: lastFeedItem.prompt,
        model: lastFeedItem.model
      };
    }

    // Save to state
    if (!state.testbenchResults) state.testbenchResults = {};
    const previous = state.testbenchResults[index] || {};
    state.testbenchResults[index] = {
      status: status,
      result: (status === 'success' || status === 'error') ? resultText : previous.result,
      ...metadata // Spread captured metadata
    };

    // Update global status text on each step
    if (statusText && status === 'running') {
      statusText.textContent = `Testowanie: ${TEST_SEQUENCE[index]?.label || '...'}`;
    }

    // Direct DOM manipulation for instant feedback (in case renderStep is slow/debounced)
    const statusEl = document.getElementById(`test-status-${index}`);
    const resultEl = document.getElementById(`test-result-${index}`);
    const rowEl = document.getElementById(`test-row-${index}`);

    if (statusEl) {
      if (status === 'running') {
        statusEl.innerHTML = '<span style="color: var(--gold);">⏳ Przetwarzanie...</span>';
        if (rowEl) rowEl.style.background = 'rgba(255, 215, 0, 0.05)';
      } else if (status === 'success') {
        statusEl.innerHTML = '<span style="color: var(--success);">✅ OK</span>';
        if (rowEl) rowEl.style.background = 'transparent';

        if (resultEl) resultEl.innerHTML = formatResultHtml(index, resultText);

      } else if (status === 'error') {
        statusEl.innerHTML = '<span style="color: var(--error);">❌ Błąd</span>';
        if (rowEl) rowEl.style.background = 'rgba(255, 0, 0, 0.05)';
        if (resultEl) resultEl.textContent = resultText || 'Error';
      }
    }
  });
}

export function cancelTestbench() {
  stopPipelineTest();
  const btnStart = document.getElementById('btnStartPipeline');
  const btnStop = document.getElementById('btnStopPipeline');
  if (btnStart) btnStart.disabled = false;
  if (btnStop) btnStop.disabled = true;
}

// Stubs for legacy exports if any other module relies on them
export function exportTestbenchReport() { addLog('info', 'Not implemented in compact mode'); }
export function selectAllModels() { }
export function selectAllScenarios() { }
