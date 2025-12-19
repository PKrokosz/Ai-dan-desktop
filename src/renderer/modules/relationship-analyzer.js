/**
 * @module relationship-analyzer
 * @description Frontend for Global Relationship Analysis (Vis.js version)
 */

import * as visAdapter from './vis-adapter.js';
import { createModal } from './ui-modal-helper.js';
import { addLog } from './ui-helpers.js';

// Global map to store node ID -> Real Name mapping to handle spaces/special chars
window.graphNodeMap = {};

// Cache for graph data to persist between modal opens
let cachedGraphResult = null;

/**
 * Show the Global Relationship Graph in a modal
 */
export async function showGlobalGraph() {
    // 1. Create Modal Shell with Sidebar and Main Area
    const content = `
        <div style="display:flex; height:100%; gap:0;">
            <!-- SIDEBAR CONTROL PANEL -->
            <div id="graph-sidebar" style="width:260px; background:rgba(0,0,0,0.4); border-right:1px solid var(--border-subtle); display:flex; flex-direction:column; flex-shrink:0;">
                <div style="padding:15px; border-bottom:1px solid var(--border-subtle);">
                    <div style="font-size:14px; font-weight:bold; color:var(--text-highlight); margin-bottom:10px;">🔍 Szperacz</div>
                    <input type="text" id="graph-search" placeholder="Szukaj postaci..." class="input-field" style="width:100%; font-size:13px; padding:6px;">
                </div>

                <div style="padding:15px; border-bottom:1px solid var(--border-subtle); flex:1; overflow-y:auto;">
                    <div style="font-size:13px; font-weight:bold; color:var(--gold); margin-bottom:10px;">🏁 Frakcje (Filtry)</div>
                    <div id="faction-filter-list" style="display:flex; flex-direction:column; gap:6px;">
                        <!-- Checkboxes generated dynamically -->
                        <span style="color:var(--text-dim); font-size:12px;">Ładowanie frakcji...</span>
                    </div>
                </div>

                <div style="padding:15px; border-top:1px solid var(--border-subtle);">
                    <div style="font-size:12px; color:var(--text-dim); margin-bottom:5px;">Szum (Min. Relacji): <span id="noise-val">0</span></div>
                    <input type="range" id="noise-gate" min="0" max="10" value="0" style="width:100%;">
                </div>
            </div>

            <!-- MAIN VISUALIZATION AREA -->
            <div style="flex:1; display:flex; flex-direction:column; min-width:0;">
                <!-- Toolbar -->
                <div class="graph-toolbar" style="padding:10px; border-bottom:1px solid var(--border-subtle); display:flex; gap:10px; align-items:center; background:rgba(0,0,0,0.2);">
                    <button id="btn-refresh-graph" class="btn btn-primary btn-sm">🔄 Odśwież</button>
                    
                    <div style="display:flex; gap:5px; margin-left:15px;">
                        <button class="btn btn-outline btn-sm active" id="mode-organic">🕸️ Chaos</button>
                        <button class="btn btn-outline btn-sm" id="mode-map">🗺️ Mapa</button>
                    </div>

                    <div id="graph-progress-container" style="flex:1; display:none; align-items:center; gap:10px; margin-left:10px;">
                         <div style="flex:1; height:6px; background:#333; border-radius:3px; overflow:hidden;">
                              <div id="graph-progress-bar" style="width:0%; height:100%; background:var(--gold); transition:width 0.3s ease;"></div>
                         </div>
                         <span id="graph-progress-text" style="font-size:11px; color:var(--text-dim); white-space:nowrap;">Inicjalizacja...</span>
                    </div>
                    <div id="graph-status" style="margin-left:auto; color:var(--text-dim); font-size:12px;">Gotowy</div>
                </div>
                
                <div style="flex:1; display:flex; min-height:0;">
                    <!-- Graph Canvas -->
                    <div id="graph-viz-container" style="flex:3; background:#111; position:relative; overflow:hidden;">
                        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:var(--text-dim);">Kliknij "Odśwież" aby zbudować graf.</div>
                    </div>
                    
                    <!-- Right Inspector (Collapsible? Keep fixed for now) -->
                    <div id="graph-inspector-panel" style="width:250px; background:rgba(0,0,0,0.2); border-left:1px solid var(--border-subtle); padding:15px; overflow-y:auto; display:flex; flex-direction:column;">
                        <div id="graph-inspector-content">
                            <div style="text-align:center; color:var(--text-dim); margin-top:50px;">
                                <div style="font-size:24px; opacity:0.3; margin-bottom:10px;">👆</div>
                                Wybierz postać,<br>aby zobaczyć detale.
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer / Legend -->
                <div class="graph-legend" style="padding:5px 10px; font-size:11px; color:var(--text-dim); display:flex; gap:15px; background:rgba(0,0,0,0.4); border-top:1px solid var(--border-subtle);">
                    <span style="display:flex; align-items:center; gap:5px;"><span style="width:10px; height:10px; background:#ffd700; border-radius:50%;"></span> Hub (Ważny)</span>
                    <span style="display:flex; align-items:center; gap:5px;"><span style="width:10px; height:10px; background:#2B7CE9; border-radius:50%;"></span> Zwykły</span>
                    <span style="margin-left:auto;">🖱️ Scroll: Zoom | Drag: Pan | Click: Inspect</span>
                </div>
            </div>
        </div>
    `;

    const modalOverlay = createModal('graph-modal', '🕸️ Nawigator Relacji (v2)', content);

    // CUSTOM SIZE: 85% of screen
    const modalWindow = modalOverlay.querySelector('.modal-window');
    if (modalWindow) {
        modalWindow.style.width = '90vw'; // Slightly wider for sidebar
        modalWindow.style.height = '85vh';
        modalWindow.style.maxWidth = 'none';
        modalWindow.style.maxHeight = 'none';

        // Fix internal content height
        const modalContent = modalWindow.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.height = '100%';
            modalContent.style.maxHeight = 'none';
            modalContent.style.display = 'block'; // Block because we handle flex inside 'content' html string
            modalContent.style.padding = '0'; // Remove padding for edge-to-edge layout
            modalContent.style.overflow = 'hidden'; // Handle overflow internally
        }
    }

    // 2. Bind Toolbar Events
    document.getElementById('btn-refresh-graph').onclick = async () => {
        cachedGraphResult = null;
        await loadAndRenderGraph(true);
    };

    // Bind Filters (Search, Slider) - Logic will be attached after data load
    document.getElementById('noise-gate').oninput = (e) => {
        document.getElementById('noise-val').innerText = e.target.value;
        applyFilters();
    };

    document.getElementById('graph-search').oninput = (e) => {
        applyFilters(); // Realtime search? Or debounce? Realtime is fine for localized data.
    };

    // Bind Layout Modes
    const btnOrganic = document.getElementById('mode-organic');
    const btnMap = document.getElementById('mode-map');

    if (btnOrganic && btnMap) {
        btnOrganic.onclick = () => {
            btnOrganic.classList.add('active');
            btnMap.classList.remove('active');
            visAdapter.toggleLayoutMode('organic');
        };
        btnMap.onclick = () => {
            btnMap.classList.add('active');
            btnOrganic.classList.remove('active');
            visAdapter.toggleLayoutMode('map');
        };
    }

    // 3. Auto-load
    if (cachedGraphResult) {
        loadAndRenderGraph(false);
    } else {
        loadAndRenderGraph(true);
    }
}

