const { PromptBuilder } = require('../prompts/prompt-builder');
const fs = require('fs');
const path = require('path');
const ollamaService = require('./ollama-client');
const logger = require('../shared/logger');
const schemaLoader = require('../schemas/schema-loader');
const schemaValidator = require('./schema-validator');

/**
 * GCF State Machine Service
 * Manages the Guided Conversation Flow for AI interactions.
 */
class ConversationFlowService {
    constructor() {
        this.conversations = new Map();
        this.userDataPath = null;
        this.conversationsDir = null;
    }

    /**
     * Initialize service with user data path for persistence
     * @param {string} userDataPath 
     */
    init(userDataPath) {
        this.userDataPath = userDataPath;
        this.conversationsDir = path.join(userDataPath, 'conversations');
        if (!fs.existsSync(this.conversationsDir)) {
            fs.mkdirSync(this.conversationsDir, { recursive: true });
        }
    }

    _loadState(convId) {
        if (this.conversations.has(convId)) return this.conversations.get(convId);
        if (this.userDataPath) {
            const filePath = path.join(this.conversationsDir, `${convId}.json`);
            if (fs.existsSync(filePath)) {
                try {
                    const state = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                    this.conversations.set(convId, state);
                    return state;
                } catch (e) { logger.error(`Failed to load conversation for ${convId}`, e); }
            }
        }
        return this._createNewState(convId);
    }

    _createNewState(convId) {
        return {
            meta: { version: 2, updatedAt: Date.now(), conversationId: convId },
            stage: 'DIAGNOSIS', activeGoalId: null, goalStack: [],
            data: {}, facts: {}, assumptions: {},
            validation: { missingRequired: [], missingRecommended: [], invalid: [] },
            diagnosis: { candidates: [], confidence: 0 },
            history: [],
            mode: 'standard' // 'standard', 'debug', 'fast'
        };
    }

    _saveState(convId, state) {
        state.meta.updatedAt = Date.now();
        this.conversations.set(convId, state);
        if (this.userDataPath) {
            try {
                fs.writeFileSync(path.join(this.conversationsDir, `${convId}.json`), JSON.stringify(state, null, 2), 'utf-8');
            } catch (e) { logger.error(`Failed to save conversation ${convId}`, e); }
        }
    }

    /**
     * Main entry point
     */
    async processMessage(charName, userMessage, profile, modelName) {
        const convId = profile['Imie postaci'] || 'default';
        let state = this._loadState(convId);

        // 1. Update History (User)
        state.history.push({ role: 'user', content: userMessage, timestamp: Date.now() });

        // 2. Switching Logic (Interrupts - Runtime offloading)
        const switchCheck = await this._checkForSwitch(userMessage, state, modelName);
        if (switchCheck.shouldSwitch) {
            await this._handleSwitch(state, switchCheck.newGoal, switchCheck.type);
        }

        // 3. State Machine Execution
        let response = null;
        let transitions = 0;
        const MAX_TRANSITIONS = 3;

        while (!response && transitions < MAX_TRANSITIONS) {
            logger.info(`[GCF] Executing stage: ${state.stage} for ${convId} [Mode: ${state.mode}]`);

            switch (state.stage) {
                case 'DIAGNOSIS':
                    response = await this._handleDiagnosis(state, userMessage, profile, modelName);
                    break;
                case 'COLLECTION':
                    response = await this._handleCollection(state, userMessage, profile, modelName);
                    break;
                case 'CONFIRMATION':
                    response = await this._handleConfirmation(state, userMessage, profile, modelName);
                    break;
                case 'EXECUTION':
                    response = await this._handleExecution(state, profile, modelName);
                    break;
                default:
                    state.stage = 'DIAGNOSIS'; // Fallback
            }
            transitions++;
        }

        if (!response) {
            response = { success: false, error: "Stuck in state machine loop" };
        }

        // 4. Update History (AI) & Save
        if (response.message) {
            state.history.push({ role: 'assistant', content: response.message, timestamp: Date.now() });
        }
        this._saveState(convId, state);

        return response;
    }

