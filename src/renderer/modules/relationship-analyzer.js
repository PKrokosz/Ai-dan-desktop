/**
 * @module relationship-analyzer
 * @description Frontend for Global Relationship Analysis
 */

import * as mermaidAdapter from './mermaid-adapter.js';
import { createModal } from './ui-modal-helper.js';
import { addLog } from './ui-helpers.js';

// Global map to store node ID -> Real Name mapping to handle spaces/special chars
window.graphNodeMap = {};

/**
 * Show the Global Relationship Graph in a modal
 */
export async function showGlobalGraph() {
    // 1. Create Modal Shell with Split View
    const content = `
        <div style="display:flex; flex-direction:column; height:85vh;">
            <div class="graph-toolbar" style="margin-bottom:10px; display:flex; gap:10px;">
                <button id="btn-refresh-graph" class="btn btn-primary btn-sm">⚡ Analizuj Relacje (Pełny Skan)</button>
                <div id="graph-status" style="margin-left:auto; color:var(--text-dim); font-size:12px; display:flex; align-items:center;">Gotowy</div>
            </div>
            
            <div style="flex:1; display:flex; gap:15px; min-height:0;">
                <!-- Left: Graph -->
                <div id="graph-viz-container" style="flex:2; background:#111; border:1px solid var(--border-subtle); border-radius:8px; overflow:hidden; display:flex; align-items:center; justify-content:center; position:relative;">
                    <span style="color:var(--text-dim);">Kliknij "Analizuj Relacje" aby zbudować graf.</span>
                </div>
                
                <!-- Right: Inspector -->
                <div id="graph-inspector-panel" style="flex:1; background:rgba(0,0,0,0.3); border:1px solid var(--border-subtle); border-radius:8px; padding:15px; overflow-y:auto; display:flex; flex-direction:column;">
                    <div id="graph-inspector-content">
                        <div style="text-align:center; color:var(--text-dim); margin-top:50px;">
                            <div style="font-size:24px; opacity:0.3; margin-bottom:10px;">👆</div>
                            Wybierz postać na grafie,<br>aby zobaczyć szczegóły.
                        </div>
                    </div>
                </div>
            </div>

            <div class="graph-legend" style="margin-top:10px; font-size:11px; color:var(--text-dim); display:flex; gap:15px;">
                <span style="display:flex; align-items:center; gap:5px;"><span style="width:10px; height:10px; background:#ffd700; border-radius:50%;"></span> Postać (Hub)</span>
                <span style="display:flex; align-items:center; gap:5px;"><span style="width:10px; height:10px; background:#444; border-radius:50%;"></span> Postać (Zwykła)</span>
                <span style="display:flex; align-items:center; gap:10px; margin-left:15px;">🖱️ Scroll: Zoom | Drag: Pan | Click: Inspect</span>
            </div>
        </div>
    `;

    createModal('graph-modal', '🕸️ Globalna Sieć Relacji (Gothic)', content);

    // 2. Bind Events
    document.getElementById('btn-refresh-graph').onclick = async () => {
        await loadAndRenderGraph();
    };
}

async function loadAndRenderGraph() {
    const btn = document.getElementById('btn-refresh-graph');
    const status = document.getElementById('graph-status');
    const container = document.getElementById('graph-viz-container');

    if (btn) btn.disabled = true;
    if (status) status.innerHTML = '<span class="spinner" style="width:12px;height:12px;border-width:2px;"></span> Analizuję...';
    if (container) container.innerHTML = '<div style="color:var(--text-dim);">Budowanie grafu... To może potrwać do 10-15s.</div>';

    try {
        const result = await window.electronAPI.invoke('analyze-relations', true); // Force refresh

        if (result.success && result.graph) {
            if (status) status.textContent = `Znaleziono ${result.graph.nodes.length} postaci i ${result.graph.edges.length} powiązań.`;

            const mermaidDef = convertToMermaid(result.graph);
            await mermaidAdapter.renderMermaid(container, mermaidDef);

        } else {
            console.error('Graph error', result);
            if (container) container.innerHTML = `<div style="color:red;">Błąd: ${result.error || 'Nieznany błąd'}</div>`;
            if (status) status.textContent = 'Błąd analizy.';
        }
    } catch (e) {
        console.error('Graph exception', e);
        if (container) container.innerHTML = `<div style="color:red;">Wyjątek: ${e.message}</div>`;
    } finally {
        if (btn) btn.disabled = false;
    }
}

