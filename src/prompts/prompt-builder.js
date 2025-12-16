/**
 * @module prompt-builder
 * @description Advanced Prompt Engineering System for Gothic LARP AI.
 * Implements Google's "Writing Effective Prompts" methodology:
 * Persona -> Context -> Task -> Output Schema -> Definition of Done.
 */

const fs = require('fs');
const path = require('path');
const { SYSTEM_PROMPTS, COMMAND_SCHEMAS } = require('./templates/system-prompts');

// Load Glossary Data
const GLOSSARY_PATH = path.join(__dirname, 'data', 'glossary.json');
const EXAMPLES_PATH = path.join(__dirname, 'data', 'examples.json');

let GLOSSARY_DATA = {};
let EXAMPLES_DATA = {};

try {
    if (fs.existsSync(GLOSSARY_PATH)) {
        GLOSSARY_DATA = JSON.parse(fs.readFileSync(GLOSSARY_PATH, 'utf8'));
    }
    if (fs.existsSync(EXAMPLES_PATH)) {
        EXAMPLES_DATA = JSON.parse(fs.readFileSync(EXAMPLES_PATH, 'utf8'));
    }
} catch (e) {
    console.error("Failed to load data files:", e);
}

class PromptBuilder {
    constructor() {
        this.context = {
            persona: SYSTEM_PROMPTS.PERSONA,
            style: SYSTEM_PROMPTS.STYLE_GUIDE,
            rules: SYSTEM_PROMPTS.RULES_OF_PLAY || '',
            selfCorrection: SYSTEM_PROMPTS.SELF_CORRECTION,
            format: SYSTEM_PROMPTS.FORMAT_INSTRUCTION,
            userProfile: "",
            loreContext: "",
            task: "",
            examples: "",
            modeInstruction: "", // New: Debug/Design/etc.
            userInput: "" // New: Separate User Input field
        };
    }

    /**
     * Injects User Profile context (Developer Role)
     */
    withUserProfile(profileData) {
        if (!profileData) return this;

        let profileString = "";
        if (typeof profileData === 'string') {
            profileString = profileData;
        } else if (typeof profileData === 'object') {
            // Flatten object to readable string
            profileString = Object.entries(profileData)
                .map(([key, val]) => `${key.toUpperCase()}: ${val}`)
                .join('\n');
        }

        this.context.userProfile = `
DANE POSTACI (USER PROFILE - CONTEXT):
${profileString}
`;
        return this;
    }

    /**
     * Injects relevant Lore/Glossary context based on keywords or general injection
     */
    withLoreContext(keywords = []) {
        // Basic Glossary Injection (Factions, Economy Brief)
        const economySummary = GLOSSARY_DATA.economy
            ? `CENNIK (Przykłady): ${JSON.stringify(GLOSSARY_DATA.economy.prices)}`
            : "";

        const factionsSummary = GLOSSARY_DATA.factions
            ? `FRAKCJE: ${Object.keys(GLOSSARY_DATA.factions).join(', ')}`
            : "";

        this.context.loreContext = `
KONTEKST ŚWIATA (LORE & GLOSSARY):
${factionsSummary}
${economySummary}
WAŻNE LOKACJE: ${GLOSSARY_DATA.world?.general_locations?.join(', ') || ''}
`;
        return this;
    }

    /**
     * Sets the Mode (Developer Role)
     * @param {string} mode - 'standard', 'debug', 'creative', 'strict'
     */
    withMode(mode = 'standard') {
        if (mode === 'debug') {
            this.context.modeInstruction = `
TRYB: DEBUG
Wyjaśnij swoje rozumowanie krok po kroku w polu "_thought_process".
Sprawdź spójność danych dwukrotnie.
`;
        } else if (mode === 'creative') {
            this.context.modeInstruction = `
TRYB: KREATYWNY
Bądź brutalny, nieprzewidywalny i zgodny z klimatem Dark Fantasy.
`;
        }
        return this;
    }

