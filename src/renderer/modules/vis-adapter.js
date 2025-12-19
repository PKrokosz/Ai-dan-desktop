/**
 * @module vis-adapter
 * @description Adapter for Vis.js Network library
 */

// We will try to import from node_modules directly. 
// If this path fails, we might need to copy the library to assets or usage a different path.
// Standard Vis.js distribution has a standalone ESM build.
import { Network } from '../../../node_modules/vis-network/standalone/esm/vis-network.min.js';
// Note: vis-network standalone usually bundles DataSet. Let's start with just Network import if possible, 
// or use the 'vis-network/peer/esm/vis-network' if we want granular.
// For simplicity in non-bundled environment, the standalone bundle is safest if it supports ESM default export or named exports.
// Actually, standalone usually exports `default` as an object containing Network, DataSet etc.

let networkInstance = null;

export function destroyGraph() {
    if (networkInstance) {
        networkInstance.destroy();
        networkInstance = null;
    }
}

/**
 * Renders graph using Vis.js
 * @param {HTMLElement} container 
 * @param {Object} graphData { nodes: [], edges: [] }
 * @param {Object} options Custom options
 */
export function renderGraph(container, graphData, onNodeClick) {
    if (!container) return;

    try {
        // Transform data to Vis format
        // Helper to decode HTML entities
        const decodeHtml = (html) => {
            try {
                if (!html) return "";
                const txt = document.createElement("textarea");
                txt.innerHTML = String(html);
                return txt.value;
            } catch (e) {
                return String(html);
            }
        };

        const getColorForGroup = (group) => {
            const g = (group || "").toLowerCase();

            // Bractwo (Sect Camp) - Green
            if (g.includes("nowicjusz")) return "#90EE90"; // Light Green
            if (g.includes("strażnik świątynny") || g === "sś") return "#228B22"; // Green
            if (g.includes("guru")) return "#006400"; // Dark Green

            // Stary Obóz (Old Camp) - Red
            if (g.includes("kopacz")) return "#FFC0CB"; // Light Red/Pink
            if (g.includes("cień") || g.includes("cienia")) return "#FF4500"; // OrangeRed
            if (g.includes("strażnik")) return "#FF0000"; // Red
            if (g.includes("magnat") || g.includes("mag ognia")) return "#8B0000"; // Dark Red

            // Nowy Obóz (New Camp) - Blue
            if (g.includes("kret")) return "#ADD8E6"; // Light Blue
            if (g.includes("szkodnik")) return "#00BFFF"; // Deep Sky Blue
            if (g.includes("najemnik")) return "#0000FF"; // Blue
            if (g.includes("mag wody")) return "#00008B"; // Dark Blue

            // Default / Skazaniec (Convict)
            return "#777777"; // Gray
        };

        const nodes = graphData.nodes.map(n => {
            const nodeColor = getColorForGroup(n.group);
            const treeInfo = n.treeRef ? `\nDrzewko: ${n.treeRef}` : '';
            return {
                id: n.id,
                label: decodeHtml(n.name || n.id),
                group: n.group || 'default',
                value: n.importance || 1,
                title: `Postać: ${n.name}\nKlasa: ${n.group}${treeInfo}`,
                color: {
                    background: nodeColor,
                    border: "#333",
                    highlight: { background: "#ffd700", border: "#fff" }
                },
                font: { color: "#eee" }
            };
        });

        const edges = graphData.edges.map(e => {
            const isOld = (e.year || 2025) < 2024;
            const isRecent = (e.year || 2025) === 2025;

            let edgeColor = '#888';
            let label = '';

            if (e.relType === 'friendly') { edgeColor = '#2ecc71'; label = 'Przyjaciel'; }
            if (e.relType === 'hostile') { edgeColor = '#e74c3c'; label = 'Wróg'; }
            if (e.relType === 'professional') { edgeColor = '#3498db'; label = 'Interesy'; }

            return {
                from: e.source || e.from,
                to: e.target || e.to,
                arrows: 'to',
                label: label,
                font: { size: 10, color: '#aaa', align: 'middle', background: 'rgba(0,0,0,0.5)' },
                color: {
                    color: edgeColor,
                    opacity: isRecent ? 0.8 : 0.3,
                    highlight: '#fff'
                },
                width: isRecent ? 2 : 1,
                dashes: isOld
            };
        });

        const data = { nodes, edges };

        const options = {
            nodes: {
                shape: 'dot',
                font: {
                    color: '#e0e0e0',
                    face: 'Inter',
                    size: 14
                },
                scaling: {
                    min: 10,
                    max: 45, // Reduced from 60 to avoid extreme overlaps
                    label: {
                        enabled: true,
                        min: 12, // Slightly smaller labels
                        max: 20
                    }
                },
                borderWidth: 1 // lighter border
            },
            edges: {
                smooth: {
                    type: 'continuous'
                }
            },
            physics: {
                stabilization: {
                    enabled: true,
                    iterations: 1000,
                    updateInterval: 50
                },
                barnesHut: {
                    gravitationalConstant: -30000, // Significantly increased repulsion
                    springConstant: 0.005, // Much softer springs
                    springLength: 250, // Longer distance between nodes
                    centralGravity: 0.1,
                    damping: 0.09
                }
            },
            interaction: {
                hover: true,
                tooltipDelay: 200,
                hideEdgesOnDrag: true // Performance
            },
            layout: {
                improvedLayout: false // Faster for large graphs
            }
        };

        if (networkInstance) {
            networkInstance.destroy();
        }

        networkInstance = new Network(container, data, options);

        // Events
        // Events
        networkInstance.on('click', (params) => {
            if (params.nodes.length > 0) {
                // Node Logic
                const nodeId = params.nodes[0];
                if (onNodeClick) onNodeClick({ type: 'node', id: nodeId });
            } else if (params.edges.length > 0) {
                // Edge Logic (Only if no node selected)
                const edgeId = params.edges[0];
                const edgeData = data.edges.find(e => e.id === edgeId); // Vis adds automatic IDs or we can check
                // Actually, Vis.js dataset stores them. 
                // Since we used array, we didn't specify IDs. Vis generated them (internal GUIDs).
                // But we CAN retrieve the actual edge object from the network.

                // Better approach: Since we pass simple array, we can't easily correlate unless we assigned IDs.
                // However, `networkInstance.body.data.edges.get(edgeId)` works.
                const internalEdge = networkInstance.body.data.edges.get(edgeId);
                if (internalEdge && onNodeClick) {
                    onNodeClick({ type: 'edge', from: internalEdge.from, to: internalEdge.to });
                }
            }
        });

    } catch (e) {
        console.error("Vis.js Render Error", e);
        container.innerHTML = `<div style="color:red; padding:20px;">Render Error: ${e.message}</div>`;
    }
}

