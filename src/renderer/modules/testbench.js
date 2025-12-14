/**
 * @module testbench
 * @description Model Testbench UI - Controller for automated model testing
 * ES6 Module
 */

import { addLog } from './ui-helpers.js';

// Use window.testbenchState for persistence across renders, or move to state.js if preferred.
// For now, we prefer keeping it here or on window to avoid state.js bloat.
if (!window.testbenchState) {
    window.testbenchState = {
        history: [],
        lastSummary: null
    };
}

// ==============================
// Templates
// ==============================

export function getTestbenchTemplate() {
    return `
    <div class="card" style="margin-bottom: 20px;">
      <h3 class="card-title">🧪 Model Testbench - Test Arena</h3>
      <p style="color: var(--text-dim); margin-bottom: 15px; font-size: 13px;">
        Automatyczne testowanie modeli Ollama na różnych scenariuszach. 
        Pozwala porównać które modele najlepiej radzą sobie z różnymi zadaniami.
      </p>
    </div>

 <div class="card" style="margin-bottom: 20px;">
      <h3 class="card-title">📋 Wybierz Modele do Testowania</h3>
      <div id="testbench-models-container">
        <p style="color:var(--text-dim);">Ładowanie modeli...</p>
      </div>
    </div>

    <div class="card" style="margin-bottom: 20px;">
      <h3 class="card-title">📝 Wybierz Scenariusze Testowe</h3>
      <div id="testbench-scenarios-container">
        <p style="color: var(--text-dim);">Ładowanie scenariuszy... </p>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <h3 class="card-title">🚀 Action Panel</h3>
      <div style="display: flex; gap: 12px; align-items: center;">
        <button class="btn btn-primary" id="btnRunTests" onclick="window.AppModules.runTestbench()">
          🧪 Uruchom Testy
        </button>
        <button class="btn btn-secondary" id="btnCancelTests" onclick="window.AppModules.cancelTestbench()" disabled style="background: var(--error);">
          ❌ Anuluj
        </button>
        <button class="btn btn-secondary" id="btnExportReport" onclick="window.AppModules.exportTestbenchReport()" disabled>
          📊 Eksportuj Raport HTML
        </button>
        <span id="testbench-status" style="font-size: 12px; color: var(--text-dim);"></span>
      </div>
    </div>

    <!-- Progress Section -->
<div id="testbench-progress" style="display: none; margin-bottom: 20px;">
      <div class="card">
        <h3 class="card-title">⏳ Postęp Testów</h3>
        <div style="margin-bottom: 10px;">
          <div class="progress-bar" style="height: 24px; background: var(--bg-dark); border-radius: 12px; overflow: hidden;">
            <div id="testbench-progress-fill" class="progress-fill" style="height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); transition: width 0.3s; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; width: 0%;">
              0%
            </div>
          </div>
        </div>
        <div style="font-size: 12px; color: var(--text-muted);">
          <div><strong>Model:</strong> <span id="testbench-current-model">---</span></div>
          <div><strong>Scenariusz:</strong> <span id="testbench-current-scenario">---</span></div>
          <div><strong>Postęp:</strong> <span id="testbench-test-count">0/0</span></div>
        </div>
      </div>
    </div>

    <!-- Results Section -->
    <div id="testbench-results" style="display: none;">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 class="card-title" style="margin: 0;">📊 Wyniki Testów</h3>
          <div style="display: flex; gap: 10px; align-items: center;">
            <label style="font-size: 12px; color: var(--text-dim);">Historia:</label>
            <select id="test-history-selector" class="form-select" style="width: 350px; font-size: 12px;" onchange="loadHistoryResult(this.value)">
              <option value="current">📊 Aktualny wynik</option>
            </select>
          </div>
        </div>
        <div id="testbench-results-content">
          <!-- Results injected here -->
        </div>
      </div>
    </div>
  `;
}

// ==============================
// Logic
// ==============================