    /**
     * Configures the specific Task/Command
     * @param {string} commandType - e.g., 'main_quest', 'story_hook'
     * @param {object} params - additional parameters for the task
     */
    withTask(commandType, params = {}) {
        let taskInstruction = "";
        let schema = "";

        // Capture User Input separately if provided in params
        if (params.message) {
            this.context.userInput = `
WIADOMOŚĆ UŻYTKOWNIKA (TRIGGER):
"${params.message}"
`;
        }

        switch (commandType) {
            case 'diagnosis':
                const historyText = params.history ? params.history.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n') : "Brak historii";
                taskInstruction = `ZADANIE (DEVELOPER): DIAGNOZA INTENCJI.
Na podstawie historii i nowej wiadomości, określ cel gracza.

HISTORIA ROZMOWY:
${historyText}

INSTRUKCJA:
1. Przeanalizuj czy gracz chce wygenerować treść (Quest, Hook)?
2. Czy pyta o analizę (Relacje, Cechy)?
3. Czy to luźna rozmowa (Chat / Unknown)?

Zwróć JSON z polem 'intent' (GENERATE_QUEST | ANALYZE_RELATIONS | UNKNOWN).`;
                schema = COMMAND_SCHEMAS.DIAGNOSIS;
                break;

            case 'extraction':
                taskInstruction = `ZADANIE (DEVELOPER): EKSTRAKCJA DANYCH.
Cel: Wyciągnij dane do formularza "${params.schema?.id || 'Nieznany'}" z wiadomości użytkownika.

SCHEMA PÓL DO ZNALEZIENIA:
${params.schema?.fields ? Object.entries(params.schema.fields).map(([k, v]) => `- ${k} (${v.type}): ${v.description || ''}`).join('\n') : 'Brak schematu'}

KONTEKST (Już zebrane): ${JSON.stringify(params.currentData || {})}

INSTRUKCJA:
1. Znajdź wartości dla pól w tekście użytkownika.
2. Zignoruj resztę.
3. Zwróć JSON tylko ze znalezionymi polami.`;
                schema = "{}";
                this.context.format = "Zwróć TYLKO czysty JSON z ekstrakcją.";
                break;

            case 'collection':
                // Check if we should limit questions (Good Practice #9)
                let missingList = params.missing || [];
                // Runtime logic does slicing, but we reflect it here for clarity in prompt
                const missingFields = missingList.join(', ');

                taskInstruction = `ZADANIE (DEVELOPER): WYWIAD (Zadawanie Pytań).
Brakuje informacji: ${missingFields}.

INSTRUKCJA:
Zadaj KRÓTKIE, klimatyczne pytanie o te brakujące elementy.
Nie pytaj o nic więcej.
Styl: Gothic (NPC/MG).`;
                schema = "";
                this.context.format = ""; // Natural language
                break;

            // --- ENHANCED CONTENT TASKS ---

            case 'main_quest':
            case 'side_quest':
            case 'side_quest_repeatable':
            case 'group_quest':
            case 'redemption_quest':
                taskInstruction = `ZADANIE (DEVELOPER): ZAPROJEKTUJ QUEST (${commandType.replace('_', ' ').toUpperCase()}).
Wygeneruj zadanie zgodnie z podanym schematem JSON.`;
                schema = COMMAND_SCHEMAS.QUEST;
                break;

            case 'story_hooks':
            case 'potential_conflicts':
            case 'secret':
                taskInstruction = `ZADANIE (DEVELOPER): GENEROWANIE HACZYKÓW FABULARNYCH.
Stwórz sytuacje, które wciągną postać w kłopoty.`;
                schema = COMMAND_SCHEMAS.HOOK;
                break;

            case 'npc_connections':
            case 'nickname':
                taskInstruction = `ZADANIE (DEVELOPER): NPC & KSYWKA.`;
                schema = COMMAND_SCHEMAS.NPC_ENRICHMENT;
                break;

            case 'faction_suggestion':
            case 'advise':
                taskInstruction = `ZADANIE (DEVELOPER): PORADA.`;
                schema = COMMAND_SCHEMAS.ADVISORY;
                break;

            case 'extract_traits':
                taskInstruction = `ZADANIE (DEVELOPER): ANALIZA PSYCHOLOGICZNA.`;
                schema = COMMAND_SCHEMAS.TRAIT_ANALYSIS;
                break;

            case 'analyze_relations':
                taskInstruction = `ZADANIE (DEVELOPER): ANALIZA RELACJI.`;
                schema = COMMAND_SCHEMAS.RELATION_ANALYSIS;
                break;

            case 'summarize':
                taskInstruction = `ZADANIE (DEVELOPER): PODSUMOWANIE.`;
                schema = COMMAND_SCHEMAS.SUMMARIZATION;
                break;

            case 'chat':
            case 'custom':
                taskInstruction = `ZADANIE (DEVELOPER): ODGRYWANIE ROLI (ROLEPLAY).
Bądź pomocny, ale trzymaj się klimatu ("Świat jest brutalny").`;
                schema = "";
                this.context.format = "";
                break;

            default:
                taskInstruction = `ZADANIE: WYKONAJ POLECENIE GRACZA.`;
                schema = `{"response": "treść"}`;
        }

        this.context.task = `
${taskInstruction}

OCZEKIWANY SCHEMAT JSON (KONTRAKT):
${schema}
`;
        this.context.examples = this._getExamples(commandType);
        return this;
    }

