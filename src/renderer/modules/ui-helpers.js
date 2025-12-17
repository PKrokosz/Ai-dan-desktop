/**
 * @module ui-helpers
 * @description Funkcje pomocnicze UI - renderStep, addLog, setProgress
 * ES6 Module - Faza 1 modularizacji
 */

import { state } from './state.js';
import { STEPS } from './config.js';

// ==============================
// Logging Functions
// ==============================

/**
 * Add a log entry to the log panel
 * @param {string} level - Log level: 'info', 'warn', 'error', 'success'
 * @param {string} message - Log message
 */
export function addLog(level, message) {
    const logContent = document.getElementById('logContent');
    if (!logContent) return;

    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `log-entry log-${level}`;
    entry.innerHTML = `
    <span class="log-time">${time}</span>
    <span class="log-msg">${message}</span>
  `;
    logContent.appendChild(entry);
    logContent.scrollTop = logContent.scrollHeight;
}

// ==============================
// Progress Functions
// ==============================

/**
 * Update progress bar
 * @param {number} percent - Progress percentage (0-100)
 * @param {string} text - Progress text to display
 */
export function setProgress(percent, text) {
    const container = document.getElementById('progressContainer'); // Assuming container exists
    const fill = document.getElementById('progressFill');
    const label = document.getElementById('progressText');

    // Ensure visibility if likely hidden previously
    if (container && percent < 100) {
        container.style.opacity = '1';
        container.style.transition = 'opacity 0.3s';
    }

    if (fill) fill.style.width = `${percent}%`;
    if (label) label.textContent = text;

    // Auto-hide if complete
    if (percent >= 100) {
        setTimeout(() => {
            if (label && label.textContent === text) { // Check if text hasn't changed (new task started)
                if (container) {
                    container.style.opacity = '0';
                } else if (fill) {
                    // Fallback if no container ID known, fade fill/label? 
                    // Usually progress bar is wrapped. Let's assume global footer progress.
                    // We will try to fade the parent of fill if container not found
                    const parent = fill.parentElement?.parentElement; // fill -> bar -> container?
                    if (parent && parent.id === 'statusbar') {
                        // Statusbar shouldn't disappear entirely maybe? 
                        // User said "pasek progresu tez moglby znikac".
                        // Let's just clear the text and width.
                        fill.style.width = '0%';
                        if (label) label.textContent = '';
                    }
                }
            }
        }, 3000);
    }
}

// ==============================
// Step Navigation
// ==============================

/**
 * Get current step configuration
 */
export function getCurrentStep() {
    return STEPS.find(s => s.id === state.currentStep) || STEPS[0];
}

/**
 * Navigate to a specific step
 * @param {number} stepId - Step ID to navigate to
 */
export function goToStep(stepId) {
    if (stepId >= 1 && stepId <= state.totalSteps) {
        state.currentStep = stepId;
        renderStep();
    }
}

/**
 * Render current step - must be implemented by main app
 * This is a placeholder that will be overwritten
 */
export let renderStep = () => {
    console.warn('renderStep not implemented yet');
};

/**
 * Set the renderStep implementation
 * @param {Function} fn - The render function
 */
export function setRenderStep(fn) {
    renderStep = fn;
}

// ==============================
// Sidebar / Step Indicator Updates
// ==============================

/**
 * Update step indicators in sidebar
 */
export function updateStepIndicators() {
    document.querySelectorAll('.step-item[data-step]').forEach(item => {
        const stepNum = parseInt(item.dataset.step);
        item.classList.remove('active', 'completed');

        if (stepNum === state.currentStep) {
            item.classList.add('active');
        } else if (stepNum < state.currentStep) {
            item.classList.add('completed');
        }
    });
}

/**
 * Update page title based on current step
 */
export function updateStepTitle() {
    const step = getCurrentStep();
    const titleEl = document.getElementById('stepTitle');
    if (titleEl && step) {
        titleEl.textContent = step.title;
    }
}

// ==============================
// Drawer Helpers (Minimal Theme)
// ==============================

export function toggleTagsDrawer() {
    const drawer = document.getElementById('tagsDrawer');
    const btn = document.getElementById('tagsFilterBtn');

    if (drawer) {
        drawer.classList.toggle('open');
        if (btn) btn.classList.toggle('active');
    }
}

// Make functions globally available for legacy onclick handlers
if (typeof window !== 'undefined') {
    window.addLog = addLog;
    window.setProgress = setProgress;
    window.toggleTagsDrawer = toggleTagsDrawer;
}
