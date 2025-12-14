/**
 * @module models-manager
 * @description Manages Ollama models, VRAM filtering, and selection UI.
 */

// We rely on global window.state and window.addLog for now to maintain compatibility 
// with the legacy app.js structure until full state management migration.

// ==============================
// Ollama Models Database
// ==============================
export const OLLAMA_MODELS = {
    vramBySize: {
        '0.5b': 1, '1b': 2, '1.5b': 2, '2b': 2, '3b': 3, '4b': 4, '7b': 8, '8b': 8,
        '10.7b': 12, '11b': 12, '12b': 12, '13b': 16, '14b': 16, '22b': 24, '27b': 24, '30b': 24, '32b': 24, '34b': 24, '70b': 48, '72b': 48, '90b': 80
    },
    categories: {
        reasoning: {
            name: '🧠 Reasoning / Thinking',
            desc: 'Modele które "myślą" zanim odpowiedzą - lepsze do trudnych zadań',
            models: [
                { id: 'deepseek-r1', name: 'DeepSeek R1', sizes: ['1.5b', '7b', '8b', '14b', '32b', '70b'], tags: ['thinking'], desc: 'Bardzo mądry, pokazuje tok rozumowania' },
                { id: 'qwq', name: 'QwQ', sizes: ['32b'], tags: ['thinking'], desc: 'Chiński model myślący, świetny do matematyki' },
                { id: 'phi4-reasoning', name: 'Phi-4 Reasoning', sizes: ['14b'], tags: ['thinking'], desc: 'Microsoft, dobry stosunek jakości do rozmiaru' },
                { id: 'openthinker', name: 'OpenThinker', sizes: ['7b', '32b'], tags: ['thinking'], desc: 'Open source model myślący' },
                { id: 'exaone-deep', name: 'EXAONE Deep', sizes: ['7.8b', '32b'], tags: ['thinking'], desc: 'Koreański, dobry do analizy' }
            ]
        },
        general: {
            name: '💬 General Purpose',
            desc: 'Do wszystkiego - chatowanie, pisanie, Q&A',
            models: [
                { id: 'llama3.3', name: 'Llama 3.3', sizes: ['70b'], tags: ['tools'], desc: 'Najnowszy od Meta, bardzo mądry' },
                { id: 'llama3.2', name: 'Llama 3.2', sizes: ['1b', '3b'], tags: [], desc: 'Mały i szybki, dobry na start' },
                { id: 'llama3.1', name: 'Llama 3.1', sizes: ['8b', '70b'], tags: ['tools'], desc: 'Sprawdzony klasyk, stabilny' },
                { id: 'qwen3', name: 'Qwen 3', sizes: ['0.6b', '1.7b', '4b', '8b', '14b', '30b', '32b'], tags: ['tools', 'thinking'], desc: '🔥 Najlepszy chiński model, mega wszechstronny' },
                { id: 'qwen2.5', name: 'Qwen 2.5', sizes: ['0.5b', '1.5b', '3b', '7b', '14b', '32b', '72b'], tags: ['tools'], desc: 'Stabilna wersja, świetny do wielu zadań' },
                { id: 'gemma3', name: 'Gemma 3', sizes: ['1b', '4b', '12b', '27b'], tags: [], desc: 'Od Google, lekki i szybki' },
                { id: 'phi4', name: 'Phi-4', sizes: ['14b'], tags: [], desc: 'Microsoft, świetny na średnim sprzęcie' },
                { id: 'phi4-mini', name: 'Phi-4 Mini', sizes: ['3.8b'], tags: [], desc: '⭐ Polecany! Mały ale sprytny' },
                { id: 'mistral', name: 'Mistral', sizes: ['7b'], tags: [], desc: 'Francuski klasyk, szybki i dobry' },
                { id: 'mistral-nemo', name: 'Mistral Nemo', sizes: ['12b'], tags: ['tools'], desc: 'Nowszy Mistral z toolsami' }
            ]
        },
        coding: {
            name: '💻 Coding',
            desc: 'Specjaliści od programowania i kodu',
            models: [
                { id: 'qwen2.5-coder', name: 'Qwen 2.5 Coder', sizes: ['0.5b', '1.5b', '3b', '7b', '14b', '32b'], tags: ['tools'], desc: '⭐ Najlepszy do kodu, bardzo precyzyjny' },
                { id: 'deepseek-coder-v2', name: 'DeepSeek Coder V2', sizes: ['16b'], tags: [], desc: 'Chiński spec od kodu' },
                { id: 'codellama', name: 'Code Llama', sizes: ['7b', '13b', '34b', '70b'], tags: [], desc: 'Meta, dobry do dopełniania kodu' },
                { id: 'codegemma', name: 'CodeGemma', sizes: ['2b', '7b'], tags: [], desc: 'Google, lekki do kodu' },
                { id: 'starcoder2', name: 'StarCoder 2', sizes: ['3b', '7b', '15b'], tags: [], desc: 'BigCode, wiele języków programowania' },
                { id: 'codestral', name: 'Codestral', sizes: ['22b'], tags: [], desc: 'Mistral dla programistów' }
            ]
        },
        vision: {
            name: '👁️ Vision',
            desc: 'Widzą i rozumieją obrazki',
            models: [
                { id: 'llama3.2-vision', name: 'Llama 3.2 Vision', sizes: ['11b', '90b'], tags: ['vision'], desc: 'Meta, analizuje zdjęcia' },
                { id: 'llava', name: 'LLaVA', sizes: ['7b', '13b', '34b'], tags: ['vision'], desc: 'Rozpoznaje co jest na obrazku' },
                { id: 'llava-llama3', name: 'LLaVA Llama3', sizes: ['8b'], tags: ['vision'], desc: 'Nowsza wersja z Llama3' },
                { id: 'qwen3-vl', name: 'Qwen3-VL', sizes: ['2b', '4b', '8b', '30b'], tags: ['vision', 'tools'], desc: '⭐ Najlepszy do obrazów, wielozadaniowy' },
                { id: 'moondream', name: 'Moondream', sizes: ['2b'], tags: ['vision'], desc: 'Malutki ale widzi!' }
            ]
        },
        embedding: {
            name: '📊 Embedding',
            desc: 'Do wyszukiwania i RAG (nie do chatowania)',
            models: [
                { id: 'nomic-embed-text', name: 'Nomic Embed', sizes: ['137m'], tags: ['embedding'], desc: 'Popularny do wyszukiwania' },
                { id: 'mxbai-embed-large', name: 'MxBai Embed', sizes: ['335m'], tags: ['embedding'], desc: 'Duży embedding, dokładniejszy' },
                { id: 'bge-m3', name: 'BGE-M3', sizes: ['567m'], tags: ['embedding'], desc: 'Multilingual, wiele języków' },
                { id: 'all-minilm', name: 'All-MiniLM', sizes: ['23m', '33m'], tags: ['embedding'], desc: 'Maluteńki, szybki' }
            ]
        },
        roleplay: {
            name: '🎭 Roleplay / Uncensored',
            desc: 'Do kreatywnego pisania, bez cenzury',
            models: [
                { id: 'dolphin3', name: 'Dolphin 3', sizes: ['8b'], tags: [], desc: 'Bez filtrów, kreatywny' },
                { id: 'dolphin-llama3', name: 'Dolphin Llama3', sizes: ['8b', '70b'], tags: [], desc: 'Llama3 bez cenzury' },
                { id: 'llama2-uncensored', name: 'Llama2 Uncensored', sizes: ['7b', '70b'], tags: [], desc: 'Klasyk bez ograniczeń' },
                { id: 'nous-hermes2', name: 'Nous Hermes 2', sizes: ['10.7b', '34b'], tags: ['tools'], desc: 'Do storytellingu' },
                { id: 'hermes3', name: 'Hermes 3', sizes: ['8b', '70b'], tags: ['tools'], desc: 'Nowszy, lepszy do RP' }
            ]
        },
        small: {
            name: '🪶 Small / Edge',
            desc: 'Leciutkie, działają nawet na słabym sprzęcie',
            models: [
                { id: 'tinyllama', name: 'TinyLlama', sizes: ['1.1b'], tags: [], desc: 'Malutki ale działa!' },
                { id: 'smollm2', name: 'SmolLM2', sizes: ['135m', '360m', '1.7b'], tags: [], desc: 'Mikro-model od HuggingFace' },
                { id: 'phi3:mini', name: 'Phi-3 Mini', sizes: ['3.8b'], tags: [], desc: 'Microsoft, mały i mądry' },
                { id: 'gemma3:1b', name: 'Gemma 3 1B', sizes: ['1b'], tags: [], desc: 'Google, ultra lekki' },
                { id: 'orca-mini', name: 'Orca Mini', sizes: ['3b', '7b', '13b'], tags: [], desc: 'Zoptymalizowany do szybkości' }
            ]
        }
    },
    getVram(sizeStr) {
        const key = sizeStr.replace(/[^0-9.bm]/gi, '').toLowerCase();
        if (this.vramBySize[key]) return this.vramBySize[key];
        const match = key.match(/(\d+\.?\d*)([mb])/i);
        if (!match) return 999;
        const num = parseFloat(match[1]);
        return match[2] === 'm' ? Math.ceil(num / 500) : Math.ceil(num * 1.2);
    },
    filterByVram(maxVram) {
        const result = {};
        for (const [catId, cat] of Object.entries(this.categories)) {
            const filtered = cat.models.filter(m => m.sizes.some(s => this.getVram(s) <= maxVram))
                .map(m => ({ ...m, sizes: m.sizes.filter(s => this.getVram(s) <= maxVram) }))
                .filter(m => m.sizes.length > 0);
            if (filtered.length > 0) result[catId] = { ...cat, models: filtered };
        }

        // Inject Local/Custom models (bypass VRAM filter)
        if (typeof window.state !== 'undefined' && window.state.ollamaModels && window.state.ollamaModels.length > 0) {
            const knownIds = new Set();
            // Collect known IDs
            for (const cat of Object.values(this.categories)) {
                cat.models.forEach(m => knownIds.add(m.id));
            }

            const customModels = window.state.ollamaModels.filter(m => {
                // Check if model matches any known ID (exact or base name)
                return !Array.from(knownIds).some(id => m.name === id || m.name.startsWith(id + ':'));
            });

            if (customModels.length > 0) {
                result['custom'] = {
                    name: '📂 Lokalne / Inne',
                    desc: 'Modele znalezione na dysku (spoza listy oficjalnej)',
                    models: customModels.map(m => {
                        const parts = m.name.split(':');
                        const base = parts[0];
                        const tag = parts[1] || 'latest';
                        return {
                            id: base,
                            name: m.name,
                            sizes: [tag],
                            tags: ['local'],
                            desc: 'Znaleziony lokalnie'
                        };
                    })
                };
            }
        }

        return result;
    }
};

