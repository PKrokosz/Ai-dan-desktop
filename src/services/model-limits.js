// Model Limits Service - uses ollama-client for API calls
const logger = require('../shared/logger');

// Cache for model capabilities to avoid repeated API calls
// Key: modelName, Value: { maxContext, isReasoning, parameterCount, timeoutMultiplier }
const capabilitiesCache = new Map();

// Known baselines for fallback
const KNOWN_LIMITS = {
    'llama3': 8192,
    'llama-3': 8192,
    'llama3.1': 131072,
    'llama3.2': 131072,
    'qwen2.5': 32768,
    'qwen3': 32768,
    'gemma2': 8192,
    'deepseek-r1': 65536,
    'tinyllama': 2048,
    'mistral': 32768,
    'phi4': 16384,
    'nemotron': 32768
};

// Reasoning models often require significantly more output tokens for their "thinking" process
const REASONING_IDENTIFIERS = ['deepseek-r1', 'reasoning', 'cot', 'o1'];

class ModelLimitsService {
    constructor() {
        this.host = '127.0.0.1';
        this.port = 11434;
    }

    /**
     * Get validated capabilities for a specific model.
     * Checks cache first, then queries Ollama API.
     * @param {string} modelName - Full model name (e.g., "deepseek-r1:7b")
     * @returns {Promise<Object>} Capabilities object
     */
    async getModelCapabilities(modelName) {
        if (!modelName) return this.getDefaultCapabilities();

        // Check cache
        if (capabilitiesCache.has(modelName)) {
            return capabilitiesCache.get(modelName);
        }

        logger.info(`[ModelLimits] Analyzing capabilities for: ${modelName}`);

        try {
            const modelInfo = await this.fetchModelInfo(modelName);

            if (!modelInfo.success) {
                logger.warn(`[ModelLimits] Failed to inspect model ${modelName}, using defaults.`);
                return this.getDefaultCapabilities(modelName);
            }

            const capabilities = this.parseCapabilities(modelName, modelInfo);

            // Save to cache
            capabilitiesCache.set(modelName, capabilities);
            logger.info(`[ModelLimits] Capabilities derived:`, capabilities);

            return capabilities;
        } catch (error) {
            logger.error(`[ModelLimits] Error getting capabilities: ${error.message}`);
            return this.getDefaultCapabilities(modelName);
        }
    }

    /**
     * Parse raw API info into usable capabilities
     */
    parseCapabilities(modelName, info) {
        const baseName = modelName.split(':')[0].toLowerCase();

        // 1. Detect Context Window (num_ctx)
        let maxContext = 4096; // Default safe fallback

        // Try to find in parameters
        const paramMatch = info.parameters?.match(/num_ctx\s+(\d+)/i);
        if (paramMatch) {
            maxContext = parseInt(paramMatch[1]);
        } else {
            // Try known limits map
            for (const [key, limit] of Object.entries(KNOWN_LIMITS)) {
                if (baseName.includes(key)) {
                    maxContext = limit;
                    break;
                }
            }
        }

        // 2. Detect Reasoning Model
        // Check name keywords (e.g. deepseek-r1) or Modelfile for specific templates often used by reasoning models
        // Note: checking template for "<think>" is a good heuristic if available
        let isReasoning = REASONING_IDENTIFIERS.some(id => baseName.includes(id));

        if (!isReasoning && info.template) {
            if (info.template.includes('<think>') || info.template.includes('Thinking Process:')) {
                isReasoning = true;
            }
        }

        // 3. Estimate Parameter Count (for timeout adjustments)
        // Heuristic: check details.parameter_size (e.g. "7B", "70B")
        let isLargeModel = false;
        if (info.details?.parameter_size) {
            const sizeStr = info.details.parameter_size.replace('B', '');
            const size = parseFloat(sizeStr);
            if (!isNaN(size) && size > 20) { // e.g. 70B, 32B considered large
                isLargeModel = true;
            }
        }

        return {
            maxContext,
            isReasoning,
            isLargeModel,
            // Recommended timeout boost multiplier
            timeoutMultiplier: isReasoning ? 2.5 : (isLargeModel ? 1.5 : 1.0)
        };
    }

    /**
     * Calculate optimal parameters for a generation request
     * @param {string} modelName 
     * @param {string} responseLengthPreference - 'short' | 'medium' | 'long'
     * @returns {Promise<Object>} { num_predict, num_ctx, timeout }
     */
    async calculateLimits(modelName, responseLengthPreference = 'medium') {
        const caps = await this.getModelCapabilities(modelName);

        // Base definitions for output length
        const lengths = {
            short: 800,
            medium: 2000,
            long: 5000
        };

        let numPredict = lengths[responseLengthPreference] || 2000;

        // Apply Boosting
        if (caps.isReasoning) {
            // Reasoning models need space to "think" before answering. 
            // We boost significantly to prevent cutoff of the actual answer.
            numPredict += 4000;
        }

        // Safety Cap: num_predict should not exceed what the model can handle (approximately)
        // Though Ollama handles this, it's good to be explicit.
        // If maxContext is small (e.g. 2048), we can't ask for 5000 tokens.
        if (numPredict > caps.maxContext) {
            numPredict = Math.floor(caps.maxContext * 0.9); // Leave 10% for input
        }

        // Calculate Context Window
        // We want enough context for history, but capped at model's limit or a reasonable max (e.g. 32k) to save VRAM
        const SYSTEM_MAX_CONTEXT = 32768;
        const numCtx = Math.min(caps.maxContext, SYSTEM_MAX_CONTEXT);

        // Calculate Timeout
        const BASE_TIMEOUT = 300000; // 5 minutes
        const timeout = Math.floor(BASE_TIMEOUT * caps.timeoutMultiplier);

        return {
            num_predict: numPredict,
            num_ctx: numCtx,
            timeout: timeout,
            capabilities: caps // Return raw capabilities for UI (e.g. showing "Thinking..." UI triggers)
        };
    }

    getDefaultCapabilities(modelName) {
        return {
            maxContext: 4096,
            isReasoning: modelName?.toLowerCase().includes('r1') || false,
            isLargeModel: false,
            timeoutMultiplier: 1.0
        };
    }

    /**
     * Fetch raw model info from Ollama API using ollama-client
     */
    async fetchModelInfo(modelName) {
        try {
            const ollamaClient = require('./ollama-client');
            const result = await ollamaClient.showModel(modelName);

            if (result.success) {
                return {
                    success: true,
                    ...result.info
                };
            }
            return { success: false, error: result.error };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

module.exports = new ModelLimitsService();
