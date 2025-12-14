/**
 * @module ConfigHub Panel
 * @description GUI do zarządzania centralną konfiguracją AI
 */

// ==========================================
// STATE
// ==========================================

let configHubState = {
    config: null,
    defaults: null,
    loaded: false,
    dirty: false
};

// ==========================================
// TEMPLATE
// ==========================================

function getConfigHubTemplate() {
    const config = configHubState.config || {};
    const gen = config.generation || {};
    const prompts = config.prompts || {};
    const features = config.features || {};
    const timeouts = config.timeouts || {};
    const models = config.models || {};

    return `
    <div class="confighub-panel">
        <div class="confighub-header">
            <h2>🔧 ConfigHub - Centralna Konfiguracja AI</h2>
            <p class="confighub-subtitle">Wszystkie ustawienia w jednym miejscu. Zmiany są zapisywane automatycznie.</p>
        </div>

        <div class="confighub-grid">
            <!-- === MODELS === -->
            <div class="config-section">
                <div class="section-header">
                    <span class="section-icon">🧠</span>
                    <h3>Modele</h3>
                </div>
                <div class="config-row">
                    <label>Model domyślny:</label>
                    <input type="text" id="cfg-models-default" value="${models.default || 'mistral:latest'}" 
                           onchange="updateConfig('models.default', this.value)">
                </div>
                <div class="config-row">
                    <label>Fallback chain:</label>
                    <input type="text" id="cfg-models-fallback" 
                           value="${(models.fallbackChain || []).join(', ')}" 
                           onchange="updateConfig('models.fallbackChain', this.value.split(',').map(s=>s.trim()))"
                           placeholder="gemma:2b, phi3:3.8b">
                </div>
            </div>

            <!-- === GENERATION === -->
            <div class="config-section">
                <div class="section-header">
                    <span class="section-icon">🎚️</span>
                    <h3>Parametry Generacji</h3>
                </div>
                ${(() => {
            const params = [
                { type: 'range', label: 'Temperature (ogólna)', key: 'generation.temperature', value: gen.temperature ?? 0.7, min: 0, max: 1, step: 0.05, desc: 'Jak bardzo kreatywna i nieprzewidywalna ma być AI (0 = Robot, 1 = Artysta).' },
                { type: 'range', label: 'Temperature (klasyfikacja)', key: 'generation.temperatureClassify', value: gen.temperatureClassify ?? 0.1, min: 0, max: 0.5, step: 0.05, desc: 'Niska temperatura dla zadań logicznych, żeby AI nie zmyślała.' },
                { type: 'range', label: 'Temperature (kreatywna)', key: 'generation.temperatureCreative', value: gen.temperatureCreative ?? 0.85, min: 0.5, max: 1.2, step: 0.05, desc: 'Wysoka temperatura dla tworzenia fabuły i opisów.' },
                { type: 'number', label: 'num_predict (short)', key: 'generation.numPredict.short', value: gen.numPredict?.short ?? 800, min: 100, max: 5000, desc: 'Limit słów dla krótkich odpowiedzi.' },
                { type: 'number', label: 'num_predict (medium)', key: 'generation.numPredict.medium', value: gen.numPredict?.medium ?? 2000, min: 500, max: 10000, desc: 'Limit słów dla średnich odpowiedzi.' },
                { type: 'number', label: 'num_predict (long)', key: 'generation.numPredict.long', value: gen.numPredict?.long ?? 5000, min: 1000, max: 20000, desc: 'Limit słów dla długich questów.' },
                { type: 'number', label: 'num_ctx (domyślny)', key: 'generation.numCtx.default', value: gen.numCtx?.default ?? 4096, min: 1024, max: 131072, step: 1024, desc: 'Pamięć krótkotrwała AI (ile tekstu pamięta).' },
                { type: 'number', label: 'num_ctx (max)', key: 'generation.numCtx.max', value: gen.numCtx?.max ?? 32768, min: 4096, max: 131072, step: 4096, desc: 'Maksymalna techniczna pamięć modelu.' },
                { type: 'number', label: 'repeat_penalty', key: 'generation.repeatPenalty', value: gen.repeatPenalty ?? 1.1, min: 1.0, max: 2.0, step: 0.05, desc: 'Kara za powtarzanie tych samych zdań (1.1 = lekka kara).' },
                { type: 'number', label: 'top_p', key: 'generation.topP', value: gen.topP ?? 0.9, min: 0.1, max: 1.0, step: 0.05, desc: 'Różnorodność słownictwa (0.9 = 90% sensownych słów).' },
                { type: 'number', label: 'top_k', key: 'generation.topK', value: gen.topK ?? 40, min: 1, max: 100, desc: 'Ograniczenie wyboru do K najlepszych słów.' }
            ];

            return params.map(p => {
                const tooltip = p.desc ? `<div class="eli5-tooltip" title="${p.desc}">ℹ️</div>` : '';
                const descRow = p.desc ? `<div class="config-desc">${p.desc}</div>` : '';

                if (p.type === 'range') {
                    return `
                            <div class="config-row-group">
                                <div class="config-row">
                                    <label>${p.label} ${tooltip}</label>
                                    <input type="range" min="${p.min}" max="${p.max}" step="${p.step || 1}" value="${p.value}"
                                           oninput="this.nextElementSibling.textContent=this.value; updateConfig('${p.key}', parseFloat(this.value))">
                                    <span class="range-value">${p.value}</span>
                                </div>
                                ${descRow}
                            </div>`;
                } else {
                    return `
                            <div class="config-row-group">
                                <div class="config-row">
                                    <label>${p.label} ${tooltip}</label>
                                    <input type="number" value="${p.value}" min="${p.min}" max="${p.max}" step="${p.step || 1}"
                                           onchange="updateConfig('${p.key}', ${p.step ? 'parseFloat' : 'parseInt'}(this.value))">
                                </div>
                                ${descRow}
                            </div>`;
                }
            }).join('');
        })()}
            </div>

            <!-- === PROMPTS === -->
            <div class="config-section">
                <div class="section-header">
                    <span class="section-icon">📝</span>
                    <h3>Prompty</h3>
                </div>
                <div class="config-row">
                    <label>Język bazowy:</label>
                    <select onchange="updateConfig('prompts.language', this.value)">
                        <option value="pl" ${prompts.language === 'pl' ? 'selected' : ''}>Polski</option>
                        <option value="en" ${prompts.language === 'en' ? 'selected' : ''}>English</option>
                    </select>
                </div>
                <div class="config-row">
                    <label>Styl domyślny:</label>
                    <select onchange="updateConfig('prompts.style', this.value)">
                        <option value="auto" ${prompts.style === 'auto' ? 'selected' : ''}>Automatyczny</option>
                        <option value="political" ${prompts.style === 'political' ? 'selected' : ''}>Polityczny</option>
                        <option value="mystical" ${prompts.style === 'mystical' ? 'selected' : ''}>Mistyczny</option>
                        <option value="personal" ${prompts.style === 'personal' ? 'selected' : ''}>Osobisty</option>
                        <option value="action" ${prompts.style === 'action' ? 'selected' : ''}>Akcja</option>
                    </select>
                </div>
                <div class="config-row">
                    <label>Długość odpowiedzi:</label>
                    <select onchange="updateConfig('prompts.responseLength', this.value)">
                        <option value="short" ${prompts.responseLength === 'short' ? 'selected' : ''}>Krótka</option>
                        <option value="medium" ${prompts.responseLength === 'medium' ? 'selected' : ''}>Średnia</option>
                        <option value="long" ${prompts.responseLength === 'long' ? 'selected' : ''}>Długa</option>
                    </select>
                </div>
                <div class="config-row">
                    <label>Few-shot examples:</label>
                    <input type="number" value="${prompts.fewShotCount || 2}" min="0" max="5"
                           onchange="updateConfig('prompts.fewShotCount', parseInt(this.value))">
                </div>
                <div class="config-row config-checkboxes">
                    <label>Konteksty domyślne:</label>
                    <div class="checkbox-group">
                        <label><input type="checkbox" ${prompts.contexts?.geography ? 'checked' : ''} 
                               onchange="updateConfig('prompts.contexts.geography', this.checked)"> 🌍 Geografia</label>
                        <label><input type="checkbox" ${prompts.contexts?.system ? 'checked' : ''} 
                               onchange="updateConfig('prompts.contexts.system', this.checked)"> ⚖️ System</label>
                        <label><input type="checkbox" ${prompts.contexts?.quests ? 'checked' : ''} 
                               onchange="updateConfig('prompts.contexts.quests', this.checked)"> 📜 Questy</label>
                        <label><input type="checkbox" ${prompts.contexts?.aspirations ? 'checked' : ''} 
                               onchange="updateConfig('prompts.contexts.aspirations', this.checked)"> 🎯 Aspiracje</label>
                        <label><input type="checkbox" ${prompts.contexts?.weaknesses ? 'checked' : ''} 
                               onchange="updateConfig('prompts.contexts.weaknesses', this.checked)"> ⚠️ Słabości</label>
                    </div>
                </div>
            </div>

            <!-- === TIMEOUTS === -->
            <div class="config-section">
                <div class="section-header">
                    <span class="section-icon">⏱️</span>
                    <h3>Timeouty</h3>
                </div>
                <div class="config-row">
                    <label>Bazowy timeout (ms):</label>
                    <input type="number" value="${timeouts.baseMs || 300000}" min="60000" max="600000" step="30000"
                           onchange="updateConfig('timeouts.baseMs', parseInt(this.value))">
                    <span class="config-hint">${Math.round((timeouts.baseMs || 300000) / 60000)} min</span>
                </div>
                <div class="config-row">
                    <label>Mnożnik (reasoning):</label>
                    <input type="number" value="${timeouts.reasoningMultiplier || 2.5}" min="1.0" max="5.0" step="0.5"
                           onchange="updateConfig('timeouts.reasoningMultiplier', parseFloat(this.value))">
                </div>
                <div class="config-row">
                    <label>Mnożnik (duży model):</label>
                    <input type="number" value="${timeouts.largeModelMultiplier || 1.5}" min="1.0" max="3.0" step="0.25"
                           onchange="updateConfig('timeouts.largeModelMultiplier', parseFloat(this.value))">
                </div>
            </div>

            <!-- === FEATURE FLAGS === -->
            <div class="config-section">
                <div class="section-header">
                    <span class="section-icon">🚦</span>
                    <h3>Feature Flags</h3>
                </div>
                <div class="config-row">
                    <label><input type="checkbox" ${features.conversationFlow ? 'checked' : ''} 
                           onchange="updateConfig('features.conversationFlow', this.checked)">
                        Conversation Flow (diagnostyczny)</label>
                </div>
                <div class="config-row">
                    <label><input type="checkbox" ${features.ragEnabled ? 'checked' : ''} 
                           onchange="updateConfig('features.ragEnabled', this.checked)">
                        RAG (Vector Store)</label>
                </div>
                <div class="config-row">
                    <label><input type="checkbox" ${features.sessionContext ? 'checked' : ''} 
                           onchange="updateConfig('features.sessionContext', this.checked)">
                        Kontekst sesji</label>
                </div>
                <div class="config-row">
                    <label><input type="checkbox" ${features.streamingDefault ? 'checked' : ''} 
                           onchange="updateConfig('features.streamingDefault', this.checked)">
                        Streaming domyślnie</label>
                </div>
                <div class="config-row">
                    <label><input type="checkbox" ${features.debugLogging ? 'checked' : ''} 
                           onchange="updateConfig('features.debugLogging', this.checked)">
                        Debug logging</label>
                </div>
            </div>
        </div>

        <!-- === ACTIONS === -->
        <div class="confighub-actions">
            <button class="btn btn-secondary" onclick="resetConfigSection()">🔄 Reset sekcji</button>
            <button class="btn btn-secondary" onclick="resetAllConfig()">⚠️ Reset wszystkiego</button>
            <button class="btn btn-secondary" onclick="exportConfig()">📤 Eksportuj JSON</button>
            <button class="btn btn-secondary" onclick="importConfig()">📥 Importuj JSON</button>
            <button class="btn btn-primary" onclick="reloadConfig()">🔃 Odśwież</button>
        </div>

        <!-- === DEBUG VIEW === -->
        <div class="config-section config-debug">
            <div class="section-header">
                <span class="section-icon">🐛</span>
                <h3>Aktualny JSON (debug)</h3>
            </div>
            <pre id="configJsonPreview">${JSON.stringify(config, null, 2)}</pre>
        </div>
    </div>

    <style>
        .confighub-panel {
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }
        .confighub-header h2 {
            margin: 0 0 5px 0;
            color: var(--gold-bright);
        }
        .confighub-subtitle {
            color: var(--text-muted);
            margin: 0 0 20px 0;
        }
        .confighub-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
        }
        .config-section {
            background: var(--bg-card);
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            padding: 15px;
        }
        .section-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--border-subtle);
        }
        .section-header h3 {
            margin: 0;
            font-size: 14px;
            color: var(--text-primary);
        }
        .section-icon {
            font-size: 18px;
        }
        .config-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
            font-size: 13px;
        }
        .config-row label {
            min-width: 150px;
            color: var(--text-muted);
        }
        .config-row input[type="text"],
        .config-row input[type="number"],
        .config-row select {
            flex: 1;
            padding: 6px 10px;
            background: var(--bg-dark);
            border: 1px solid var(--border-subtle);
            border-radius: 4px;
            color: var(--text-primary);
            font-size: 13px;
        }
        .config-row input[type="range"] {
            flex: 1;
        }
        .range-value {
            min-width: 40px;
            text-align: right;
            color: var(--gold-soft);
            font-family: monospace;
        }
        .config-checkboxes {
            flex-direction: column;
            align-items: flex-start;
        }
        .checkbox-group {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 5px;
        }
        .checkbox-group label {
            min-width: auto;
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
        }
        .config-hint {
            font-size: 11px;
            color: var(--text-dim);
        }
        .confighub-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid var(--border-subtle);
        }
        .config-debug {
            margin-top: 20px;
        }
        .config-debug pre {
            background: var(--bg-dark);
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
            font-size: 11px;
            max-height: 300px;
            color: var(--text-muted);
        }
        .config-row-group {
            margin-bottom: 15px;
            border-bottom: 1px dashed var(--border-subtle);
            padding-bottom: 10px;
        }
        .config-row-group:last-child {
            border-bottom: none;
        }
        .config-desc {
            font-size: 11px;
            color: var(--text-dim);
            font-style: italic;
            margin-left: 160px; /* Align with input */
            margin-top: -5px;
        }
        .eli5-tooltip {
            display: inline-block;
            margin-left: 5px;
            cursor: help;
            font-size: 12px;
            opacity: 0.7;
        }
        .eli5-tooltip:hover {
            opacity: 1;
        }
    </style>
    `;
}

