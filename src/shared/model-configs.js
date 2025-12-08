/**
 * @module ModelConfigs
 * @description Konfiguracje modeli Ollama z zalecanymi parametrami
 * 
 * Źródła:
 * - Ollama modelfiles (ollama show <model> --modelfile)
 * - Oficjalne dokumentacje
 */

const MODEL_CONFIGS = {
    // ==========================================
    // MISTRAL FAMILY
    // ==========================================
    'ministral-3:3b': {
        name: 'Ministral 3 (3B)',
        family: 'mistral',
        size: '3.0 GB',
        parameters: '3.85B',
        quantization: 'Q4_K_M',
        recommendedParams: {
            temperature: 0.15,  // From modelfile - very deterministic
            top_p: 0.9,
            repeat_penalty: 1.1
        },
        template: {
            system: '[SYSTEM_PROMPT]{{content}}[/SYSTEM_PROMPT]',
            user: '[INST]{{content}}[/INST]',
            assistant: '{{content}}</s>'
        },
        capabilities: ['vision', 'tools', 'edge-deployment'],
        bestFor: ['classification', 'structured-output', 'tool-calling'],
        notes: 'Edge model, niska temperatura dla determinizmu. Ma wbudowany system prompt o Le Chat.'
    },

    'mistral:latest': {
        name: 'Mistral 7B',
        family: 'mistral',
        size: '4.4 GB',
        parameters: '7B',
        quantization: 'Q4_0',
        recommendedParams: {
            temperature: 0.7,
            top_p: 0.9,
            repeat_penalty: 1.1
        },
        template: {
            system: '[INST]{{content}}[/INST]',
            user: '[INST]{{content}}[/INST]',
            assistant: '{{content}}</s>'
        },
        capabilities: ['general', 'coding', 'reasoning'],
        bestFor: ['creative-writing', 'general-chat', 'coding'],
        notes: 'Baseline Mistral. Dobry do ogólnych zadań.'
    },

    // ==========================================
    // QWEN FAMILY
    // ==========================================
    'qwen2.5:7b': {
        name: 'Qwen 2.5 (7B)',
        family: 'qwen',
        size: '4.7 GB',
        parameters: '7B',
        quantization: 'Q4_K_M',
        recommendedParams: {
            temperature: 0.7,      // Creative tasks
            temperature_classify: 0.1,  // Classification
            top_p: 0.8,
            repeat_penalty: 1.1,
            num_ctx: 32768  // 32k context
        },
        template: {
            system: '<|im_start|>system\n{{content}}<|im_end|>',
            user: '<|im_start|>user\n{{content}}<|im_end|>',
            assistant: '<|im_start|>assistant\n{{content}}<|im_end|>'
        },
        capabilities: ['long-context', 'multilingual', 'coding', 'reasoning'],
        bestFor: ['discovery-questions', 'polish-language', 'creative-generation'],
        notes: 'Świetny dla polskiego. 32k kontekst. Używany w conversation-flow.js.'
    },

    'qwen2.5:3b': {
        name: 'Qwen 2.5 (3B)',
        family: 'qwen',
        size: '1.9 GB',
        parameters: '3B',
        quantization: 'Q4_K_M',
        recommendedParams: {
            temperature: 0.7,
            top_p: 0.8,
            num_ctx: 8192
        },
        template: {
            system: '<|im_start|>system\n{{content}}<|im_end|>',
            user: '<|im_start|>user\n{{content}}<|im_end|>',
            assistant: '<|im_start|>assistant\n{{content}}<|im_end|>'
        },
        capabilities: ['fast', 'multilingual'],
        bestFor: ['quick-classification', 'fallback'],
        notes: 'Szybka alternatywa dla 7B.'
    },

    // ==========================================
    // DEEPSEEK FAMILY
    // ==========================================
    'deepseek-r1:latest': {
        name: 'DeepSeek R1 (7B)',
        family: 'deepseek',
        size: '5.2 GB',
        parameters: '7B',
        quantization: 'Q4_K_M',
        recommendedParams: {
            temperature: 0.6,
            top_p: 0.95,
            repeat_penalty: 1.05
        },
        template: {
            system: 'System: {{content}}\n',
            user: 'User: {{content}}\n',
            assistant: 'Assistant: {{content}}'
        },
        capabilities: ['reasoning', 'chain-of-thought', 'coding'],
        bestFor: ['complex-reasoning', 'step-by-step', 'coding'],
        notes: 'Thinking model - używa <think> tags. Dobry do rozumowania.'
    },

    'deepseek-r1:1.5b': {
        name: 'DeepSeek R1 (1.5B)',
        family: 'deepseek',
        size: '1.1 GB',
        parameters: '1.5B',
        quantization: 'Q4_K_M',
        recommendedParams: {
            temperature: 0.5,
            top_p: 0.9
        },
        capabilities: ['fast', 'reasoning-lite'],
        bestFor: ['quick-tasks', 'classification'],
        notes: 'Mniejszy wariant R1 dla szybkich zadań.'
    },

    // ==========================================
    // LLAMA FAMILY
    // ==========================================
    'llama3.1:latest': {
        name: 'Llama 3.1 (8B)',
        family: 'llama',
        size: '4.9 GB',
        parameters: '8B',
        quantization: 'Q4_K_M',
        recommendedParams: {
            temperature: 0.7,
            top_p: 0.9,
            repeat_penalty: 1.1,
            num_ctx: 8192
        },
        template: {
            system: '<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n{{content}}<|eot_id|>',
            user: '<|start_header_id|>user<|end_header_id|>\n{{content}}<|eot_id|>',
            assistant: '<|start_header_id|>assistant<|end_header_id|>\n{{content}}<|eot_id|>'
        },
        capabilities: ['general', 'coding', 'multilingual'],
        bestFor: ['general-tasks', 'english-content'],
        notes: 'Solidny model ogólnego przeznaczenia od Meta.'
    },

    // ==========================================
    // SPECIALIZED MODELS
    // ==========================================
    'codellama:7b-instruct': {
        name: 'CodeLlama (7B Instruct)',
        family: 'llama',
        size: '3.8 GB',
        parameters: '7B',
        recommendedParams: {
            temperature: 0.2,  // Low for code
            top_p: 0.95
        },
        capabilities: ['coding', 'code-completion'],
        bestFor: ['code-generation', 'refactoring'],
        notes: 'Specjalizowany do kodu.'
    },

    'phi3:3.8b': {
        name: 'Phi 3 (3.8B)',
        family: 'microsoft',
        size: '2.2 GB',
        parameters: '3.8B',
        recommendedParams: {
            temperature: 0.5,
            top_p: 0.9
        },
        capabilities: ['reasoning', 'math', 'coding'],
        bestFor: ['math-problems', 'logic'],
        notes: 'Mały ale mocny w rozumowaniu.'
    },

    'phi4-mini:latest': {
        name: 'Phi 4 Mini',
        family: 'microsoft',
        size: '2.5 GB',
        recommendedParams: {
            temperature: 0.5,
            top_p: 0.9
        },
        capabilities: ['reasoning', 'efficiency'],
        bestFor: ['quick-reasoning', 'edge'],
        notes: 'Najnowszy Phi od Microsoft.'
    },

    // ==========================================
    // EMBEDDING MODELS
    // ==========================================
    'nomic-embed-text:latest': {
        name: 'Nomic Embed Text',
        family: 'embedding',
        size: '274 MB',
        type: 'embedding',
        dimensions: 768,
        capabilities: ['text-embedding', 'semantic-search'],
        bestFor: ['topic-detection', 'similarity'],
        notes: 'Do wykrywania zmiany tematu (Faza 4).'
    },

    'mxbai-embed-large:latest': {
        name: 'MxBai Embed Large',
        family: 'embedding',
        size: '669 MB',
        type: 'embedding',
        dimensions: 1024,
        capabilities: ['text-embedding', 'high-quality'],
        bestFor: ['semantic-search', 'rag'],
        notes: 'Większe wymiary = lepsza jakość.'
    },

    'all-minilm:latest': {
        name: 'All MiniLM',
        family: 'embedding',
        size: '45 MB',
        type: 'embedding',
        dimensions: 384,
        capabilities: ['text-embedding', 'fast'],
        bestFor: ['quick-similarity', 'real-time'],
        notes: 'Bardzo szybki, mniejsze wymiary.'
    },

    // ==========================================
    // VISION MODELS
    // ==========================================
    'llava:latest': {
        name: 'LLaVA (Vision)',
        family: 'llava',
        size: '4.7 GB',
        capabilities: ['vision', 'image-understanding'],
        bestFor: ['image-analysis', 'ocr'],
        notes: 'Model multimodalny - rozumie obrazy.'
    },

    'moondream:latest': {
        name: 'Moondream',
        family: 'moondream',
        size: '1.7 GB',
        capabilities: ['vision', 'lightweight'],
        bestFor: ['quick-image-analysis'],
        notes: 'Lekki model wizyjny.'
    }
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Get config for a model
 */
function getModelConfig(modelName) {
    // Handle variants like "qwen2.5:7b-instruct" -> "qwen2.5:7b"
    const normalized = modelName.toLowerCase();
    return MODEL_CONFIGS[normalized] || MODEL_CONFIGS[normalized.split('-')[0]] || null;
}

/**
 * Get recommended temperature for task type
 */
function getRecommendedTemperature(modelName, taskType = 'general') {
    const config = getModelConfig(modelName);
    if (!config) return 0.7; // default

    const params = config.recommendedParams || {};

    switch (taskType) {
        case 'classify':
        case 'classification':
            return params.temperature_classify || 0.1;
        case 'creative':
        case 'generation':
            return params.temperature || 0.7;
        case 'coding':
            return 0.2;
        default:
            return params.temperature || 0.7;
    }
}

/**
 * Get best model for task
 */
function getBestModelForTask(task) {
    const taskModels = {
        'classification': ['ministral-3:3b', 'qwen2.5:3b'],
        'discovery': ['qwen2.5:7b', 'mistral:latest'],
        'creative': ['qwen2.5:7b', 'llama3.1:latest'],
        'reasoning': ['deepseek-r1:latest', 'phi3:3.8b'],
        'coding': ['codellama:7b-instruct', 'deepseek-r1:latest'],
        'embedding': ['nomic-embed-text:latest', 'mxbai-embed-large:latest'],
        'vision': ['llava:latest', 'moondream:latest']
    };
    return taskModels[task] || ['qwen2.5:7b'];
}

/**
 * List all available models with metadata
 */
function listModels(filter = null) {
    return Object.entries(MODEL_CONFIGS)
        .filter(([name, config]) => {
            if (!filter) return true;
            if (filter === 'embedding') return config.type === 'embedding';
            if (filter === 'vision') return config.capabilities?.includes('vision');
            return config.capabilities?.includes(filter) || config.family === filter;
        })
        .map(([name, config]) => ({
            name,
            displayName: config.name,
            size: config.size,
            bestFor: config.bestFor
        }));
}

// ==========================================
// EXPORTS
// ==========================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MODEL_CONFIGS,
        getModelConfig,
        getRecommendedTemperature,
        getBestModelForTask,
        listModels
    };
}

// Browser export
if (typeof window !== 'undefined') {
    window.MODEL_CONFIGS = MODEL_CONFIGS;
    window.getModelConfig = getModelConfig;
    window.getRecommendedTemperature = getRecommendedTemperature;
    window.getBestModelForTask = getBestModelForTask;
}
