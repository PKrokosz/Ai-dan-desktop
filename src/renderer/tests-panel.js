/**
 * Advanced Tests Panel UI
 * Submenu with all test types - isolated from main app
 */

// Test panel templates
function getTestsPanelTemplate() {
  return `
    <div class="card" style="margin-bottom: 20px;">
      <h3 class="card-title">🧪 Advanced Tests</h3>
      <p style="color: var(--text-dim); margin-bottom: 15px; font-size: 13px;">
        Zaawansowane testy modeli - każdy test można uruchomić osobno lub dla wszystkich modeli naraz.
      </p>
      
      <!-- Test Tabs -->
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;">
        <button class="btn btn-sm test-tab active" onclick="showTestPanel('context-limits')">📏 Context Limits</button>
        <button class="btn btn-sm test-tab" onclick="showTestPanel('memory-usage')">💾 Memory</button>
        <button class="btn btn-sm test-tab" onclick="showTestPanel('consistency')">🔄 Consistency</button>
        <button class="btn btn-sm test-tab" onclick="showTestPanel('prompt-sensitivity')">📐 Prompt Sensitivity</button>
        <button class="btn btn-sm test-tab" onclick="showTestPanel('instruction-following')">✅ Instructions</button>
        <button class="btn btn-sm test-tab" onclick="showTestPanel('hallucination')">🔍 Hallucination</button>
        <button class="btn btn-sm test-tab" onclick="showTestPanel('latency')">⏱️ Latency</button>
        <button class="btn btn-sm test-tab" onclick="showTestPanel('cost-efficiency')">💰 Cost</button>
        <button class="btn btn-sm test-tab" onclick="showTestPanel('needle-haystack')">🧵 Needle</button>
        <button class="btn btn-sm test-tab" onclick="showTestPanel('safety-limits')">🛡️ Safety</button>
        <button class="btn btn-sm test-tab" onclick="showTestPanel('language-stability')">🌍 Language</button>
      </div>

      <!-- Global Model Selector -->
      <div style="background: var(--bg-dark); padding: 10px; border-radius: 6px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 13px; color: var(--text-dim);">Cel testu:</span>
        <select id="global-model-selector" class="form-select" style="width: auto; flex-grow: 1;">
            <option value="all">🚀 Wszystkie Modele (Domyślne)</option>
        </select>
      </div>
    </div>

    <!-- Context Limits Panel -->
    <div id="test-panel-context-limits" class="test-panel-content">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 class="card-title" style="margin: 0;">📏 Context Window Limits</h3>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-primary" id="btnRunContextLimits" onclick="runContextLimitsTest()">
              🚀 Testuj Wszystkie Modele
            </button>
            <button class="btn btn-secondary" onclick="loadContextLimitsCache()">
              📥 Załaduj Cache
            </button>
          </div>
        </div>
        
        <p style="color: var(--text-dim); font-size: 12px; margin-bottom: 15px;">
          Sprawdza maksymalną liczbę tokenów kontekstu dla każdego modelu. 
          Pomaga dobrać model do zadań wymagających długiego kontekstu.
        </p>
        
        <div id="context-limits-results">
          <p style="color: var(--text-dim);">Kliknij "Testuj Wszystkie Modele" aby rozpocząć.</p>
        </div>
      </div>
    </div>

    <!-- Memory Usage Panel -->
    <div id="test-panel-memory-usage" class="test-panel-content" style="display: none;">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 class="card-title" style="margin: 0;">💾 Memory / VRAM Usage</h3>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-primary" id="btnRunMemoryUsage" onclick="runMemoryUsageTest()">
              🚀 Testuj Wszystkie Modele
            </button>
            <button class="btn btn-secondary" onclick="loadMemoryUsageCache()">
              📥 Załaduj Cache
            </button>
          </div>
        </div>
        
        <p style="color: var(--text-dim); font-size: 12px; margin-bottom: 15px;">
          Szacuje zużycie RAM dla każdego modelu. Sprawdza czy model mieści się w 8GB RAM.
        </p>
        
        <div id="memory-usage-results">
          <p style="color: var(--text-dim);">Kliknij "Testuj Wszystkie Modele" aby rozpocząć.</p>
        </div>
      </div>
    </div>
    <!-- Consistency Panel -->
    <div id="test-panel-consistency" class="test-panel-content" style="display: none;">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 class="card-title" style="margin: 0;">🔄 Consistency Test</h3>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-primary" id="btnRunConsistency" onclick="runConsistencyTest()">
              🚀 Testuj Wszystkie Modele
            </button>
            <button class="btn btn-secondary" onclick="loadConsistencyCache()">
              📥 Załaduj Cache
            </button>
          </div>
        </div>
        
        <p style="color: var(--text-dim); font-size: 12px; margin-bottom: 15px;">
          Uruchamia ten sam prompt 3x przy temp=0 i mierzy spójność odpowiedzi (Levenshtein distance).
        </p>
        
        <div id="consistency-results">
          <p style="color: var(--text-dim);">Kliknij "Testuj Wszystkie Modele" aby rozpocząć.</p>
        </div>
      </div>
    </div>
    <!-- Prompt Sensitivity Panel -->
    <div id="test-panel-prompt-sensitivity" class="test-panel-content" style="display: none;">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 class="card-title" style="margin: 0;">📐 Prompt Length Sensitivity</h3>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-primary" id="btnRunPromptSensitivity" onclick="runPromptSensitivityTest()">
              🚀 Testuj Wszystkie Modele
            </button>
            <button class="btn btn-secondary" onclick="loadPromptSensitivityCache()">
              📥 Załaduj Cache
            </button>
          </div>
        </div>
        
        <p style="color: var(--text-dim); font-size: 12px; margin-bottom: 15px;">
          Testuje jak model radzi sobie z krótkimi, średnimi i długimi promptami. Wykrywa degradację jakości.
        </p>
        
        <div id="prompt-sensitivity-results">
          <p style="color: var(--text-dim);">Kliknij "Testuj Wszystkie Modele" aby rozpocząć.</p>
        </div>
      </div>
    </div>
    <!-- Instruction Following Panel -->
    <div id="test-panel-instruction-following" class="test-panel-content" style="display: none;">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 class="card-title" style="margin: 0;">✅ Instruction Following</h3>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-primary" id="btnRunInstructionFollowing" onclick="runInstructionFollowingTest()">
              🚀 Testuj Wszystkie Modele
            </button>
            <button class="btn btn-secondary" onclick="loadInstructionFollowingCache()">
              📥 Załaduj Cache
            </button>
          </div>
        </div>
        
        <p style="color: var(--text-dim); font-size: 12px; margin-bottom: 15px;">
          Testuje czy model przestrzega instrukcji: format JSON, listy numerowane, język polski, limity długości.
        </p>
        
        <div id="instruction-following-results">
          <p style="color: var(--text-dim);">Kliknij "Testuj Wszystkie Modele" aby rozpocząć.</p>
        </div>
      </div>
    </div>
    <!-- Hallucination Panel -->
    <div id="test-panel-hallucination" class="test-panel-content" style="display: none;">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 class="card-title" style="margin: 0;">🔍 Hallucination Detection</h3>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-primary" id="btnRunHallucination" onclick="runHallucinationTest()">
              🚀 Testuj Wszystkie Modele
            </button>
            <button class="btn btn-secondary" onclick="loadHallucinationCache()">
              📥 Załaduj Cache
            </button>
          </div>
        </div>
        
        <p style="color: var(--text-dim); font-size: 12px; margin-bottom: 15px;">
          Sprawdza czy model wymysła fakty (np. postacie z Władcy Pierścieni, Skyrim, Wiedźmina) zamiast używać lore Gothic LARP.
        </p>
        
        <div id="hallucination-results">
          <p style="color: var(--text-dim);">Kliknij "Testuj Wszystkie Modele" aby rozpocząć.</p>
        </div>
      </div>
    </div>
    <!-- Latency Panel -->
    <div id="test-panel-latency" class="test-panel-content" style="display: none;">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 class="card-title" style="margin: 0;">⏱️ Latency Breakdown</h3>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-primary" id="btnRunLatency" onclick="runLatencyTest()">
              🚀 Testuj Wszystkie Modele
            </button>
            <button class="btn btn-secondary" onclick="loadLatencyCache()">
              📥 Załaduj Cache
            </button>
          </div>
        </div>
        
        <p style="color: var(--text-dim); font-size: 12px; margin-bottom: 15px;">
          Mierzy Time to First Token (TTFT) i tokens/second. Streaming API.
        </p>
        
        <div id="latency-results">
          <p style="color: var(--text-dim);">Kliknij "Testuj Wszystkie Modele" aby rozpocząć.</p>
        </div>
      </div>
    </div>
    <!-- Cost Efficiency Panel -->
    <div id="test-panel-cost-efficiency" class="test-panel-content" style="display: none;">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 class="card-title" style="margin: 0;">💰 Cost Efficiency</h3>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-primary" id="btnRunCostEfficiency" onclick="runCostEfficiencyTest()">
              🚀 Testuj Wszystkie Modele
            </button>
            <button class="btn btn-secondary" onclick="loadCostEfficiencyCache()">
              📥 Załaduj Cache
            </button>
          </div>
        </div>
        
        <p style="color: var(--text-dim); font-size: 12px; margin-bottom: 15px;">
          Oblicza jakość per token i per milisekundę. Pomaga wybrać najbardziej opłacalny model.
        </p>
        
        <div id="cost-efficiency-results">
          <p style="color: var(--text-dim);">Kliknij "Testuj Wszystkie Modele" aby rozpocząć.</p>
        </div>
      </div>
    </div>

    <!-- Needle in a Haystack Panel -->
    <div id="test-panel-needle-haystack" class="test-panel-content" style="display: none;">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 class="card-title" style="margin: 0;">🧵 Needle in a Haystack</h3>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-primary" id="btnRunNeedleHaystack" onclick="runNeedleHaystackTest()">
              🚀 Testuj Wszystkie Modele
            </button>
            <button class="btn btn-secondary" onclick="loadNeedleHaystackCache()">
              📥 Załaduj Cache
            </button>
          </div>
        </div>
        
        <p style="color: var(--text-dim); font-size: 12px; margin-bottom: 15px;">
          Sprawdza czy model potrafi znaleźć ukrytą informację ("igłę") w długim kontekście. Testuje początek (0%), środek (50%) i koniec (100%) kontekstu.
        </p>
        
        <div id="needle-haystack-results">
          <p style="color: var(--text-dim);">Kliknij "Testuj Wszystkie Modele" aby rozpocząć.</p>
        </div>
      </div>
    </div>

    <!-- Safety Limits Panel -->
    <div id="test-panel-safety-limits" class="test-panel-content" style="display: none;">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 class="card-title" style="margin: 0;">🛡️ Safety & Censorship Limits</h3>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-primary" id="btnRunSafetyLimits" onclick="runSafetyLimitsTest()">
              🚀 Testuj Wszystkie Modele
            </button>
            <button class="btn btn-secondary" onclick="loadSafetyLimitsCache()">
              📥 Załaduj Cache
            </button>
          </div>
        </div>
        
        <p style="color: var(--text-dim); font-size: 12px; margin-bottom: 15px;">
          Sprawdza reakcję modeli na kontrowersyjne tematy RPG (przemoc, czarna magia, kradzież). Wykrywa "odmowy" (refusals).
        </p>
        
        <div id="safety-limits-results">
          <p style="color: var(--text-dim);">Kliknij "Testuj Wszystkie Modele" aby rozpocząć.</p>
        </div>
      </div>
    </div>

    <!-- Language Stability Panel -->
    <div id="test-panel-language-stability" class="test-panel-content" style="display: none;">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 class="card-title" style="margin: 0;">🌍 Language Stability</h3>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-primary" id="btnRunLanguageStability" onclick="runLanguageStabilityTest()">
              🚀 Uruchom Test
            </button>
            <button class="btn btn-secondary" onclick="loadLanguageStabilityCache()">
              📥 Załaduj Cache
            </button>
          </div>
        </div>
        
        <p style="color: var(--text-dim); font-size: 12px; margin-bottom: 15px;">
          Generuje długi tekst (>1000 tokenów) i analizuje go pod kątem wtrąceń angielskich (Language Bleed).
        </p>
        
        <div id="language-stability-results">
          <p style="color: var(--text-dim);">Kliknij "Uruchom Test" aby rozpocząć.</p>
        </div>
      </div>
    </div>
  </div>
  `;
}

