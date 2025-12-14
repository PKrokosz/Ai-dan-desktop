/**
 * Tests for OllamaClient service
 */

const mockList = jest.fn();
const mockGenerate = jest.fn();
const mockPull = jest.fn();
const mockEmbed = jest.fn();
const mockShow = jest.fn();
const mockChat = jest.fn();

jest.mock('ollama', () => ({
    Ollama: jest.fn().mockImplementation(() => ({
        list: mockList,
        generate: mockGenerate,
        pull: mockPull,
        embed: mockEmbed,
        show: mockShow,
        chat: mockChat
    }))
}));

jest.mock('../src/shared/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

jest.mock('../src/shared/tracing', () => ({
    getTraceId: jest.fn(() => 'test-trace-123')
}));

jest.mock('../src/services/generation-logger', () => ({
    logGeneration: jest.fn()
}));

jest.mock('../src/shared/model-configs', () => ({
    getModelConfig: jest.fn(() => ({})),
    getRecommendedTemperature: jest.fn(() => 0.7)
}));

const ollamaClient = require('../src/services/ollama-client');

describe('OllamaClient', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('checkConnection', () => {
        it('should return connected=true with models when Ollama responds', async () => {
            mockList.mockResolvedValue({
                models: [{ name: 'mistral:latest' }, { name: 'gemma:2b' }]
            });

            const result = await ollamaClient.checkConnection();

            expect(result.connected).toBe(true);
            expect(result.models).toHaveLength(2);
            expect(result.models[0].name).toBe('mistral:latest');
        });

        it('should return connected=false when Ollama is not running', async () => {
            mockList.mockRejectedValue(new Error('ECONNREFUSED'));

            const result = await ollamaClient.checkConnection();

            expect(result.connected).toBe(false);
            expect(result.error).toContain('ECONNREFUSED');
        });
    });

    describe('generateText', () => {
        it('should generate text with default options', async () => {
            mockGenerate.mockResolvedValue({
                response: 'Test response from AI',
                done: true
            });

            const result = await ollamaClient.generateText('Hello, world!');

            expect(mockGenerate).toHaveBeenCalled();
            expect(result.success).toBe(true);
            expect(result.text).toBe('Test response from AI');
        });

        it('should handle generation errors gracefully', async () => {
            mockGenerate.mockRejectedValue(new Error('Model not found'));

            const result = await ollamaClient.generateText('Hello');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('pullModel', () => {
        it('should call pull with model name', async () => {
            mockPull.mockImplementation(async function* () {
                yield { status: 'downloading', completed: 50, total: 100 };
                yield { status: 'success', completed: 100, total: 100 };
            });

            const onProgress = jest.fn();
            await ollamaClient.pullModel('mistral:latest', onProgress);

            expect(mockPull).toHaveBeenCalledWith({ model: 'mistral:latest', stream: true });
        });
    });

    describe('generateEmbeddings', () => {
        it('should return embedding array', async () => {
            mockEmbed.mockResolvedValue({
                embeddings: [[0.1, 0.2, 0.3]]
            });

            const result = await ollamaClient.generateEmbeddings('Test text');

            expect(result.success).toBe(true);
            expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
        });
    });
});
