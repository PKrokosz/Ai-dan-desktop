/**
 * @module ai-panel
 * @description Panel AI - renderowanie, dropdowny, toggleDropdown
 * ES6 Module - Faza 4 modularizacji
 */

import { state } from './state.js';
import { QUICK_ACTIONS } from './config.js';
import { addLog, renderStep } from './ui-helpers.js';
import { runAI } from './ai-core.js';
import { showContextPreviewModal } from './ui-modal-helper.js';

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
    // Close others if opening one
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

// ==============================
// Main AI Panel Renderer
// ==============================

/**
 * Basic Markdown Formatter (Regex-based)
 */
export function formatMarkdown(text) {
  if (!text) return '';

  let html = text;

  // Headers (### Header)
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');

  // Bold (**text**)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Italic (*text*)
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Blockquotes (> text)
  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

  // Code blocks (```code```)
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

  // Unordered Lists (- item)
  // Simple heuristic: replace start of line dashes
  html = html.replace(/^- (.*$)/gim, '<ul><li>$1</li></ul>');
  // Fix adjacent lists (</ul><ul>)
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // Line breaks (only if not already tags)
  html = html.replace(/\n/g, '<br>');

  return html;
}

/**
 * Render Minimalist AI Panel (Static Shell Pattern)
 */
