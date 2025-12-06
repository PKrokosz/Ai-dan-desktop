/**
 * @module prompt-builder
 * @description Budowanie promptów z konfigurowalnymi kontekstami i stylami
 */

const fs = require('fs');
const path = require('path');
const { CONTEXTS, STYLES, DEFAULT_CONFIG, FACTIONS } = require('./prompt-config');

const CONTEXTS_DIR = path.join(__dirname, '..', 'contexts');

// Cache dla załadowanych kontekstów
let contextCache = {};

/**
 * Ładuje kontekst z pliku (z cache)
 */
function loadContext(contextId, maxChars = null) {
    if (!CONTEXTS[contextId]) {
        console.warn(`Unknown context: ${contextId}`);
        return '';
    }

    const cacheKey = contextId;
    if (!contextCache[cacheKey]) {
        const filePath = path.join(CONTEXTS_DIR, CONTEXTS[contextId].file);
        try {
            contextCache[cacheKey] = fs.readFileSync(filePath, 'utf-8');
        } catch (error) {
            console.error(`Failed to load context ${contextId}:`, error.message);
            return '';
        }
    }

    let content = contextCache[cacheKey];
    if (maxChars && content.length > maxChars) {
        content = content.slice(0, maxChars) + '\n[...skrócono...]';
    }
    return content;
}

/**
 * Wyciąga schematy questów dla danego zakresu
 */
function getQuestSchemas(style, count = 2) {
    const questContent = loadContext('quests');
    if (!questContent) return '';

    const styleConfig = STYLES[style] || STYLES.auto;
    const [start, end] = styleConfig.questRange;

    // Parsuj schematy z tekstu
    const lines = questContent.split('\n');
    const schemas = [];
    let currentSchema = '';
    let schemaNumber = 0;

    for (const line of lines) {
        // Szukaj linii zaczynających się od [Typ]
        if (line.match(/^\[.*\]:/)) {
            if (currentSchema) {
                schemaNumber++;
                if (schemaNumber >= start && schemaNumber <= end) {
                    schemas.push(currentSchema.trim());
                }
            }
            currentSchema = line;
        } else if (currentSchema) {
            currentSchema += '\n' + line;
        }
    }

    // Losowo wybierz 'count' schematów
    const shuffled = schemas.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).join('\n\n');
}

/**
 * Automatycznie dobiera styl na podstawie profilu postaci
 */
function detectStyleFromProfile(profile) {
    const text = JSON.stringify(profile).toLowerCase();

    for (const [styleId, style] of Object.entries(STYLES)) {
        if (styleId === 'auto') continue;
        for (const keyword of style.keywords) {
            if (text.includes(keyword.toLowerCase())) {
                return styleId;
            }
        }
    }

    // Domyślnie: personal (osobiste cele)
    return 'personal';
}

/**
 * Buduje kontekst frakcyjny
 */
function buildFactionContext(faction, contextContent) {
    if (!faction || !FACTIONS[faction]) return '';

    const factionName = FACTIONS[faction].label;
    const lines = contextContent.split('\n');
    const relevant = [];

    let inFactionSection = false;
    for (const line of lines) {
        if (line.includes(factionName) || line.includes(faction)) {
            inFactionSection = true;
        }
        if (inFactionSection) {
            relevant.push(line);
            if (relevant.length > 50) break; // Limit
        }
    }

    return relevant.join('\n');
}

/**
 * Główna funkcja budująca prompt
 */
