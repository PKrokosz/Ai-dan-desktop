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
    const fill = document.getElementById('progressFill');
    const label = document.getElementById('progressText');
    if (fill) fill.style.width = `${percent}%`;
    if (label) label.textContent = text;
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
// Modal Helpers
// ==============================

/**
 * Close modal by ID
 * @param {string} modalId - ID of modal to close
 */
export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

/**
 * Create a basic modal overlay
 * @param {string} id - Modal ID
 * @param {string} title - Modal title
 * @param {string} content - Modal HTML content
 */
export function createModal(id, title, content) {
    // Remove existing modal with same ID
    closeModal(id);

    const modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal-overlay';
    modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.7); display: flex; align-items: center; 
    justify-content: center; z-index: 2000; backdrop-filter: blur(5px);
  `;

    modal.innerHTML = `
    <div class="modal-window" style="width: 600px; max-width: 90vw; 
      background: var(--bg-panel); border: 1px solid var(--gold); 
      border-radius: 8px; max-height: 80vh; overflow: hidden;">
      <div class="modal-header" style="padding: 15px; border-bottom: 1px solid var(--border); 
        display: flex; justify-content: space-between; background: var(--bg-dark);">
        <h2 style="margin:0; font-size: 18px; color: var(--gold);">${title}</h2>
        <button class="btn-icon close-modal" style="background:none; border:none; 
          color: var(--text-muted); cursor: pointer; font-size: 20px;">✕</button>
      </div>
      <div class="modal-content" style="padding: 20px; overflow-y: auto; max-height: 60vh;">
        ${content}
      </div>
    </div>
  `;

    document.body.appendChild(modal);

    // Close handlers
    modal.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => modal.remove();
    });

    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    return modal;
}

// Make functions globally available for legacy onclick handlers
if (typeof window !== 'undefined') {
    window.addLog = addLog;
    window.setProgress = setProgress;
    window.closeModal = closeModal;
}