// ==========================================
// ACTIONS
// ==========================================

async function loadConfigHub() {
    try {
        const result = await window.electronAPI.configGetAll();
        if (result.success) {
            configHubState.config = result.config;
            configHubState.loaded = true;
        }

        const defaultsResult = await window.electronAPI.configGetDefaults();
        if (defaultsResult.success) {
            configHubState.defaults = defaultsResult.defaults;
        }
    } catch (e) {
        console.error('Failed to load config:', e);
    }
}

async function updateConfig(path, value) {
    try {
        await window.electronAPI.configSet(path, value);

        // Update local state
        const keys = path.split('.');
        let target = configHubState.config;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!target[keys[i]]) target[keys[i]] = {};
            target = target[keys[i]];
        }
        target[keys[keys.length - 1]] = value;

        // Update JSON preview
        const preview = document.getElementById('configJsonPreview');
        if (preview) {
            preview.textContent = JSON.stringify(configHubState.config, null, 2);
        }

        if (typeof addLog === 'function') {
            addLog('info', `⚙️ Config: ${path} = ${JSON.stringify(value)}`);
        }
    } catch (e) {
        console.error('Failed to update config:', e);
    }
}

async function resetConfigSection() {
    const sections = ['models', 'generation', 'prompts', 'personality', 'timeouts', 'features'];
    const section = prompt('Którą sekcję zresetować?\n\n' + sections.join(', '));

    if (section && sections.includes(section)) {
        await window.electronAPI.configReset(section);
        await reloadConfig();
        if (typeof addLog === 'function') {
            addLog('success', `✓ Zresetowano sekcję: ${section}`);
        }
    }
}

