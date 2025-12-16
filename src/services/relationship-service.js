/**
 * Relationship Service
 * Analyzes the social graph of characters to find clusters, hubs, and isolated nodes.
 */

const logger = require('../shared/logger');
const profileService = require('./profile-service'); // Assuming we can reuse profile loading

class RelationshipService {
    constructor() {
        this.graph = {
            nodes: [], // { id, name, group, importance }
            edges: []  // { source, target, weight, context }
        };
        this.lastBuildTime = 0;
    }

    /**
     * Builds the global relationship graph from all profiles.
     * This is an expensive operation, should be cached.
     */
    async buildGraph(forceRefresh = false) {
        const now = Date.now();
        // Cache for 10 minutes unless forced
        if (!forceRefresh && this.graph.nodes.length > 0 && (now - this.lastBuildTime < 600000)) {
            return this.graph;
        }

        logger.info('Building Relationship Graph...');

        try {
            const allProfiles = await profileService.getProfiles({});

            const nodes = [];
            const edges = [];

            // 1. Create Nodes
            allProfiles.forEach(p => {
                // Ensure we have a valid name
                const name = p['Imie postaci'] || p['name'];
                if (!name) return;

                nodes.push({
                    id: name,
                    name: name,
                    group: p['Gildia'] || p['guild'] || 'Unknown',
                    importance: 1 // Baseline importance
                });
            });

            // 2. Create Edges (Analyze 'Friends', 'Enemies', 'History')
            // Using a simple keyword search for now. 
            // Warning: heavily O(n*m) complexity.

            // Optimization: Create a set of all names to search for
            const nameSet = new Set(nodes.map(n => n.name));

            allProfiles.forEach(source => {
                const sourceName = source['Imie postaci'] || source['name'];
                if (!sourceName) return;

                // Fields to scan
                const textFields = [
                    source['Znajomi, przyjaciele i wrogowie'],
                    source['O postaci'],
                    source['Fakty']
                ].join(' ').toLowerCase();

                // Check for mentions
                nameSet.forEach(targetName => {
                    if (sourceName === targetName) return; // Self-loop skip

                    if (textFields.includes(targetName.toLowerCase())) {
                        // Found a mention!
                        // Check if edge already exists (undirected or directed?)
                        // Let's make it directed: Source mentions Target.
                        edges.push({
                            source: sourceName,
                            target: targetName,
                            weight: 1
                        });

                        // Boost importance of target (PageRank-lite)
                        const targetNode = nodes.find(n => n.name === targetName);
                        if (targetNode) targetNode.importance += 1;
                    }
                });
            });

            this.graph = { nodes, edges };
            this.lastBuildTime = now;

            logger.info('Relationship Graph built', { nodes: nodes.length, edges: edges.length });
            return this.graph;

        } catch (error) {
            logger.error('Failed to build relationship graph', { error: error.message });
            return { nodes: [], edges: [] };
        }
    }

    /**
     * Get neighbors and context for a specific character
     */
    async getContextForCharacter(name) {
        if (this.graph.nodes.length === 0) {
            await this.buildGraph();
        }

        const directRelations = this.graph.edges.filter(e => e.source === name || e.target === name);

        const neighbors = new Set();
        directRelations.forEach(e => {
            neighbors.add(e.source === name ? e.target : e.source);
        });

        return {
            name,
            degree: neighbors.size,
            relatives: Array.from(neighbors),
            isHub: neighbors.size > 5,
            isIsle: neighbors.size === 0
        };
    }
}

module.exports = new RelationshipService();
