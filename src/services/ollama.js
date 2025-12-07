const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('../shared/logger');
const { getTraceId } = require('../shared/tracing');
const generationLogger = require('./generation-logger');

class OllamaService {
    constructor() {
        this.host = '127.0.0.1';
        this.port = 11434;
    }

    /**
     * Check connection to Ollama and get available models
     * Now combines API check with local filesystem scan
     */
    async checkConnection() {
        // 1. Try to get models from API (primary source)
        const apiResult = await this.checkApiConnection();

        // 2. Scan local filesystem (secondary source, useful if API is down or models hidden)
        const localModels = await this.getLocalModels();

        if (apiResult.connected) {
            // Merge local models into API result if they are missing
            // API models usually have more data (size, details), so we prefer them
            const mergedModels = [...apiResult.models];
            const existingNames = new Set(mergedModels.map(m => m.name));

            for (const local of localModels) {
                // Check if this model is already in the list (considering tags)
                // Local scan returns e.g. "llama3:latest", "mistral:7b"
                if (!existingNames.has(local.name)) {
                    mergedModels.push(local);
                    existingNames.add(local.name);
                }
            }

            return { connected: true, models: mergedModels };
        } else {
            // If API is down, but we found local models, return them with a warning
            if (localModels.length > 0) {
                return {
                    connected: false,
                    error: 'Ollama is offline, but local models were found.',
                    models: localModels,
                    details: apiResult.error
                };
            }
            return apiResult;
        }
    }

    /**
     * Internal method to check API
     */
    async checkApiConnection() {
        return new Promise((resolve) => {
            const req = http.get({
                hostname: this.host,
                port: this.port,
                path: '/api/tags',
                timeout: 2000 // Short timeout
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve({ connected: true, models: json.models || [] });
                    } catch (e) {
                        resolve({ connected: true, error: 'Invalid JSON', models: [] });
                    }
                });
            });