async function loadAndRenderGraph(forceRefresh = false) {
    const btn = document.getElementById('btn-refresh-graph');
    const status = document.getElementById('graph-status');
    const container = document.getElementById('graph-viz-container');
    const progressContainer = document.getElementById('graph-progress-container');
    const progressBar = document.getElementById('graph-progress-bar');
    const progressText = document.getElementById('graph-progress-text');

    if (btn) btn.disabled = true;
    if (status) status.innerHTML = '<span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> Analizuję...';
    // Clear container explicitly for Vis.js
    if (container) container.innerHTML = '';

    // Check Cache first
    if (!forceRefresh && cachedGraphResult) {
        console.log('Using cached graph data', cachedGraphResult);
        renderFromData(cachedGraphResult, container, status, progressBar, progressText);
        if (btn) btn.disabled = false;
        return;
    }

    // Show progress bar
    if (progressContainer) {
        progressContainer.style.display = 'flex';
        progressBar.style.width = '10%';
        progressText.innerText = 'Inicjalizacja...';
    }

    // Bind Progress Listener
    const removeListener = window.electronAPI.onProgress((data) => {
        if (data && progressBar && progressText) {
            progressBar.style.width = `${data.progress}%`;
            progressText.innerText = data.message || `${data.progress}%`;
        }
    });

    try {
        const result = await window.electronAPI.analyzeRelations(forceRefresh); // Always force backend scan if we are here (button click or first load)

        if (result.success && result.graph) {
            // Update Cache
            cachedGraphResult = result;
            renderFromData(result, container, status, progressBar, progressText);

        } else {
            console.error('Graph error returned from backend', result);
            if (container) container.innerHTML = `<div style="color:red; padding:20px;">Błąd Backend: ${result.error || 'Nieznany błąd'}</div>`;
            if (status) status.textContent = 'Błąd analizy.';
        }
    } catch (e) {
        console.error('Graph exception in frontend', e);
        if (container) container.innerHTML = `<div style="color:red; padding:20px;">Wyjątek Frontend: ${e.message}</div>`;
    } finally {
        if (btn) btn.disabled = false;
        if (progressContainer) setTimeout(() => { progressContainer.style.display = 'none'; }, 2000);
        // Clean up specific listener if possible, but the wrapper might not support removeListener properly 
        // without a reference. Ideally we'd have .off but preload expose wrapper handles it differently.
        // For now we accept it might leak one listener per click until reload, or we rely on it overwriting.
        // The preload implementation: ipcRenderer.on('progress', (e, d) => callback(d)) checks strictly. 
        // Since we pass an anonymous function here, we can't easily remove it unless invoke returns a cleanup handle.
    }
}