// Initialize testbench view
export async function initTestbenchView() {
    // Setup progress event listener
    if (window.electronAPI) {
        window.electronAPI.onTestbenchProgress((progress) => {
            updateTestbenchProgress(progress);
        });

        // Load models
        try {
            const modelsResult = await window.electronAPI.testbenchGetModels();
            if (modelsResult.success) {
                renderTestbenchModels(modelsResult.models);
            } else {
                const container = document.getElementById('testbench-models-container');
                if (container) container.innerHTML = `<p style="color: var(--error);">Błąd: ${modelsResult.error}</p>`;
            }
        } catch (error) {
            const container = document.getElementById('testbench-models-container');
            if (container) container.innerHTML = `<p style="color: var(--error);">Błąd ładowania modeli: ${error.message}</p>`;
        }

        // Load scenarios
        try {
            const scenariosResult = await window.electronAPI.testbenchGetScenarios();
            if (scenariosResult.success) {
                renderTestbenchScenarios(scenariosResult.scenarios);
            } else {
                const container = document.getElementById('testbench-scenarios-container');
                if (container) container.innerHTML = `<p style="color: var(--error);">Błąd: ${scenariosResult.error}</p>`;
            }
        } catch (error) {
            const container = document.getElementById('testbench-scenarios-container');
            if (container) container.innerHTML = `<p style="color: var(--error);">Błąd ładowania scenariuszy: ${error.message}</p>`;
        }
    } else {
        console.error("ElectronAPI not available");
    }
}

// Render model checkboxes
function renderTestbenchModels(models) {
    const container = document.getElementById('testbench-models-container');
    if (!container) return;

    if (!models || models.length === 0) {
        container.innerHTML = '<p style="color: var(--text-dim);">Brak dostępnych modeli</p>';
        return;
    }

    container.innerHTML = `
    <div style="margin-bottom: 10px;">
      <button class="btn btn-sm" onclick="window.AppModules.selectAllModels(true)">✓ Zaznacz wszystkie</button>
      <button class="btn btn-sm" onclick="window.AppModules.selectAllModels(false)" style="margin-left: 8px;">✗ Odznacz wszystkie</button>
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 8px;">
      ${models.map(m => `
        <label class="context-checkbox" style="background: var(--bg-dark); padding: 8px; border-radius: 6px;">
          <input type="checkbox" class="testbench-model-checkbox" value="${m.name}" checked>
          <span style="font-size: 12px;">${m.name}</span>
        </label>
      `).join('')}
    </div>
  `;
}

