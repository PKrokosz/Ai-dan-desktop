
/**
 * Analyzes relationships between characters and generates a Mermaid graph definition.
 */

import npcs from '../../data/npcs.json' assert { type: 'json' };
import * as mermaidAdapter from './mermaid-adapter.js';
import { state } from './state.js';
import { addLog, renderStep } from './ui-helpers.js';

/**
 * Generates a Mermaid graph definition for character relationships.
 * @param {Array} promptHistory - The global history of prompts to calculate weights.
 * @returns {string} - The Mermaid graph definition string.
 */
export function generateRelationshipGraph(promptHistory = []) {
    // 1. Calculate Weights based on mentions in history
    const weights = {};
    const allText = promptHistory.map(item => (item.prompt + ' ' + item.response).toLowerCase()).join(' ');

    npcs.forEach(npc => {
        const name = npc.name;
        const regex = new RegExp(`\\b${name.toLowerCase()}\\b`, 'g');
        const count = (allText.match(regex) || []).length;
        weights[name] = count;
    });

    // 2. Build Graph Definition
    let graph = 'graph TD\n';

    // Styling classes
    graph += '  classDef default fill:#1a1a1a,stroke:#333,stroke-width:1px,color:#e0e0e0;\n';
    graph += '  classDef focus fill:#4a3b2a,stroke:#d4af37,stroke-width:2px,color:#fff;\n'; // Gold border for active chars
    graph += '  classDef active fill:#2a2a40,stroke:#668,stroke-width:1px,color:#fff;\n'; // Blue tint for mentioned chars

    // Nodes
    npcs.forEach(npc => {
        const weight = weights[npc.name] || 0;
        let className = 'default';
        let label = npc.name;

        // Scale node size/importance visually if supported or just by class
        if (weight > 5) {
            className = 'focus';
            label += ` (${weight})`; // Debugging/Info
        } else if (weight > 0) {
            className = 'active';
        }

        // Sanitize ID (remove spaces)
        const id = npc.name.replace(/\s+/g, '_');

        // Add Node
        graph += `  ${id}("${label}"):::${className}\n`;
    });

    // Edges (Relationships)
    graph += '\n  %% Relationships\n';
    npcs.forEach(npc => {
        if (npc.relations && Array.isArray(npc.relations)) {
            const sourceId = npc.name.replace(/\s+/g, '_');

            npc.relations.forEach(rel => {
                // Parse "Name (description)"
                const match = rel.match(/^([^(]+)(?:\(([^)]+)\))?$/);
                if (match) {
                    const targetName = match[1].trim();
                    const desc = match[2] ? match[2].trim() : '';

                    // Check if target exists in our DB to avoid disconnected/ghost nodes if desired
                    // But usually we want to show all defined relations
                    const targetId = targetName.replace(/\s+/g, '_');

                    // Add Edge
                    // A -->|Label| B
                    if (desc) {
                        graph += `  ${sourceId} -->|"${desc}"| ${targetId}\n`;
                    } else {
                        graph += `  ${sourceId} --> ${targetId}\n`;
                    }
                }
            });
        }
    });

    return graph;
}

/**
 * Handles the 'map_relations' command to render the map in the UI.
 * @param {number} newItemIndex - The index of the new item in text feed to render into.
 */
export async function renderRelationshipMap(newItemIndex) {
    try {
        addLog('info', '🕸️ Generuję mapę relacji...');

        // 1. Generate Graph Definition
        const combinedHistory = [
            ...(state.promptHistory || []),
            ...state.aiResultsFeed.map(item => ({ prompt: '', response: item.content || '' }))
        ];

        const graphDef = generateRelationshipGraph(combinedHistory);

        // 2. Render Result
        const feedItem = state.aiResultsFeed[newItemIndex];
        feedItem.content = `### Mapa Relacji\n\nAnaliza występowania postaci w historii sesji.\n\n<div class="mermaid-container" style="background:#1a1a1a; padding:10px; border-radius:8px; overflow:hidden;">${graphDef}</div>`;
        feedItem.isStreaming = false;

        // 3. Render Mermaid
        // We need to wait for DOM update first
        renderStep();

        // Allow micro-delay for DOM paint
        setTimeout(async () => {
            const container = document.getElementById(`ai-card-${newItemIndex}`);
            if (container) {
                const mermaidDiv = container.querySelector('.mermaid-container');
                if (mermaidDiv) {
                    await mermaidAdapter.renderMermaid(mermaidDiv, graphDef);
                }
            }
        }, 50);

        state.aiProcessing = false;
        state.streamData.active = false;
        addLog('success', 'Mapa relacji wygenerowana.');

    } catch (err) {
        state.aiResult = `❌ Błąd generowania mapy: ${err.message}`;
        addLog('error', `Błąd mapy: ${err.message}`);
        state.aiProcessing = false;
        state.streamData.active = false;
        renderStep();
    }
}
