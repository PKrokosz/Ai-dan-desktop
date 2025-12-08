/**
 * @module ConversationFlowService
 * @description Zarządza stanem rozmowy diagnostycznej z użytkownikiem.
 * 
 * STANY: IDLE → ANALYZE → DISCOVERY → CONFIRM → VALIDATE → GENERATE
 * 
 * Atomic persistence: temp file → rename
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../shared/logger');

// Stany flow
const STATES = {
    IDLE: 'IDLE',
    ANALYZE: 'ANALYZE',
    DISCOVERY: 'DISCOVERY',
    CONFIRM: 'CONFIRM',
    VALIDATE: 'VALIDATE',
    GENERATE: 'GENERATE',
    FORCE_GEN: 'FORCE_GEN'
};

// Intencje użytkownika
const INTENTS = {
    GOAL_PROVIDED: 'GOAL_PROVIDED',
    NEEDS_GOAL: 'NEEDS_GOAL',
    ASK_CAPABILITIES: 'ASK_CAPABILITIES',
    PROBLEM: 'PROBLEM',
    UNKNOWN: 'UNKNOWN'
};

// Limity
const MAX_QUESTIONS = 5;
const CLASSIFICATION_TIMEOUT_MS = 3000;
const ESCAPE_WORDS = ['pomiń', 'wystarczy', 'generuj', 'dawaj', 'ok', 'lecimy'];

// Modele
const CLASSIFICATION_MODEL = 'qwen2.5:7b';
const DISCOVERY_MODEL = 'qwen2.5:7b';

class ConversationFlowService {
    constructor() {
        this.conversationsDir = path.join(process.cwd(), 'data', 'conversations');
        this.conversations = new Map();
        this.ensureDir();
    }

    async ensureDir() {
        try { await fs.mkdir(this.conversationsDir, { recursive: true }); } catch (e) { }
    }

    generateId() {
        return `conv-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    }

    startConversation(profileName) {
        const convId = this.generateId();
        const state = {
            id: convId,
            profileName,
            stage: STATES.IDLE,
            createdAt: new Date().toISOString(),
            lastModified: Date.now(),
            version: 1,
            questionsAsked: 0,
            messages: [],
            recipe: { goal: null, context_slots: {}, constraints: {}, currentTopic: null },
            referenced_profiles: []
        };
        this.conversations.set(convId, state);
        this.saveArtifact(convId);
        logger.info('Conversation started', { convId, profileName });
        return convId;
    }

    getOrCreateConversation(profileName) {
        for (const [id, state] of this.conversations) {
            if (state.profileName === profileName && state.stage !== STATES.IDLE) return id;
        }
        return this.startConversation(profileName);
    }

    getState(convId) { return this.conversations.get(convId); }

    isActive(convId) {
        const s = this.conversations.get(convId);
        return s ? s.stage !== STATES.IDLE && s.stage !== STATES.GENERATE : false;
    }

    addMessage(convId, role, content, metadata = {}) {
        const s = this.conversations.get(convId);
        if (!s) return;
        s.messages.push({ role, content, timestamp: Date.now(), ...metadata });
        s.lastModified = Date.now();
        s.version++;
        this.saveArtifact(convId);
    }

    checkEscapeIntent(message) {
        const lower = message.toLowerCase();
        return ESCAPE_WORDS.some(w => lower.includes(w));
    }

    checkQuestionLimit(convId) {
        const s = this.conversations.get(convId);
        return s ? s.questionsAsked >= MAX_QUESTIONS : false;
    }

    detectCircular(convId) {
        const s = this.conversations.get(convId);
        if (!s || s.messages.length < 4) return false;
        const userMsgs = s.messages.filter(m => m.role === 'user');
        if (userMsgs.length < 3) return false;
        const last = userMsgs[userMsgs.length - 1].content.toLowerCase();
        const prev = userMsgs[userMsgs.length - 2].content.toLowerCase();
        return last === prev;
    }

    updateRecipe(convId, updates) {
        const s = this.conversations.get(convId);
        if (!s) return;
        Object.assign(s.recipe, updates);
        s.lastModified = Date.now();
        s.version++;
        this.saveArtifact(convId);
    }

    transitionTo(convId, newStage) {
        const s = this.conversations.get(convId);
        if (!s) return;
        const old = s.stage;
        s.stage = newStage;
        s.lastModified = Date.now();
        s.version++;
        logger.info('State transition', { convId, from: old, to: newStage });
        this.saveArtifact(convId);
    }

    incrementQuestions(convId) {
        const s = this.conversations.get(convId);
        if (!s) return;
        s.questionsAsked++;
        s.lastModified = Date.now();
        s.version++;
        this.saveArtifact(convId);
    }

    reset(convId) {
        const s = this.conversations.get(convId);
        if (!s) return;
        s.stage = STATES.IDLE;
        s.questionsAsked = 0;
        s.recipe = { goal: null, context_slots: {}, constraints: {}, currentTopic: null };
        s.lastModified = Date.now();
        s.version++;
        logger.info('Conversation reset', { convId });
        this.saveArtifact(convId);
    }

    getRecipe(convId) { return this.conversations.get(convId)?.recipe || null; }

    // PERSISTENCE
    async saveArtifact(convId) {
        const s = this.conversations.get(convId);
        if (!s) return;
        const tmp = path.join(this.conversationsDir, `${convId}.tmp`);
        const fin = path.join(this.conversationsDir, `${convId}.json`);
        try {
            await fs.writeFile(tmp, JSON.stringify(s, null, 2), 'utf8');
            await fs.rename(tmp, fin);
        } catch (e) {
            logger.error('Save failed', { convId, error: e.message });
            try { await fs.unlink(tmp); } catch (_) { }
        }
    }

    async loadConversation(convId) {
        try {
            const data = await fs.readFile(path.join(this.conversationsDir, `${convId}.json`), 'utf8');
            const state = JSON.parse(data);
            this.conversations.set(convId, state);
            return state;
        } catch (e) { return null; }
    }

    async listConversations() {
        try {
            const files = await fs.readdir(this.conversationsDir);
            return files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
        } catch (e) { return []; }
    }
}

// ==========================================
// AI INTEGRATION
// ==========================================

const discoveryPrompts = require('../prompts/discovery-prompt');
const recipeValidator = require('./recipe-validator');

async function classifyIntent(message, ollamaService) {
    const prompt = discoveryPrompts.buildClassificationPrompt(message);
    try {
        const result = await Promise.race([
            ollamaService.generateText(prompt, { model: CLASSIFICATION_MODEL, temperature: 0.1, num_predict: 20 }),
            new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), CLASSIFICATION_TIMEOUT_MS))
        ]);
        const intent = result.text?.trim().toUpperCase() || 'UNKNOWN';
        return Object.values(INTENTS).includes(intent)
            ? { intent, confidence: 0.8 }
            : { intent: 'NEEDS_GOAL', confidence: 0.5, fallback: true };
    } catch (e) {
        logger.warn('Classification fallback', { error: e.message });
        return { intent: 'NEEDS_GOAL', confidence: 0.3, fallback: true };
    }
}

async function generateDiscoveryResponse(convId, ollamaService, profileData) {
    const service = module.exports;
    const s = service.getState(convId);
    if (!s) return null;

    const history = s.messages.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n');
    const prompt = discoveryPrompts.buildDiscoveryPrompt({
        profileName: profileData?.['Imie postaci'] || s.profileName,
        profileGuild: profileData?.['Gildia'] || 'Nieznana',
        conversationHistory: history,
        recipe: s.recipe,
        questionsCount: s.questionsAsked,
        instruction: discoveryPrompts.getInstruction(s.stage)
    });

    try {
        const result = await ollamaService.generateText(prompt, { model: DISCOVERY_MODEL, temperature: 0.7, num_predict: 200 });
        return result.text?.trim() || 'Przepraszam, coś poszło nie tak.';
    } catch (e) {
        logger.error('Discovery failed', { convId, error: e.message });
        return 'Przepraszam, wystąpił błąd. Czego potrzebujesz?';
    }
}

async function processUserMessage(convId, message, ollamaService, profileData) {
    const service = module.exports;
    const s = service.getState(convId);
    if (!s) return { error: 'No conversation' };

    if (service.checkEscapeIntent(message)) {
        service.transitionTo(convId, STATES.FORCE_GEN);
        return { type: 'FORCE_GENERATE', message: 'Ok, generuję.', recipe: s.recipe };
    }
    if (service.checkQuestionLimit(convId)) {
        service.transitionTo(convId, STATES.FORCE_GEN);
        return { type: 'FORCE_GENERATE', message: 'Limit pytań. Generuję.', recipe: s.recipe };
    }
    if (service.detectCircular(convId)) {
        service.transitionTo(convId, STATES.FORCE_GEN);
        return { type: 'FORCE_GENERATE', message: 'Kręcimy się w kółko. Generuję.', recipe: s.recipe };
    }

    service.addMessage(convId, 'user', message);

    if (s.stage === STATES.IDLE || s.stage === STATES.ANALYZE) {
        service.transitionTo(convId, STATES.ANALYZE);
        const { intent, confidence } = await classifyIntent(message, ollamaService);
        service.updateRecipe(convId, { goal: { type: intent, confidence }, currentTopic: message.substring(0, 50) });

        if (intent === 'GOAL_PROVIDED' && confidence >= 0.7) {
            service.transitionTo(convId, STATES.CONFIRM);
        } else if (intent === 'ASK_CAPABILITIES') {
            const help = discoveryPrompts.getInstruction('ASK_CAPABILITIES');
            service.addMessage(convId, 'ai', help);
            return { type: 'HELP', message: help };
        } else {
            service.transitionTo(convId, STATES.DISCOVERY);
        }
    }

    service.incrementQuestions(convId);
    const response = await generateDiscoveryResponse(convId, ollamaService, profileData);
    service.addMessage(convId, 'ai', response);

    if (s.questionsAsked >= 2 && recipeValidator.isRecipeMinimallyComplete(s.recipe)) {
        service.transitionTo(convId, STATES.CONFIRM);
    }

    return { type: 'DISCOVERY', message: response, questionsAsked: s.questionsAsked, stage: s.stage };
}

// Exports
const instance = new ConversationFlowService();
instance.STATES = STATES;
instance.INTENTS = INTENTS;
instance.MAX_QUESTIONS = MAX_QUESTIONS;
instance.classifyIntent = classifyIntent;
instance.generateDiscoveryResponse = generateDiscoveryResponse;
instance.processUserMessage = processUserMessage;

module.exports = instance;