// ==============================
// Logic
// ==============================

export function filterModelsByVram() {
    const vram = parseInt(document.getElementById('vramFilter')?.value || 8);
    if (window.state) window.state.currentVramFilter = vram;
    renderModelCategories();
    populateModelSelects();
    if (window.addLog) window.addLog('info', `Filtr VRAM: ≤${vram} GB`);
}

export function renderModelCategories() {
    const container = document.getElementById('modelCategories');
    if (!container) return;

    const currentVram = window.state ? window.state.currentVramFilter : 8;
    const filtered = OLLAMA_MODELS.filterByVram(currentVram);

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
            // We need to access pullModel. Since it might not be modularized yet, 
            // we assume it is on window or we will extract it later? 
            // Wait, pullModel is typically in app.js or ollama-setup.js?
            // If it's in app.js, we call window.pullModel.
            if (window.pullModel) {
                window.pullModel(modelName);
            } else if (window.AppModules && window.AppModules.pullModel) {
                window.AppModules.pullModel(modelName);
            } else {
                console.error("pullModel not found");
            }
        });
    });
}

export function toggleCategory(catId) {
    const header = document.querySelector(`#cat-${catId}`)?.previousElementSibling;
    const body = document.getElementById(`cat-${catId}`);
    if (header && body) {
        header.classList.toggle('open');
        body.classList.toggle('open');
    }
}

