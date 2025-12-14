const vectorStore = require('./vector-store');
const ollamaService = require('./ollama-client');
const logger = require('../shared/logger');

class ConversationFlowService {
    constructor() {
        this.conversations = new Map(); // In-memory storage: convId -> { history: [], stage: 'exploration' }
        this.MAX_HISTORY = 10;
    }

    /**
     * Main entry point for processing a message in the conversation flow.
     * @param {string} charName - Character name
     * @param {string} userMessage - User input
     * @param {object} profile - Full character profile
     * @returns {Promise<object>} - Result for frontend
     */
    async processMessage(charName, userMessage, profile, modelName) {
        const convId = profile['Imie postaci'] || 'default'; // Simple ID strategy for now
        let convState = this.conversations.get(convId);

        if (!convState) {
            convState = {
                history: [],
                stage: 'exploration',
                questionsAsked: 0
            };
            this.conversations.set(convId, convState);
        }

        // 1. Check for exit/force commands
        if (this.isForceGenerate(userMessage)) {
            return this.finalizeConversation(convId, userMessage, profile);
        }

        // 2. RAG Search - Find context relevant to user message
        const contextDocs = await vectorStore.search(userMessage, 3);
        const contextText = contextDocs.map(d => d.text).join('\n---\n');

        // 3. Build System Prompt for the "Interviewer"
        const systemPrompt = `Jesteś doświadczonym Mistrzem Gry (Game Master) w systemie Gothic.
Twoim zadaniem jest dopytać użytkownika o szczegóły, aby stworzyć idealny quest lub element fabularny dla postaci: ${charName}.
Gildia postaci: ${profile.Gildia || 'Nieznana'}.

KONTEKST Z BAZY WIEDZY (RAG):
${contextText}

HISTORIA ROZMOWY:
${convState.history.map(m => `${m.role}: ${m.content}`).join('\n')}

ZASADY:
1. Zadaj JEDNO konkretne pytanie doprecyzowujące, bazując na kontekście i wypowiedzi użytkownika.
2. Jeśli użytkownik wspomniał o frakcji/miejscu, wykorzystaj wiedzę z RAG, aby pytanie było klimatyczne.
3. Nie generuj jeszcze całego questa, tylko dopytuj.
4. Bądź krótki i zwięzły (max 2 zdania).
5. Jeśli użytkownik napisał już wystarczająco dużo szczegółów, napisz specjalną komendę: [[GENERATE]]`;

        // 4. Generate AI Response
        const responseCallback = await ollamaService.generateText(userMessage, {
            system: systemPrompt,
            model: modelName || 'gemma:2b', // Use passed model or fallback
            temperature: 0.7
        });

        if (!responseCallback.success) {
            return { success: false, error: responseCallback.error };
        }

        let aiText = responseCallback.text.trim();

        // 5. Check if AI decided to generate
        if (aiText.includes('[[GENERATE]]')) {
            return this.finalizeConversation(convId, userMessage, profile);
        }

        // 6. Update History
        convState.history.push({ role: 'user', content: userMessage });
        convState.history.push({ role: 'assistant', content: aiText });
        convState.questionsAsked++;

        // 7. Return Question to User
        return {
            success: true,
            type: 'QUESTION',
            message: aiText,
            stage: 'exploration',
            convId: convId,
            questionsAsked: convState.questionsAsked
        };
    }

    isForceGenerate(msg) {
        const keywords = ['generuj', 'wystarczy', 'pomiń', 'skip', 'koniec', 'zrób to', 'ok'];
        return keywords.some(k => msg.toLowerCase().includes(k));
    }

    finalizeConversation(convId, lastUserMessage, profile) {
        const convState = this.conversations.get(convId);

        // Compile the full "recipe" or context for the final generation
        let recipe = `Postać: ${profile['Imie postaci']} (${profile.Gildia})\n`;
        if (convState && convState.history.length > 0) {
            recipe += `\nUstalenia z rozmowy:\n${convState.history.map(m => `- ${m.role === 'user' ? 'Gracz' : 'MG'}: ${m.content}`).join('\n')}`;
        }
        recipe += `\nOstatnie życzenie: ${lastUserMessage}`;

        // Reset state
        this.conversations.delete(convId);

        return {
            success: true,
            type: 'FORCE_GENERATE',
            message: 'Zrozumiałem. Generuję treść...',
            recipe: recipe,
            stage: 'generation',
            convId: convId
        };
    }
}

module.exports = new ConversationFlowService();