function renderFromData(result, container, status, progressBar, progressText) {
    try {
        // Ensure map is ready
        if (!window.graphNodeMap) window.graphNodeMap = {};

        if (status) status.textContent = `Znaleziono ${result.graph.nodes.length} postaci i ${result.graph.edges.length} powiązań.`;

        // Map nodes for inspector
        result.graph.nodes.forEach(n => {
            window.graphNodeMap[n.id] = n.name || n.id;
        });

        // Initialize Sidebar Filters (only if full refresh or empty)
        if (activeFactions.size === 0 || window.shouldRebuildSidebar) {
            buildSidebar(result.graph.nodes);
            window.shouldRebuildSidebar = false;
        }

        // check container size
        console.log(`Container size: ${container.clientWidth}x${container.clientHeight}`);
        if (container.clientHeight < 50) {
            console.warn("Container height is suspicious!", container);
        }

        // Render Graph
        if (progressBar) progressBar.style.width = '100%';
        if (progressText) progressText.innerText = 'Renderowanie (Vis.js)...';

        visAdapter.renderGraph(container, result.graph, (nodeId) => {
            if (window.showNodeContext) window.showNodeContext(nodeId);
        });
    } catch (e) {
        console.error("renderFromData exception", e);
        if (container) container.innerHTML = `<div style="color:red; padding:20px;">Błąd Renderowania Danych: ${e.message}</div>`;
    }
}


// ==============================
// SIDEBAR & FILTER LOGIC
// ==============================

