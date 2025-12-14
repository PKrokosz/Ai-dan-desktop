/**
 * @module init
 * @description Inicjalizacja aplikacji - init(), event listeners
 * ES6 Module - Faza 6 modularizacji
 */

import { state } from './state.js';
import { addLog, setProgress, renderStep } from './ui-helpers.js';
import { handleAIStreamChunk } from './streaming-handler.js';
import { checkOllama, updateDownloadQueue } from './api-functions.js';
import { checkOllamaSetup } from './ollama-setup.js';
import { preloadData } from './search-functions.js';

// ==============================
// Main Initialization
// ==============================

/**
 * Initialize the application
 */
export async function init() {
    // Get trace ID
    state.traceId = await window.electronAPI.getTraceId();
    const traceIdEl = document.getElementById('traceId');
    if (traceIdEl) traceIdEl.textContent = state.traceId.slice(-12);

    // Load all character names for auto-linking
    try {
        const namesResult = await window.electronAPI.getAllCharacterNames();
        if (namesResult.success) {
            state.allCharacterNames = namesResult.names;
            addLog('info', `Załadowano ${state.allCharacterNames.length} imion do linkowania.`);
        }
    } catch (e) {
        console.error('Failed to load character names', e);
    }

    // Check if Ollama is installed
    if (typeof checkOllamaSetup === 'function') {
        await checkOllamaSetup();
    }

    // Check Ollama connection
    if (typeof checkOllama === 'function') {
        await checkOllama();
    }

    // Auto-fetch LarpGothic profiles in background
    if (typeof preloadData === 'function') {
        preloadData();
    }

    // Setup UI event listeners
    setupLogsPanelToggle();
    setupIpcListeners();

    // Check ThinkingParser
    if (typeof ThinkingParser !== 'undefined') {
        state.thinkingParser = new ThinkingParser();
    }

    // Render initial step
    renderStep();
    addLog('info', 'Aplikacja gotowa');
}

// ==============================
// UI Setup
// ==============================

/**
 * Setup logs panel toggle
 */
export function setupLogsPanelToggle() {
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
}

// ==============================
// IPC Event Listeners
// ==============================

/**
 * Setup IPC event listeners
 */
export function setupIpcListeners() {
    // Listen for progress events
    window.electronAPI.onProgress((data) => {
        setProgress(data.progress, data.message);
    });

    // Listen for log events
    window.electronAPI.onLog((data) => {
        addLog(data.level, data.message);
    });

    // Listen for Ollama install status
    window.electronAPI.onOllamaInstallStatus((data) => {
        addLog('info', `[Installer] ${data.message}`);
        const statusEl = document.getElementById('ollama-setup-status');
        if (statusEl) statusEl.textContent = data.message;
    });

    // Listen for Ollama install progress
    window.electronAPI.onOllamaInstallProgress((data) => {
        setProgress(data.percent, `Pobieranie Ollama: ${data.percent}%`);
        const progressEl = document.getElementById('ollama-setup-progress');
        if (progressEl) progressEl.style.width = `${data.percent}%`;
    });

    // Listen for model pull progress
    window.electronAPI.onModelPullProgress((data) => {
        if (state.activeDownloads && state.activeDownloads[data.modelName]) {
            state.activeDownloads[data.modelName].percent = data.percent;
            state.activeDownloads[data.modelName].status = data.status;
            if (typeof updateDownloadQueue === 'function') {
                updateDownloadQueue();
            }
        }
        addLog('info', `Pull: ${data.percent}% - ${data.status || ''}`);
    });

    // Listen for AI stream chunks
    window.electronAPI.onAIStream((data) => {
        if (typeof handleAIStreamChunk === 'function') {
            handleAIStreamChunk(data);
        }
    });
}

// ==============================
// Sidebar Navigation Setup
// ==============================

/**
 * Setup sidebar step navigation
 */
export function setupSidebarNavigation() {
    document.querySelectorAll('.step-item[data-step]').forEach(item => {
        item.addEventListener('click', () => {
            const step = parseInt(item.dataset.step);
            if (!isNaN(step) && step !== state.currentStep) {
                const previousStep = state.currentStep;
                state.currentStep = step;

                // Refresh step 2 when navigating to it
                if (state.currentStep === 2 && previousStep !== 2) {
                    state.selectedRow = null;
                    state.aiResult = null;
                    state.aiProcessing = false;
                    addLog('info', 'Nawigacja do ekstrakcji - widok odświeżony');
                }

                renderStep();
            }
        });
    });
}

/**
 * Setup footer navigation buttons
 */
export function setupNavigationButtons() {
    const btnNext = document.getElementById('btnNext');
    const btnPrev = document.getElementById('btnPrev');

    if (btnNext) {
        btnNext.addEventListener('click', () => {
            if (state.currentStep < state.totalSteps) {
                state.currentStep++;
                renderStep();
            }
        });
    }

    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            if (state.currentStep > 1) {
                state.currentStep--;
                renderStep();
            }
        });
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.init = init;
    window.setupLogsPanelToggle = setupLogsPanelToggle;
    window.setupIpcListeners = setupIpcListeners;
    window.setupSidebarNavigation = setupSidebarNavigation;
    window.setupNavigationButtons = setupNavigationButtons;
}
