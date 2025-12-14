/**
 * @jest-environment node
 * Tests for ConversationFlowService
 */

// Mock dependencies
jest.mock('../src/services/vector-store', () => ({
    search: jest.fn()
}));

jest.mock('../src/services/ollama-client', () => ({
    generateText: jest.fn()
}));

jest.mock('../src/services/generation-logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

jest.mock('../src/shared/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

const vectorStore = require('../src/services/vector-store');
const ollamaService = require('../src/services/ollama-client');

describe('ConversationFlowService', () => {
    let conversationFlow;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();

        // Default mock implementations
        vectorStore.search.mockResolvedValue([
            { text: 'Stary Obóz to główne skupisko' }
        ]);

        ollamaService.generateText.mockResolvedValue({
            success: true,
            text: 'Jaka jest motywacja tej postaci?'
        });

        conversationFlow = require('../src/services/conversation-flow');
    });

    describe('processMessage', () => {
        const mockProfile = {
            'Imie postaci': 'Diego',
            'Gildia': 'Cień'
        };

        it('should return QUESTION type for normal exploration', async () => {
            const result = await conversationFlow.processMessage(
                'Diego',
                'Chcę stworzyć quest o zemście',
                mockProfile,
                'mistral'
            );

            expect(result.success).toBe(true);
            expect(result.type).toBe('QUESTION');
            expect(result.stage).toBe('exploration');
            expect(vectorStore.search).toHaveBeenCalledWith('Chcę stworzyć quest o zemście', 3);
        });

        it('should return FORCE_GENERATE when user says "generuj"', async () => {
            const result = await conversationFlow.processMessage(
                'Diego',
                'ok, generuj to',
                mockProfile,
                'mistral'
            );

            expect(result.success).toBe(true);
            expect(result.type).toBe('FORCE_GENERATE');
            expect(result.stage).toBe('generation');
        });

        it('should return FORCE_GENERATE when user says "wystarczy"', async () => {
            const result = await conversationFlow.processMessage(
                'Diego',
                'wystarczy, zrób quest',
                mockProfile,
                'mistral'
            );

            expect(result.type).toBe('FORCE_GENERATE');
        });

        it('should trigger generation when AI responds with [[GENERATE]]', async () => {
            ollamaService.generateText.mockResolvedValue({
                success: true,
                text: 'Masz już wszystkie szczegóły. [[GENERATE]]'
            });

            const result = await conversationFlow.processMessage(
                'Diego',
                'Postać to mag ognia',
                mockProfile,
                'mistral'
            );

            expect(result.type).toBe('FORCE_GENERATE');
        });

        it('should accumulate conversation history', async () => {
            // First message
            await conversationFlow.processMessage(
                'Diego',
                'Pierwszy wątek',
                mockProfile,
                'mistral'
            );

            // Second message
            const result = await conversationFlow.processMessage(
                'Diego',
                'Drugi wątek',
                mockProfile,
                'mistral'
            );

            expect(result.questionsAsked).toBe(2);
        });
    });

    describe('isForceGenerate', () => {
        it('should detect force keywords', () => {
            expect(conversationFlow.isForceGenerate('generuj quest')).toBe(true);
            expect(conversationFlow.isForceGenerate('wystarczy pytań')).toBe(true);
            expect(conversationFlow.isForceGenerate('ok zrób to')).toBe(true);
            expect(conversationFlow.isForceGenerate('opowiedz mi więcej')).toBe(false);
        });
    });

    describe('finalizeConversation', () => {
        it('should compile recipe with history', async () => {
            const mockProfile = { 'Imie postaci': 'Diego', Gildia: 'Cień' };

            // Build up some history first
            await conversationFlow.processMessage('Diego', 'Quest o zemście', mockProfile, 'mistral');

            // Then finalize
            const result = await conversationFlow.processMessage('Diego', 'ok generuj', mockProfile, 'mistral');

            expect(result.type).toBe('FORCE_GENERATE');
            expect(result.recipe).toContain('Diego');
            expect(result.recipe).toContain('Cień');
        });
    });
});