// State for active filters
let activeFactions = new Set();
let allFactions = [];

/**
 * Build dynamic sidebar content based on Graph Data
 */
function buildSidebar(nodes) {
    const list = document.getElementById('faction-filter-list');
    if (!list) return;
    list.innerHTML = ''; // Clear loading

    // 1. Extract Factions
    const factionCounts = {};
    nodes.forEach(n => {
        const f = n.group || 'Unknown';
        factionCounts[f] = (factionCounts[f] || 0) + 1;
    });

    // Sort by size
    allFactions = Object.keys(factionCounts).sort((a, b) => factionCounts[b] - factionCounts[a]);

    // Init active set (all visible by default)
    activeFactions = new Set(allFactions);

    // 2. Create Checkboxes
    allFactions.forEach(f => {
        const count = factionCounts[f];
        const row = document.createElement('label');
        row.style.cssText = 'display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12px; color:var(--text-normal);';

        row.innerHTML = `
            <input type="checkbox" checked value="${f}" style="cursor:pointer;">
            <span style="flex:1;">${f}</span>
            <span style="color:var(--text-dim); font-size:10px;">(${count})</span>
        `;

        // Event Listener
        const checkbox = row.querySelector('input');
        checkbox.onchange = (e) => {
            if (e.target.checked) activeFactions.add(f);
            else activeFactions.delete(f);

            applyFilters();
        };

        list.appendChild(row);
    });
}

/**
 * Apply all active filters (Search, Factions, Noise)
 */
function applyFilters() {
    if (!cachedGraphResult) return;

    const searchTerm = (document.getElementById('graph-search')?.value || '').toLowerCase().trim();
    const noiseLevel = parseInt(document.getElementById('noise-gate')?.value || 0);

    const container = document.getElementById('graph-viz-container');

    const originalNodes = cachedGraphResult.graph.nodes;
    const originalEdges = cachedGraphResult.graph.edges;

    // 1. Identify Search Matches (Spotlight Core)
    const exactMatches = new Set();
    if (searchTerm) {
        originalNodes.forEach(n => {
            if (n.name.toLowerCase().includes(searchTerm)) {
                exactMatches.add(n.id);
            }
        });
    }

    // 2. Identify Neighbors of Matches (Spotlight Aura)
    const neighborMatches = new Set();
    if (searchTerm && exactMatches.size > 0) {
        originalEdges.forEach(e => {
            if (exactMatches.has(e.source)) neighborMatches.add(e.target);
            if (exactMatches.has(e.target)) neighborMatches.add(e.source);
        });
    }

    // 3. Filter Nodes
    const filteredNodes = originalNodes.filter(n => {
        // A. Faction Filter check (Always applies)
        if (!activeFactions.has(n.group || 'Unknown')) return false;

        // B. Noise Gate (Based on Importance/Degree)
        if ((n.importance || 1) <= noiseLevel) return false;

        // C. Search Logic (Spotlight)
        // If search is active, ONLY show:
        // - Direct hits (exactMatches)
        // - OR Neighbors of hits (neighborMatches)
        if (searchTerm) {
            const isHit = exactMatches.has(n.id);
            const isNeighbor = neighborMatches.has(n.id);
            if (!isHit && !isNeighbor) return false;
        }

        return true;
    });

    // 4. Filter Edges
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = originalEdges.filter(e => {
        // Both ends must be visible
        return nodeIds.has(e.source) && nodeIds.has(e.target);
    });

    // 5. Re-render
    visAdapter.renderGraph(container, { nodes: filteredNodes, edges: filteredEdges }, (selection) => {
        if (window.showNodeContext) window.showNodeContext(selection);
    });

    // Update status
    const status = document.getElementById('graph-status');
    if (status) status.textContent = `Widocznych: ${filteredNodes.length} / ${originalNodes.length}`;
}

// ==============================
// INSPECTOR / SIDE PANEL LOGIC
// ==============================

