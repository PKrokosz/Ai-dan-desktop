/**
 * @module ui-core
 * @description Main UI rendering logic (renderStep, showSettings, etc.)
 */

import { state } from './state.js';
import { STEPS } from './config.js';
import { stepTemplates } from './step-templates.js';
import { addLog, setProgress, goToStep } from './ui-helpers.js';
import { renderMinimalistAIPanel } from './ai-panel.js';

// Import proxies if unavailable via AppModules yet
// Ideally we rely on AppModules or window.electronAPI for inter-module calls to avoid circular deps.
// But we can import specific managers if they are leaf nodes.

export function renderStep() {
    const step = STEPS.find(s => s.id === state.currentStep) || STEPS[0];
    const titleEl = document.getElementById('stepTitle');
    if (titleEl) titleEl.textContent = step.title;

    // Ensure footer is visible unless on AI step (Step 3)
    const footer = document.querySelector('.content-footer');
    const logPanel = document.getElementById('logPanel');

    // Clean up any existing edge arrow
    const existingArrow = document.querySelector('.edge-nav-arrow');
    if (existingArrow) existingArrow.remove();

    if (state.currentStep === 3) {
        if (footer) footer.style.display = 'none';
        if (logPanel) logPanel.style.display = 'none'; // Default hide logs on chat step

        // Add edge nav arrow
        // Edge arrow removed as there are no linear steps after AI Processing (Step 3)


        // Add small logs toggle
        const toggleExists = document.querySelector('.log-toggle-mini');
        if (!toggleExists) {
            const logToggle = document.createElement('div');
            logToggle.className = 'log-toggle-mini';
            logToggle.innerHTML = '🔧';
            logToggle.onclick = () => {
                const logPanel = document.getElementById('logPanel');
                if (logPanel) logPanel.style.display = logPanel.style.display === 'none' ? 'flex' : 'none';
            };
            document.body.appendChild(logToggle);
        }

        // STATIC SHELL: Delegate to specialized renderer
        renderMinimalistAIPanel();

    } else {
        if (footer) footer.style.display = 'flex';
        // Only show log panel if it was not explicitly collapsed by user? 
        // For now enforcing flex as per original code.
        if (logPanel) logPanel.style.display = 'flex';

        // Clean up toggles from other steps
        const toggle = document.querySelector('.log-toggle-mini');
        if (toggle) toggle.remove();

        // Standard Template Rendering for other steps
        const template = stepTemplates[step.key];
        const stepContent = document.getElementById('stepContent');
        if (stepContent) {
            stepContent.innerHTML = template ? template() : '<p>Step not implemented</p>';
        }
    }

    // Update sidebar
    document.querySelectorAll('.step-item').forEach((el, i) => {
        el.classList.remove('active', 'completed');
        const stepNum = i + 1; // Assuming steps match index+1
        if (stepNum === state.currentStep) {
            el.classList.add('active');
        } else if (stepNum < state.currentStep) {
            el.classList.add('completed');
        }
    });

    // Update nav buttons
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    if (btnPrev) btnPrev.disabled = state.currentStep === 1;
    if (btnNext) btnNext.textContent = state.currentStep === state.totalSteps ? 'Zakończ' : 'Dalej ▶';

    // Initialize model selectors on step 1
    if (state.currentStep === 1) {
        setTimeout(async () => {
            if (window.AppModules && window.AppModules.loadSystemSpecs) await window.AppModules.loadSystemSpecs();
            if (window.AppModules && window.AppModules.renderModelCategories) window.AppModules.renderModelCategories();
            if (window.AppModules && window.AppModules.populateModelSelects) window.AppModules.populateModelSelects();

            const filter = document.getElementById('vramFilter');
            if (filter) {
                filter.onchange = () => {
                    if (window.AppModules.filterModelsByVram) window.AppModules.filterModelsByVram();
                };
            }
        }, 50);
    }

    // Initialize Testbench (Step 7)
    if (state.currentStep === 7) {
        setTimeout(() => {
            if (window.AppModules && window.AppModules.initTestbenchView) {
                window.AppModules.initTestbenchView();
            }
        }, 50);
    }

    // Initialize Settings (Step 8)
    if (state.currentStep === 8) {
        setTimeout(async () => {
            if (window.AppModules && window.AppModules.loadSystemSpecs) await window.AppModules.loadSystemSpecs();

            try {
                if (window.electronAPI) {
                    const currentPath = await window.electronAPI.getModelsPath();
                    const input = document.getElementById('modelPathInput');
                    if (input) input.value = currentPath || 'Domyślna (Systemowa)';
                }
            } catch (e) {
                console.error('Failed to load model path', e);
            }

            if (window.AppModules && window.AppModules.renderModelCategories) window.AppModules.renderModelCategories();
            if (window.AppModules && window.AppModules.populateModelSelects) window.AppModules.populateModelSelects();
        }, 50);
    }

    // Re-attach listeners for ChatUtils (Dropdowns)
    if (window.ChatUtils) {
        window.ChatUtils.attachListeners();
    }
}

export function showSettings() {
    goToStep(8);
}

export function showTestbench() {
    goToStep(7);
}

export function updatePromptConfig(path, value) {
    const keys = path.split('.');
    let target = state.promptConfig;

    for (let i = 0; i < keys.length - 1; i++) {
        if (!target[keys[i]]) {
            target[keys[i]] = {};
        }
        target = target[keys[i]];
    }

    target[keys[keys.length - 1]] = value;
    renderStep();
}
