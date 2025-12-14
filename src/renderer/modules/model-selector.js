/**
 * @module model-selector
 * @description Model selection UI and filtering
 * ES6 Module - Faza 8 modularizacji
 */

import { state } from './state.js';
import { addLog } from './ui-helpers.js';
import { OLLAMA_MODELS } from './models-db.js';

// ==============================
// VRAM Filtering
// ==============================

/**
 * Filter models by VRAM and refresh UI
 */
export function filterModelsByVramUI() {
    const vram = parseInt(document.getElementById('vramFilter')?.value || 8);
    state.currentVramFilter = vram;
    renderModelCategories();
    populateModelSelects();
    addLog('info', `Filtr VRAM: ≤${vram} GB`);
}

// ==============================
// Model Categories Rendering
// ==============================

/**
 * Render model categories grid
 */
export function renderModelCategories() {
    const container = document.getElementById('modelCategories');
    if (!container) return;

    const filtered = OLLAMA_MODELS.filterByVram(state.currentVramFilter);
    if (Object.keys(filtered).length === 0) {
        container.innerHTML = '<p style="color: var(--text-dim);">Brak modeli dla wybranego VRAM.</p>';
        return;
    }

    let html = '';
    for (const [catId, cat] of Object.entries(filtered)) {
        html += `
      <div class="model-category">
        <div class="model-category-header" data-category="${catId}">
          <span class="arrow">▶</span>
          <span class="model-category-title">${cat.name}</span>
          <span class="model-category-desc">${cat.desc || ''}</span>
          <span class="model-category-count">${cat.models.length} modeli</span>
        </div>
        <div class="model-category-body" id="cat-${catId}">
          ${cat.models.map(m => `
            <div class="model-item">
              <div class="model-item-info">
                <span class="model-item-name">${m.name}</span>
                <span class="model-item-desc">${m.desc || ''}</span>
              </div>
              <span class="model-item-tags">
                ${m.tags.map(t => `<span class="model-tag">${t}</span>`).join('')}
              </span>
              <div class="model-download-controls">
                <select class="model-size-select" data-model-id="${m.id}">
                  ${m.sizes.map(size => `<option value="${size}">${size}</option>`).join('')}
                </select>
                <button class="model-item-btn ${isModelInstalled(m.id) ? 'installed' : ''}" 
                        data-model-base="${m.id}">
                  ${isModelInstalled(m.id) ? '✓' : 'Pobierz'}
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    }
    container.innerHTML = html;

    // Bind event listeners
    container.querySelectorAll('.model-category-header').forEach(header => {
        header.addEventListener('click', () => {
            const catId = header.dataset.category;
            toggleCategory(catId);
        });
    });

    container.querySelectorAll('.model-item-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const modelBase = btn.dataset.modelBase;
            const select = btn.parentElement.querySelector('.model-size-select');
            const size = select ? select.value : 'latest';
            const modelName = `${modelBase}:${size}`;
            if (typeof pullModel === 'function') pullModel(modelName);
        });
    });
}

/**
 * Toggle category accordion
 * @param {string} catId - Category ID
 */
export function toggleCategory(catId) {
    const header = document.querySelector(`#cat-${catId}`)?.previousElementSibling;
    const body = document.getElementById(`cat-${catId}`);
    if (header && body) {
        header.classList.toggle('open');
        body.classList.toggle('open');
    }
}

// ==============================
// Model Select Dropdowns
// ==============================

/**
 * Populate model selection dropdowns
 */
export function populateModelSelects() {
    const selectExt = document.getElementById('modelExtraction');
    const selectGen = document.getElementById('modelGeneration');
    if (!selectExt || !selectGen) return;

    const filtered = OLLAMA_MODELS.filterByVram(state.currentVramFilter);
    const allModels = [];
    for (const cat of Object.values(filtered)) {
        for (const m of cat.models) {
            for (const size of m.sizes) {
                allModels.push({
                    id: `${m.id}:${size}`,
                    name: `${m.name} (${size})`,
                    vram: OLLAMA_MODELS.getVram(size)
                });
            }
        }
    }
    allModels.sort((a, b) => a.vram - b.vram);

    const options = allModels.map(m =>
        `<option value="${m.id}" ${isModelInstalled(m.id.split(':')[0]) ? 'data-installed="true"' : ''}>${m.name} - ${m.vram}GB</option>`
    ).join('');

    selectExt.innerHTML = '<option value="">-- Wybierz model --</option>' + options;
    selectGen.innerHTML = '<option value="">-- Wybierz model --</option>' + options;

    if (state.selectedModelExtraction) selectExt.value = state.selectedModelExtraction;
    if (state.selectedModelGeneration) selectGen.value = state.selectedModelGeneration;
}

/**
 * Check if model is installed
 * @param {string} modelId - Model base ID
 * @returns {boolean}
 */
export function isModelInstalled(modelId) {
    return state.ollamaModels?.some(m => m.name.startsWith(modelId)) || false;
}

/**
 * Set selected model for extraction
 * @param {string} modelId - Model ID
 */
export function setExtractionModel(modelId) {
    state.selectedModelExtraction = modelId;
    addLog('info', `Model ekstrakcji: ${modelId}`);
}

/**
 * Set selected model for generation
 * @param {string} modelId - Model ID
 */
export function setGenerationModel(modelId) {
    state.selectedModelGeneration = modelId;
    addLog('info', `Model generacji: ${modelId}`);
}

/**
 * Get current selected model
 * @returns {string}
 */
export function getCurrentModel() {
    return state.selectedModel || state.selectedModelGeneration || 'gemma2:2b';
}

// Make globally available
if (typeof window !== 'undefined') {
    window.filterModelsByVram = filterModelsByVramUI;
    window.renderModelCategories = renderModelCategories;
    window.toggleCategory = toggleCategory;
    window.populateModelSelects = populateModelSelects;
    window.isModelInstalled = isModelInstalled;
    window.setExtractionModel = setExtractionModel;
    window.setGenerationModel = setGenerationModel;
    window.getCurrentModel = getCurrentModel;
}
