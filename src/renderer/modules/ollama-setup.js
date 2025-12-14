/**
 * @module ollama-setup
 * @description Instalacja i konfiguracja Ollama
 * ES6 Module - Faza 7 modularizacji
 */

// Adapters for Legacy App.js
const addLog = window.addLog || ((l, m) => console.log(`[${l}] ${m}`));

// ==============================
// Ollama Setup Check
// ==============================

/**
 * Check if Ollama is installed and running
 * @returns {Promise<boolean>} True if ready
 */
export async function checkOllamaSetup() {
  addLog('info', 'Sprawdzam instalację Ollama...');

  const { installed, running } = await window.electronAPI.checkOllamaInstalled();

  if (!installed) {
    addLog('warn', 'Ollama nie jest zainstalowana');
    showOllamaSetupModal();
    return false;
  }

  if (!running) {
    addLog('info', 'Ollama zainstalowana, uruchamiam serwis...');
    await window.electronAPI.startOllama();
  }

  addLog('success', 'Ollama gotowa');
  return true;
}

// ==============================
// Setup Modal
// ==============================

/**
 * Show Ollama installation modal
 */
export function showOllamaSetupModal() {
  const modal = document.createElement('div');
  modal.id = 'ollama-setup-modal';
  modal.innerHTML = `
    <div class="setup-modal-backdrop">
      <div class="setup-modal">
        <div class="setup-modal-header">
          <span class="setup-icon">🦙</span>
          <h2>Instalacja Ollama</h2>
        </div>
        <div class="setup-modal-body">
          <p>Ollama jest wymagana do działania Agent MG.<br>Kliknij poniżej aby automatycznie zainstalować.</p>

          <div class="setup-progress-container" style="display: none;">
            <div class="setup-progress-bar">
              <div class="setup-progress-fill" id="ollama-setup-progress"></div>
            </div>
            <p id="ollama-setup-status" class="setup-status">Przygotowywanie...</p>
          </div>

          <div id="setup-buttons">
            <button class="btn btn-primary" id="btn-install-ollama">
              📥 Zainstaluj Ollama
            </button>
            <a href="https://ollama.com/download" target="_blank" class="btn btn-secondary">
              Pobierz ręcznie
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('btn-install-ollama').addEventListener('click', installOllama);
}

/**
 * Close Ollama setup modal
 */
export function closeOllamaSetupModal() {
  const modal = document.getElementById('ollama-setup-modal');
  if (modal) modal.remove();
}

// ==============================
// Installation
// ==============================

/**
 * Install Ollama automatically
 */
export async function installOllama() {
  const buttonsEl = document.getElementById('setup-buttons');
  const progressEl = document.querySelector('.setup-progress-container');

  if (buttonsEl) buttonsEl.style.display = 'none';
  if (progressEl) progressEl.style.display = 'block';

  addLog('info', 'Rozpoczynam instalację Ollama...');

  const result = await window.electronAPI.installOllama();

  if (result.success) {
    addLog('success', 'Ollama zainstalowana pomyślnie!');
    closeOllamaSetupModal();
    if (typeof checkOllama === 'function') {
      await checkOllama();
    }
  } else {
    addLog('error', `Błąd instalacji: ${result.error}`);
    const statusEl = document.getElementById('ollama-setup-status');
    if (statusEl) statusEl.textContent = `Błąd: ${result.error}`;
    if (buttonsEl) buttonsEl.style.display = 'flex';
    if (progressEl) progressEl.style.display = 'none';
  }
}

// Make globally available
if (typeof window !== 'undefined') {
  window.checkOllamaSetup = checkOllamaSetup;
  window.showOllamaSetupModal = showOllamaSetupModal;
  window.closeOllamaSetupModal = closeOllamaSetupModal;
  window.installOllama = installOllama;
}