    // --- STAGE HANDLERS ---

    async _handleDiagnosis(state, message, profile, model) {
        // Check runtime debug commands
        if (message.startsWith('/debug')) {
            state.mode = 'debug';
            return { success: true, message: "Tryb Debug Włączony.", type: 'SYSTEM' };
        }
        if (message.startsWith('/standard')) {
            state.mode = 'standard';
            return { success: true, message: "Tryb Standardowy.", type: 'SYSTEM' };
        }

        // Check heuristics first (slash commands fallback)
        if (message.startsWith('/quest')) return this._transitionToCollection(state, 'GENERATE_QUEST');

        // Build System Prompt
        const builder = new PromptBuilder();
        builder.withMode(state.mode)
            .withUserProfile(profile)
            .withTask('diagnosis', {
                message,
                history: state.history,
                profileName: profile['Imie postaci']
            });

        const systemPrompt = builder.build();

        // Call AI - Output First strictness
        // Call AI - Output First strictness
        let aiRes;
        try {
            aiRes = await ollamaService.generateText("Analizuj", {
                model,
                system: systemPrompt,
                format: 'json', // STRICT CONTRACT
                temperature: 0.1
            });
        } catch (err) {
            logger.warn('GCF Diagnosis AI Call Failed', { error: err.message });
            aiRes = { success: false };
        }

        let intent = 'UNKNOWN';
        let reply = "Co? Mów wyraźniej."; // Fallback reply

        if (aiRes.success) {
            try {
                const parsed = JSON.parse(aiRes.text);
                intent = parsed.intent || 'UNKNOWN';
                if (parsed.reply) reply = parsed.reply;
            } catch (e) {
                logger.warn('Failed to parse diagnosis JSON', e);
            }
        }

        if (intent !== 'UNKNOWN' && intent !== 'CHAT') {
            state.diagnosis.confidence = 0.9;
            return this._transitionToCollection(state, intent);
        }

        // If UNKNOWN or CHAT, return the generated reply
        return {
            success: true,
            type: 'QUESTION',
            message: reply,
            stage: 'DIAGNOSIS',
            convId: state.meta.conversationId
        };
    }

    async _handleCollection(state, message, profile, model) {
        const schema = schemaLoader.getGoalSchema(state.activeGoalId);
        if (!schema) {
            state.stage = 'DIAGNOSIS';
            return { success: false, error: "Missing schema for goal" };
        }

        // 1. Extract Data from User Input (if not empty and we are not just entering the stage)
        // Note: Logic allows extracting even if we just entered, if message is relevant.
        if (message) {
            const extractBuilder = new PromptBuilder();
            extractBuilder.withMode(state.mode)
                .withTask('extraction', {
                    schema,
                    message,
                    currentData: state.data
                });
            const extractSystemPrompt = extractBuilder.build();

            const extRes = await ollamaService.generateText("Ekstrakcja", {
                model,
                system: extractSystemPrompt,
                format: 'json',
                temperature: 0.1
            });

            if (extRes.success) {
                try {
                    const extracted = JSON.parse(extRes.text);
                    state.data = { ...state.data, ...extracted };
                    state.data = schemaValidator.normalize(schema, state.data);
                } catch (e) {
                    logger.warn('Failed to parse extraction JSON', e);
                }
            }
        }

        // 2. Validate & Check Missing
        state.validation = schemaValidator.getMissingFields(schema, state.data);

        // 3. Decide next step
        if (state.validation.required.length === 0) {
            state.stage = 'CONFIRMATION';
            return null; // Loop will immediately process Confirmation
        }

        // 4. Generate Question (Limit to max 2 items)
        const missingToAsk = state.validation.required.slice(0, 2);

        const collectionBuilder = new PromptBuilder();
        collectionBuilder.withMode(state.mode)
            .withUserProfile(profile)
            .withTask('collection', {
                schema,
                missing: missingToAsk,
                currentData: state.data
            });

        const collectionSystemPrompt = collectionBuilder.build();

        const qRes = await ollamaService.generateText("Zadaj pytanie", {
            model,
            system: collectionSystemPrompt,
            temperature: 0.7
        });

        let msg = qRes.text;
        if (state.mode === 'debug') {
            msg += `\n[DEBUG: Brakuje: ${state.validation.required.join(', ')}]`;
        }

        return {
            success: true,
            type: 'QUESTION',
            message: msg,
            stage: 'COLLECTION',
            convId: state.meta.conversationId,
            missingFields: state.validation.required
        };
    }

