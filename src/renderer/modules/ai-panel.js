/**
 * @module ai-panel
 * @description Panel AI - renderowanie, dropdowny, toggleDropdown
 * ES6 Module - Faza 4 modularizacji
 */

import { state } from './state.js';
import { QUICK_ACTIONS } from './config.js';
import { addLog, renderStep } from './ui-helpers.js';

// ==============================
// Dropdown Toggle
// ==============================

/**
 * Toggle dropdown menu
 * @param {string} name - Dropdown name
 * @param {boolean|null} forceState - Force open/close state
 */
export function toggleDropdown(name, forceState = null) {
    if (!state.ui) state.ui = { dropdowns: {} };
    if (!state.ui.dropdowns) state.ui.dropdowns = {};

    if (forceState !== null) {
        state.ui.dropdowns[name] = forceState;
    } else {
        const wasOpen = state.ui.dropdowns[name];
        Object.keys(state.ui.dropdowns).forEach(k => state.ui.dropdowns[k] = false);
        state.ui.dropdowns[name] = !wasOpen;
    }
    renderStep();

    if (state.ui.dropdowns[name] === false) {
        const input = document.getElementById('mainPromptInput');
        if (input) input.focus();
    }
}

// ==============================
// Dropdown Renderers
// ==============================

/**
 * Render quick actions dropdown
 */
export function renderQuickActionsDropdown() {
    const container = document.getElementById('dropdown-quick-actions-container');
    if (!container) return;

    if (!state.ui.dropdowns.quickActions) {
        container.innerHTML = '';
        return;
    }

    const html = `
    <div class="ai-dropdown-menu show" style="bottom: 80px; left: 20px;">
      <div class="ai-dropdown-header">Szybkie Akcje</div>
      ${QUICK_ACTIONS.map(group => `
        <div class="ai-dropdown-section">
          <div class="ai-dropdown-header" style="color: var(--gold-dim); font-size: 10px;">${group.group}</div>
          ${group.items.map(item => `
            <div class="ai-dropdown-item" onclick="runAI('${item.id}'); toggleDropdown('quickActions', false);">
              <span class="ai-item-icon">${item.icon}</span>
              <span class="ai-item-label">${item.label}</span>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  `;
    container.innerHTML = html;
}

/**
 * Render model selection dropdown
 */
export function renderModelDropdown() {
    const container = document.getElementById('dropdown-model-container');
    if (!container) return;

    if (!state.ui.dropdowns.model) {
        container.innerHTML = '';
        return;
    }

    const html = `
    <div class="ai-dropdown-menu show" style="bottom: 80px; left: 100px;">
      <div class="ai-dropdown-header">Wybierz Model</div>
      <div class="ai-dropdown-section">
        ${state.ollamaModels && state.ollamaModels.length > 0
            ? state.ollamaModels.map(m => `
            <div class="ai-dropdown-item ${state.selectedModel === m.name ? 'active' : ''}" 
                 onclick="state.selectedModel = '${m.name}'; toggleDropdown('model', false); renderStep();">
              <span class="ai-item-icon">🧠</span>
              <span class="ai-item-label">${m.name}</span>
              ${state.selectedModel === m.name ? '✓' : ''}
            </div>
          `).join('')
            : '<div style="padding: 10px; color: var(--text-dim);">Brak modeli</div>'}
      </div>
    </div>
  `;
    container.innerHTML = html;
}

/**
 * Render context settings dropdown
 */
export function renderContextDropdown() {
    const container = document.getElementById('dropdown-context-container');
    if (!container) return;

    if (!state.ui.dropdowns.context) {
        container.innerHTML = '';
        return;
    }

    const html = `
    <div class="ai-dropdown-menu show" style="bottom: 80px; left: 150px; width: 260px;">
      <div class="ai-dropdown-header">Kontekst</div>
      <div class="ai-dropdown-section">
        <label class="ai-dropdown-item" onclick="event.stopPropagation()">
          <input type="checkbox" ${state.promptConfig?.contexts?.geography !== false ? 'checked' : ''} onchange="updatePromptConfig('contexts.geography', this.checked)">
          <span>🌍 Lore Świata</span>
        </label>
        <label class="ai-dropdown-item" onclick="event.stopPropagation()">
          <input type="checkbox" ${state.promptConfig?.contexts?.system !== false ? 'checked' : ''} onchange="updatePromptConfig('contexts.system', this.checked)">
          <span>⚖️ System Gry</span>
        </label>
      </div>
      <div class="ai-dropdown-section">
        <div class="ai-dropdown-header">Temperatura: <span id="tempValue">${(state.aiTemperature || 0.7).toFixed(1)}</span></div>
        <div class="ai-range-container">
          <input type="range" min="0" max="100" value="${(state.aiTemperature || 0.7) * 100}" 
                 style="width: 100%;" 
                 oninput="document.getElementById('tempValue').textContent = (this.value/100).toFixed(1)"
                 onchange="state.aiTemperature = this.value / 100; renderStep();">
        </div>
      </div>
    </div>
  `;
    container.innerHTML = html;
}

/**
 * Update prompt part in state
 * @param {string} part - Part name
 * @param {*} value - Value
 */
export function updatePromptPart(part, value) {
    if (!state.promptParts) state.promptParts = {};
    state.promptParts[part] = value;
}

// Make globally available
if (typeof window !== 'undefined') {
    window.toggleDropdown = toggleDropdown;
    window.renderQuickActionsDropdown = renderQuickActionsDropdown;
    window.renderModelDropdown = renderModelDropdown;
    window.renderContextDropdown = renderContextDropdown;
    window.updatePromptPart = updatePromptPart;
}
