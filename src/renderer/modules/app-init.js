/**
 * @module app-init
 * @description Handles application initialization, event listeners setup, and global hooks.
 */

import { preloadData } from './data-manager.js';
import { checkOllamaSetup } from './ollama-setup.js';

export async function init() {
    // Get trace ID
    window.state.traceId = await window.electronAPI.getTraceId();
    const traceEl = document.getElementById('traceId');
    if (traceEl) traceEl.textContent = window.state.traceId.slice(-12);

    // Load all character names for auto-linking
    try {
        const namesResult = await window.electronAPI.getAllCharacterNames();
        if (namesResult.success) {
            window.state.allCharacterNames = namesResult.names;
            // Create persistent History Panel
            createGlobalHistoryPanel();

            if (window.addLog) window.addLog('info', `Załadowano ${window.state.allCharacterNames.length} imion do linkowania.`);
        }
    } catch (e) {
        console.error('Failed to load character names', e);
    }

    // Check if Ollama is installed
    if (window.AppModules && window.AppModules.checkOllamaSetup) {
        await window.AppModules.checkOllamaSetup();
    } else {
        // Fallback if checkOllamaSetup not in AppModules, try implicit or direct import if needed
        // But for now assuming AppModules is populated or we rely on window.checkOllamaSetup proxy until this runs.
        // Actually, imports might be circular if we rely on AppModules here inside init. 
        // Strategy: We imported `checkOllamaSetup` directly at top.
        await checkOllamaSetup();
    }

    // Check Ollama connection
    if (window.checkOllama) await window.checkOllama();

    // Auto-fetch LarpGothic profiles in background
    preloadData(); // Imported directly

    // Setup logs panel toggle
    const btnToggleLogs = document.getElementById('btnToggleLogs');
    const logPanel = document.getElementById('logPanel');
    const logContent = document.getElementById('logContent');

    if (btnToggleLogs && logPanel && logContent) {
        btnToggleLogs.addEventListener('click', () => {
            const isCollapsed = logPanel.classList.toggle('collapsed');
            btnToggleLogs.textContent = isCollapsed ? '▲' : '▼';
            logContent.style.display = isCollapsed ? 'none' : 'block';
        });
    }

    // Listen for progress events
    window.electronAPI.onProgress((data) => {
        if (window.setProgress) window.setProgress(data.progress, data.message);
    });

    // Listen for log events
    window.electronAPI.onLog((data) => {
        if (window.addLog) window.addLog(data.level, data.message);
    });

    // Listen for Ollama install status
    window.electronAPI.onOllamaInstallStatus((data) => {
        if (window.addLog) window.addLog('info', `[Installer] ${data.message} `);
        const statusEl = document.getElementById('ollama-setup-status');
        if (statusEl) statusEl.textContent = data.message;
    });

    window.electronAPI.onOllamaInstallProgress((data) => {
        if (window.setProgress) window.setProgress(data.percent, `Pobieranie Ollama: ${data.percent}% `);
        const progressEl = document.getElementById('ollama-setup-progress');
        if (progressEl) progressEl.style.width = `${data.percent}% `;
    });

    // Listen for model pull progress
    window.electronAPI.onModelPullProgress((data) => {
        // Update individual download progress
        if (window.state.activeDownloads && window.state.activeDownloads[data.modelName]) {
            window.state.activeDownloads[data.modelName].percent = data.percent;
            window.state.activeDownloads[data.modelName].status = data.status;
            // Assuming updateDownloadQueue is still in app.js or we need it here?
            // updateDownloadQueue was defined in app.js. It's UI logic.
            // Ideally it should be modularized, but if it stays in app.js for now, we call window.updateDownloadQueue
            if (window.updateDownloadQueue) window.updateDownloadQueue();
        }
        if (window.addLog) window.addLog('info', `Pull: ${data.percent}% - ${data.status || ''}`);
    });

    // Render initial step
    if (window.renderStep) window.renderStep();
    if (window.addLog) window.addLog('info', 'Aplikacja gotowa');

    // Setup Search Logic Listeners if needed
    setupSearchListeners();
}

function createGlobalHistoryPanel() {
    const historyPanel = document.createElement('div');
    historyPanel.id = 'globalPromptHistoryPanel';
    historyPanel.className = 'card';
    historyPanel.style.display = 'none';
    historyPanel.style.marginTop = '20px';
    historyPanel.style.border = '1px solid var(--border)';
    historyPanel.style.background = 'var(--bg-dark)';
    historyPanel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
      <h3 class="card-title" style="margin: 0;">📜 Historia Promptów</h3>
      <button class="btn btn-sm" onclick="window.AppModules.togglePromptHistory()" title="Zamknij" style="padding: 4px 10px; font-size: 16px;">✕</button>
    </div>
    <div id="globalPromptHistoryContent" style="max-height: 500px; overflow-y: auto; padding-right: 5px;"></div>
  `;

    // Insert after stepContent
    const stepContent = document.getElementById('stepContent');
    if (stepContent && stepContent.parentNode) {
        stepContent.parentNode.insertBefore(historyPanel, stepContent.nextSibling);
    }
}

function setupSearchListeners() {
    // Search Input Listener
    const searchInput = document.getElementById('searchName');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            if (window.AppModules && window.AppModules.handleSearchInput) {
                window.AppModules.handleSearchInput();
            }
        });
    }

    // Close suggestions on click outside
    document.addEventListener('click', (e) => {
        const input = document.getElementById('searchName');
        const suggestionsPanel = document.getElementById('searchSuggestions');

        if (input && suggestionsPanel && !input.contains(e.target) && !suggestionsPanel.contains(e.target)) {
            suggestionsPanel.style.display = 'none';
        }
    });

    // Close suggestions on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (window.AppModules && window.AppModules.hideSuggestions) {
                window.AppModules.hideSuggestions();
            }
        }
    });
}