    async _handleConfirmation(state, message, profile, model) {
        // Runtime Logic for Confirmation
        const lower = message.toLowerCase();
        let isConfirmed = 'UNCLEAR';

        const yesWords = ['tak', 'yes', 'dobrze', 'zgoda', 'ok', 'dawaj', 'rób', 'generuj', 'jasne'];
        const noWords = ['nie', 'no', 'błąd', 'zmień', 'czekaj', 'stop', 'anuluj'];

        if (yesWords.some(w => lower.includes(w))) isConfirmed = 'YES';
        else if (noWords.some(w => lower.includes(w))) isConfirmed = 'NO';

        if (isConfirmed === 'YES') {
            state.stage = 'EXECUTION';
            return null;
        } else if (isConfirmed === 'NO') {
            state.stage = 'COLLECTION';
            // We interpret refusal as potential correction, run extraction next loop or ask what to change?
            // For simplicity, just going back to collection might trigger "What is missing?" check.
            return this._handleCollection(state, message, profile, model);
        }

        // Loop breaker check? 
        // If we just asked for confirmation and got garbage, we should re-ask.

        const summary = JSON.stringify(state.data, null, 2);
        return {
            success: true,
            type: 'QUESTION',
            message: `Nie zrozumiałem. Mam te dane:\n${summary}\n\nCzy mam generować? (Tak/Nie)`,
            stage: 'CONFIRMATION',
            convId: state.meta.conversationId
        };
    }

    async _handleExecution(state, profile, model) {
        const schema = schemaLoader.getGoalSchema(state.activeGoalId);

        const builder = new PromptBuilder();

        // Manual injection of collected data for final generation context
        // Since withTask usually sets up the schema/instruction, we append the data context.
        const dataSummary = JSON.stringify(state.data, null, 2);

        builder.withMode(state.mode)
            .withUserProfile(profile)
            .withLoreContext()
            .withTask(state.activeGoalId, {
                message: "GENERUJ" // Dummy trigger
            });

        // Append data to task instruction context
        builder.context.task += `\n\nZEBRANE DANE DO GENEROWANIA:\n${dataSummary}`;

        const systemPrompt = builder.build();

        const exRes = await ollamaService.generateText("Generuj Wynik", {
            model,
            system: systemPrompt,
            format: 'json',
            temperature: 0.7
        });

        let recipe = exRes.text;

        // Reset stage after successful generation
        state.stage = 'DIAGNOSIS';
        state.activeGoalId = null;
        state.data = {};

        return {
            success: true,
            type: 'FORCE_GENERATE',
            message: 'Generowanie zakończone.',
            recipe: recipe,
            stage: 'EXECUTION',
            convId: state.meta.conversationId
        };
    }

    // --- HELPERS ---

    async _checkForSwitch(message, state, model) {
        if (message === '/start' || message === '/new' || message.startsWith('/new ')) {
            return { shouldSwitch: true, type: 'HARD', newGoal: null };
        }
        if (message.startsWith('/cancel')) {
            return { shouldSwitch: true, type: 'HARD', newGoal: null };
        }
        // TODO: Use LLM for soft switching?
        return { shouldSwitch: false };
    }

    async _handleSwitch(state, newGoal, type) {
        if (type === 'HARD') {
            state.activeGoalId = newGoal;
            state.data = {};
            state.stage = newGoal ? 'COLLECTION' : 'DIAGNOSIS';
            state.goalStack = [];
        }
    }

    _transitionToCollection(state, goalId) {
        state.activeGoalId = goalId;
        state.stage = 'COLLECTION';
        return null; // Let loop execute Collection
    }
}

module.exports = new ConversationFlowService();
