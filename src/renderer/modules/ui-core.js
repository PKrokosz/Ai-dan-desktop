/**
 * @module ui-core
 * @description Main UI rendering logic (renderStep, showSettings, etc.)
 */

import { state } from './state.js';
import { STEPS } from './config.js';
import { stepTemplates } from './step-templates.js';
import { addLog, setProgress } from './ui-helpers.js';
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
        const arrow = document.createElement('div');
        arrow.className = 'edge-nav-arrow';
        arrow.innerHTML = '▶';
        arrow.title = 'Przejdź dalej';
        arrow.onclick = () => {
            if (state.currentStep < state.totalSteps) {
                state.currentStep++;
                if (window.AppModules && window.AppModules.renderStep) window.AppModules.renderStep();
                else renderStep(); // Fallback internal recursion
            }
        };
        document.body.appendChild(arrow);

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
            // Load specs via proxy
            if (window.AppModules && window.AppModules.loadSystemSpecs) await window.AppModules.loadSystemSpecs();
            if (window.AppModules && window.AppModules.renderModelCategories) window.AppModules.renderModelCategories();
            if (window.AppModules && window.AppModules.populateModelSelects) window.AppModules.populateModelSelects();

            // Add event listener for VRAM filter
            const filter = document.getElementById('vramFilter');
            if (filter) {
                // Remove old listeners to be safe? 
                // A robust way to replace listener is setting onchange, or using a dedicated handler replacer.
                // Assuming AppModules.filterModelsByVram is available.
                filter.onchange = () => {
                    if (window.AppModules.filterModelsByVram) window.AppModules.filterModelsByVram();
                };
            }
        }, 50);
    }

    // Re-attach listeners for ChatUtils (Dropdowns)
    if (window.ChatUtils) {
        window.ChatUtils.attachListeners();
    }
}

export function showSettings() {
    const content = document.getElementById('stepContent');
    const title = document.getElementById('stepTitle');

    if (content && title) {
        title.textContent = '⚙️ Ustawienia AI';
        content.innerHTML = stepTemplates.settings();

        // Highlight settings item in sidebar
        document.querySelectorAll('.step-item').forEach(el => el.classList.remove('active'));
        document.querySelector('.settings-item')?.classList.add('active');

        // Initialize settings view
        setTimeout(async () => {
            if (window.AppModules && window.AppModules.loadSystemSpecs) await window.AppModules.loadSystemSpecs();

            // Load current model path
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
}

export function showTestbench() {
    const content = document.getElementById('stepContent');
    const title = document.getElementById('stepTitle');

    if (content && title) {
        title.textContent = '🧪 Model Testbench';
        content.innerHTML = stepTemplates.testbench();

        // Highlight testbench item in sidebar
        document.querySelectorAll('.step-item').forEach(el => el.classList.remove('active'));
        document.querySelector('.testbench-item')?.classList.add('active');

        //Initialize testbench view
        setTimeout(() => {
            if (window.AppModules && window.AppModules.initTestbenchView) {
                window.AppModules.initTestbenchView();
            }
        }, 50);
    }
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