function convertToMermaid(graph) {
    if (!graph || !graph.nodes) return '';

    // Reset Map
    window.graphNodeMap = {};

    let def = 'graph TD\n';

    // Increase spacing for better readability
    def += '  %%{init: {"flowchart": {"nodeSpacing": 40, "rankSpacing": 80, "curve": "basis"}} }%%\n';

    // Styles
    def += '  classDef default fill:#1e1e24,stroke:#333,stroke-width:1px,color:#e0e0e0,rx:5,ry:5;\n';
    def += '  classDef hub fill:#2d1b0a,stroke:#d4af37,stroke-width:2px,color:#ffd700,font-weight:bold;\n'; // Hubs
    def += '  classDef isolated fill:#111,stroke:#333,stroke-width:1px,color:#666,stroke-dasharray: 5 5;\n';

    // Calculate node degrees
    const degrees = {};
    graph.edges.forEach(e => {
        degrees[e.from] = (degrees[e.from] || 0) + 1;
        degrees[e.to] = (degrees[e.to] || 0) + 1;
    });

    const NODE_THRESHOLD = 4; // Threshold to be a "Hub"

    graph.nodes.forEach(node => {
        const id = sanitizeId(node.id);
        const label = node.id;
        const degree = degrees[node.id] || 0;

        // Populate Map
        window.graphNodeMap[id] = node.id;

        let className = 'default';
        if (degree >= NODE_THRESHOLD) className = 'hub';
        if (degree === 0) className = 'isolated';

        def += `  ${id}["${label}"]:::${className}\n`;
    });

    graph.edges.forEach(edge => {
        const from = sanitizeId(edge.from);
        const to = sanitizeId(edge.to);

        if (from === to) return;

        // Simple edge
        def += `  ${from} --> ${to}\n`;
    });

    // Bind Clicks
    graph.nodes.forEach(node => {
        const id = sanitizeId(node.id);
        def += `  click ${id} showNodeContext\n`;
    });

    return def;
}

function sanitizeId(text) {
    return text.replace(/[^a-zA-Z0-9]/g, '_');
}

// ==============================
// INSPECTOR / SIDE PANEL LOGIC
// ==============================

// Helper to escape for HTML attributes
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
}

window.showNodeContext = (nodeId) => {
    // 1. Resolve Name
    const name = window.graphNodeMap?.[nodeId] || nodeId;
    const inspector = document.getElementById('graph-inspector-content');
    if (!inspector) return;

    // 2. Render Inspector
    inspector.innerHTML = `
        <div style="border-bottom:1px solid var(--border-subtle); padding-bottom:10px; margin-bottom:15px;">
            <h3 style="color:var(--gold); margin:0; font-size:18px;">${name}</h3>
            <div style="font-size:11px; color:var(--text-dim); margin-top:5px;">ID Węzła: ${nodeId}</div>
        </div>

        <div style="margin-bottom:20px;">
           <div style="font-weight:bold; color:var(--text-bright); margin-bottom:10px;">Dostępne Akcje AI:</div>
           
           <button onclick="analyzePlotFor('${escapeHtml(name)}')" class="btn btn-outline" style="width:100%; text-align:left; margin-bottom:8px;">
              🔮 <strong>Wylosuj Wątki Fabularne</strong><br>
              <span style="font-size:10px; color:var(--text-dim);">Analiza otoczenia i generowanie zaczepki listy</span>
           </button>
        </div>

        <div id="plot-results-area"></div>
    `;
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
