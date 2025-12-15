const { GOAL_SCHEMAS } = require('../schemas/schema-loader'); // Need to ensure path is correct
// If schema-loader is not CommonJS, we might need dynamic import or refactor.
// For now assuming existing CommonJS structure of backend.

class FlowManager {
    constructor() {
        this.stages = {
            IDLE: 'IDLE',
            DIAGNOSIS: 'DIAGNOSIS',
            COLLECTION: 'COLLECTION',
            CONFIRMATION: 'CONFIRMATION',
            EXECUTION: 'EXECUTION'
        };
    }

    /**
     * Analyze message to detect intent (Silent Operation)
     * In integrated mode, this is a heuristic or fast LLM check.
     * @param {string} message - User message
     * @returns {string|null} Detected intent or null
     */
    analyzeIntent(message) {
        const lower = message.toLowerCase();

        // Trigger words (Heuristic MVP)
        // In full version this could be a fast LLM classification
        if (lower.includes('quest') || lower.includes('zadanie') || lower.includes('przygoda')) {
            return 'GENERATE_QUEST';
        }
        if (lower.includes('relacj') || lower.includes('analiza') || lower.includes('kogo lubi')) {
            return 'ANALYZE_RELATIONS';
        }
        if (lower.includes('/reset') || lower.includes('nowa rozmowa')) {
            return 'RESET';
        }

        return null; // UNKNOWN / CHIT-CHAT
    }

    /**
     * Update Flow State based on intent and message
     * @param {Object} flowState - Current session flow state
     * @param {string} message - User message 
     * @param {string} intent - Detected intent
     * @returns {Object} Updated flow state
     */
    updateState(flowState, message, intent) {
        let state = flowState || { stage: 'IDLE', data: {}, missing: [] };

        // 1. Handle Reset
        if (intent === 'RESET') {
            return { stage: 'IDLE', data: {}, missing: [], intent: null };
        }

        // 2. State Machine Transitions
        switch (state.stage) {
            case 'IDLE':
                if (intent && intent !== 'RESET') {
                    // Start Flow
                    state.stage = 'COLLECTION';
                    state.intent = intent;
                    state.data = {};
                    state.missing = this._calculateMissing(intent, {});
                }
                break;

            case 'COLLECTION':
                // Check if we switched context (Hard Switch MVP)
                if (intent && intent !== state.intent) {
                    // Simple overwrite for now
                    state.intent = intent;
                    state.data = {};
                    state.missing = this._calculateMissing(intent, {});
                    return state;
                }

                // If no intent change, we assume user is answering questions.
                // NOTE: Extracting data happens in the LLM System Prompt instructions!
                // But we need to track progress?
                // In "Integrated Mode", the LLM is the one managing the conversation.
                // We just need to guide it.
                // So here we might not strictly "Extract" via code unless we use a JSON model.
                // COMPROMISE: We let the LLM handle the extraction in memory, 
                // but we update the System Prompt to tell it what is missing.

                // For MVP Integrated, we rely on the LLM to know what it has collected history-wise.
                // But to be "Guided", we should try to update `missing` if possible.
                // Keep it simple: Assume LLM tracks it. Use Flow State mostly for STAGE control.

                // If user says "Confirm" or we detect completeness?
                // This is hard without extraction.
                // Let's stick to STAGE control via Intent.

                // If message looks like "Zrób to" or "Gotowe", transition to EXECUTION?
                if (message.toLowerCase().includes('zrób to') || message.toLowerCase().includes('generuj')) {
                    state.stage = 'EXECUTION';
                }
                break;

            case 'EXECUTION':
                // One-shot execution. Reset after.
                state.stage = 'IDLE';
                state.intent = null;
                break;
        }

        return state;
    }

    _calculateMissing(intent, currentData) {
        // Placeholder for schema checking
        // In full integrated mode, we'd need to run a fast extraction to know this.
        // For now, we trust the LLM prompt to ask for required fields.
        return [];
    }

    /**
     * Build Dynamic System Prompt based on State
     * @param {Object} state - Current flow state
     * @param {Object} profile - Character profile
     * @returns {string} System prompt injection
     */
    /**
     * Build Dynamic System Prompt based on State (Director Notes)
     * @param {Object} state - Current flow state
     * @param {Object} profile - Character profile
     * @returns {string} System prompt injection
     */
    buildSystemPrompt(state, profile) {
        // Base Persona is already loaded by prompt-builder.
        // Here we inject "SCENARIO DIRECTOR NOTES" (Hidden instructions)

        const directorPrefix = `
=== NOTATKI REŻYSERSKIE (TYLKO DLA CIEBIE) ===
Jesteś w trakcie odgrywania roli (Roleplay). Nie wychodź z postaci.
`;

        if (state.stage === 'COLLECTION') {
            return `${directorPrefix}
[CEL SCENY: ${state.intent}]
Gracz chce, abyś coś dla niego przygotował (Quest/Analizę), ale musisz to z niego "wyciągnąć" w naturalnej rozmowie.
NIE PLANUJ wszystkiego od razu. Prowadź dialog.
Twoim zadaniem jest dowiedzieć się co gracz ma na myśli, ale rób to subtelnie, w stylu swojej postci.
Jeśli gracz pisze zdawkowo ("Chcę questa"), wyśmiej go lub dopytaj o szczegóły ("Dla kogo? Za ile?").
Nie zachowuj się jak bot przyjmujący zamówienie. Zachowuj się jak ${profile['Imie postaci']}, który musi zostać przekonany.
Gdy uznasz, że wiesz już wystarczająco dużo, zapytaj wprost czy przejść do konkretów.`;
        }

        if (state.stage === 'EXECUTION') {
            return `${directorPrefix}
[FISTUŁA SCENY: FINAŁ]
Masz już wszystkie dane. Gracz czeka na wynik.
Teraz - i tylko teraz - możesz wygenerować pełny, sformatowany opis (Quest/Analizę).
Zrób to profesjonalnie (struktura Markdown), ale opatrz to komentarzem w stylu postaci.`;
        }

        return ""; // IDLE - Default Persona handles it.
    }
}

module.exports = new FlowManager();
