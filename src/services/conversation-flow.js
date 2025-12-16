const vectorStore = require('./vector-store');
const ollamaService = require('./ollama-client');
const logger = require('../shared/logger');
const schemaLoader = require('../schemas/schema-loader');
const schemaValidator = require('./schema-validator');
const discoveryPrompt = require('../prompts/discovery-prompt');
const fs = require('fs');
const path = require('path');

/**
 * GCF State Machine Service
 * Manages the Guided Conversation Flow for AI interactions.
 */
class ConversationFlowService {
    constructor() {
        this.conversations = new Map();
        this.userDataPath = null;
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

    /**
     * Load state from disk or memory
     */
    _loadState(convId) {
        // 1. Try memory
        if (this.conversations.has(convId)) {
            return this.conversations.get(convId);
        }

        // 2. Try disk
        if (this.userDataPath) {
            const filePath = path.join(this.conversationsDir, `${convId}.json`);
            if (fs.existsSync(filePath)) {
                try {
                    const raw = fs.readFileSync(filePath, 'utf-8');
                    const state = JSON.parse(raw);
                    this.conversations.set(convId, state);
                    return state;
                } catch (e) {
                    logger.error(`Failed to load conversation state for ${convId}`, e);
                }
            }
        }

        // 3. New State
        return this._createNewState(convId);
    }

    _createNewState(convId) {
        return {
            meta: {
                version: 1,
                updatedAt: Date.now(),
                conversationId: convId
            },
            stage: 'DIAGNOSIS', // Initial stage
            activeGoalId: null,
            goalStack: [],

            data: {},          // Raw inputs
            facts: {},         // Validated data
            assumptions: {},   // Defaults

            validation: {
                missingRequired: [],
                missingRecommended: [],
                invalid: []
            },

            diagnosis: {
                candidates: [],
                confidence: 0
            },

            history: []
        };
    }

    _saveState(convId, state) {
        state.meta.updatedAt = Date.now();
        this.conversations.set(convId, state);

        if (this.userDataPath) {
            const filePath = path.join(this.conversationsDir, `${convId}.json`);
            try {
                fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8');
            } catch (e) {
                logger.error(`Failed to save conversation state for ${convId}`, e);
            }
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

        // 2. Switching Logic (Interrupts)
        // Check if user wants to switch context explicitly or implicitly
        const switchCheck = await this._checkForSwitch(userMessage, state, modelName);
        if (switchCheck.shouldSwitch) {
            await this._handleSwitch(state, switchCheck.newGoal, switchCheck.type);
        }

        // 3. State Machine Execution
        let response = null;
        let transitions = 0;
        const MAX_TRANSITIONS = 3; // Prevent infinite loops

        while (!response && transitions < MAX_TRANSITIONS) {
            logger.info(`[GCF] Executing stage: ${state.stage} for ${convId}`);

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
        // Use Discovery Prompt to classify intent
        // Check heuristics first (slash commands)
        if (message.startsWith('/quest')) {
            return this._transitionToCollection(state, 'GENERATE_QUEST');
        }

        // ONE-SHOT DIAGNOSIS & CHIT-CHAT
        // We ask the LLM to classify. If UNKNOWN, it must provide a reply in the same JSON.
        // This avoids a second round-trip.

        const diagnosisPrompt = `Jesteś ${profile['Imie postaci'] || 'Mistrzem Gry'} (Gothic 1/2).
Twoim zadaniem jest klasyfikacja intencji użytkownika lub odpowiedź na luźną rozmowę.

HISTORIA:
${state.history.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n')}
OSTATNIA WIADOMOŚĆ: "${message}"

DOSTĘPNE KOMENDY (INTENCJE):
- GENERATE_QUEST (gdy użytkownik chce zadanie/przygodę)
- ANALYZE_RELATIONS (gdy pyta o relacje/kogo lubi)
- UNKNOWN (gdy to luźna rozmowa, powitanie, hejt lub brednie)

WYMAGANY FORMAT JSON:
{
  "intent": "GENERATE_QUEST" | "ANALYZE_RELATIONS" | "UNKNOWN",
  "reply": "Treść odpowiedzi jeśli intent=UNKNOWN (w klimacie postaci)"
}`;

        // Call AI
        const aiRes = await ollamaService.generateText(diagnosisPrompt, { model, format: 'json', temperature: 0.1 });
        let intent = 'UNKNOWN';
        let reply = "Co? Mów wyraźniej.";

        if (aiRes.success) {
            try {
                const parsed = JSON.parse(aiRes.text);
                intent = parsed.intent || 'UNKNOWN';
                reply = parsed.reply || reply;
            } catch (e) {
                logger.warn('Failed to parse diagnosis JSON', e);
            }
        }

        if (intent !== 'UNKNOWN') {
            state.diagnosis.confidence = 0.9;
            return this._transitionToCollection(state, intent);
        }

        // If UNKNOWN, return the generated reply directly (Fast Path)
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
            // Fallback if schema lost
            state.stage = 'DIAGNOSIS';
            return { success: false, error: "Missing schema for goal" };
        }

        // 1. Extract Data from latest message
        // We assume the AI already asked a question, and 'message' is the user's answer
        // We perform extraction for ALL fields in the schema to fill gaps
        const extractionPrompt = discoveryPrompt.buildExtractionPrompt({
            schema,
            message,
            currentData: state.data
        });

        const extRes = await ollamaService.generateText(extractionPrompt, { model, format: 'json', temperature: 0.1 });
        if (extRes.success) {
            try {
                const extracted = JSON.parse(extRes.text);
                // Merge data
                state.data = { ...state.data, ...extracted };
                // Normalize
                state.data = schemaValidator.normalize(schema, state.data);
            } catch (e) {
                logger.warn('Failed to parse extraction JSON', e);
            }
        }

        // 2. Validate
        state.validation = schemaValidator.getMissingFields(schema, state.data);
        const { valid, errors } = schemaValidator.validate(schema, state.data);

        // 3. Decide next step
        if (state.validation.required.length === 0) {
            // All required present -> Move to Confirmation
            state.stage = 'CONFIRMATION';
            // Recursively call process loop to immediately trigger confirmation prompt?
            // Or return null to let the loop in processMessage handle it?
            // We'll return null to let the loop verify the new stage.
            return null;
        }

        // 4. Generate Question for missing fields
        const questionPrompt = discoveryPrompt.buildCollectionQuestionPrompt({
            schema,
            missing: state.validation.required,
            currentData: state.data
        });

        const qRes = await ollamaService.generateText(questionPrompt, { model });

        return {
            success: true,
            type: 'QUESTION',
            message: qRes.text,
            stage: 'COLLECTION',
            convId: state.meta.conversationId,
            missingFields: state.validation.required
        };
    }

    async _handleConfirmation(state, message, profile, model) {
        // Did user confirm?
        const isConfirmed = discoveryPrompt.isConfirmation(message);

        if (isConfirmed === 'YES') {
            state.stage = 'EXECUTION';
            return null; // Loop will pick it up
        } else if (isConfirmed === 'NO') {
            // User corrected something or denied
            // Go back to matching/collection
            // Simplest is to treat message as new data input for Collection
            state.stage = 'COLLECTION';
            return this._handleCollection(state, message, profile, model);
        }

        // If we just arrived here (from implicit transition), present the summary
        const summary = JSON.stringify(state.data, null, 2); // Prompt should make this pretty
        const prompt = `Mam następujące dane:\n${summary}\n\nCzy to się zgadza? (Facts vs Assumptions)`;
        // In real impl, use discoveryPrompt.buildConfirmationPrompt...

        return {
            success: true,
            type: 'QUESTION', // UI Adapter will handle prefixes
            message: `Zebrałem następujące informacje:\n${summary}\n\nCzy mogę generować?`,
            stage: 'CONFIRMATION',
            convId: state.meta.conversationId
        };
    }

    async _handleExecution(state, profile, model) {
        // Final Generation
        // Here we format the recipe and send Force Generate
        const schema = schemaLoader.getGoalSchema(state.activeGoalId);

        // Separate Facts vs Assumptions for final recipe
        const recipe = {
            goal: state.activeGoalId,
            profile: profile['Imie postaci'],
            params: state.data
        };

        // Reset stage after successful generation setup
        state.stage = 'DIAGNOSIS';
        state.activeGoalId = null;
        state.data = {};

        return {
            success: true,
            type: 'FORCE_GENERATE',
            message: 'Generuję wynik...',
            recipe: JSON.stringify(recipe, null, 2),
            stage: 'EXECUTION',
            convId: state.meta.conversationId
        };
    }

    // --- HELPERS ---

    async _checkForSwitch(message, state, model) {
        // Heuristic: explicit commands
        if (message.startsWith('/new') || message.startsWith('/cancel')) {
            return { shouldSwitch: true, type: 'HARD', newGoal: null };
        }
        // TODO: Use LLM to detect topic change soft switches
        return { shouldSwitch: false };
    }

    async _handleSwitch(state, newGoal, type) {
        if (type === 'HARD') {
            state.activeGoalId = newGoal;
            state.data = {};
            state.stage = newGoal ? 'COLLECTION' : 'DIAGNOSIS';
            state.goalStack = [];
        }
        // Soft switch logic...
    }

    _transitionToCollection(state, goalId) {
        state.activeGoalId = goalId;
        state.stage = 'COLLECTION';
        // Initialize data?
        return null; // Let loop execute Collection logic
    }
}

module.exports = new ConversationFlowService();
