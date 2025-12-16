/**
 * @module flow-manager
 * @description Logic-heavy manager for Guided Conversation Flow (GCF).
 * Offloads deterministic operations from AI to Code (Rule-based state transitions).
 */

const { PromptBuilder } = require('../prompts/prompt-builder');
const logger = require('../shared/logger');

class FlowManager {
    /**
     * Analyzes user intent using deterministic rules (Slash commands, keywords).
     * This runs BEFORE the AI diagnosis step to catch explicit commands.
     * @param {string} prompt 
     * @returns {string} Intent (GENERATE_QUEST, DEBUG_MODE, CHAT, etc.)
     */
    analyzeIntent(prompt) {
        if (!prompt) return 'UNKNOWN';
        const p = prompt.trim();

        // 1. Explicit Slash Commands
        if (p.startsWith('/quest')) return 'GENERATE_QUEST';
        if (p.startsWith('/side')) return 'GENERATE_SIDE_QUEST';
        if (p.startsWith('/analyze')) return 'ANALYZE_RELATION';
        if (p.startsWith('/stats')) return 'EXTRACT_TRAITS';
        if (p.startsWith('/hooks')) return 'GENERATE_HOOKS';

        if (p.startsWith('/debug')) return 'DEBUG_MODE';
        if (p.startsWith('/standard')) return 'STANDARD_MODE';

        if (p.startsWith('/reset') || p.startsWith('/new')) return 'RESET_FLOW';

        // 2. Strong Keywords (Optional, proceed with caution to avoid false positives)
        const lower = p.toLowerCase();
        if (lower.includes('nowy quest') || lower.includes('stwórz zadanie')) return 'GENERATE_QUEST';

        // 3. Default fallback
        return 'CHAT';
    }

    /**
     * Updates the flow state based on the analyzed intent.
     * @param {object} currentState 
     * @param {string} prompt 
     * @param {string} intent 
     * @returns {object} New State
     */
    updateState(currentState, prompt, intent) {
        const newState = { ...currentState };

        // Ensure structure
        if (!newState.stage) newState.stage = 'IDLE';
        if (!newState.data) newState.data = {};

        // Helper to reset into a specific goal
        const startTarget = (goalId) => {
            newState.stage = 'COLLECTION';
            newState.activeGoalId = goalId;
            newState.data = {};
            newState.goalStack = []; // Clear stack
            newState.validation = { missingRequired: [] };
        };

        switch (intent) {
            case 'GENERATE_QUEST':
                startTarget('main_quest'); // Default to main or let user specify?
                break;
            case 'GENERATE_SIDE_QUEST':
                startTarget('side_quest');
                break;
            case 'EXTRACT_TRAITS':
                startTarget('extract_traits');
                break;
            case 'ANALYZE_RELATION':
                startTarget('analyze_relations');
                break;
            case 'GENERATE_HOOKS':
                startTarget('story_hooks');
                break;

            case 'RESET_FLOW':
                newState.stage = 'IDLE';
                newState.activeGoalId = null;
                newState.data = {};
                break;

            case 'DEBUG_MODE':
                newState.mode = 'debug';
                break;
            case 'STANDARD_MODE':
                newState.mode = 'standard';
                break;

            case 'CHAT':
            default:
                // If we are already in a flow (COLLECTION/CONFIRMATION), we stay there.
                // The AI in the loop (ConversationFlowService) will handle extraction.
                // We only force transition if we are in IDLE.
                if (newState.stage === 'IDLE') {
                    newState.stage = 'DIAGNOSIS'; // Let AI diagnose implicit intent
                }
                break;
        }

        return newState;
    }

    /**
     * Builds the System Prompt dynamically based on the current State.
     * This overrides the default system prompt when a specific flow is active.
     */
    buildSystemPrompt(state, profile) {
        const builder = new PromptBuilder();

        // Inject Profile
        if (profile) builder.withUserProfile(profile);

        // Inject Mode
        if (state.mode) builder.withMode(state.mode);

        // Inject Task based on Stage
        switch (state.stage) {
            case 'COLLECTION':
                // We are collecting data for activeGoalId
                builder.withTask('collection', {
                    intent: state.activeGoalId,
                    missing: state.validation?.missingRequired || [],
                    currentData: state.data
                    // PromptBuilder.withTask('collection') uses validatable schema internally if we pass schema
                    // But here we rely on the generic 'Ask for missing' logic
                });
                break;

            case 'CONFIRMATION':
                builder.withTask('custom');
                builder.context.task = `ZADANIE: POTWIERDZENIE (CONFIRMATION).
Mamy komplet danych do celu: ${state.activeGoalId}.
Zebrane dane: ${JSON.stringify(state.data)}.

INSTRUKCJA:
Przedstaw krótko zebrane dane graczowi.
Zapytaj czy generować wynik.
Oczekuj na potwierdzenie (Tak/Nie).`;
                break;

            case 'EXECUTION':
                builder.withTask(state.activeGoalId || 'custom');
                // The generation logic usually happens in handleExecution, but if we are here via PromptBuilder,
                // we prepare the generation instruction.
                break;

            case 'DIAGNOSIS':
                builder.withTask('diagnosis', {
                    history: state.history || []
                });
                break;

            default:
                builder.withTask('custom'); // Fallback
                break;
        }

        return builder.build();
    }
}

module.exports = new FlowManager();
