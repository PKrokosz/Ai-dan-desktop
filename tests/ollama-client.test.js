/**
 * @jest-environment node
 * Tests for OllamaClient service
 */

// Mock the ollama package
jest.mock('ollama', () => ({
    Ollama: jest.fn().mockImplementation(() => ({
        list: jest.fn(),
        generate: jest.fn(),
        pull: jest.fn(),
        embed: jest.fn(),
        show: jest.fn(),
        chat: jest.fn()
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

// Import after mocks
const { Ollama } = require('ollama');

describe('OllamaClient', () => {
    let ollamaClient;
    let mockOllamaInstance;

    beforeEach(() => {
        jest.clearAllMocks();

        // Get mock instance
        mockOllamaInstance = {
            list: jest.fn(),
            generate: jest.fn(),
            pull: jest.fn(),
            embed: jest.fn(),
            show: jest.fn(),
            chat: jest.fn()
        };
        Ollama.mockImplementation(() => mockOllamaInstance);

        // Re-require to get fresh instance with mocks
        jest.resetModules();
        ollamaClient = require('../src/services/ollama-client');
    });

    describe('checkConnection', () => {
        it('should return connected=true with models when Ollama responds', async () => {
            mockOllamaInstance.list.mockResolvedValue({
                models: [{ name: 'mistral:latest' }, { name: 'gemma:2b' }]
            });

            const result = await ollamaClient.checkConnection();

            expect(result.connected).toBe(true);
            expect(result.models).toHaveLength(2);
            expect(result.models[0].name).toBe('mistral:latest');
        });

        it('should return connected=false when Ollama is not running', async () => {
            mockOllamaInstance.list.mockRejectedValue(new Error('ECONNREFUSED'));

            const result = await ollamaClient.checkConnection();

            expect(result.connected).toBe(false);
            expect(result.error).toContain('ECONNREFUSED');
        });
    });

    describe('generateText', () => {
        it('should generate text with default options', async () => {
            mockOllamaInstance.generate.mockResolvedValue({
                response: 'Test response from AI',
                done: true
            });

            const result = await ollamaClient.generateText('Hello, world!');

            expect(mockOllamaInstance.generate).toHaveBeenCalled();
            expect(result.success).toBe(true);
            expect(result.text).toBe('Test response from AI');
        });

        it('should handle generation errors gracefully', async () => {
            mockOllamaInstance.generate.mockRejectedValue(new Error('Model not found'));

            const result = await ollamaClient.generateText('Hello');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Model not found');
        });
    });

    describe('pullModel', () => {
        it('should call pull with model name', async () => {
            mockOllamaInstance.pull.mockImplementation(async function* () {
                yield { status: 'downloading', completed: 50, total: 100 };
                yield { status: 'success', completed: 100, total: 100 };
            });

            const onProgress = jest.fn();
            await ollamaClient.pullModel('mistral:latest', onProgress);

            expect(mockOllamaInstance.pull).toHaveBeenCalledWith({ model: 'mistral:latest' });
        });
    });

    describe('generateEmbeddings', () => {
        it('should return embeddings array', async () => {
            mockOllamaInstance.embed.mockResolvedValue({
                embeddings: [[0.1, 0.2, 0.3]]
            });

            const result = await ollamaClient.generateEmbeddings('Test text');

            expect(result.success).toBe(true);
            expect(result.embeddings).toEqual([0.1, 0.2, 0.3]);
        });
    });
});
