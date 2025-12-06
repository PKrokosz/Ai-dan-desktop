/**
 * Ollama Service
 * Real API integration with Ollama LLM
 */

const http = require('http');
const config = require('../shared/config');
const logger = require('../shared/logger');
const { getTraceId } = require('../shared/tracing');

class OllamaService {
    constructor() {
        this.baseUrl = config.ollama.host;
        this.defaultModels = {
            extraction: config.ollama.models.extraction,
            generation: config.ollama.models.generation
        };
    }

    /**
     * Check if Ollama is available
     * Uses native http module for Electron compatibility
     */
    async checkConnection() {
        return new Promise((resolve) => {
            // Hardcoded for debugging
            const url = new URL('http://127.0.0.1:11434/api/tags');
            const port = 11434;

            logger.info('Check connection to:', { href: url.href });

            const req = http.get({
                hostname: '127.0.0.1',
                port: 11434,
                path: '/api/tags',
                timeout: 5000
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        logger.info('Ollama connection OK', { models: json.models?.length || 0 });
                        resolve({ connected: true, models: json.models || [] });
                    } catch (e) {
                        logger.error('Ollama response parse error', { error: e.message });
                        resolve({ connected: false, error: 'Invalid response', models: [] });
                    }
                });
            });

            req.on('error', (error) => {
                console.error('OLLAMA CHECK ERROR:', error);
                logger.error('Ollama connection failed', { error: error.message });
                resolve({ connected: false, error: error.message, models: [] });
            });