    /**
     * Assembles the final prompt string adhering to GCF Hierarchy
     */
    build() {
        // Strict Hierarchy:
        // 1. SYSTEM ROLE (Persona, Style, Rules, Mode)
        // 2. DEVELOPER ROLE (Context, Examples, Task Schema)
        // 3. USER ROLE (Input Message) - Trigger for the AI

        const systemBlock = [
            this.context.persona,
            this.context.style,
            this.context.rules,
            this.context.modeInstruction,
            this.context.selfCorrection,
            this.context.format
        ].filter(Boolean).join('\n\n');

        const developerBlock = [
            this.context.loreContext,
            this.context.userProfile,
            this.context.examples,
            this.context.task
        ].filter(Boolean).join('\n\n');

        const userBlock = this.context.userInput;

        return `
${systemBlock}

========================================
[KONTEKST I ZADANIE]
${developerBlock}

========================================
[TRIGGER]
${userBlock || "(Brak wejścia użytkownika, generuj na podstawie zadania)"}
`;
    }

    /**
     * Helper to get examples for a command
     */
    _getExamples(commandType) {
        if (!EXAMPLES_DATA) return "";

        let type = "";
        // Map commands to example categories
        if (['main_quest', 'side_quest', 'side_quest_repeatable', 'group_quest', 'redemption_quest'].includes(commandType)) {
            type = 'QUEST';
        } else if (['story_hooks', 'potential_conflicts', 'secret'].includes(commandType)) {
            type = 'HOOK';
        } else if (['diagnosis'].includes(commandType)) {
            type = 'DIAGNOSIS';
        } else if (['extract_traits'].includes(commandType)) {
            type = 'TRAIT_ANALYSIS';
        }

        const examples = EXAMPLES_DATA[type];
        if (!examples || examples.length === 0) return "";

        const formattedExamples = examples.map((ex, i) => {
            return `PRZYKŁAD ${i + 1}:\nWEJŚCIE: ${JSON.stringify(ex.user_input || ex.history || ex.message)}\nWYJŚCIE: ${JSON.stringify(ex.output, null, 2)}`;
        }).join('\n\n');

        return `PRZYKŁADY (FEW-SHOT):\nOto jak powinieneś wykonywać to zadanie. Zwróć uwagę na styl, detale i format.\n\n${formattedExamples}`;
    }
}

// ----------------------------------------------------------------------
// Legacy Adapter functions to maintain compatibility with existing app.js calls
// ----------------------------------------------------------------------

/**
 * Main entry point currently used by app.js
 * @param {string} command - Identifies the intent (e.g. 'main_quest')
 * @param {object} contextData - Contains user profile, history, etc.
 */
async function buildPrompt(command, contextData) {
    const builder = new PromptBuilder();

    // 1. Inject Profile
    if (contextData.profile) {
        builder.withUserProfile(contextData.profile);
    } else if (contextData.content) {
        // Fallback if profile is passed as raw content
        builder.withUserProfile(contextData.content);
    }

    // 2. Inject Lore
    builder.withLoreContext();

    // 3. Configure Task
    builder.withTask(command);

    return builder.build();
}

/**
 * Validation function (kept for compatibility)
 */
function validatePromptInput(text) {
    if (!text || text.length < 3) return { valid: false, error: 'Za krótki tekst' };
    return { valid: true, text };
}

module.exports = {
    buildPrompt,
    validatePromptInput,
    PromptBuilder // Export class for future direct usage
};