// Render scenario checkboxes
function renderTestbenchScenarios(scenarios) {
    const container = document.getElementById('testbench-scenarios-container');
    if (!container) return;

    if (!scenarios || scenarios.length === 0) {
        container.innerHTML = '<p style="color: var(--text-dim);">Brak scenariuszy testowych</p>';
        return;
    }

    // Group by category
    const byCategory = {};
    scenarios.forEach(s => {
        if (!byCategory[s.category]) byCategory[s.category] = [];
        byCategory[s.category].push(s);
    });

    container.innerHTML = `
    <div style="margin-bottom: 10px;">
      <button class="btn btn-sm" onclick="window.AppModules.selectAllScenarios(true)">✓ Zaznacz wszystkie</button>
      <button class="btn btn-sm" onclick="window.AppModules.selectAllScenarios(false)" style="margin-left: 8px;">✗ Odznacz wszystkie</button>
    </div>
    ${Object.entries(byCategory).map(([category, items]) => `
      <div style="margin-bottom: 15px;">
        <h4 style="font-size: 13px; color: var(--gold-soft); margin-bottom: 8px; text-transform: capitalize;">${category.replace('_', ' ')}</h4>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          ${items.map(s => `
            <label class="context-checkbox" style="background: var(--bg-dark); padding: 6px 10px; border-radius: 4px;">
              <input type="checkbox" class="testbench-scenario-checkbox" value="${s.id}" checked>
              <span style="font-size: 11px; color: var(--text-muted);">${s.name}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `).join('')}
  `;
}

// Select/deselect all models
export function selectAllModels(checked) {
    document.querySelectorAll('.testbench-model-checkbox').forEach(cb => {
        cb.checked = checked;
    });
}

// Select/deselect all scenarios
export function selectAllScenarios(checked) {
    document.querySelectorAll('.testbench-scenario-checkbox').forEach(cb => {
        cb.checked = checked;
    });
}

// Run testbench
export async function runTestbench() {
    // Get selected models
    const selectedModels = Array.from(document.querySelectorAll('.testbench-model-checkbox:checked'))
        .map(cb => cb.value);

    // Get selected scenarios
    const selectedScenarios = Array.from(document.querySelectorAll('.testbench-scenario-checkbox:checked'))
        .map(cb => cb.value);

    if (selectedModels.length === 0) {
        addLog('warn', 'Wybierz przynajmniej jeden model');
        return;
    }

    if (selectedScenarios.length === 0) {
        addLog('warn', 'Wybierz przynajmniej jeden scenariusz');
        return;
    }

    // Disable run button, enable cancel button
    const btnRun = document.getElementById('btnRunTests');
    const btnCancel = document.getElementById('btnCancelTests');
    if (btnRun) btnRun.disabled = true;
    if (btnCancel) btnCancel.disabled = false;

    const statusEl = document.getElementById('testbench-status');
    if (statusEl) statusEl.textContent = '⏳ Uruchamianie testów...';

    const progressEl = document.getElementById('testbench-progress');
    const resultsEl = document.getElementById('testbench-results');
    if (progressEl) progressEl.style.display = 'block';
    if (resultsEl) resultsEl.style.display = 'none';

    addLog('info', `🧪 Rozpoczynam testy: ${selectedModels.length} modeli × ${selectedScenarios.length} scenariuszy`);

    try {
        const result = await window.electronAPI.testbenchRunTests(selectedModels, selectedScenarios);

        if (result.success) {
            addLog('success', `✓ Testy zakończone! ${result.summary.successfulTests}/${result.summary.totalTests} udanych`);

            // Store in history with metadata
            const historyEntry = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                summary: result.summary,
                metadata: {
                    models: selectedModels,
                    scenarios: selectedScenarios,
                    totalTests: result.summary.totalTests,
                    successRate: Math.round((result.summary.successfulTests / result.summary.totalTests) * 100)
                }
            };

            if (!window.testbenchState) window.testbenchState = { history: [] };
            if (!window.testbenchState.history) window.testbenchState.history = [];
            window.testbenchState.history.unshift(historyEntry);

            // Keep only last 10 results
            if (window.testbenchState.history.length > 10) {
                window.testbenchState.history = window.testbenchState.history.slice(0, 10);
            }

            // Set as current and display
            window.testbenchState.lastSummary = result.summary;
            displayTestbenchResults(result.summary);
            // updateHistoryDropdown(); // Assuming this is defined or we need to export it? 
            // It was not in the file I viewed? Wait.
            // I missed updateHistoryDropdown in the file scan? 
            // Checking step 602. It ends at line 399.
            // updateHistoryDropdown is NOT defined in testbench-ui.js in the view!
            // Line 260 calls it: `updateHistoryDropdown();`
            // But it is not defined in the file?
            // Maybe it's in `testbench-history.js`?
            // Yes, `testbench-history.js` is included in index.html line 221.
            // I should leave `updateHistoryDropdown()` call as is (global from another script).
            if (typeof updateHistoryDropdown === 'function') {
                updateHistoryDropdown();
            } else if (window.updateHistoryDropdown) {
                window.updateHistoryDropdown();
            }

            const btnExport = document.getElementById('btnExportReport');
            if (btnExport) btnExport.disabled = false;
        } else {
            addLog('error', `✗ Błąd testów: ${result.error}`);
            if (statusEl) statusEl.textContent = `❌ Błąd: ${result.error}`;
        }
    } catch (error) {
        addLog('error', `Błąd: ${error.message}`);
        if (statusEl) statusEl.textContent = `❌ Błąd: ${error.message}`;
    } finally {
        if (btnRun) btnRun.disabled = false;
        if (btnCancel) btnCancel.disabled = true;
        if (progressEl) progressEl.style.display = 'none';
    }
}

// Cancel running tests
export async function cancelTestbench() {
    addLog('warn', 'Anulowanie testów...');
    const statusEl = document.getElementById('testbench-status');
    if (statusEl) statusEl.textContent = '⚠️ Anulowanie...';

    const btnCancel = document.getElementById('btnCancelTests');
    if (btnCancel) btnCancel.disabled = true;

    try {
        await window.electronAPI.testbenchCancel();
        addLog('warn', '⚠️ Testy anulowane');
    } catch (error) {
        addLog('error', `Błąd anulowania: ${error.message}`);
    }
}

// Update progress display
function updateTestbenchProgress(progress) {
    const fill = document.getElementById('testbench-progress-fill');
    if (fill) {
        fill.style.width = progress.progressPercent + '%';
        fill.textContent = progress.progressPercent + '%';
    }
    const modelEl = document.getElementById('testbench-current-model');
    if (modelEl) modelEl.textContent = progress.currentModel || '---';
    const sceneEl = document.getElementById('testbench-current-scenario');
    if (sceneEl) sceneEl.textContent = progress.currentScenario || '---';
    const countEl = document.getElementById('testbench-test-count');
    if (countEl) countEl.textContent = `${progress.completedTests}/${progress.totalTests}`;
}

// Display results
function displayTestbenchResults(summary) {
    const container = document.getElementById('testbench-results-content');
    if (!container) return;

    // Model stats table
    const modelStatsRows = Object.entries(summary.modelStats || {})
        .map(([modelName, stats]) => {
            const scoreColor = stats.averageScore >= 70 ? 'var(--success)'
                : stats.averageScore >= 50 ? 'var(--gold)'
                    : 'var(--error)';

            return `
        <tr>
          <td style="font-weight: 500;">${modelName}</td>
          <td>${stats.totalTests}</td>
          <td>${stats.successfulTests}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="flex: 1; height: 20px; background: var(--bg-dark); border-radius: 10px; overflow: hidden;">
                <div style="width: ${stats.averageScore}%; height: 100%; background: ${scoreColor};"></div>
              </div>
              <span style="font-weight: bold; color: ${scoreColor};">${stats.averageScore}%</span>
            </div>
          </td>
          <td>${stats.averageResponseTime}ms</td>
          <td>${stats.tokenMetrics?.avgPromptTokens || '-'}</td>
          <td>${stats.tokenMetrics?.avgResponseTokens || '-'}</td>
          <td><strong>${stats.tokenMetrics?.avgTokensPerSecond || '-'}</strong></td>
        </tr>
      `;
        }).join('');

    // Top performers
    const topPerformers = (summary.topPerformers || [])
        .slice(0, 10)
        .map(perf => `
      <div style="padding: 10px; background: var(--bg-dark); border-radius: 6px; margin-bottom: 8px; border-left: 3px solid var(--gold);">
        <div style="font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 4px;">
          ${perf.scenarioName}
        </div>
        <div style="font-size: 11px; color: var(--gold-soft);">
          🏆 Winner: <strong>${perf.winnerModel}</strong> (${perf.score}% score)
        </div>
      </div>
    `).join('');

    container.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h4 style="font-size: 14px; margin-bottom: 10px;">📊 Statystyki Modeli</h4>
      <table class="data-table">
        <thead>
          <tr>
            <th>Model</th>
            <th>Testy</th>
            <th>Udane</th>
            <th>Średni Score</th>
            <th>Średni Czas</th>
            <th>Tok Prompt</th>
            <th>Tok Response</th>
            <th>Tok/sek</th>
          </tr>
        </thead>
        <tbody>
          ${modelStatsRows}
        </tbody>
      </table>
    </div>

    <div>
      <h4 style="font-size: 14px; margin-bottom: 10px;">🏆 Top Performers (Najlepsze modele per scenariusz)</h4>
      ${topPerformers}
    </div>
  `;

    const resEl = document.getElementById('testbench-results');
    if (resEl) resEl.style.display = 'block';

    const statusEl = document.getElementById('testbench-status');
    if (statusEl) statusEl.textContent = '✅ Testy zakończone';
}

// Export report
export async function exportTestbenchReport() {
    const summary = window.testbenchState?.lastSummary;
    if (!summary) {
        addLog('warn', 'Brak wyników do eksportu');
        return;
    }

    try {
        const filename = `testbench-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.html`;
        const result = await window.electronAPI.testbenchExportReport(summary, filename);

        if (result.success) {
            addLog('success', `📊 Raport zapisany: ${result.path}`);
        } else {
            addLog('error', `Błąd eksportu: ${result.error}`);
        }
    } catch (error) {
        addLog('error', `Błąd: ${error.message}`);
    }
}
