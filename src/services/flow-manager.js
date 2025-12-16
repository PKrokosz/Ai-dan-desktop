const { GOAL_SCHEMAS, getSchemaForCommand } = require('../schemas/schema-loader');
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

        // 1. One-Shot Slash Commands (Fast Path)
        if (lower.includes('/cechy')) return 'EXTRACT_TRAITS';
        if (lower.includes('/sekret')) return 'GENERATE_SECRET';
        if (lower.includes('/hook')) return 'STORY_HOOKS';
        if (lower.includes('/relacje') || lower.includes('/analiza')) return 'ANALYZE_RELATIONS';
        if (lower.includes('/quest') || lower.includes('/q ')) return 'GENERATE_QUEST';

        // 2. Trigger words (Heuristic)
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
                    const isOneShot = ['EXTRACT_TRAITS', 'GENERATE_SECRET', 'STORY_HOOKS'].includes(intent);
                    state.stage = isOneShot ? 'EXECUTION' : 'COLLECTION'; // Slash commands jump to EXECUTION
                    state.intent = intent;
                    state.data = {};
                    state.missing = [];
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

    buildSystemPrompt(state, profile) {
        const directorPrefix = `
=== SYSTEM MODE: DATA COLLECTION ===
`;

        if (state.stage === 'COLLECTION') {
            return `${directorPrefix}
[CURRENT GOAL: ${state.intent}]
User wants specific content. You need to gather missing details.
1. ASK QUESTIONS specific to "${state.intent}".
2. BE CONCISE. No roleplay.
3. If you have enough info, say "READY".
`;
        }

        if (state.stage === 'EXECUTION') {
            // == SYSTEM OVERRIDE: ACCOUNTANT MODE ==
            // We force the model to break character and become a JSON generator.

            let schemaJson = "{}";
            let typeInstruction = "Generic JSON";

            // Map Intent to Schema Type
            if (state.intent === 'GENERATE_QUEST') {
                const schema = getSchemaForCommand('main_quest'); // Use generic Quest schema
                schemaJson = JSON.stringify(schema, null, 2);
                typeInstruction = "Quest Data";
            } else if (state.intent === 'ANALYZE_RELATIONS') {
                const schema = getSchemaForCommand('analyze_relations');
                schemaJson = JSON.stringify(schema, null, 2);
                typeInstruction = "Relationship Analysis";
            } else if (state.intent === 'EXTRACT_TRAITS') {
                const schema = getSchemaForCommand('extract_traits');
                schemaJson = JSON.stringify(schema, null, 2);
                typeInstruction = "Traits Extraction";
            } else if (state.intent === 'GENERATE_SECRET') {
                const schema = getSchemaForCommand('secret');
                schemaJson = JSON.stringify(schema, null, 2);
                typeInstruction = "Secret Generation";
            } else if (state.intent === 'STORY_HOOKS') {
                const schema = getSchemaForCommand('story_hooks');
                schemaJson = JSON.stringify(schema, null, 2);
                typeInstruction = "Story Hooks";
            }

            return `
=== SYSTEM OVERRIDE: DATA GENERATION MODE ===
Your task is to generate strict VALID JSON based on the user's request.

[RULES]
1. OUTPUT MUST BE RAW JSON ONLY. No markdown blocks, no fluff text.
2. FIELDS MUST BE TECHNICAL. Do not use metaphors. Use precise language.
3. FOLLOW THE SCHEMA EXACTLY.

[SCHEMA: ${typeInstruction}]
${schemaJson}

[INPUT DATA]
User Intent: ${state.intent}
Context: ${JSON.stringify(state.data || {})}
`;
        }

        return ""; // IDLE - Default Persona handles it.
    }
}

module.exports = new FlowManager();
