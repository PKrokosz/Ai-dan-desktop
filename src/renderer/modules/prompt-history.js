// Adapters for Legacy App.js
// We use window.state/addLog because app.js is not yet fully modularized
const state = window.state;
const addLog = window.addLog;
const renderStep = window.renderStep;

/**
 * Synchronizes the visibility of the global prompt history panel with the state.
 */
export function syncHistoryPanelVisibility() {
    const panel = document.getElementById('globalPromptHistoryPanel');
    if (panel) {
        // Force flex if showPromptHistory is true (matches CSS)
        panel.style.display = state.showPromptHistory ? 'flex' : 'none';
        if (state.showPromptHistory) {
            renderPromptHistory();
        }
    }
}

/**
 * Toggles the prompt history panel.
 */
export function togglePromptHistory() {
    state.showPromptHistory = !state.showPromptHistory;
    syncHistoryPanelVisibility();
}

/**
 * Renders the prompt history list into the container.
 */
export function renderPromptHistory() {
    if (!state.showPromptHistory) return;

    const container = document.getElementById('globalPromptHistoryContent');
    if (!container) return;

    if (!state.promptHistory || state.promptHistory.length === 0) {
        container.innerHTML = '<p style="color: var(--text-dim); font-size: 13px; text-align: center; padding: 20px;">Brak historii. Wykonaj polecenie AI.</p>';
        return;
    }

    container.innerHTML = state.promptHistory.map((item, index) => {
        // Show request and response
        const date = new Date(item.timestamp).toLocaleTimeString();

        // Check if collapsed (default collapsed except last)
        const isExpanded = index === state.promptHistory.length - 1;

        return `
      <div class="history-item" style="margin-bottom: 15px; border-bottom: 1px dashed var(--border-subtle); padding-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
           <span style="color: var(--gold-soft); font-weight: bold; font-size: 13px;">${item.command}</span>
           <span style="color: var(--text-dim); font-size: 11px;">${date} (${item.model})</span>
        </div>
        
        <details ${isExpanded ? 'open' : ''}>
          <summary style="cursor: pointer; font-size: 12px; color: var(--text-muted); margin-bottom: 5px;">Pokaż szczegóły</summary>
          
          <div style="background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px; margin-bottom: 5px;">
             <strong style="font-size: 11px; color: var(--text-dim);">PROMPT:</strong>
             <pre style="white-space: pre-wrap; font-size: 11px; color: var(--text-muted); margin: 5px 0 0 0; max-height: 100px; overflow-y: auto;">${item.prompt.replace(/</g, '&lt;')}</pre>
          </div>
          
          <div>
             <strong style="font-size: 11px; color: var(--text-dim);">RESPONSE:</strong>
             <div style="font-size: 13px; color: var(--text-primary); margin-top: 5px; white-space: pre-wrap;">${item.response.replace(/</g, '&lt;')}</div>
          </div>
        </details>
      </div>
    `;
    }).join('');
}

// ==============================
// Prompt Templates System
// ==============================

/**
 * Loads prompt templates from localStorage.
 */
export function loadPromptTemplates() {
    const stored = localStorage.getItem('mg_prompt_templates');
    state.promptTemplates = stored ? JSON.parse(stored) : [
        { name: 'Kreatywny Opis', parts: { role: 'Pisarz fantasy', goal: 'Opisz wygląd postaci w mrocznym stylu', dod: 'Używaj metafor, max 3 zdania' } },
        { name: 'Generowanie Questu', parts: { role: 'Mistrz Gry', goal: 'Stwórz quest dla postaci', dod: 'Format: Tytuł, Cel, Zagrożenie, Nagroda' } }
    ];
}

/**
 * Saves the current prompt parts as a new template.
 */
export function savePromptTemplate() {
    const name = prompt('Podaj nazwę szablonu:');
    if (!name) return;

    const newTemplate = {
        name: name,
        parts: { ...state.promptParts }
    };

    state.promptTemplates.push(newTemplate);
    localStorage.setItem('mg_prompt_templates', JSON.stringify(state.promptTemplates));
    addLog('success', `Zapisano szablon: ${name}`);
    renderStep();
}

/**
 * Deletes a template by index.
 * @param {number} index 
 */
export function deletePromptTemplate(index) {
    if (confirm('Czy na pewno usunąć ten szablon?')) {
        state.promptTemplates.splice(index, 1);
        localStorage.setItem('mg_prompt_templates', JSON.stringify(state.promptTemplates));
        addLog('info', 'Szablon usunięty');
        renderStep();
    }
}

/**
 * Applies a template by index.
 * @param {number} index 
 */
export function applyPromptTemplate(index) {
    const template = state.promptTemplates[index];
    if (template) {
        state.promptParts = { ...template.parts };
        addLog('info', `Załadowano szablon: ${template.name}`);
        renderStep();
    }
}
