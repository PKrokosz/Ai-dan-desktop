/**
 * Tests for ConversationFlowService
 */

const mockSearch = jest.fn();
const mockGenerateText = jest.fn();

jest.mock('../src/services/vector-store', () => ({
    search: mockSearch
}));

jest.mock('../src/services/ollama-client', () => ({
    generateText: mockGenerateText
}));

jest.mock('../src/shared/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

// Import AFTER mocks
const conversationFlow = require('../src/services/conversation-flow');

describe('ConversationFlowService', () => {

    beforeEach(() => {
        jest.clearAllMocks();

        // Default mock implementations
        mockSearch.mockResolvedValue([
            { text: 'Stary Obóz to główne skupisko' }
        ]);

        mockGenerateText.mockResolvedValue({
            success: true,
            text: 'Jaka jest motywacja tej postaci?'
        });
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
            expect(mockSearch).toHaveBeenCalledWith('Chcę stworzyć quest o zemście', 3);
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
            mockGenerateText.mockResolvedValue({
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

        it('should handle search errors gracefully', async () => {
            mockSearch.mockRejectedValue(new Error('Vector store error'));

            const result = await conversationFlow.processMessage(
                'Diego',
                'Co słychać?',
                mockProfile,
                'mistral'
            );

            // Should continue without context
            expect(result.success).toBe(true);
            expect(mockGenerateText).toHaveBeenCalled();
        });

        it('should handle AI generation error', async () => {
            mockGenerateText.mockResolvedValue({
                success: false,
                error: 'Ollama offline'
            });

            const result = await conversationFlow.processMessage(
                'Diego',
                'Hej',
                mockProfile,
                'mistral'
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('Ollama offline');
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
        it('should compile recipe with character info', async () => {
            const mockProfile = { 'Imie postaci': 'Diego', Gildia: 'Cień' };

            // Finalize directly
            const result = await conversationFlow.processMessage('Diego', 'ok generuj', mockProfile, 'mistral');

            expect(result.type).toBe('FORCE_GENERATE');
            expect(result.recipe).toContain('Diego');
            expect(result.recipe).toContain('Cień');
        });
    });
});