            req.on('error', (error) => {
                resolve({ connected: false, error: error.message, models: [] });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({ connected: false, error: 'Timeout', models: [] });
            });
        });
    }

    /**
     * Scan local filesystem for model manifests
     * Windows: %USERPROFILE%\.ollama\models\manifests\registry.ollama.ai\library
     * WSL: \\wsl.localhost\Ubuntu\usr\share\ollama\.ollama\models\manifests\registry.ollama.ai\library
     */
    async getLocalModels() {
        try {
            const home = os.homedir();
            const candidatePaths = [];

            // 0. Custom Path (OLLAMA_MODELS)
            if (process.env.OLLAMA_MODELS) {
                candidatePaths.push(path.join(process.env.OLLAMA_MODELS, 'manifests', 'registry.ollama.ai', 'library'));
            }

            // 1. Windows Default (User profile)
            candidatePaths.push(path.join(home, '.ollama', 'models', 'manifests', 'registry.ollama.ai', 'library'));

            // 2. WSL Default (Ubuntu /usr/share/ollama - detected via investigation)
            candidatePaths.push('\\\\wsl.localhost\\Ubuntu\\usr\\share\\ollama\\.ollama\\models\\manifests\\registry.ollama.ai\\library');

            // 3. WSL User (Ubuntu /home/pkrokosz - fallback)
            candidatePaths.push('\\\\wsl.localhost\\Ubuntu\\home\\pkrokosz\\.ollama\\models\\manifests\\registry.ollama.ai\\library');

            const models = [];
            const processedNames = new Set(); // To avoid duplicates

            for (const manifestsPath of candidatePaths) {
                if (!fs.existsSync(manifestsPath)) {
                    continue; // Skip if path doesn't exist
                }

                logger.info('Scanning models at:', { path: manifestsPath });

                try {
                    // Read main library folder
                    const entries = fs.readdirSync(manifestsPath, { withFileTypes: true });

                    for (const entry of entries) {
                        if (entry.isDirectory()) {
                            const modelName = entry.name;
                            const modelPath = path.join(manifestsPath, modelName);

                            // Read tags (files inside the directory)
                            try {
                                const tags = fs.readdirSync(modelPath);
                                for (const tag of tags) {
                                    // Construct full model name e.g. "llama3:latest"
                                    const fullName = `${modelName}:${tag}`;

                                    if (processedNames.has(fullName)) continue; // Skip duplicates

                                    // Add to list
                                    models.push({
                                        name: fullName,
                                        model: fullName,
                                        size: 0, // Unknown size without reading blobs
                                        digest: 'local-file',
                                        details: {
                                            format: 'gguf',
                                            family: modelName,
                                            parameter_size: 'unknown',
                                            quantization_level: 'unknown'
                                        },
                                        isLocalOnly: true,
                                        sourcePath: manifestsPath // Debug info
                                    });
                                    processedNames.add(fullName);
                                }
                            } catch (e) {
                                logger.warn(`Failed to read model tags for ${modelName}`, { error: e.message });
                            }
                        }
                    }
                } catch (e) {
                    logger.warn(`Failed to scan directory ${manifestsPath}`, { error: e.message });
                }
            }

            logger.info('Total local models found:', { count: models.length });
            return models;

        } catch (error) {
            logger.error('Failed to scan local files:', error);
            return [];
        }
    }

    /**
     * Generate text using a model
     * @param {string} prompt 
     * @param {object} options 
     */
    async generateText(prompt, options = {}) {
        const traceId = getTraceId();

        return new Promise((resolve) => {
            const model = options.model || 'mistral:latest';

            const postData = JSON.stringify({
                model: model,
                prompt: prompt,
                stream: false,
                system: options.system,
                context: [],  // RESET: Start with empty context - no memory from previous calls
                keep_alive: 0,  // RESET: Immediately unload model after generation (forces clean state)
                options: {
                    temperature: options.temperature || 0.7,
                    num_ctx: options.contextSize || 4096,  // Context window size
                    num_predict: options.maxTokens || 1500,  // Max output tokens (was incorrectly using num_ctx)
                    repeat_penalty: 1.1,  // Prevent repetitive gibberish
                    top_k: 40,  // Limit token choices for more coherent output
                    top_p: 0.9  // Nucleus sampling for quality
                }
            });

            const req = http.request({
                hostname: this.host,
                port: this.port,
                path: '/api/generate',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const json = JSON.parse(data);

                            const stats = {
                                evalCount: json.eval_count,
                                evalDuration: json.eval_duration,
                                totalDuration: json.total_duration
                            };

                            // Log generation for debugging
                            generationLogger.logGeneration({
                                traceId,
                                model,
                                type: 'text_generation',
                                prompt,
                                system: options.system,
                                options,
                                response: json.response,
                                stats
                            });

                            resolve({ success: true, text: json.response, stats });
                        } catch (e) {
                            resolve({ success: false, error: 'Parse error' });
                        }
                    } else {
                        resolve({ success: false, error: `HTTP ${res.statusCode}` });
                    }
                });
            });

            req.on('error', (e) => {
                resolve({ success: false, error: e.message });
            });

            req.setTimeout(60000, () => { // 60s timeout for generation
                req.destroy();
                resolve({ success: false, error: 'Timeout' });
            });

            req.write(postData);
            req.end();
        });
    }

    /**
     * Pull a model from Ollama library
     * @param {string} modelName 
     * @param {function} onProgress (percent, status)
     */
    async pullModel(modelName, onProgress) {
        return new Promise((resolve) => {
            const postData = JSON.stringify({
                name: modelName,
                stream: true
            });

            const req = http.request({
                hostname: this.host,
                port: this.port,
                path: '/api/pull',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            }, (res) => {
                res.on('data', chunk => {
                    const lines = chunk.toString().split('\n').filter(Boolean);
                    for (const line of lines) {
                        try {
                            const json = JSON.parse(line);
                            if (json.total && json.completed) {
                                const percent = Math.round((json.completed / json.total) * 100);
                                if (onProgress) onProgress(percent, json.status);
                            } else if (json.status) {
                                if (onProgress) onProgress(null, json.status);
                            }

                            if (json.status === 'success') {
                                // finished
                            }
                        } catch (e) {
                            // ignore parse error for chunks
                        }
                    }
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve({ success: true });
                    } else {
                        resolve({ success: false, error: `HTTP ${res.statusCode}` });
                    }
                });
            });

            req.on('error', (e) => {
                resolve({ success: false, error: e.message });
            });

            req.write(postData);
            req.end();
        });
    }
}

module.exports = new OllamaService();