// Helper to escape for HTML attributes
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
}

window.showNodeContext = (selection) => {
    // Selection can be string (legacy) or object { type: 'node'|'edge', ... }
    let type = 'node';
    let id = selection;

    if (typeof selection === 'object') {
        type = selection.type;
        id = selection.id; // for node
    }

    const inspector = document.getElementById('graph-inspector-content');
    if (!inspector) return;

    // A) NODE SELECTION
    if (type === 'node') {
        // 1. Resolve Name
        const name = window.graphNodeMap?.[id] || id;

        // 2. Find Neighbors
        // We need access to current filtered data or full data?
        // Let's use cachedGraphResult.graph
        const edges = cachedGraphResult?.graph?.edges || [];
        const related = [];

        edges.forEach(e => {
            if (e.source === id) related.push({ id: e.target, dir: 'out' });
            else if (e.target === id) related.push({ id: e.source, dir: 'in' });
        });

        // 3. Render Inspector
        inspector.innerHTML = `
            <div style="border-bottom:1px solid var(--border-subtle); padding-bottom:10px; margin-bottom:15px;">
                <h3 style="color:var(--gold); margin:0; font-size:18px;">${name}</h3>
                <div style="font-size:12px; color:var(--text-dim); margin-top:5px;">Połączeń: ${related.length}</div>
            </div>
            
            <div style="font-size:12px; font-weight:bold; color:var(--text-highlight); margin-bottom:10px;">BLISKIE RELACJE:</div>
            <div style="display:flex; flex-direction:column; gap:5px;">
                ${related.slice(0, 20).map(r => { // Limit to 20 for perf
            const rName = window.graphNodeMap?.[r.id] || r.id;
            return `<div style="padding:4px; background:rgba(255,255,255,0.05); border-radius:4px;">${rName}</div>`;
        }).join('')}
                ${related.length > 20 ? `<div style="font-size:10px; color:var(--text-dim);">...i ${related.length - 20} więcej</div>` : ''}
            </div>
        `;
    }

    // B) EDGE SELECTION
    else if (type === 'edge') {
        const fromName = window.graphNodeMap?.[selection.from] || selection.from;
        const toName = window.graphNodeMap?.[selection.to] || selection.to;

        // Find Context
        // We need to look up the edge object to get 'context' property
        const edgeObj = cachedGraphResult?.graph?.edges.find(e => e.source === selection.from && e.target === selection.to);
        const contextText = edgeObj?.context || "Brak zapisanego kontekstu.";

        inspector.innerHTML = `
             <div style="border-bottom:1px solid var(--border-subtle); padding-bottom:10px; margin-bottom:15px;">
                <h3 style="color:var(--gold); margin:0; font-size:16px;">Relacja</h3>
                <div style="font-size:13px; margin-top:5px;">
                    <span style="color:var(--text-highlight);">${fromName}</span> 
                    <span style="color:var(--text-dim);">→</span> 
                    <span style="color:var(--text-highlight);">${toName}</span>
                </div>
            </div>
            
            <div style="font-size:11px; font-weight:bold; color:var(--text-dim); margin-bottom:10px; text-transform:uppercase;">Wnioski AI:</div>
            <div id="ai-rel-summary" style="padding:10px; background:rgba(255,215,0,0.05); border:1px solid rgba(255,215,0,0.1); border-radius:6px; margin-bottom:15px; font-size:13px; line-height:1.4;">
                <div style="color:var(--text-dim); font-size:11px;">Analizuję relację...</div>
            </div>

            <div style="font-size:11px; font-weight:bold; color:var(--text-dim); margin-bottom:10px; text-transform:uppercase;">Kontekst (Dlaczego?):</div>
            <div style="padding:10px; background:rgba(0,0,0,0.2); border-radius:6px; border-left:2px solid var(--border-subtle); font-style:italic; font-size:12px; line-height:1.5; color:var(--text-muted);">
                "${contextText}"
            </div>
        `;

        // Trigger AI Summary
        if (window.electronAPI?.invoke) {
            window.electronAPI.invoke('summarize-relationship', { source: fromName, target: toName, snippet: contextText })
                .then(res => {
                    const sumEl = document.getElementById('ai-rel-summary');
                    if (!sumEl) return;
                    if (res.success) {
                        sumEl.innerHTML = `<span style="color:var(--gold-soft);">✦</span> ${res.summary}`;
                    } else {
                        sumEl.innerHTML = `<span style="color:var(--text-dim); font-size:11px;">(AI nie mogło wygenerować podsumowania)</span>`;
                    }
                })
                .catch(err => {
                    console.error('AI summary failed:', err);
                });
        }
    }
};