function buildPrompt(commandType, profile, userConfig = {}) {
    // Merge z domyślną konfiguracją
    const config = {
        ...DEFAULT_CONFIG,
        ...userConfig,
        contexts: { ...DEFAULT_CONFIG.contexts, ...userConfig.contexts },
        focus: { ...DEFAULT_CONFIG.focus, ...userConfig.focus }
    };

    let prompt = '';

    // === ROLA ===
    prompt += `Jesteś Mistrzem Gry na Gothic LARP. Tworzysz wątki fabularne dla graczy w Kolonii Karnej.\n\n`;

    // === KONTEKSTY ===
    if (config.contexts.geography) {
        prompt += `=== ŚWIAT I LOKACJE ===\n${loadContext('geography', 2000)}\n\n`;
    }

    if (config.contexts.system) {
        let systemContent = loadContext('system', 3000);
        if (config.focus.faction) {
            prompt += `=== FRAKCJA: ${FACTIONS[config.focus.faction]?.label} ===\n`;
            prompt += buildFactionContext(config.focus.faction, systemContent) + '\n\n';
        } else {
            prompt += `=== ZASADY I HIERARCHIA ===\n${systemContent}\n\n`;
        }
    }

    if (config.contexts.aspirations) {
        prompt += `=== ASPIRACJE I INTRYGI ===\n${loadContext('aspirations', 2000)}\n\n`;
    }

    if (config.contexts.weaknesses) {
        prompt += `=== SŁABOŚCI I ZAGROŻENIA ===\n${loadContext('weaknesses', 1500)}\n\n`;
    }

    // === STYL NARRACYJNY ===
    let activeStyle = config.style;
    if (activeStyle === 'auto') {
        activeStyle = detectStyleFromProfile(profile);
    }
    const styleConfig = STYLES[activeStyle];
    prompt += `=== STYL: ${styleConfig.label} ===\n`;
    prompt += `Ton: ${styleConfig.description}\n\n`;

    // === FEW-SHOT EXAMPLES ===
    if (config.contexts.quests && config.fewShotCount > 0) {
        const examples = getQuestSchemas(activeStyle, config.fewShotCount);
        if (examples) {
            prompt += `=== PRZYKŁADY SCHEMATÓW ===\n${examples}\n\n`;
        }
    }

    // === POSTAĆ ===
    prompt += `=== PROFIL POSTACI ===\n`;
    prompt += `Imię: ${profile['Imie postaci'] || 'Nieznane'}\n`;
    prompt += `Gildia: ${profile['Gildia'] || 'Brak'}\n`;
    prompt += `Region: ${profile['Region'] || 'Nieznany'}\n`;
    prompt += `Za co siedzi: ${profile['Wina'] || 'Nieznane'}\n`;
    prompt += `Historia: ${profile['O postaci'] || profile['Jak zarabiala na zycie, kim byla'] || 'Brak'}\n`;
    prompt += `Cele: ${profile['Przyszlosc'] || profile['Kim chce zostac'] || 'Brak'}\n`;
    prompt += `Słabości: ${profile['Slabosci'] || 'Brak'}\n`;
    prompt += `Umiejętności: ${profile['Umiejetnosci'] || 'Brak'}\n\n`;

    // === INSTRUKCJE ===
    const lengthInstructions = {
        short: 'Odpowiedz krótko (3-5 zdań).',
        medium: 'Odpowiedz w średniej długości (1-2 akapity).',
        long: 'Możesz odpowiedzieć szczegółowo (3-4 akapity).'
    };

    prompt += `=== ZADANIE ===\n`;
    prompt += `${getCommandInstruction(commandType)}\n`;
    prompt += `${lengthInstructions[config.responseLength]}\n`;

    if (config.usePlaceholders) {
        prompt += `Używaj [insert ...] zamiast wymyślania nowych nazw własnych.\n`;
    }

    if (config.focus.theme) {
        prompt += `Skup się na motywie: ${config.focus.theme}.\n`;
    }

    return prompt;
}

/**
 * Instrukcje dla konkretnych poleceń AI
 */
function getCommandInstruction(commandType) {
    const instructions = {
        'main_quest': 'Zaproponuj GŁÓWNY QUEST powiązany z przeszłością postaci. Podaj: nazwę, opis (2-3 zdania), 3-5 kroków, potencjalną nagrodę.',
        'side_quest': 'Zaproponuj QUEST POBOCZNY wykorzystujący umiejętności postaci. Krótki (1-2 sesje), z konkretnym zleceniodawcą.',
        'redemption_quest': 'Zaproponuj QUEST ODKUPIENIA pozwalający zmazać winę postaci. Może wymagać poświęceń.',
        'group_quest': 'Zaproponuj QUEST GRUPOWY dla 3-5 graczy. Określ rolę tej postaci i potrzebne specjalizacje.',
        'story_hooks': 'Zaproponuj 3 HOOKI FABULARNE - krótkie sytuacje wciągające postać w akcję.',
        'potential_conflicts': 'Wymień 3-4 potencjalne KONFLIKTY z innymi frakcjami lub postaciami.',
        'npc_connections': 'Zasugeruj 3-4 NPC, którzy mogą być powiązani z tą postacią.',
        'nickname': 'Wymyśl 3 KSYWKI pasujące do stylu gotyckiego uniwersum.',
        'faction_suggestion': 'Zasugeruj którą frakcję powinna wybrać postać i dlaczego.',
        'secret': 'Wymyśl SEKRET, który postać skrywa. Powinien pasować do jej historii i mieć potencjał fabularny.',
        'extract_traits': 'Wypisz kluczowe cechy postaci: charakter, mocne/słabe strony, motywacje.',
        'analyze_relations': 'Przeanalizuj relacje postaci: sojusznicy, wrogowie, neutralne kontakty.',
        'summarize': 'Podsumuj postać w MAKSYMALNIE 3 zdaniach.',
        'custom': '' // Dla własnych promptów
    };

    return instructions[commandType] || instructions['summarize'];
}

/**
 * Czyści cache kontekstów
 */
function clearContextCache() {
    contextCache = {};
}

module.exports = {
    buildPrompt,
    loadContext,
    getQuestSchemas,
    detectStyleFromProfile,
    clearContextCache,
    getCommandInstruction
};