export function populateModelSelects() {
    const selectExt = document.getElementById('modelExtraction');
    const selectGen = document.getElementById('modelGeneration');
    if (!selectExt || !selectGen) return;

    const currentVram = window.state ? window.state.currentVramFilter : 8;
    const filtered = OLLAMA_MODELS.filterByVram(currentVram);

    const allModels = [];
    for (const cat of Object.values(filtered)) {
        for (const m of cat.models) {
            for (const size of m.sizes) {
                allModels.push({ id: `${m.id}:${size}`, name: `${m.name} (${size})`, vram: OLLAMA_MODELS.getVram(size) });
            }
        }
    }
    allModels.sort((a, b) => a.vram - b.vram);

    const options = allModels.map(m =>
        `<option value="${m.id}" ${isModelInstalled(m.id.split(':')[0]) ? 'data-installed="true"' : ''}>${m.name} - ${m.vram}GB</option>`
    ).join('');

    selectExt.innerHTML = '<option value="">-- Wybierz model --</option>' + options;
    selectGen.innerHTML = '<option value="">-- Wybierz model --</option>' + options;

    // Restore previous selections if still valid
    if (window.state) {
        if (window.state.selectedModelExtraction) selectExt.value = window.state.selectedModelExtraction;
        if (window.state.selectedModelGeneration) selectGen.value = window.state.selectedModelGeneration;
    }
}

