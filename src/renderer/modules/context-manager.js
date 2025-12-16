/**
 * @module ContextManager
 * @description Manages intelligent loading, indexing, and token-budgeting of flat-file contexts.
 * implements the "Surgical Generation" strategy.
 */

// Cache for loaded file contents
const contextCache = {
    aspirations: null,
    weaknesses: null,
    system: null,
    quests: null,
    geography: null
};

// Paths to context files
const CONTEXT_PATHS = {
    aspirations: 'src/contexts/aspirations.txt',
    weaknesses: 'src/contexts/weaknesses.txt',
    system: 'src/contexts/system.txt',
    quests: 'src/contexts/quests.txt',
    geography: 'src/contexts/geography.txt'
};

// ==========================================
// CORE LOADER
// ==========================================

async function loadContextFile(key) {
    if (contextCache[key]) return contextCache[key];

    try {
        const result = await window.electronAPI.readFile(CONTEXT_PATHS[key]);
        if (result && result.success) {
            contextCache[key] = result.data;
            return result.data;
        }
    } catch (e) {
        console.error(`[ContextManager] Failed to load ${key}:`, e);
    }
    return '';
}

/**
 * Gets the FULL content of a context file (no chunking).
 * @param {string} key - Context key (system, geography, etc.)
 */
export async function getFullContext(key) {
    return await loadContextFile(key);
}

// ==========================================
// SMART INDEXERS (REGEX & SEARCH)
// ==========================================

/**
 * Extracts a specific section based on a header or keyword, respecting token limits.
 * @param {string} text - Full text content
 * @param {string|RegExp} query - Search query
 * @param {number} tokenLimit - Max tokens (approx 4 chars per token)
 */
function extractChunk(text, query, tokenLimit = 500) {
    if (!text) return '';

    const charLimit = tokenLimit * 4;
    let matchIndex = -1;

    if (query instanceof RegExp) {
        const match = text.match(query);
        matchIndex = match ? match.index : -1;
    } else {
        matchIndex = text.toLowerCase().indexOf(query.toLowerCase());
    }

    if (matchIndex === -1) return '';

    // Extract surrounding context (e.g. paragraph)
    // Find previous double newline or bullet
    const start = Math.max(0, text.lastIndexOf('\n\n', matchIndex));
    let end = Math.min(text.length, start + charLimit);

    // Attempt to end cleanly at a sentence or bullet
    const nextBullet = text.indexOf('\n\n', matchIndex + 20); // offset to Ensure we get at least some content
    if (nextBullet !== -1 && nextBullet < end) {
        end = nextBullet;
    }

    return text.substring(start, end).trim();
}

/**
 * Finds faction specific rules
 */
function getFactionBlock(text, factionName) {
    // Mapping logic: Map Character Guild to System Text Faction Name
    const map = {
        'Cień': 'Stary Obóz', 'Strażnik': 'Stary Obóz', 'Magnat': 'Stary Obóz', 'Kopacz': 'Stary Obóz',
        'Szkodnik': 'Nowy Obóz', 'Najemnik': 'Nowy Obóz', 'Mag Wody': 'Nowy Obóz',
        'Nowicjusz': 'Bractwo', 'Guru': 'Bractwo', 'Strażnik Świątynny': 'Bractwo'
    };

    const target = map[factionName] || factionName;
    return extractChunk(text, target, 800);
}

// ==========================================
// LAYER API (The "Surgical" Methods)
// ==========================================

/**
 * BASIC LAYER: Profile Stats & Bio
 * Formats the raw profile row into a readable string.
 */
export function getProfileStats(profile) {
    if (!profile) return '';
    const ignoreKeys = ['id', 'rowId', 'hasHistory', 'hasEmbedding'];
    let text = '--- KARTA POSTACI ---\n';

    // Prioritize key fields
    if (profile['Imie postaci']) text += `IMIE: ${profile['Imie postaci']}\n`;
    if (profile['Gildia']) text += `GILDIA: ${profile['Gildia']}\n`;
    if (profile['Ranga']) text += `RANGA: ${profile['Ranga']}\n`;

    // Add other fields
    for (const [key, val] of Object.entries(profile)) {
        if (!ignoreKeys.includes(key) && val && key !== 'Imie postaci' && key !== 'Gildia' && key !== 'Ranga') {
            text += `${key}: ${val}\n`;
        }
    }
    return text + '\n';
}

/**
 * LAYER 1: The Actor
 * Gets Aspirations & Weaknesses for specific character name
 */
export async function getLayer1_Identity(name) {
    const [aspText, weakText] = await Promise.all([
        loadContextFile('aspirations'),
        loadContextFile('weaknesses')
    ]);

    const aspiration = extractChunk(aspText, name, 500);
    const weakness = extractChunk(weakText, name, 500);

    let result = '';
    if (aspiration) result += `\n--- AMBICJE POSTACI (${name}) ---\n${aspiration}\n`;
    if (weakness) result += `\n--- SŁABOŚCI POSTACI (${name}) ---\n${weakness}\n`;

    return result;
}

/**
 * LAYER 2: The Network
 * Gets Faction Rules & Relations/Rivals
 */
export async function getLayer2_Relations(profile) {
    const [sysText] = await Promise.all([
        loadContextFile('system')
    ]);

    const guild = profile['Gildia'] || 'Nieznany';
    const factionRules = getFactionBlock(sysText, guild);

    let result = '';
    if (factionRules) result += `\n--- WIEDZA O FRAKCJI (${guild}) ---\n${factionRules}\n`;

    // TODO: Advanced Logic - Search 'aspirations' for names mentioned in Profile's 'Historia'
    // This requires cross-referencing, heavily depends on Profile data structure

    return result;
}

/**
 * LAYER 3: The World & Style
 * Gets Geography & Quest Templates based on intent
 */
export async function getLayer3_World(intent) {
    const [geoText, questText] = await Promise.all([
        loadContextFile('geography'),
        loadContextFile('quests')
    ]);

    // Map intent to Quest Template Category
    let category = 'Mroczna Intryga'; // default
    if (intent.includes('walka') || intent.includes('potwór')) category = 'Surowy Realizm';
    if (intent.includes('magia') || intent.includes('artefakt')) category = 'Mistyczna Wizja';

    const template = extractChunk(questText, category, 1000);

    // Keyword extraction for geography (naive impl)
    // E.g. if intent has "bagno", load Swamps
    let loc = '';
    if (intent.toLowerCase().includes('bagn')) loc = extractChunk(geoText, 'Bagna', 600);
    if (intent.toLowerCase().includes('kopalni')) loc = extractChunk(geoText, 'Kopalnia', 600);
    if (intent.toLowerCase().includes('zamek')) loc = extractChunk(geoText, 'Zamek', 600);

    let result = '';
    if (template) result += `\n--- PRZYKŁAD QUESTU (${category}) ---\n${template}\n`;
    if (loc) result += `\n--- LOKACJA ---\n${loc}\n`;

    return result;
}

// Export for usage in AI Core
export default {
    getLayer1_Identity,
    getLayer2_Relations,
    getLayer3_World,
    getProfileStats,
    getFullContext
};
