/**
 * Ollama Client - using official 'ollama' npm package
 * Replaces legacy http.request implementation with cleaner library
 */

const { Ollama } = require('ollama');
const logger = require('../shared/logger');
const { getTraceId } = require('../shared/tracing');
const generationLogger = require('./generation-logger');
const { getModelConfig, getRecommendedTemperature } = require('../shared/model-configs');

class OllamaClient {
    constructor() {
        this.client = new Ollama({ host: 'http://127.0.0.1:11434' });
    }

    /**
     * Check connection to Ollama and get available models
     */
    async checkConnection() {
        try {
            const response = await this.client.list();
            return {
                connected: true,
                models: response.models || []
            };
        } catch (error) {
            logger.error('Ollama connection failed', { error: error.message });
            return {
                connected: false,
                error: error.message,
                models: []
            };
        }
    }

    /**
     * Generate text using a model
     * @param {string} prompt 
     * @param {object} options 
     */
    async generateText(prompt, options = {}) {
        const traceId = getTraceId();
        const model = options.model || 'mistral:latest';

        // Build generation options
        const genOptions = {
            temperature: options.temperature ?? getRecommendedTemperature(model, options.taskType || 'general'),
            num_ctx: options.num_ctx || options.contextSize || getModelConfig(model)?.recommendedParams?.num_ctx || 4096,
            num_predict: options.num_predict || options.maxTokens || 2000,
            repeat_penalty: getModelConfig(model)?.recommendedParams?.repeat_penalty || 1.1,
            top_k: 40,
            top_p: getModelConfig(model)?.recommendedParams?.top_p || 0.9
        };

        // Support both streaming and non-streaming
        if (options.stream && options.onData) {
            return this._generateTextStream(prompt, model, genOptions, options, traceId);
        } else {
            return this._generateTextPromise(prompt, model, genOptions, options, traceId);
        }
    }

    async _generateTextStream(prompt, model, genOptions, options, traceId) {
        try {
            logger.info('[OllamaClient] Starting stream generation', { model });

            let fullText = '';
            const response = await this.client.generate({
                model: model,
                prompt: prompt,
                system: options.system,
                stream: true,
                options: genOptions,
                format: options.format // 'json' or JSON schema object
            });

            for await (const part of response) {
                if (part.response) {
                    fullText += part.response;
                    options.onData(part.response, false);
                }

                if (part.done) {
                    const stats = {
                        evalCount: part.eval_count,
                        evalDuration: part.eval_duration,
                        totalDuration: part.total_duration
                    };
                    options.onData('', true, stats);

                    generationLogger.logGeneration({
                        traceId,
                        model,
                        type: 'text_generation_stream',
                        prompt,
                        system: options.system,
                        options: genOptions,
                        response: fullText,
                        stats
                    });

                    return { success: true, text: fullText, stats };
                }
            }

            return { success: true, text: fullText, stats: {} };
        } catch (error) {
            logger.error('[OllamaClient] Stream generation failed', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    async _generateTextPromise(prompt, model, genOptions, options, traceId) {
        try {
            logger.info('[OllamaClient] Starting promise generation', { model });

            const response = await this.client.generate({
                model: model,
                prompt: prompt,
                system: options.system,
                stream: false,
                options: genOptions,
                format: options.format
            });

            const stats = {
                evalCount: response.eval_count,
                evalDuration: response.eval_duration,
                totalDuration: response.total_duration
            };

            generationLogger.logGeneration({
                traceId,
                model,
                type: 'text_generation',
                prompt,
                system: options.system,
                options: genOptions,
                response: response.response,
                stats
            });

            return { success: true, text: response.response, stats };
        } catch (error) {
            logger.error('[OllamaClient] Promise generation failed', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Pull a model from Ollama registry
     * @param {string} modelName 
     * @param {function} onProgress 
     */
    async pullModel(modelName, onProgress) {
        try {
            logger.info('[OllamaClient] Pulling model', { modelName });

            const response = await this.client.pull({
                model: modelName,
                stream: true
            });

            for await (const part of response) {
                if (part.total && part.completed) {
                    const percent = Math.round((part.completed / part.total) * 100);
                    if (onProgress) onProgress(percent, part.status);
                } else if (part.status) {
                    if (onProgress) onProgress(null, part.status);
                }
            }

            return { success: true };
        } catch (error) {
            logger.error('[OllamaClient] Model pull failed', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Generate embeddings for a given prompt
     * @param {string} prompt Text to embed
     * @param {string} model Model to use (default: mxbai-embed-large for Polish support)
     */
    async generateEmbeddings(prompt, model = 'mxbai-embed-large:335m') {
        try {
            const response = await this.client.embed({
                model: model,
                input: prompt
            });

            return { success: true, embedding: response.embeddings?.[0] || response.embedding };
        } catch (error) {
            logger.error('[OllamaClient] Embeddings failed', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Get model info
     * @param {string} modelName
     */
    async showModel(modelName) {
        try {
            const response = await this.client.show({ model: modelName });
            return { success: true, info: response };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Chat with message history (for conversation context)
     * @param {array} messages Array of {role, content} objects
     * @param {object} options
     */
    async chat(messages, options = {}) {
        const model = options.model || 'mistral:latest';

        try {
            if (options.stream && options.onData) {
                let fullText = '';
                const response = await this.client.chat({
                    model: model,
                    messages: messages,
                    stream: true,
                    format: options.format,
                    options: {
                        temperature: options.temperature || 0.7,
                        num_ctx: options.num_ctx || 4096
                    }
                });

                for await (const part of response) {
                    if (part.message?.content) {
                        fullText += part.message.content;
                        options.onData(part.message.content, false);
                    }
                    if (part.done) {
                        options.onData('', true, {});
                        return { success: true, text: fullText };
                    }
                }
                return { success: true, text: fullText };
            } else {
                const response = await this.client.chat({
                    model: model,
                    messages: messages,
                    stream: false,
                    format: options.format,
                    options: {
                        temperature: options.temperature || 0.7,
                        num_ctx: options.num_ctx || 4096
                    }
                });

                return { success: true, text: response.message?.content };
            }
        } catch (error) {
            logger.error('[OllamaClient] Chat failed', { error: error.message });
            return { success: false, error: error.message };
        }
    }
    /**
     * Ensure a model exists, pulling it if necessary
     * @param {string} modelName
     */
    async ensureModel(modelName) {
        try {
            const list = await this.client.list();
            const exists = list.models.some(m => m.name.startsWith(modelName)); // startsWith to handle tags like :latest implicitly if needed, or exact match
            if (exists) return true;

            logger.info(`[OllamaClient] Model ${modelName} not found. Attempting auto-pull...`);
            const pullResult = await this.pullModel(modelName);
            return pullResult.success;
        } catch (error) {
            logger.error(`[OllamaClient] Failed to ensure model ${modelName}`, { error: error.message });
            return false;
        }
    }
}

module.exports = new OllamaClient();
