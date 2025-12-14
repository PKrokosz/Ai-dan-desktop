/**
 * @module operator-functions
 * @description Funkcje Operatora/Mistrza Gry - profile MG, modal wyboru
 * ES6 Module - Faza 5 modularizacji
 */

import { state } from './state.js';
import { addLog } from './ui-helpers.js';

// ==============================
// MG Profile Management
// ==============================

/**
 * Load MG profiles from data store
 */
export async function loadMgProfiles() {
    const result = await window.electronAPI.dataLoadMgProfiles();
    if (result.success) {
        state.mgProfiles = result.profiles;

        // Try to restore last used profile
        const savedId = localStorage.getItem('activeMgProfileId');
        if (savedId) {
            const profile = state.mgProfiles.find(p => String(p.id) === String(savedId));
            if (profile) setOperator(profile);
        }

        // Load histories in background
        window.electronAPI.dataLoadFactionHistory().then(r => {
            if (r.success) state.factionHistory = r.history;
        });
        window.electronAPI.dataLoadCharHistory().then(r => {
            if (r.success) state.charHistory = r.history;
        });
        window.electronAPI.dataLoadWorldContext().then(r => {
            if (r.success) state.worldContext = r.context;
        });

    } else {
        addLog('error', 'Błąd ładowania profili MG: ' + result.error);
    }
}

/**
 * Set active operator/MG profile
 * @param {Object} profile - MG profile object
 */
export function setOperator(profile) {
    state.activeMgProfile = profile;
    localStorage.setItem('activeMgProfileId', profile.id);

    const widgetEl = document.getElementById('currentOperatorName');
    if (widgetEl) widgetEl.textContent = profile.name;

    addLog('info', `Zmieniono operatora na: ${profile.name}`);
}

// ==============================
// Operator Modal
// ==============================

/**
 * Open operator selection modal
 */
export function openOperatorModal() {
    const modalId = 'operatorModal';
    let modal = document.getElementById(modalId);

    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal-overlay';
        modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 2000;
      backdrop-filter: blur(5px);
    `;
        modal.innerHTML = `
      <div class="modal-window" style="width: 800px; max-width: 90vw; background: var(--bg-panel); border: 1px solid var(--gold); border-radius: 8px; display: flex; flex-direction: column; height: 600px;">
        <div class="modal-header" style="padding: 15px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; background: var(--bg-dark);">
          <h2 style="margin:0; font-size: 18px; color: var(--gold);">👤 Wybierz Operatora (Mistrza Gry)</h2>
          <button class="btn-icon close-modal" style="background:none; border:none; color: var(--text-muted); cursor: pointer; font-size: 20px;">✕</button>
        </div>
        <div class="modal-content" style="flex: 1; overflow: hidden; padding: 20px;">
          <div class="matrix-grid">
            <div class="matrix-sidebar">
              <div class="matrix-list" id="mgProfileList"></div>
            </div>
            <div class="matrix-details" id="mgProfileDetails" style="overflow-y: auto; padding-right: 10px;">
              <p style="color: var(--text-dim); text-align: center; margin-top: 50px;">Wybierz profil z listy...</p>
            </div>
          </div>
        </div>
        <div class="modal-footer" style="padding: 15px; border-top: 1px solid var(--border); background: var(--bg-dark); display: flex; justify-content: flex-end; gap: 10px;">
          <button class="btn btn-secondary close-modal">Anuluj</button>
          <button class="btn btn-primary" id="btnApplyOperator">Wybierz Operatora</button>
        </div>
      </div>
    `;
        document.body.appendChild(modal);

        // Close handlers
        modal.querySelectorAll('.close-modal').forEach(b => {
            b.onclick = () => modal.remove();
        });

        modal.querySelector('#btnApplyOperator').onclick = () => {
            const selectedId = modal.dataset.selectedId;
            if (selectedId) {
                const profile = state.mgProfiles.find(p => String(p.id) === String(selectedId));
                if (profile) {
                    setOperator(profile);
                    modal.remove();
                }
            }
        };
    }

    // Render list
    const listEl = modal.querySelector('#mgProfileList');
    listEl.innerHTML = state.mgProfiles.map(p => `
    <div class="matrix-item ${state.activeMgProfile?.id === p.id ? 'active' : ''}" 
         onclick="renderMgDetails('${p.id}', this)">
      <div style="font-weight: 600;">${p.name}</div>
      <div style="font-size: 11px; color: var(--text-dim);">${p.role || 'MG'}</div>
    </div>
  `).join('');

    // Select current if exists
    if (state.activeMgProfile) {
        setTimeout(() => {
            const currentEl = Array.from(listEl.children).find(el => el.textContent.includes(state.activeMgProfile.name));
            if (currentEl) currentEl.click();
        }, 50);
    }
}

/**
 * Render MG profile details in modal
 * @param {string} id - Profile ID
 * @param {HTMLElement} itemEl - Selected item element
 */
export function renderMgDetails(id, itemEl) {
    document.querySelectorAll('.matrix-item').forEach(el => el.classList.remove('active'));
    itemEl.classList.add('active');

    const modal = document.getElementById('operatorModal');
    modal.dataset.selectedId = id;

    const profile = state.mgProfiles.find(p => String(p.id) === String(id));
    const detailsEl = modal.querySelector('#mgProfileDetails');

    if (!profile) return;

    const renderTags = (text, cls) => {
        if (!text) return '<span style="color:var(--text-dim)">-</span>';
        return text.split(',').map(t => `<span class="tag ${cls}">${t.trim()}</span>`).join('');
    };

    detailsEl.innerHTML = `
    <h3 style="color: var(--gold); margin-bottom: 20px;">${profile.name} <span style="font-size:12px; color:var(--text-dim)">(${profile.role})</span></h3>
    
    <div class="stat-card">
      <div class="stat-title">💪 Mocne strony</div>
      <div class="tag-cloud">
        ${renderTags(profile.style_strengths, 'positive')}
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-title">⚠️ Słabsze strony (AI pomoże)</div>
      <div class="tag-cloud">
        ${renderTags(profile.style_weaknesses, 'negative')}
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-title">❤️ Preferencje</div>
      <div style="font-size: 13px; line-height: 1.5; color: var(--text-primary);">
        ${profile.preferences || 'Brak danych'}
      </div>
    </div>
  `;
}

// Make globally available
if (typeof window !== 'undefined') {
    window.loadMgProfiles = loadMgProfiles;
    window.setOperator = setOperator;
    window.openOperatorModal = openOperatorModal;
    window.renderMgDetails = renderMgDetails;
}