window.analyzePlotFor = async (name) => {
    const area = document.getElementById('plot-results-area');
    if (!area) return;

    area.innerHTML = `
      <div style="background:rgba(0,0,0,0.2); padding:10px; border-radius:4px; text-align:center;">
        <span class="spinner" style="width:14px;height:14px;"></span><br>
        <span style="font-size:11px; color:var(--text-dim);">Analizuję relacje i profile sąsiadów...<br>(To zajmie ok. 10-20s)</span>
      </div>
    `;

    try {
        // Invoke IPC
        const res = await window.electronAPI.invoke('analyze-plot-potential', name);

        if (res.success) {
            let data;
            try {
                // AI might return markdown block ```json ... ```
                // clean it
                const jsonStr = res.analysis.replace(/```json/g, '').replace(/```/g, '').trim();
                data = JSON.parse(jsonStr);
            } catch (e) {
                console.error("JSON Parse error", e);
                data = { theme: "Błąd formatowania wyjścia AI", hooks: [] };
            }

            if (!data.hooks) data.hooks = [];

            area.innerHTML = `
             <div class="ai-card" style="border-left: 3px solid var(--gold); animation: fadeIn 0.3s;">
                <div style="font-size:13px; color:var(--text-highlight); margin-bottom:10px;">
                   <strong>Motyw:</strong> ${data.theme || 'Nieokreślony'}
                </div>
                <div style="display:flex; flex-direction:column; gap:10px;">
                ${data.hooks.map((h, idx) => `
                   <div style="background:var(--bg-dark); padding:10px; border-radius:4px; border:1px solid var(--border-subtle);">
                      <strong style="color:var(--gold); display:block; margin-bottom:4px;">${idx + 1}. ${h.title}</strong>
                      <div style="font-size:12px; color:var(--text-primary); margin-bottom:8px;">${h.description}</div>
                      ${h.target_letter ? `
                        <div style="font-size:11px; font-style:italic; color:var(--text-dim); border-left:2px solid #555; padding-left:5px;">
                           "Treść listu: ${h.target_letter.substring(0, 80)}..."
                        </div>
                      ` : ''}
                   </div>
                `).join('')}
                </div>
                <div style="margin-top:10px; text-align:right;">
                   <button class="btn-icon" onclick="copyPlotToClipboard()" title="Kopiuj">📋</button>
                </div>
             </div>
          `;

            // Temporary Store for clipboard
            window.lastPlotAnalysis = res.analysis;

        } else {
            area.innerHTML = `<div style="color:#ff6b6b; font-size:12px; padding:10px; border:1px solid #ff6b6b; border-radius:4px;">
              <strong>Błąd analizy:</strong><br>${res.error}
          </div>`;
        }
    } catch (e) {
        area.innerHTML = `<div style="color:red; font-size:12px;">Wyjątek: ${e.message}</div>`;
    }
};

window.copyPlotToClipboard = () => {
    if (window.lastPlotAnalysis) {
        navigator.clipboard.writeText(window.lastPlotAnalysis);
        addLog('success', 'Skopiowano analizę do schowka.');
    }
};