// Show specific test panel
function showTestPanel(testId) {
  // Hide all panels
  document.querySelectorAll('.test-panel-content').forEach(p => p.style.display = 'none');
  // Deactivate all tabs
  document.querySelectorAll('.test-tab').forEach(t => t.classList.remove('active'));

  // Show selected panel
  const panel = document.getElementById(`test-panel-${testId}`);
  if (panel) panel.style.display = 'block';

  // Activate tab
  event.target.classList.add('active');
}

// Run Context Limits test on all models
async function runContextLimitsTest() {
  const btn = document.getElementById('btnRunContextLimits');
  btn.disabled = true;
  btn.textContent = '⏳ Testowanie...';

  const resultsDiv = document.getElementById('context-limits-results');
  resultsDiv.innerHTML = '<p style="color: var(--gold);">⏳ Pobieranie listy modeli i testowanie...</p>';

  try {
    // Get available models first
    const modelsResult = await window.electronAPI.testbenchGetModels();
    if (!modelsResult.success) {
      throw new Error(modelsResult.error || 'Failed to get models');
    }

    const selectedModel = document.getElementById('global-model-selector') ? document.getElementById('global-model-selector').value : 'all';
    let modelNames = [];

    if (selectedModel && selectedModel !== 'all') {
      modelNames = [selectedModel];
    } else {
      modelNames = modelsResult.models.map(m => m.name);
    }
    addLog('info', `📏 Testowanie Context Limits dla ${modelNames.length} modeli...`);

    // Run test
    const result = await window.electronAPI.testsContextLimitsRunAll(modelNames);

    if (result.success) {
      displayContextLimitsResults(result);
      addLog('success', `✓ Context Limits test zakończony`);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    resultsDiv.innerHTML = `<p style="color: var(--error);">❌ Błąd: ${error.message}</p>`;
    addLog('error', `Context Limits test error: ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 Testuj Wszystkie Modele';
  }
}

// Load cached results
async function loadContextLimitsCache() {
  try {
    const result = await window.electronAPI.testsContextLimitsLoadCache();
    if (result.success && result.cached) {
      displayContextLimitsResults(result.cached);
      addLog('info', `📥 Załadowano cache z ${result.cached.timestamp}`);
    } else {
      addLog('warn', 'Brak danych w cache');
    }
  } catch (error) {
    addLog('error', `Błąd ładowania cache: ${error.message}`);
  }
}

// Display Context Limits results
function displayContextLimitsResults(data) {
  const resultsDiv = document.getElementById('context-limits-results');
  const results = data.results || [];
  const summary = data.summary || {};

  // Build table
  const tableRows = results.map(r => {
    if (!r.success) {
      return `<tr><td>${r.model}</td><td colspan="3" style="color: var(--error);">❌ ${r.error}</td></tr>`;
    }

    const ctx = r.metrics.maxContext;
    const ctxStr = ctx >= 1000 ? `${Math.round(ctx / 1000)}K` : ctx;
    const optStr = r.metrics.optimalContext >= 1000 ? `${Math.round(r.metrics.optimalContext / 1000)}K` : r.metrics.optimalContext;

    const badge = ctx >= 32768 ? '<span style="color: var(--success);">✅ Long</span>' :
      ctx >= 8192 ? '<span style="color: var(--gold);">⚠️ Medium</span>' :
        '<span style="color: var(--error);">❌ Short</span>';

    return `
            <tr>
                <td><strong>${r.model}</strong></td>
                <td>${ctxStr}</td>
                <td>${optStr}</td>
                <td>${badge}</td>
            </tr>
        `;
  }).join('');

  // Build narrative summaries
  const narratives = results
    .filter(r => r.success && r.narrative)
    .map(r => `<div style="padding: 10px; background: var(--bg-dark); border-radius: 6px; margin-bottom: 8px; font-size: 12px;">${r.narrative.replace(/\n/g, '<br>')}</div>`)
    .join('');

  resultsDiv.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h4 style="font-size: 14px; margin-bottom: 10px;">📊 Wyniki (${results.length} modeli)</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Model</th>
                        <th>Max Context</th>
                        <th>Optymalne</th>
                        <th>Kategoria</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="font-size: 14px; margin-bottom: 10px;">🏆 Rekomendacje</h4>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                <div style="padding: 10px; background: var(--bg-dark); border-radius: 6px; border-left: 3px solid var(--success);">
                    <strong style="color: var(--success);">Long Context</strong><br>
                    <span style="font-size: 11px;">${summary.recommendations?.longContext?.join(', ') || 'Brak'}</span>
                </div>
                <div style="padding: 10px; background: var(--bg-dark); border-radius: 6px; border-left: 3px solid var(--gold);">
                    <strong style="color: var(--gold);">Medium Context</strong><br>
                    <span style="font-size: 11px;">${summary.recommendations?.mediumContext?.join(', ') || 'Brak'}</span>
                </div>
                <div style="padding: 10px; background: var(--bg-dark); border-radius: 6px; border-left: 3px solid var(--error);">
                    <strong style="color: var(--error);">Short Context</strong><br>
                    <span style="font-size: 11px;">${summary.recommendations?.shortContext?.join(', ') || 'Brak'}</span>
                </div>
            </div>
        </div>
        
        <details style="margin-top: 15px;">
            <summary style="cursor: pointer; color: var(--gold);">📝 Narracja dla człowieka</summary>
            <div style="margin-top: 10px;">
                ${narratives}
            </div>
        </details>
    `;
}

// ============================================
// MEMORY USAGE TEST
// ============================================

// Run Memory Usage test on all models
async function runMemoryUsageTest() {
  const btn = document.getElementById('btnRunMemoryUsage');
  btn.disabled = true;
  btn.textContent = '⏳ Testowanie...';

  const resultsDiv = document.getElementById('memory-usage-results');
  resultsDiv.innerHTML = '<p style="color: var(--gold);">⏳ Szacowanie zużycia pamięci dla modeli...</p>';

  try {
    const modelsResult = await window.electronAPI.testbenchGetModels();
    if (!modelsResult.success) {
      throw new Error(modelsResult.error || 'Failed to get models');
    }

    const modelNames = modelsResult.models.map(m => m.name);
    addLog('info', `💾 Testowanie Memory Usage dla ${modelNames.length} modeli...`);

    const result = await window.electronAPI.testsMemoryUsageRunAll(modelNames);

    if (result.success) {
      displayMemoryUsageResults(result);
      addLog('success', `✓ Memory Usage test zakończony`);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    resultsDiv.innerHTML = `<p style="color: var(--error);">❌ Błąd: ${error.message}</p>`;
    addLog('error', `Memory Usage test error: ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 Testuj Wszystkie Modele';
  }
}

// Load cached Memory Usage results
async function loadMemoryUsageCache() {
  try {
    const result = await window.electronAPI.testsMemoryUsageLoadCache();
    if (result.success && result.cached) {
      displayMemoryUsageResults(result.cached);
      addLog('info', `📥 Załadowano cache z ${result.cached.timestamp}`);
    } else {
      addLog('warn', 'Brak danych w cache');
    }
  } catch (error) {
    addLog('error', `Błąd ładowania cache: ${error.message}`);
  }
}

// Display Memory Usage results
function displayMemoryUsageResults(data) {
  const resultsDiv = document.getElementById('memory-usage-results');
  const results = data.results || [];
  const summary = data.summary || {};

  // Sort by size
  const sorted = [...results].filter(r => r.success).sort((a, b) =>
    a.metrics.estimatedSizeGB - b.metrics.estimatedSizeGB
  );

  const tableRows = results.map(r => {
    if (!r.success) {
      return `<tr><td>${r.model}</td><td colspan="3" style="color: var(--error);">❌ ${r.error}</td></tr>`;
    }

    const sizeGB = r.metrics.estimatedSizeGB.toFixed(1);
    const fits = r.metrics.fits8GB;

    const badge = fits
      ? '<span style="color: var(--success);">✅ Mieści się</span>'
      : '<span style="color: var(--error);">❌ Za duży</span>';

    return `
            <tr>
                <td><strong>${r.model}</strong></td>
                <td>${sizeGB} GB</td>
                <td>${badge}</td>
                <td>${r.json?.recommendation === 'can_run_locally' ? '🖥️ Lokalnie' : '☁️ Cloud/Więcej RAM'}</td>
            </tr>
        `;
  }).join('');

  const narratives = results
    .filter(r => r.success && r.narrative)
    .map(r => `<div style="padding: 10px; background: var(--bg-dark); border-radius: 6px; margin-bottom: 8px; font-size: 12px;">${r.narrative.replace(/\n/g, '<br>')}</div>`)
    .join('');

  resultsDiv.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h4 style="font-size: 14px; margin-bottom: 10px;">📊 Szacowane zużycie RAM (${results.length} modeli)</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Model</th>
                        <th>Rozmiar</th>
                        <th>8GB RAM</th>
                        <th>Rekomendacja</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="font-size: 14px; margin-bottom: 10px;">🏆 Podsumowanie</h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                <div style="padding: 10px; background: var(--bg-dark); border-radius: 6px; border-left: 3px solid var(--success);">
                    <strong style="color: var(--success);">✅ Mieszczą się w 8GB</strong><br>
                    <span style="font-size: 11px;">${summary.fitsIn8GB?.join(', ') || 'Brak'}</span>
                </div>
                <div style="padding: 10px; background: var(--bg-dark); border-radius: 6px; border-left: 3px solid var(--error);">
                    <strong style="color: var(--error);">❌ Wymagają więcej RAM</strong><br>
                    <span style="font-size: 11px;">${summary.requiresMoreRAM?.join(', ') || 'Brak'}</span>
                </div>
            </div>
            <div style="margin-top: 10px; padding: 10px; background: var(--bg-dark); border-radius: 6px;">
                <strong>Najmniejszy:</strong> ${summary.smallest} (${summary.smallestSize?.toFixed(1) || 0} GB) | 
                <strong>Największy:</strong> ${summary.largest} (${summary.largestSize?.toFixed(1) || 0} GB)
            </div>
        </div>
        
        <details style="margin-top: 15px;">
            <summary style="cursor: pointer; color: var(--gold);">📝 Narracja dla człowieka</summary>
            <div style="margin-top: 10px;">
                ${narratives}
            </div>
        </details>
    `;
}

// ============================================
// CONSISTENCY TEST
// ============================================

async function runConsistencyTest() {
  const btn = document.getElementById('btnRunConsistency');
  btn.disabled = true;
  btn.textContent = '⏳ Testowanie (3x per model)...';

  const resultsDiv = document.getElementById('consistency-results');
  resultsDiv.innerHTML = '<p style="color: var(--gold);">⏳ Testowanie spójności odpowiedzi (może potrwać dłużej - 3 uruchomienia per model)...</p>';

  try {
    const modelsResult = await window.electronAPI.testbenchGetModels();
    if (!modelsResult.success) throw new Error(modelsResult.error);

    const modelNames = modelsResult.models.map(m => m.name);
    addLog('info', `🔄 Testowanie Consistency dla ${modelNames.length} modeli (3x każdy)...`);

    const result = await window.electronAPI.testsConsistencyRunAll(modelNames);

    if (result.success) {
      displayConsistencyResults(result);
      addLog('success', `✓ Consistency test zakończony`);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    resultsDiv.innerHTML = `<p style="color: var(--error);">❌ Błąd: ${error.message}</p>`;
    addLog('error', `Consistency test error: ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 Testuj Wszystkie Modele';
  }
}

async function loadConsistencyCache() {
  try {
    const result = await window.electronAPI.testsConsistencyLoadCache();
    if (result.success && result.cached) {
      displayConsistencyResults(result.cached);
      addLog('info', `📥 Załadowano cache z ${result.cached.timestamp}`);
    } else {
      addLog('warn', 'Brak danych w cache');
    }
  } catch (error) {
    addLog('error', `Błąd ładowania cache: ${error.message}`);
  }
}

function displayConsistencyResults(data) {
  const resultsDiv = document.getElementById('consistency-results');
  const results = data.results || [];
  const summary = data.summary || {};

  const tableRows = results.map(r => {
    if (!r.success) {
      return `<tr><td>${r.model}</td><td colspan="3" style="color: var(--error);">❌ ${r.error}</td></tr>`;
    }

    const sim = r.metrics.avgSimilarity;
    const badge = r.metrics.isHighlyConsistent
      ? '<span style="color: var(--success);">✅ Wysoka</span>'
      : r.metrics.isConsistent
        ? '<span style="color: var(--gold);">⚠️ Średnia</span>'
        : '<span style="color: var(--error);">❌ Niska</span>';

    return `
            <tr>
                <td><strong>${r.model}</strong></td>
                <td>${sim}%</td>
                <td>${r.metrics.minSimilarity}% - ${r.metrics.maxSimilarity}%</td>
                <td>${badge}</td>
            </tr>
        `;
  }).join('');

  const narratives = results
    .filter(r => r.success && r.narrative)
    .map(r => `<div style="padding: 10px; background: var(--bg-dark); border-radius: 6px; margin-bottom: 8px; font-size: 12px;">${r.narrative.replace(/\n/g, '<br>')}</div>`)
    .join('');

  resultsDiv.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h4 style="font-size: 14px; margin-bottom: 10px;">📊 Spójność odpowiedzi (${results.length} modeli)</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Model</th>
                        <th>Śr. Podobieństwo</th>
                        <th>Zakres</th>
                        <th>Spójność</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="font-size: 14px; margin-bottom: 10px;">🏆 Podsumowanie</h4>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                <div style="padding: 10px; background: var(--bg-dark); border-radius: 6px; border-left: 3px solid var(--success);">
                    <strong style="color: var(--success);">✅ Wysoce spójne (≥98%)</strong><br>
                    <span style="font-size: 11px;">${summary.highlyConsistent?.join(', ') || 'Brak'}</span>
                </div>
                <div style="padding: 10px; background: var(--bg-dark); border-radius: 6px; border-left: 3px solid var(--gold);">
                    <strong style="color: var(--gold);">⚠️ Przeważnie spójne (≥90%)</strong><br>
                    <span style="font-size: 11px;">${summary.mostlyConsistent?.join(', ') || 'Brak'}</span>
                </div>
                <div style="padding: 10px; background: var(--bg-dark); border-radius: 6px; border-left: 3px solid var(--error);">
                    <strong style="color: var(--error);">❌ Niespójne (<90%)</strong><br>
                    <span style="font-size: 11px;">${summary.inconsistent?.join(', ') || 'Brak'}</span>
                </div>
            </div>
        </div>
        
        <details style="margin-top: 15px;">
            <summary style="cursor: pointer; color: var(--gold);">📝 Narracja dla człowieka</summary>
            <div style="margin-top: 10px;">${narratives}</div>
        </details>
    `;
}

// ============================================
// PROMPT SENSITIVITY TEST
// ============================================

async function runPromptSensitivityTest() {
  const btn = document.getElementById('btnRunPromptSensitivity');
  btn.disabled = true;
  btn.textContent = '⏳ Testowanie (3 prompty per model)...';

  const resultsDiv = document.getElementById('prompt-sensitivity-results');
  resultsDiv.innerHTML = '<p style="color: var(--gold);">⏳ Testowanie z różnymi długościami promptów...</p>';

  try {
    const modelsResult = await window.electronAPI.testbenchGetModels();
    if (!modelsResult.success) throw new Error(modelsResult.error);

    const modelNames = modelsResult.models.map(m => m.name);
    addLog('info', `📐 Testowanie Prompt Sensitivity dla ${modelNames.length} modeli...`);

    const result = await window.electronAPI.testsPromptSensitivityRunAll(modelNames);

    if (result.success) {
      displayPromptSensitivityResults(result);
      addLog('success', `✓ Prompt Sensitivity test zakończony`);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    resultsDiv.innerHTML = `<p style="color: var(--error);">❌ Błąd: ${error.message}</p>`;
    addLog('error', `Prompt Sensitivity error: ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 Testuj Wszystkie Modele';
  }
}

async function loadPromptSensitivityCache() {
  try {
    const result = await window.electronAPI.testsPromptSensitivityLoadCache();
    if (result.success && result.cached) {
      displayPromptSensitivityResults(result.cached);
      addLog('info', `📥 Załadowano cache z ${result.cached.timestamp}`);
    } else {
      addLog('warn', 'Brak danych w cache');
    }
  } catch (error) {
    addLog('error', `Błąd ładowania cache: ${error.message}`);
  }
}

function displayPromptSensitivityResults(data) {
  const resultsDiv = document.getElementById('prompt-sensitivity-results');
  const results = data.results || [];
  const summary = data.summary || {};

  const tableRows = results.map(r => {
    if (!r.success) {
      return `<tr><td>${r.model}</td><td colspan="5" style="color: var(--error);">❌ ${r.error}</td></tr>`;
    }

    const m = r.metrics;
    const badge = m.handlesLongWell
      ? '<span style="color: var(--success);">✅ OK</span>'
      : '<span style="color: var(--gold);">⚠️ Degradacja</span>';

    return `
            <tr>
                <td><strong>${r.model}</strong></td>
                <td>${m.short.score}%</td>
                <td>${m.medium.score}%</td>
                <td>${m.long.score}%</td>
                <td>${m.avgScore}%</td>
                <td>${badge}</td>
            </tr>
        `;
  }).join('');

  resultsDiv.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h4 style="font-size: 14px; margin-bottom: 10px;">📊 Wyniki według długości promptu (${results.length} modeli)</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Model</th>
                        <th>Short</th>
                        <th>Medium</th>
                        <th>Long</th>
                        <th>Średnia</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="font-size: 14px; margin-bottom: 10px;">🏆 Podsumowanie</h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                <div style="padding: 10px; background: var(--bg-dark); border-radius: 6px; border-left: 3px solid var(--success);">
                    <strong style="color: var(--success);">✅ Radzą sobie z wszystkimi</strong><br>
                    <span style="font-size: 11px;">${summary.handlesAllLengths?.join(', ') || 'Brak'}</span>
                </div>
                <div style="padding: 10px; background: var(--bg-dark); border-radius: 6px; border-left: 3px solid var(--gold);">
                    <strong style="color: var(--gold);">⚠️ Lepsze dla krótkich</strong><br>
                    <span style="font-size: 11px;">${summary.betterForShort?.join(', ') || 'Brak'}</span>
                </div>
            </div>
            <div style="margin-top: 10px; padding: 10px; background: var(--bg-dark); border-radius: 6px;">
                <strong>Najlepszy overall:</strong> ${summary.bestOverall} (${summary.bestScore}%)
            </div>
        </div>
    `;
}

// ============================================
// INSTRUCTION FOLLOWING TEST
// ============================================

async function runInstructionFollowingTest() {
  const btn = document.getElementById('btnRunInstructionFollowing');
  btn.disabled = true;
  btn.textContent = '⏳ Testowanie (4 testy per model)...';

  const resultsDiv = document.getElementById('instruction-following-results');
  resultsDiv.innerHTML = '<p style="color: var(--gold);">⏳ Testowanie przestrzegania instrukcji...</p>';

  try {
    const modelsResult = await window.electronAPI.testbenchGetModels();
    if (!modelsResult.success) throw new Error(modelsResult.error);

    const modelNames = modelsResult.models.map(m => m.name);
    addLog('info', `✅ Testowanie Instruction Following dla ${modelNames.length} modeli...`);

    const result = await window.electronAPI.testsInstructionFollowingRunAll(modelNames);

    if (result.success) {
      displayInstructionFollowingResults(result);
      addLog('success', `✓ Instruction Following test zakończony`);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    resultsDiv.innerHTML = `<p style="color: var(--error);">❌ Błąd: ${error.message}</p>`;
    addLog('error', `Instruction Following error: ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 Testuj Wszystkie Modele';
  }
}

async function loadInstructionFollowingCache() {
  try {
    const result = await window.electronAPI.testsInstructionFollowingLoadCache();
    if (result.success && result.cached) {
      displayInstructionFollowingResults(result.cached);
      addLog('info', `📥 Załadowano cache z ${result.cached.timestamp}`);
    } else {
      addLog('warn', 'Brak danych w cache');
    }
  } catch (error) {
    addLog('error', `Błąd ładowania cache: ${error.message}`);
  }
}

function displayInstructionFollowingResults(data) {
  const resultsDiv = document.getElementById('instruction-following-results');
  const results = data.results || [];
  const summary = data.summary || {};

  const tableRows = results.map(r => {
    if (!r.success) {
      return `<tr><td>${r.model}</td><td colspan="5" style="color: var(--error);">❌ ${r.error}</td></tr>`;
    }

    const m = r.metrics;
    const tests = m.tests || {};

    const getCheck = (key) => tests[key]?.passed
      ? '✅' : '❌';

    return `
            <tr>
                <td><strong>${r.model}</strong></td>
                <td>${getCheck('json')}</td>
                <td>${getCheck('list')}</td>
                <td>${getCheck('polish')}</td>
                <td>${getCheck('length')}</td>
                <td><strong>${m.complianceRate}%</strong></td>
            </tr>
        `;
  }).join('');

  resultsDiv.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h4 style="font-size: 14px; margin-bottom: 10px;">📊 Wyniki przestrzegania instrukcji (${results.length} modeli)</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Model</th>
                        <th>JSON</th>
                        <th>Lista</th>
                        <th>Polski</th>
                        <th>Długość</th>
                        <th>Compliance</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="font-size: 14px; margin-bottom: 10px;">🏆 Podsumowanie</h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                <div style="padding: 10px; background: var(--bg-dark); border-radius: 6px; border-left: 3px solid var(--success);">
                    <strong style="color: var(--success);">✅ Przestrzegają instrukcji (≥75%)</strong><br>
                    <span style="font-size: 11px;">${summary.compliantModels?.join(', ') || 'Brak'}</span>
                </div>
                <div style="padding: 10px; background: var(--bg-dark); border-radius: 6px; border-left: 3px solid var(--error);">
                    <strong style="color: var(--error);">❌ Mają problemy (<75%)</strong><br>
                    <span style="font-size: 11px;">${summary.nonCompliantModels?.join(', ') || 'Brak'}</span>
                </div>
            </div>
            <div style="margin-top: 10px; padding: 10px; background: var(--bg-dark); border-radius: 6px;">
                <strong>Najlepszy:</strong> ${summary.bestModel} (${summary.bestScore}%)
            </div>
        </div>
    `;
}

// ============================================
// HALLUCINATION TEST
// ============================================

async function runHallucinationTest() {
  const btn = document.getElementById('btnRunHallucination');
  btn.disabled = true;
  btn.textContent = '⏳ Sprawdzanie halucynacji...';

  const resultsDiv = document.getElementById('hallucination-results');
  resultsDiv.innerHTML = '<p style="color: var(--gold);">⏳ Testowanie wierności faktom Gothic LARP...</p>';

  try {
    const modelsResult = await window.electronAPI.testbenchGetModels();
    if (!modelsResult.success) throw new Error(modelsResult.error);

    const modelNames = modelsResult.models.map(m => m.name);
    addLog('info', `🔍 Testowanie Hallucination dla ${modelNames.length} modeli...`);

    const result = await window.electronAPI.testsHallucinationRunAll(modelNames);

    if (result.success) {
      displayHallucinationResults(result);
      addLog('success', `✓ Hallucination test zakończony`);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    resultsDiv.innerHTML = `<p style="color: var(--error);">❌ Błąd: ${error.message}</p>`;
    addLog('error', `Hallucination error: ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 Testuj Wszystkie Modele';
  }
}

async function loadHallucinationCache() {
  try {
    const result = await window.electronAPI.testsHallucinationLoadCache();
    if (result.success && result.cached) {
      displayHallucinationResults(result.cached);
      addLog('info', `📥 Załadowano cache z ${result.cached.timestamp}`);
    } else {
      addLog('warn', 'Brak danych w cache');
    }
  } catch (error) {
    addLog('error', `Błąd ładowania cache: ${error.message}`);
  }
}

function displayHallucinationResults(data) {
  const resultsDiv = document.getElementById('hallucination-results');
  const results = data.results || [];
  const summary = data.summary || {};

  const tableRows = results.map(r => {
    if (!r.success) {
      return `<tr><td>${r.model}</td><td colspan="4" style="color: var(--error);">❌ ${r.error}</td></tr>`;
    }

    const m = r.metrics;
    const badge = m.isReliable
      ? '<span style="color: var(--success);">✅ Wiarygodny</span>'
      : m.hallucinationCount === 0
        ? '<span style="color: var(--gold);">⚠️ OK</span>'
        : '<span style="color: var(--error);">❌ Halucynacje</span>';

    return `
            <tr>
                <td><strong>${r.model}</strong></td>
                <td>${m.score}%</td>
                <td>${m.factCount}</td>
                <td>${m.hallucinationCount > 0 ? m.hallucinationsFound.join(', ') : '-'}</td>
                <td>${badge}</td>
            </tr>
        `;
  }).join('');

  resultsDiv.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h4 style="font-size: 14px; margin-bottom: 10px;">📊 Wyniki Hallucination Detection (${results.length} modeli)</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Model</th>
                        <th>Score</th>
                        <th>Fakty Gothic</th>
                        <th>Halucynacje</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="font-size: 14px; margin-bottom: 10px;">🏆 Podsumowanie</h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                <div style="padding: 10px; background: var(--bg-dark); border-radius: 6px; border-left: 3px solid var(--success);">
                    <strong style="color: var(--success);">✅ Wiarygodne (bez halucynacji)</strong><br>
                    <span style="font-size: 11px;">${summary.reliableModels?.join(', ') || 'Brak'}</span>
                </div>
                <div style="padding: 10px; background: var(--bg-dark); border-radius: 6px; border-left: 3px solid var(--error);">
                    <strong style="color: var(--error);">❌ Skłonne do halucynacji</strong><br>
                    <span style="font-size: 11px;">${summary.unreliableModels?.join(', ') || 'Brak'}</span>
                </div>
            </div>
            <div style="margin-top: 10px; padding: 10px; background: var(--bg-dark); border-radius: 6px;">
                <strong>Najlepszy:</strong> ${summary.bestModel} (${summary.bestScore}%)
            </div>
        </div>
    `;
}

// ============================================
// LATENCY TEST
// ============================================

async function runLatencyTest() {
  const btn = document.getElementById('btnRunLatency');
  btn.disabled = true;
  btn.textContent = '⏳ Mierzenie latencji...';

  const resultsDiv = document.getElementById('latency-results');
  resultsDiv.innerHTML = '<p style="color: var(--gold);">⏳ Mierzenie TTFT i tokens/second (streaming)...</p>';

  try {
    const modelsResult = await window.electronAPI.testbenchGetModels();
    if (!modelsResult.success) throw new Error(modelsResult.error);

    const modelNames = modelsResult.models.map(m => m.name);
    addLog('info', `⏱️ Testowanie Latency dla ${modelNames.length} modeli...`);

    const result = await window.electronAPI.testsLatencyRunAll(modelNames);

    if (result.success) {
      displayLatencyResults(result);
      addLog('success', `✓ Latency test zakończony`);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    resultsDiv.innerHTML = `<p style="color: var(--error);">❌ Błąd: ${error.message}</p>`;
    addLog('error', `Latency error: ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 Testuj Wszystkie Modele';
  }
}

async function loadLatencyCache() {
  try {
    const result = await window.electronAPI.testsLatencyLoadCache();
    if (result.success && result.cached) {
      displayLatencyResults(result.cached);
      addLog('info', `📥 Załadowano cache z ${result.cached.timestamp}`);
    } else {
      addLog('warn', 'Brak danych w cache');
    }
  } catch (error) {
    addLog('error', `Błąd ładowania cache: ${error.message}`);
  }
}

function displayLatencyResults(data) {
  const resultsDiv = document.getElementById('latency-results');
  const results = data.results || [];
  const summary = data.summary || {};

  const tableRows = results.map(r => {
    if (!r.success) {
      return `<tr><td>${r.model}</td><td colspan="4" style="color: var(--error);">❌ ${r.error}</td></tr>`;
    }

    const m = r.metrics;
    const ttftIcon = m.ttftCategory === 'fast' ? '🚀' : m.ttftCategory === 'medium' ? '⚡' : '🐢';
    const tpsIcon = m.tpsCategory === 'fast' ? '🚀' : m.tpsCategory === 'medium' ? '⚡' : '🐢';

    return `
            <tr>
                <td><strong>${r.model}</strong></td>
                <td>${m.ttft}ms ${ttftIcon}</td>
                <td>${m.tokensPerSecond} ${tpsIcon}</td>
                <td>${m.totalTokens}</td>
                <td>${m.totalTime}ms</td>
            </tr>
        `;
  }).join('');

  resultsDiv.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h4 style="font-size: 14px; margin-bottom: 10px;">📊 Wyniki Latency (${results.length} modeli)</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Model</th>
                        <th>TTFT</th>
                        <th>Tok/s</th>
                        <th>Tokens</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="font-size: 14px; margin-bottom: 10px;">🏆 Champions</h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                <div style="padding: 10px; background: var(--bg-dark); border-radius: 6px; border-left: 3px solid var(--success);">
                    <strong style="color: var(--success);">🚀 Najszybszy TTFT</strong><br>
                    <span style="font-size: 13px;">${summary.fastestTTFT} (${summary.fastestTTFTValue}ms)</span>
                </div>
                <div style="padding: 10px; background: var(--bg-dark); border-radius: 6px; border-left: 3px solid var(--gold);">
                    <strong style="color: var(--gold);">⚡ Najwyższy tok/s</strong><br>
                    <span style="font-size: 13px;">${summary.highestTPS} (${summary.highestTPSValue} tok/s)</span>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// COST EFFICIENCY TEST (FINAL)
// ============================================

async function runCostEfficiencyTest() {
  const btn = document.getElementById('btnRunCostEfficiency');
  btn.disabled = true;
  btn.textContent = '⏳ Obliczanie efektywności...';

  const resultsDiv = document.getElementById('cost-efficiency-results');
  resultsDiv.innerHTML = '<p style="color: var(--gold);">⏳ Obliczanie jakości per token i per ms...</p>';

  try {
    const modelsResult = await window.electronAPI.testbenchGetModels();
    if (!modelsResult.success) throw new Error(modelsResult.error);

    const modelNames = modelsResult.models.map(m => m.name);
    addLog('info', `💰 Testowanie Cost Efficiency dla ${modelNames.length} modeli...`);

    const result = await window.electronAPI.testsCostEfficiencyRunAll(modelNames);

    if (result.success) {
      displayCostEfficiencyResults(result);
      addLog('success', `✓ Cost Efficiency test zakończony`);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    resultsDiv.innerHTML = `<p style="color: var(--error);">❌ Błąd: ${error.message}</p>`;
    addLog('error', `Cost Efficiency error: ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 Testuj Wszystkie Modele';
  }
}

async function loadCostEfficiencyCache() {
  try {
    const result = await window.electronAPI.testsCostEfficiencyLoadCache();
    if (result.success && result.cached) {
      displayCostEfficiencyResults(result.cached);
      addLog('info', `📥 Załadowano cache z ${result.cached.timestamp}`);
    } else {
      addLog('warn', 'Brak danych w cache');
    }
  } catch (error) {
    addLog('error', `Błąd ładowania cache: ${error.message}`);
  }
}

function displayCostEfficiencyResults(data) {
  const resultsDiv = document.getElementById('cost-efficiency-results');
  const results = data.results || [];
  const summary = data.summary || {};

  const tableRows = results.map(r => {
    if (!r.success) {
      return `<tr><td>${r.model}</td><td colspan="5" style="color: var(--error);">❌ ${r.error}</td></tr>`;
    }

    const m = r.metrics;
    const effIcon = m.efficiencyScore >= 60 ? '💚' : m.efficiencyScore >= 40 ? '💛' : '❤️';

    return `
            <tr>
                <td><strong>${r.model}</strong></td>
                <td>${m.quality}%</td>
                <td>${m.tokens}</td>
                <td>${m.time}ms</td>
                <td>${m.qualityPerToken}</td>
                <td>${m.efficiencyScore} ${effIcon}</td>
            </tr>
        `;
  }).join('');

  resultsDiv.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h4 style="font-size: 14px; margin-bottom: 10px;">📊 Cost Efficiency (${results.length} modeli)</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Model</th>
                        <th>Quality</th>
                        <th>Tokens</th>
                        <th>Time</th>
                        <th>Q/Token</th>
                        <th>Efficiency</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="font-size: 14px; margin-bottom: 10px;">🏆 Best Value</h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                <div style="padding: 10px; background: var(--bg-dark); border-radius: 6px; border-left: 3px solid var(--success);">
                    <strong style="color: var(--success);">💰 Najbardziej efektywny</strong><br>
                    <span style="font-size: 13px;">${summary.mostEfficient} (${summary.mostEfficientScore})</span>
                </div>
                <div style="padding: 10px; background: var(--bg-dark); border-radius: 6px; border-left: 3px solid var(--gold);">
                    <strong style="color: var(--gold);">⭐ Najlepsza jakość</strong><br>
                    <span style="font-size: 13px;">${summary.highestQuality} (${summary.highestQualityScore}%)</span>
                </div>
            </div>
        </div>
    `;
}


// ==========================================
// Test 9: Needle in a Haystack
// ==========================================

async function runNeedleHaystackTest() {
  const btn = document.getElementById('btnRunNeedleHaystack');
  const resultsDiv = document.getElementById('needle-haystack-results');

  if (btn) btn.disabled = true;
  resultsDiv.innerHTML = '<div class="spinner"></div> Trwa testowanie pamięci (to może potrwać kilka minut)...';

  try {
    const modelsResult = await window.electronAPI.testbenchGetModels();
    if (!modelsResult.success) throw new Error(modelsResult.error);

    const selectedModel = document.getElementById('global-model-selector') ? document.getElementById('global-model-selector').value : 'all';
    let modelNames = [];

    if (selectedModel && selectedModel !== 'all') {
      modelNames = [selectedModel];
    } else {
      modelNames = modelsResult.models.map(m => m.name);
    }

    // Progress loop
    const progressInterval = setInterval(async () => {
      const p = await window.electronAPI.testbenchGetProgress();
    }, 1000);

    const result = await window.electronAPI.testsNeedleHaystackRunAll(modelNames);
    clearInterval(progressInterval);

    if (result.success) {
      displayNeedleHaystackResults(result.results);
    } else {
      resultsDiv.innerHTML = `<p style="color: var(--error);">Błąd: ${result.error}</p>`;
    }
  } catch (error) {
    resultsDiv.innerHTML = `<p style="color: var(--error);">Błąd krytyczny: ${error.message}</p>`;
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function loadNeedleHaystackCache() {
  const resultsDiv = document.getElementById('needle-haystack-results');
  resultsDiv.innerHTML = '<div class="spinner"></div> Ładowanie cache...';

  try {
    const result = await window.electronAPI.testbenchLoadNeedleHaystackCache();
    if (result.success && result.cached && result.cached.length > 0) {
      displayNeedleHaystackResults(result.cached);
    } else {
      resultsDiv.innerHTML = '<p style="color: var(--text-dim);">Brak zapisanych wyników.</p>';
    }
  } catch (error) {
    resultsDiv.innerHTML = `<p style="color: var(--error);">Błąd cache: ${error.message}</p>`;
  }
}

function displayNeedleHaystackResults(results) {
  const container = document.getElementById('needle-haystack-results');
  if (!container) return;

  let html = `
    <table class="data-table" style="margin-top: 10px;">
      <thead>
        <tr>
          <th>Model</th>
          <th style="text-align: center;">Score</th>
          <th>Start (0%)</th>
          <th>Middle (50%)</th>
          <th>End (100%)</th>
        </tr>
      </thead>
      <tbody>
  `;

  results.sort((a, b) => b.metrics.score - a.metrics.score);

  results.forEach(r => {
    const m = r.metrics;
    const findDepth = (d) => {
      const res = m.depthResults.find(x => x.depth.includes(d));
      return res ? (res.passed ? '✅' : '❌') : '-';
    };

    html += `
      <tr>
        <td style="font-weight: 500;">${r.model}</td>
        <td style="text-align: center;">
            <span class="badge ${m.score === 100 ? 'badge-success' : (m.score > 0 ? 'badge-warning' : 'badge-error')}">
                ${m.score}%
            </span>
        </td>
        <td style="text-align: center;">${findDepth('0%')}</td>
        <td style="text-align: center;">${findDepth('50%')}</td>
        <td style="text-align: center;">${findDepth('100%')}</td>
      </tr>
      <tr>
        <td colspan="5" style="padding: 0 10px 15px 10px; border-bottom: 2px solid var(--border-subtle);">
           <div style="background: var(--bg-dark); padding: 8px; border-radius: 6px; font-size: 12px; white-space: pre-wrap; font-family: monospace; color: var(--text-dim);">${r.narrative}</div>
        </td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}


// ==========================================
// Test 10: Safety Limits
// ==========================================

async function runSafetyLimitsTest() {
  const btn = document.getElementById('btnRunSafetyLimits');
  const resultsDiv = document.getElementById('safety-limits-results');

  if (btn) btn.disabled = true;
  resultsDiv.innerHTML = '<div class="spinner"></div> Trwa testowanie cenzury...';

  try {
    const modelsResult = await window.electronAPI.testbenchGetModels();
    if (!modelsResult.success) throw new Error(modelsResult.error);

    const selectedModel = document.getElementById('global-model-selector') ? document.getElementById('global-model-selector').value : 'all';
    let modelNames = [];

    if (selectedModel && selectedModel !== 'all') {
      modelNames = [selectedModel];
    } else {
      modelNames = modelsResult.models.map(m => m.name);
    }

    // Progress loop (short test, skip extended progress)

    const result = await window.electronAPI.testsSafetyLimitsRunAll(modelNames);

    if (result.success) {
      displaySafetyLimitsResults(result.results);
    } else {
      resultsDiv.innerHTML = `<p style="color: var(--error);">Błąd: ${result.error}</p>`;
    }
  } catch (error) {
    resultsDiv.innerHTML = `<p style="color: var(--error);">Błąd krytyczny: ${error.message}</p>`;
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function loadSafetyLimitsCache() {
  const resultsDiv = document.getElementById('safety-limits-results');
  resultsDiv.innerHTML = '<div class="spinner"></div> Ładowanie cache...';

  try {
    const result = await window.electronAPI.testbenchLoadSafetyLimitsCache();
    if (result.success && result.cached && result.cached.length > 0) {
      displaySafetyLimitsResults(result.cached);
    } else {
      resultsDiv.innerHTML = '<p style="color: var(--text-dim);">Brak zapisanych wyników.</p>';
    }
  } catch (error) {
    resultsDiv.innerHTML = `<p style="color: var(--error);">Błąd cache: ${error.message}</p>`;
  }
}

function displaySafetyLimitsResults(results) {
  const container = document.getElementById('safety-limits-results');
  if (!container) return;

  let html = `
    <table class="data-table" style="margin-top: 10px;">
      <thead>
        <tr>
          <th>Model</th>
          <th style="text-align: center;">Permissiveness</th>
          <th>Censored Categories</th>
        </tr>
      </thead>
      <tbody>
  `;

  results.sort((a, b) => b.metrics.safetyScore - a.metrics.safetyScore);

  results.forEach(r => {
    const m = r.metrics;

    // Check if score exists, otherwise use json data (fallback if metrics missing in cache load?)
    const score = m.safetyScore !== undefined ? m.safetyScore : r.json.permisivenessScore;
    const censored = m.probeResults ? m.probeResults.filter(p => p.refused).map(p => p.category).join(', ') : (r.json.censoredCategories || []).join(', ');

    html += `
      <tr>
        <td style="font-weight: 500;">${r.model}</td>
        <td style="text-align: center;">
            <span class="badge ${score === 100 ? 'badge-success' : (score > 30 ? 'badge-warning' : 'badge-error')}">
                ${score}%
            </span>
        </td>
        <td style="font-size: 12px; color: var(--text-dim);">${censored || 'None (Uncensored)'}</td>
      </tr>
      <tr>
        <td colspan="3" style="padding: 0 10px 15px 10px; border-bottom: 2px solid var(--border-subtle);">
           <div style="background: var(--bg-dark); padding: 8px; border-radius: 6px; font-size: 12px; white-space: pre-wrap; font-family: monospace; color: var(--text-dim);">${r.narrative}</div>
        </td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}


// ==========================================
// Test 11: Language Stability
// ==========================================

async function runLanguageStabilityTest() {
  const btn = document.getElementById('btnRunLanguageStability');
  const resultsDiv = document.getElementById('language-stability-results');

  if (btn) btn.disabled = true;
  resultsDiv.innerHTML = '<div class="spinner"></div> Trwa testowanie stabilności językowej (długi tekst)...';

  try {
    const modelsResult = await window.electronAPI.testbenchGetModels();
    if (!modelsResult.success) throw new Error(modelsResult.error);

    const selectedModel = document.getElementById('global-model-selector') ? document.getElementById('global-model-selector').value : 'all';
    let modelNames = [];

    if (selectedModel && selectedModel !== 'all') {
      modelNames = [selectedModel];
    } else {
      modelNames = modelsResult.models.map(m => m.name);
    }

    // Progress loop
    const progressInterval = setInterval(async () => {
      // keep alive
    }, 1000);

    const result = await window.electronAPI.testsLanguageStabilityRunAll(modelNames);
    clearInterval(progressInterval);

    if (result.success) {
      displayLanguageStabilityResults(result.results);
    } else {
      resultsDiv.innerHTML = `<p style="color: var(--error);">Błąd: ${result.error}</p>`;
    }
  } catch (error) {
    resultsDiv.innerHTML = `<p style="color: var(--error);">Błąd krytyczny: ${error.message}</p>`;
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function loadLanguageStabilityCache() {
  const resultsDiv = document.getElementById('language-stability-results');
  resultsDiv.innerHTML = '<div class="spinner"></div> Ładowanie cache...';

  try {
    const result = await window.electronAPI.testbenchLoadLanguageStabilityCache();
    if (result.success && result.cached && result.cached.length > 0) {
      displayLanguageStabilityResults(result.cached);
    } else {
      resultsDiv.innerHTML = '<p style="color: var(--text-dim);">Brak zapisanych wyników.</p>';
    }
  } catch (error) {
    resultsDiv.innerHTML = `<p style="color: var(--error);">Błąd cache: ${error.message}</p>`;
  }
}

function displayLanguageStabilityResults(results) {
  const container = document.getElementById('language-stability-results');
  if (!container) return;

  let html = `
    <table class="data-table" style="margin-top: 10px;">
      <thead>
        <tr>
          <th>Model</th>
          <th style="text-align: center;">Score</th>
          <th>Angielski (Density)</th>
        </tr>
      </thead>
      <tbody>
  `;

  results.sort((a, b) => b.metrics.score - a.metrics.score);

  results.forEach(r => {
    const m = r.metrics;

    html += `
      <tr>
        <td style="font-weight: 500;">${r.model}</td>
        <td style="text-align: center;">
            <span class="badge ${m.score === 100 ? 'badge-success' : (m.score > 50 ? 'badge-warning' : 'badge-error')}">
                ${m.score}%
            </span>
        </td>
        <td style="font-size: 12px; color: var(--text-dim);">
            ${m.bleedDetected ? '⚠️ TAK (' + m.englishDensity + ')' : 'NIE (' + m.englishDensity + ')'}
        </td>
      </tr>
      <tr>
        <td colspan="3" style="padding: 0 10px 15px 10px; border-bottom: 2px solid var(--border-subtle);">
           <div style="background: var(--bg-dark); padding: 8px; border-radius: 6px; font-size: 12px; white-space: pre-wrap; font-family: monospace; color: var(--text-dim);">${r.narrative}</div>
        </td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

// Initialize tests panel
async function initTestsPanel() {
  // Populate Model Selector
  try {
    const result = await window.electronAPI.testbenchGetModels();
    const selector = document.getElementById('global-model-selector');
    if (selector && result.success && result.models) {
      // Clear existing options except first
      while (selector.options.length > 1) {
        selector.remove(1);
      }
      result.models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.name;
        opt.textContent = `🤖 ${m.name}`;
        selector.appendChild(opt);
      });

      // Add event listener for dynamic button text
      selector.addEventListener('change', () => {
        const val = selector.value;
        const text = val === 'all' ? '🚀 Testuj Wszystkie Modele' : `🚀 Testuj ${val}`;

        const btnIds = [
          'btnRunContextLimits', 'btnRunMemoryUsage', 'btnRunConsistency',
          'btnRunPromptSensitivity', 'btnRunInstructionFollowing', 'btnRunHallucination',
          'btnRunLatency', 'btnRunCostEfficiency', 'btnRunNeedleHaystack',
          'btnRunSafetyLimits', 'btnRunLanguageStability'
        ];

        btnIds.forEach(id => {
          const btn = document.getElementById(id);
          if (btn) btn.textContent = text;
        });
      });
    }
  } catch (e) {
    console.error("Failed to load models for selector", e);
  }
}