            req.on('timeout', () => {
                req.destroy();
                logger.error('Ollama connection timeout');
                resolve({ connected: false, error: 'Connection timeout', models: [] });
            });
        });
    }

    /**
     * Pull a model from Ollama registry with streaming progress
     * Uses native http module for better Electron compatibility
     */
    async pullModel(modelName, onProgress) {
        logger.info('Pulling model', { model: modelName });

        return new Promise((resolve) => {
            const url = new URL(`${this.baseUrl}/api/pull`);
            const postData = JSON.stringify({ name: modelName, stream: true });

            const port = parseInt(url.port) || 11434;

            const options = {
                hostname: '127.0.0.1',  // Force IPv4 to avoid ECONNREFUSED on ::1
                port: port,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            logger.info('Pull request options', { hostname: options.hostname, port: options.port, path: options.path });

            const req = http.request(options, (res) => {
                let lastStatus = '';
                let lastProgress = 0;
                let hasError = false;
                let errorMessage = '';
                let buffer = '';

                res.on('data', (chunk) => {
                    buffer += chunk.toString();
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep incomplete line for next chunk

                    for (const line of lines) {
                        if (!line.trim()) continue;
                        try {
                            const data = JSON.parse(line);

                            if (data.error) {
                                hasError = true;
                                errorMessage = data.error;
                            }

                            if (data.total && data.completed) {
                                const percent = Math.round((data.completed / data.total) * 100);
                                if (percent !== lastProgress) {
                                    lastProgress = percent;
                                    onProgress?.(percent, data.status);
                                    logger.info('Pull progress', { model: modelName, percent, status: data.status });
                                }
                            }

                            lastStatus = data.status || lastStatus;
                        } catch (e) {
                            // Ignore JSON parse errors
                        }
                    }
                });

                res.on('end', async () => {
                    if (hasError) {
                        logger.error('Model pull failed', { model: modelName, error: errorMessage });
                        resolve({ success: false, error: errorMessage });
                        return;
                    }

                    // Verify model was pulled
                    try {
                        const checkRes = await this.checkConnection();
                        const modelPulled = checkRes.models?.some(m =>
                            m.name === modelName || m.name.startsWith(modelName.split(':')[0])
                        );

                        if (!modelPulled && lastStatus !== 'success') {
                            resolve({ success: false, error: 'Model nie pojawił się na liście' });
                            return;
                        }
                    } catch (e) {
                        // Ignore verification errors
                    }

                    logger.info('Model pulled successfully', { model: modelName, status: lastStatus });
                    resolve({ success: true, status: lastStatus });
                });

                res.on('error', (error) => {
                    logger.error('Pull response error', { model: modelName, error: error.message });
                    resolve({ success: false, error: error.message });
                });
            });

            req.on('error', (error) => {
                logger.error('Pull request error', { model: modelName, error: error.message });
                resolve({ success: false, error: error.message });
            });

            req.setTimeout(600000); // 10 minutes timeout for large models
            req.write(postData);
            req.end();
        });
    }

    /**
     * Generate completion with structured JSON output
     * Used for character lane extraction
     * Uses native http module for Electron compatibility
     */
    async generateJSON(prompt, options = {}) {
        const model = options.model || this.defaultModels.extraction;
        const traceId = getTraceId();

        logger.info('Generating JSON', { model, traceId, promptLength: prompt.length });

        return new Promise((resolve) => {
            const url = new URL(`${this.baseUrl}/api/generate`);
            const postData = JSON.stringify({
                model,
                prompt,
                stream: false,
                format: 'json',
                options: {
                    temperature: options.temperature ?? 0,
                    top_p: options.topP ?? 0.1,
                    num_predict: options.maxTokens ?? 2000
                }
            });

            const reqOptions = {
                hostname: '127.0.0.1',  // Force IPv4 to avoid ECONNREFUSED on ::1
                port: parseInt(url.port) || 11434,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const req = http.request(reqOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        if (res.statusCode !== 200) {
                            throw new Error(`Generate failed: ${res.statusCode}`);
                        }

                        const responseData = JSON.parse(data);
                        let parsed = null;

                        try {
                            parsed = JSON.parse(responseData.response);
                        } catch (e) {
                            logger.warn('Failed to parse JSON response, returning raw', { traceId });
                            parsed = { raw: responseData.response };
                        }

                        logger.info('JSON generation complete', {
                            traceId,
                            model,
                            evalCount: responseData.eval_count,
                            evalDuration: responseData.eval_duration
                        });

                        resolve({
                            success: true,
                            result: parsed,
                            raw: responseData.response,
                            stats: {
                                evalCount: responseData.eval_count,
                                evalDuration: responseData.eval_duration,
                                totalDuration: responseData.total_duration
                            }
                        });
                    } catch (error) {
                        logger.error('JSON generation parse error', { traceId, model, error: error.message });
                        resolve({ success: false, error: error.message });
                    }
                });
            });

            req.on('error', (error) => {
                logger.error('JSON generation failed', { traceId, model, error: error.message });
                resolve({ success: false, error: error.message });
            });

            req.setTimeout(120000); // 2 minutes timeout
            req.write(postData);
            req.end();
        });
    }

    /**
     * Generate creative text (for quests, narratives)
     * Uses native http module for Electron compatibility
     */
    async generateText(prompt, options = {}) {
        const model = options.model || this.defaultModels.generation;
        const traceId = getTraceId();

        logger.info('Generating text', { model, traceId, promptLength: prompt.length });

        return new Promise((resolve) => {
            const url = new URL(`${this.baseUrl}/api/generate`);
            const postData = JSON.stringify({
                model,
                prompt,
                system: options.system, // Add system prompt support
                stream: false,
                options: {
                    temperature: options.temperature ?? 0.7,
                    top_p: options.topP ?? 0.9,
                    num_predict: options.maxTokens ?? 1500
                }
            });

            const reqOptions = {
                hostname: '127.0.0.1',  // Force IPv4 to avoid ECONNREFUSED on ::1
                port: parseInt(url.port) || 11434,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const req = http.request(reqOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        if (res.statusCode !== 200) {
                            throw new Error(`Generate failed: ${res.statusCode}`);
                        }

                        const responseData = JSON.parse(data);

                        logger.info('Text generation complete', {
                            traceId,
                            model,
                            responseLength: responseData.response?.length
                        });

                        resolve({
                            success: true,
                            text: responseData.response,
                            stats: {
                                evalCount: responseData.eval_count,
                                evalDuration: responseData.eval_duration,
                                totalDuration: responseData.total_duration
                            }
                        });
                    } catch (error) {
                        logger.error('Text generation parse error', { traceId, model, error: error.message });
                        resolve({ success: false, error: error.message });
                    }
                });
            });

            req.on('error', (error) => {
                logger.error('Text generation failed', { traceId, model, error: error.message });
                resolve({ success: false, error: error.message });
            });

            req.setTimeout(120000); // 2 minutes timeout
            req.write(postData);
            req.end();
        });
    }

    /**
     * Process a single lane (historia, relacje, etc.)
     * Returns structured JSON for that lane
     */
    async processLane(laneName, characterData, worldContext = '', options = {}) {
        const prompts = {
            historia: this.buildHistoriaPrompt,
            relacje: this.buildRelacjePrompt,
            aspiracje: this.buildAspiracjePrompt,
            slabosci: this.buildSlabosciPrompt,
            umiejetnosci: this.buildUmiejetnosciPrompt,
            geolore: this.buildGeolorePrompt
        };

        const buildPrompt = prompts[laneName];
        if (!buildPrompt) {
            return { success: false, error: `Unknown lane: ${laneName}` };
        }

        const prompt = buildPrompt.call(this, characterData, worldContext);
        return this.generateJSON(prompt, options);
    }

    // =====================================
    // Lane-specific prompt builders
    // =====================================

    buildHistoriaPrompt(data, worldContext) {
        return `==Return ONLY raw JSON. No code fences. No comments. No trailing commas.
Unknown → null or [].

CONTEXT:
${worldContext || ''}

FORM:
Name: ${data['Imie postaci'] || null}
Guild: ${data['Gildia'] || null}

RAW:
${data['Jak zarabiala na zycie, kim byla'] || ''}
${data['Jak zarabia na zycie, kim jest'] || ''}
${data['Jak trafila do obozu'] || ''}
${data['Inne wydarzenia z przeszlosci'] || ''}

RULES:
- No new proper nouns beyond inputs/context.
- Map Guild → core_identity.status_class
- short_description: 1–2 zdania (pochodzenie/rola/motywacja).
- keywords: lista haseł pojawiających się w inputs/context; jeśli brak → [].

OUTPUT JSON:
{
  "core_identity": {
    "character_name": "string",
    "status_class": "string or null",
    "current_group_band": "string or null",
    "short_description": "string",
    "keywords": []
  },
  "biography_and_traits": {
    "key_past_events": [],
    "survival_skills_methods": "string or null"
  }
}`;
    }

    buildRelacjePrompt(data, worldContext) {
        return `==Return ONLY raw JSON. No code fences.

CONTEXT:
${worldContext || ''}

RAW RELATIONS:
${data['Znajomi, przyjaciele i wrogowie'] || ''}

OUTPUT JSON:
{
  "relationships": {
    "allies_friends": [{"name": "string", "description": "string"}],
    "enemies_antagonists": [{"name": "string", "description": "string"}],
    "neutral_contacts": [{"name": "string", "description": "string"}]
  }
}`;
    }

    buildAspiracjePrompt(data, worldContext) {
        return `==Return ONLY raw JSON.

RAW ASPIRATIONS:
${data['Kim chce zostac'] || ''}
${data['Jakie zadania bedziesz kontynuowac'] || ''}

OUTPUT JSON:
{
  "biography_and_traits": {
    "personal_goals_short_term": [],
    "personal_goals_long_term": []
  }
}`;
    }

    buildSlabosciPrompt(data, worldContext) {
        return `==Return ONLY raw JSON.

RAW WEAKNESSES:
${data['Slabosci'] || ''}

OUTPUT JSON:
{
  "mechanical_links": {
    "declared_weaknesses": [],
    "phobias_or_triggers": []
  }
}`;
    }

    buildUmiejetnosciPrompt(data, worldContext) {
        return `==Return ONLY raw JSON.

RAW SKILLS:
${data['Umiejetnosci'] || ''}

OUTPUT JSON:
{
  "mechanical_links": {
    "declared_skills": []
  }
}`;
    }

    buildGeolorePrompt(data, worldContext) {
        return `==Return ONLY raw JSON.

CONTEXT:
${worldContext || ''}

RAW LOCATION:
Region: ${data['Region'] || ''}
Miejscowość: ${data['Miejscowosc'] || ''}

OUTPUT JSON:
{
  "core_identity": {
    "home_region": "string or null"
  },
  "biography_and_traits": {
    "regional_lore_knowledge": []
  }
}`;
    }
}

module.exports = new OllamaService();