/**
 * Switch between Organic and Map (Grid/Spatial) mode
 * @param {string} mode 'organic' | 'map'
 */
export function toggleLayoutMode(mode) {
    if (!networkInstance) return;

    if (mode === 'organic') {
        networkInstance.setOptions({
            physics: { enabled: true }
        });
        networkInstance.stabilize();
    }
    else if (mode === 'map') {
        const positions = {};
        const nodes = networkInstance.body.data.nodes.get();

        // Define Faction Zones (Grid 3x3)
        // Hubs (Gold) go to center?
        // Let's optimize:
        // Use a force-directed layout with grouping constraints? Vis.js doesn't support easy constraints.
        // Alternative: Calculate fixed positions in circle sectors

        // Strategy: Circular sectors
        const groups = [...new Set(nodes.map(n => n.group))];
        const degreesPerGroup = 360 / groups.length;
        const radius = 1000;

        // Calculate Center for each group
        const groupCenters = {};
        groups.forEach((g, i) => {
            const angle = (i * degreesPerGroup) * (Math.PI / 180);
            groupCenters[g] = {
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius
            };
        });

        // Move nodes
        nodes.forEach(n => {
            const center = groupCenters[n.group];
            // Add random jitter so they don't stack perfectly
            positions[n.id] = {
                x: center.x + (Math.random() - 0.5) * 500,
                y: center.y + (Math.random() - 0.5) * 500
            };
        });

        networkInstance.setOptions({ physics: { enabled: false } });
        networkInstance.body.data.nodes.update(
            Object.keys(positions).map(id => ({ id, x: positions[id].x, y: positions[id].y }))
        );
        networkInstance.fit({ animation: { duration: 1000 } });
    }
}