export function renderMinimalistAIPanel() {
  // Ensure UI state exists
  if (!state.ui) state.ui = { dropdowns: {} };
  if (!state.ui.dropdowns) state.ui.dropdowns = { quickActions: false, model: false, context: false };

  // 1. Check if Shell Exists
  const stepContent = document.getElementById('stepContent');
  let feedContainer = document.getElementById('aiFeedContainer');

  if (!feedContainer) {
    // CLONE TEMPLATE
    const template = document.getElementById('ai-panel-template');
    if (!template) {
      console.error('Missing #ai-panel-template in index.html');
      return '<div class="error">Błąd: Brak szablonu panelu AI</div>';
    }

    // Note: We assume renderStep() or the caller clears innerHTML if needed, 
    // or this function is called to return HTML.
    // However, this function modifies DOM directly!
    // AND returns empty string? app.js implementation returns empty string at the end.
    // But step-templates.js calls it: `return window.renderMinimalistAIPanel ? ...`
    // Wait, if it modifies DOM directly, it should probably return the container HTML or be called appropriately.
    // In app.js:
    // `renderMinimalistAIPanel = () => { ... return ''; }`
    // And `stepTemplates.ai` calls it.
    // So `stepContent.innerHTML = renderMinimalistAIPanel()` results in `stepContent.innerHTML = ''`.
    // But `renderMinimalistAIPanel` does `stepContent.appendChild(clone)`.

    // BUT! Since it is called inside a template function that returns a string:
    // `document.getElementById('stepContent').innerHTML = template ? template() : ...`
    // If template() returns '', then innerHTML becomes ''.
    // BUT `renderMinimalistAIPanel` appends child to `stepContent` BEFORE returning.
    // So `stepContent` has content -> then innerHTML is set to '' -> content cleared!
    // This looks like a bug in `app.js` logic if `renderMinimalistAIPanel` is called synchronously in `innerHTML = ...`.

    // Wait, let's look at `app.js` `renderStep` (line 866):
    // `if (state.currentStep === 3) { ... renderMinimalistAIPanel(); } else { ... innerHTML = template() }`
    // Ah! It has a special branch for step 3!
    // `if (state.currentStep === 3) { ... renderMinimalistAIPanel(); }`
    // It DOES NOT use `stepTemplates.ai()` in that branch.
    // BUT `stepTemplates.ai` exists in `app.js` line 360 map.

    // My new `step-templates.js` `aiTemplate` calls `renderMinimalistAIPanel`.
    // If I use `aiTemplate` in `renderStep` (generic logic), I need to be careful.
    // If I want to unify it, `aiTemplate` should return a placeholder string, and `renderMinimalistAIPanel` should be called after render?
    // OR `renderMinimalistAIPanel` should return the HTML string and NOT modify DOM directly.

    // Currently `renderMinimalistAIPanel` logic:
    // `stepContent.innerHTML = ''; const clone = ... stepContent.appendChild(clone);`

    // If I want to keep it compatible with "Template returns HTML string" pattern:
    // It's hard because it uses `template.content.cloneNode(true)` which is DOM object, not string.

    // RECOMMENDATION: Keep formatting consistent with `app.js` logic where Step 3 is special handled, OR
    // Change `aiTemplate` to return the static HTML of the template (as string).

    // For now, I will mirror the code in `app.js`.
    // But I must ensure `state.currentStep === 3` logic in `app.js` (which I am NOT modifying in verification step yet) still works.
    // The user instruction is "Extract step templates".
    // I am effectively extracting `renderMinimalistAIPanel` to be available.
    // The legacy `renderStep` in `app.js` handles step 3 specially. I should preserve that special handling in `app.js` (or move `renderStep` logic too, but that's risky).

    // So `renderMinimalistAIPanel` will stay as a side-effect function.

    stepContent.innerHTML = '';
    const clone = template.content.cloneNode(true);
    stepContent.appendChild(clone);

    // BIND EVENTS (ONCE)
    const inp = document.getElementById('mainPromptInput');
    const sendBtn = document.getElementById('btn-send-prompt');
    const btnQuick = document.getElementById('btn-quick-actions');
    const btnModel = document.getElementById('btn-model-select');
    const btnContext = document.getElementById('btn-context-settings');

    if (inp) {
      if (state.promptParts) inp.value = state.promptParts.goal || '';
      // Auto-resize logic
      inp.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
        updatePromptPart('goal', this.value);
      });
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (window.runCustomPrompt) window.runCustomPrompt();
        }
      });

      // Restore focus if needed
      setTimeout(() => inp.focus(), 50);
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (state.aiProcessing) {
          // STOP LOGIC
          state.aiProcessing = false;
          // We assume state.streamData is managed globally
          if (state.streamData) {
            state.streamData.active = false;
            if (state.streamData.timerInterval) clearInterval(state.streamData.timerInterval);
          }
          addLog('info', 'Zatrzymano generowanie.');
          renderStep();
        } else {
          if (window.runCustomPrompt) window.runCustomPrompt();
        }
      });
    }
  }

  // 2. Update Profile Section (Dynamic)
  const profileDetailsContainer = document.getElementById('ai-profile-details');
  if (profileDetailsContainer && state.selectedRow !== null && state.sheetData?.rows?.[state.selectedRow]) {
    // Only update if changed (simple check could be added here)
    if (window.renderProfileDetails) {
      profileDetailsContainer.innerHTML = window.renderProfileDetails(state.sheetData.rows[state.selectedRow]);
    }

    // Update Excel Search Panel visibility
    const searchPanel = document.getElementById('excel-search-panel');
    if (searchPanel) {
      searchPanel.style.display = 'block';
      const searchBtn = document.getElementById('btnExcelSearch');
      if (searchBtn) {
        // Update button text with name
        searchBtn.innerHTML = `🔎 Szukaj wzmianek o "${state.sheetData.rows[state.selectedRow]['Imie postaci']}"`;
      }
    }
  } else if (profileDetailsContainer) {
    profileDetailsContainer.innerHTML = '';
    const searchPanel = document.getElementById('excel-search-panel');
    if (searchPanel) searchPanel.style.display = 'none';
  }

  // 3. Update Feed Content - OPTIMIZED to prevent flickering
  const feedContentEl = document.getElementById('ai-feed-content');
  if (feedContentEl) {
    if (!state.aiResultsFeed || state.aiResultsFeed.length === 0) {
      if (!feedContentEl.querySelector('.empty-state-icon')) {
        feedContentEl.innerHTML = `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: var(--text-dim); opacity: 0.6;">
                   <div style="font-size: 48px; margin-bottom: 20px;" class="empty-state-icon">🦅</div>
                   <h3>Gothic AI Assistant</h3>
                   <p>Wybierz tryb lub wpisz polecenie...</p>
               </div>`;
      }
    } else {
      // SMART RENDER CHECK: Only re-render if count changed or actively processing (streaming)
      // or if last item changed content (streaming)
      const currentCount = state.aiResultsFeed.length;
      const lastItem = state.aiResultsFeed[currentCount - 1];
      const lastContentHash = lastItem ? (lastItem.content.length + (lastItem.isStreaming ? '_stream' : '')) : '';

      const shouldRender =
        !feedContentEl.dataset.lastCount ||
        feedContentEl.dataset.lastCount != currentCount ||
        feedContentEl.dataset.lastHash != lastContentHash ||
        state.aiProcessing; // Always update during processing/streaming

      if (shouldRender) {
        // Render Feed Items
        const feedHTML = state.aiResultsFeed.map((item, index) => {
          const isUser = item.type === 'user';
          let contentHtml = item.content;

          if (!isUser) {
            if (item.isStreaming) {
              contentHtml = item.content || '<span class="cursor-blink">|</span>';
            } else if (window.StructuredCardRenderer && window.StructuredCardRenderer.tryRenderStructuredCard) {
              const card = window.StructuredCardRenderer.tryRenderStructuredCard(item.content);
              contentHtml = card || formatMarkdown(item.content);
            } else {
              contentHtml = formatMarkdown(item.content);
            }
          }

          return `
                      <div class="ai-message ${isUser ? 'user' : 'bot'} ${item.isNew ? 'animate-fade-in' : ''}" id="ai-card-${index}">
                         <div class="ai-avatar">${isUser ? '👤' : '🤖'}</div>
                         <div class="ai-message-content">
                            ${contentHtml}
                         </div>
                         ${!isUser && !item.isStreaming ? `
                            <div class="ai-message-actions">
                                <button class="action-btn" onclick="copyToClipboard(decodeURIComponent('${encodeURIComponent(item.content)}'))" title="Kopiuj">📋</button>
                                <button class="action-btn" onclick="saveChatToNote(decodeURIComponent('${encodeURIComponent(item.content)}'))" title="Zapisz jako notatkę">💾 Zapisz</button>
                            </div>
                         ` : ''}
                      </div>
                  `;
        }).join('');

        if (feedContentEl.innerHTML !== feedHTML) {
          feedContentEl.innerHTML = feedHTML;

          // Mark state as rendered
          feedContentEl.dataset.lastCount = currentCount;
          feedContentEl.dataset.lastHash = lastContentHash;

          // Clear new flags only after render
          setTimeout(() => {
            state.aiResultsFeed.forEach(i => i.isNew = false);
          }, 500);

          // Scroll to bottom
          if (state.aiProcessing || (lastItem && lastItem.isNew)) {
            feedContainer = document.getElementById('aiFeedContainer');
            if (feedContainer) feedContainer.scrollTop = feedContainer.scrollHeight;
          }
        }
      }
    }
  }

  // 4. Update Loading Indicator & Timer
  const loadingInd = document.getElementById('ai-loading-indicator');
  const timerDisplay = document.getElementById('thinking-timer-display');

  // ... (Timer logic same as before)
  let elapsedStr = '0.0';
  if (state.streamData?.isThinking && state.streamData.thinkStartTime) {
    const elapsed = (Date.now() - state.streamData.thinkStartTime) / 1000;
    elapsedStr = elapsed.toFixed(1);
  }

  if (loadingInd) {
    if (state.aiProcessing) {
      loadingInd.style.display = 'flex';
      if (timerDisplay) timerDisplay.textContent = `(${elapsedStr}s)`;
    } else {
      loadingInd.style.display = 'none';
    }
  }

  const sendBtn = document.getElementById('btn-send-prompt');
  if (sendBtn) sendBtn.classList.remove('processing');

  // 6. Update Tools & Dropdowns
  const btnQuick = document.getElementById('btn-quick-actions');
  const btnModel = document.getElementById('btn-model-select');
  const btnContext = document.getElementById('btn-context-settings');

  if (btnQuick) {
    btnQuick.classList.toggle('active', !!state.ui.dropdowns.quickActions);
    renderQuickActionsDropdown();
  }

  if (btnModel) {
    btnModel.classList.toggle('active', !!state.ui.dropdowns.model);
    const modelName = state.selectedModel ? state.selectedModel.split(':')[0] : 'Model';
    btnModel.textContent = `🧠 ${modelName}`;
    renderModelDropdown();
  }

  if (btnContext) {
    btnContext.classList.toggle('active', !!state.ui.dropdowns.context);
    renderContextDropdown();
  }

  // CLICK OUTSIDE HANDLER (One-time init)
  if (!window._contextPreviewInited) {
    document.addEventListener('click', (e) => {
      if (e.target.closest('.ai-dropdown-menu') ||
        e.target.closest('#btn-quick-actions') ||
        e.target.closest('#btn-model-select') ||
        e.target.closest('#btn-context-settings')) return;

      // Close all
      if (state.ui && state.ui.dropdowns) {
        let changed = false;
        ['quickActions', 'model', 'context'].forEach(k => {
          if (state.ui.dropdowns[k]) {
            state.ui.dropdowns[k] = false;
            changed = true;
          }
        });
        if (changed) renderStep();
      }
    });
    window._contextPreviewInited = true;
  }

  return '';
}

// Make globally available
if (typeof window !== 'undefined') {
  window.toggleDropdown = toggleDropdown;
  window.renderQuickActionsDropdown = renderQuickActionsDropdown;
  window.renderModelDropdown = renderModelDropdown;
  window.renderContextDropdown = renderContextDropdown;
  window.updatePromptPart = updatePromptPart;
  window.renderMinimalistAIPanel = renderMinimalistAIPanel;
  window.formatMarkdown = formatMarkdown;
}
