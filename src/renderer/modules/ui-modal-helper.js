
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

if (typeof window !== 'undefined') {
    window.closeModal = closeModal;
}