export function isModelInstalled(modelId) {
    if (!window.state || !window.state.ollamaModels) return false;
    return window.state.ollamaModels.some(m => m.name.startsWith(modelId));
}

// ==============================
// Selection Helpers
// ==============================

export function setExtractionModel(modelId) {
    if (window.state) window.state.selectedModelExtraction = modelId;
    if (window.addLog) window.addLog('info', `Model ekstrakcji: ${modelId}`);
}

export function setGenerationModel(modelId) {
    if (window.state) window.state.selectedModelGeneration = modelId;
    if (window.addLog) window.addLog('info', `Model generacji: ${modelId}`);
}

export function getCurrentModel() {
    if (!window.state) return 'gemma2:2b';
    return window.state.selectedModel || window.state.selectedModelGeneration || 'gemma2:2b';
}

// ==============================
// Ollama API Integration
// ==============================

export async function checkOllama() {
    if (window.addLog) window.addLog('info', 'Sprawdzam połączenie z Ollama...');
    const result = await window.electronAPI.checkOllama();

    const statusEl = document.getElementById('ollamaStatus');
    if (result.connected) {
        if (window.state) {
            window.state.ollamaConnected = true;
            window.state.ollamaModels = result.models;
        }
        if (statusEl) statusEl.innerHTML = `<span class="status-dot online"></span> <span>Ollama: online (${result.models.length} modeli)</span>`;
        if (window.addLog) window.addLog('success', `Ollama połączone: ${result.models.length} modeli dostępnych`);

        // Update model statuses
        updateModelStatuses();

        // Refresh model lists (to show discovered local models)
        if (window.state && (window.state.currentStep === 1 || window.state.currentStep === 3)) {
            renderModelCategories();
            populateModelSelects();
        }
    } else {
        if (statusEl) statusEl.innerHTML = `<span class="status-dot offline"></span> <span>Ollama: offline</span>`;
        if (window.addLog) window.addLog('error', `Ollama niedostępne: ${result.error} `);
    }
}

export function updateModelStatuses() {
    if (!window.state || !window.state.ollamaModels) return;

    const hasModel = (name) => window.state.ollamaModels.some(m => m.name === name);

    const status1 = document.getElementById('modelStatus1');
    const status2 = document.getElementById('modelStatus2');

    if (status1) {
        status1.textContent = hasModel('phi4-mini:latest') ? '✓ Zainstalowany' : 'Brak';
        status1.classList.toggle('installed', hasModel('phi4-mini:latest'));
    }
    if (status2) {
        status2.textContent = hasModel('mistral:latest') ? '✓ Zainstalowany' : 'Brak';
        status2.classList.toggle('installed', hasModel('mistral:latest'));
    }
}

// Active downloads tracking
// state.activeDownloads assumed to be initialized in state.js or app.js
// If not, we init it here loosely
if (window.state && !window.state.activeDownloads) window.state.activeDownloads = {};

export function updateDownloadQueue() {
    let container = document.getElementById('download-queue');
    if (!container) {
        // Create download queue container if it doesn't exist
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar && progressBar.parentElement) {
            container = document.createElement('div');
            container.id = 'download-queue';
            container.className = 'download-queue';
            progressBar.parentElement.insertBefore(container, progressBar);
        }
    }
    if (!container) return;
    if (!window.state || !window.state.activeDownloads) return;

    const downloads = Object.entries(window.state.activeDownloads);
    if (downloads.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = downloads.map(([modelName, data]) => `
    <div class="download-item" data-model="${modelName}">
      <span class="download-name">${modelName}</span>
      <div class="download-progress-bar">
        <div class="download-progress-fill" style="width: ${data.percent}%"></div>
      </div>
      <span class="download-percent">${data.percent}%</span>
    </div>
  `).join('');
}

export async function pullModel(modelName) {
    if (window.addLog) window.addLog('info', `Pobieranie modelu ${modelName}...`);

    // Add to active downloads
    if (window.state) {
        if (!window.state.activeDownloads) window.state.activeDownloads = {};
        window.state.activeDownloads[modelName] = { percent: 0, status: 'starting' };
    }
    updateDownloadQueue();

    const result = await window.electronAPI.pullModel(modelName);

    // Remove from active downloads
    if (window.state && window.state.activeDownloads) {
        delete window.state.activeDownloads[modelName];
    }
    updateDownloadQueue();

    if (result.success) {
        if (window.addLog) window.addLog('success', `Model ${modelName} pobrany`);
        await checkOllama(); // Refresh model list
    } else {
        if (window.addLog) window.addLog('error', `Błąd pobierania: ${result.error}`);
    }
}