async function resetAllConfig() {
    if (confirm('Czy na pewno zresetować CAŁĄ konfigurację do wartości domyślnych?')) {
        await window.electronAPI.configReset(null);
        await reloadConfig();
        if (typeof addLog === 'function') {
            addLog('success', '✓ Zresetowano całą konfigurację');
        }
    }
}

async function exportConfig() {
    const result = await window.electronAPI.configExport();
    if (result.success) {
        navigator.clipboard.writeText(result.json);
        alert('Konfiguracja skopiowana do schowka!');
        if (typeof addLog === 'function') {
            addLog('success', '📤 Konfiguracja wyeksportowana do schowka');
        }
    }
}

async function importConfig() {
    const json = prompt('Wklej JSON konfiguracji:');
    if (json) {
        try {
            JSON.parse(json); // validate
            const result = await window.electronAPI.configImport(json);
            if (result.success) {
                await reloadConfig();
                alert('Konfiguracja zaimportowana!');
                if (typeof addLog === 'function') {
                    addLog('success', '📥 Konfiguracja zaimportowana');
                }
            } else {
                alert('Błąd importu: ' + result.error);
            }
        } catch (e) {
            alert('Nieprawidłowy JSON: ' + e.message);
        }
    }
}

async function reloadConfig() {
    await loadConfigHub();
    renderConfigHub();
}

function renderConfigHub() {
    const container = document.getElementById('stepContent');
    if (container) {
        container.innerHTML = getConfigHubTemplate();
    }
}

// ==========================================
// SHOW PANEL
// ==========================================

async function showConfigHub() {
    // Clear active sidebar items
    document.querySelectorAll('.step-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.confighub-item').forEach(el => el.classList.add('active'));

    // Hide footer
    const footer = document.querySelector('.content-footer');
    if (footer) footer.style.display = 'none';

    // Update title
    const title = document.getElementById('stepTitle');
    if (title) title.textContent = 'ConfigHub';

    // Load config and render
    await loadConfigHub();
    renderConfigHub();

    if (typeof addLog === 'function') {
        addLog('info', '🔧 ConfigHub panel opened');
    }
}

// ==========================================
// EXPORTS
// ==========================================

window.showConfigHub = showConfigHub;
window.updateConfig = updateConfig;
window.resetConfigSection = resetConfigSection;
window.resetAllConfig = resetAllConfig;
window.exportConfig = exportConfig;
window.importConfig = importConfig;
window.reloadConfig = reloadConfig;

console.log('✅ ConfigHub Panel loaded');
