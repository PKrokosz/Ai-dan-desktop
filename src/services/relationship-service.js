/**
 * Relationship Service
 * Analyzes the social graph of characters to find clusters, hubs, and isolated nodes.
 */

const logger = require('../shared/logger');
const excelSearch = require('./excel-search');
const larpgothicService = require('./larpgothic-api');

class RelationshipService {
    constructor() {
        this.graph = {
            nodes: [], // { id, name, group, importance, treeRef }
            edges: []  // { source, target, weight, context, year, relType }
        };
        this.lastBuildTime = 0;
    }

    /**
     * Builds the global relationship graph from all profiles.
     * Priorities: larpgothic API > excel-summaries > character-trees
     */
    async buildGraph(forceRefresh = false) {
        const now = Date.now();
        if (!forceRefresh && this.graph.nodes.length > 0 && (now - this.lastBuildTime < 600000)) {
            return this.graph;
        }

        logger.info('Building Relationship Graph v3 (API-First + Temporal)...');

        try {
            // 1. DATA LOADING
            const [apiRes, excelProfiles, treeIndex] = await Promise.all([
                larpgothicService.fetchProfiles({}),
                excelSearch.loadData(),
                excelSearch.loadCharTrees()
            ]);

            const nodes = [];
            const edges = [];
            const nodeMap = new Map(); // Name -> Node Object
            const noiseBlacklist = new Set(['Na', 'Po', 'Od', 'Do', 'Za', 'W', 'Z', 'I', 'Oraz', 'Się', 'Brak', 'Null', 'N/A', 'Gor', 'Or']);

            // 2. PRIMARY NODES (from API)
            if (apiRes.success && apiRes.rows) {
                apiRes.rows.forEach(p => {
                    const rawName = p['Imie postaci'] || p['name'] || 'Anonim';
                    const name = rawName.trim();
                    if (!name || name.length < 2 || noiseBlacklist.has(name)) return;

                    const nodeId = name;
                    const node = {
                        id: nodeId,
                        name: name,
                        group: p['Gildia'] || p['class'] || 'Skazaniec',
                        raw: { ...p },
                        importance: 1,
                        varios: excelSearch.generateNameVariations(name),
                        year: parseInt(p['Rok'] || p['Edycja']) || 2025
                    };

                    if (!nodeMap.has(nodeId)) {
                        nodes.push(node);
                        nodeMap.set(nodeId, node);
                    }
                });
            }

            // 3. MERGE EXCEL SUMMARIES
            excelProfiles.forEach(p => {
                const rawName = p['Imie postaci'] || p['name'];
                if (!rawName) return;
                const name = rawName.trim();

                if (noiseBlacklist.has(name)) return;

                const nodeId = name;
                let node = nodeMap.get(nodeId);

                if (!node) {
                    // Create if missing in API (maybe old character)
                    node = {
                        id: nodeId,
                        name: name,
                        group: p['class'] || p['Gildia'] || 'Skazaniec',
                        raw: { ...p },
                        importance: 1,
                        varios: excelSearch.generateNameVariations(name),
                        year: parseInt(p['edition'] || p['Rok']) || 2024
                    };
                    nodes.push(node);
                    nodeMap.set(nodeId, node);
                } else {
                    // Merge text fields for context extraction
                    ['about', 'friends', 'facts', 'quests', 'summary', 'now', 'future', 'Znajomi, przyjaciele i wrogowie', 'O postaci'].forEach(key => {
                        if (p[key]) node.raw[key] = (node.raw[key] || '') + ' ' + p[key];
                    });
                }
            });

            // 4. ATTACH TREE REFS
            treeIndex.forEach(t => {
                const name = t['Imię postaci'];
                const node = nodeMap.get(name);
                if (node) {
                    node.treeRef = t['drzewko_postaci'];
                }
            });

            // 5. CREATE EDGES (Robust Search with Blacklist)
            const edgeSignatures = new Set();

            nodes.forEach(sourceNode => {
                const textFields = [
                    sourceNode.raw['about'], sourceNode.raw['friends'], sourceNode.raw['facts'],
                    sourceNode.raw['quests'], sourceNode.raw['summary'], sourceNode.raw['now'],
                    sourceNode.raw['future'], sourceNode.raw['Znajomi, przyjaciele i wrogowie'],
                    sourceNode.raw['O postaci']
                ];

                textFields.forEach(text => {
                    if (!text || typeof text !== 'string' || text.length < 5) return;

                    const yearOfSource = parseInt(sourceNode.raw['Rok'] || sourceNode.raw['Edycja'] || sourceNode.raw['edition']) || 2025;

                    nodes.forEach(targetNode => {
                        if (sourceNode.id === targetNode.id) return;

                        // Noise filter for target name
                        if (noiseBlacklist.has(targetNode.name)) return;

                        // Robust Matching Strategy (Ported from ProfileService)
                        // Create keys (Full name + parts)
                        const nameParts = targetNode.name.split(/\s+/).filter(part => part.length > 2);
                        const keysToMatch = [targetNode.name];
                        if (nameParts.length > 1) {
                            nameParts.forEach(p => keysToMatch.push(p));
                        }

                        let matched = false;
                        let snippet = '';
                        let foundKey = '';

                        for (const key of keysToMatch) {
                            const trimmedKey = key.trim();

                            // Special Rule for Templar Titles (Gor, Na, Or):
                            // Suppress them if they are standalone (noise), 
                            // but allow them if they are part of a compound name (e.g. "Gor Na Thot").
                            if (noiseBlacklist.has(trimmedKey)) {
                                if (targetNode.name === trimmedKey) continue; // Standalone match -> Skip
                                // If it's just a part of a name, we only allow it if it's longer than 2 chars 
                                // OR if we're matching the FULL compound name.
                                if (trimmedKey.length < 3 && key !== targetNode.name) continue;
                            }

                            const sanitized = trimmedKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            const firstChar = key[0];
                            const isUpper = firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase();

                            // Word Boundary Regex (handles Polish chars)
                            const boundary = `(^|\\s|[.,;?!:()"\\-])`;
                            const regex = isUpper
                                ? new RegExp(`${boundary}(${sanitized}|${sanitized.toUpperCase()})(${boundary})`, '')
                                : new RegExp(`${boundary}${sanitized}`, 'i');

                            const match = regex.exec(text);
                            if (match) {
                                matched = true;
                                foundKey = key;

                                const idx = match.index;
                                const matchLen = match[0].length;
                                const start = Math.max(0, idx - 40);
                                const end = Math.min(text.length, idx + matchLen + 60);
                                snippet = text.substring(start, end).trim();
                                break;
                            }
                        }

                        if (matched) {
                            const edgeSig = `${sourceNode.id}|${targetNode.id}`;
                            if (!edgeSignatures.has(edgeSig)) {
                                edges.push({
                                    source: sourceNode.id,
                                    target: targetNode.id,
                                    weight: 1,
                                    context: `...${snippet}...`,
                                    year: yearOfSource,
                                    relType: this.classifyRelationship(snippet, foundKey)
                                });
                                edgeSignatures.add(edgeSig);
                                targetNode.importance++;
                            }
                        }
                    });
                });
            });

            // Clean up
            nodes.forEach(n => {
                delete n.varios;
                delete n.raw;
            });

            this.graph = { nodes, edges };
            this.lastBuildTime = now;
            logger.info('Relationship Graph v3 built', { nodes: nodes.length, edges: edges.length });
            return this.graph;

        } catch (error) {
            logger.error('Failed to build relationship graph v3', { error: error.message, stack: error.stack });
            return { nodes: [], edges: [] };
        }
    }

    /**
     * Categorizes relationship based on keywords near the name
     */
    classifyRelationship(snippet, targetName) {
        const s = snippet.toLowerCase();

        const friendly = ['przyjaciel', 'kumpel', 'brat', 'siostra', 'lubi', 'kocha', 'wierny', 'pomaga', 'ratuje', 'znajomy', 'sojusz'];
        const hostile = ['wróg', 'nienawidzi', 'zabił', 'oszukał', 'zdrajca', 'konfident', 'walczy', 'śmierć', 'zemsta', 'ataki'];
        const professional = ['zleca', 'pracuje', 'szef', 'mistrz', 'uczeń', 'płaci', 'ruda', 'interesy', 'kontrakt'];

        if (hostile.some(k => s.includes(k))) return 'hostile';
        if (friendly.some(k => s.includes(k))) return 'friendly';
        if (professional.some(k => s.includes(k))) return 'professional';

        return 'neutral';
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
