
/**
 * Shows a modal with the prompt context preview
 * @param {string} content 
 */
export function showContextPreviewModal(content) {
    let modal = document.getElementById('context-preview-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'context-preview-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.85); z-index: 9999;
            display: flex; align-items: center; justify-content: center;
        `;
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div style="background: var(--bg-dark); width: 80%; max-width: 800px; max-height: 80vh; border: 1px solid var(--gold); display: flex; flex-direction: column; border-radius: 8px; box-shadow: 0 0 20px rgba(0,0,0,0.5);">
            <div class="context-preview-header">
                <span style="font-weight: bold; color: var(--gold);">👁️ Podgląd Kontekstu</span>
                <button onclick="document.getElementById('context-preview-modal').style.display='none'" style="background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 20px;">✕</button>
            </div>
            <div class="context-preview-content">
                ${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
            </div>
            <div style="padding: 10px; border-top: 1px solid var(--border-subtle); text-align: right;">
                 <button class="btn btn-primary" onclick="document.getElementById('context-preview-modal').style.display='none'">Zamknij</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

// Attach to window for global access from onclick handlers
window.showContextPreviewModal = showContextPreviewModal;
