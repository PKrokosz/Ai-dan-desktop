/**
 * Ollama Models Database
 * Comprehensive list of models with categories and VRAM requirements
 */

const OLLAMA_MODELS = {
    // VRAM requirements by model size (4-bit quantization)
    vramBySize: {
        '0.5b': 1,
        '1b': 2,
        '1.5b': 2,
        '2b': 2,
        '3b': 3,
        '4b': 4,
        '7b': 8,
        '8b': 8,
        '13b': 16,
        '14b': 16,
        '27b': 24,
        '30b': 24,
        '32b': 24,
        '34b': 24,
        '70b': 48,
        '72b': 48,
        '120b': 80,
        '235b': 128,
        '671b': 256
    },

    categories: {
        'reasoning': {
            name: '🧠 Reasoning / Thinking',
            description: 'Modele z rozszerzonym rozumowaniem',
            models: [
                { id: 'deepseek-r1', name: 'DeepSeek R1', sizes: ['1.5b', '7b', '8b', '14b', '32b', '70b', '671b'], tags: ['thinking', 'tools'] },
                { id: 'qwq', name: 'QwQ', sizes: ['32b'], tags: ['thinking'] },
                { id: 'phi4-reasoning', name: 'Phi-4 Reasoning', sizes: ['14b'], tags: ['thinking'] },
                { id: 'phi4-mini-reasoning', name: 'Phi-4 Mini Reasoning', sizes: ['3.8b'], tags: ['thinking'] },
                { id: 'openthinker', name: 'OpenThinker', sizes: ['7b', '32b'], tags: ['thinking'] },
                { id: 'smallthinker', name: 'SmallThinker', sizes: ['3b'], tags: ['thinking'] },
                { id: 'marco-o1', name: 'Marco-O1', sizes: ['7b'], tags: ['thinking'] },
                { id: 'exaone-deep', name: 'EXAONE Deep', sizes: ['7.8b', '32b'], tags: ['thinking'] }
            ]
        },
        'general': {
            name: '💬 General Purpose',
            description: 'Modele ogólnego przeznaczenia',
            models: [
                { id: 'llama3.3', name: 'Llama 3.3', sizes: ['70b'], tags: ['tools'] },
                { id: 'llama3.2', name: 'Llama 3.2', sizes: ['1b', '3b'], tags: [] },
                { id: 'llama3.1', name: 'Llama 3.1', sizes: ['8b', '70b', '405b'], tags: ['tools'] },
                { id: 'llama3', name: 'Llama 3', sizes: ['8b', '70b'], tags: [] },
                { id: 'qwen3', name: 'Qwen 3', sizes: ['0.6b', '1.7b', '4b', '8b', '14b', '30b', '32b', '235b'], tags: ['tools', 'thinking'] },
                { id: 'qwen2.5', name: 'Qwen 2.5', sizes: ['0.5b', '1.5b', '3b', '7b', '14b', '32b', '72b'], tags: ['tools'] },
                { id: 'gemma3', name: 'Gemma 3', sizes: ['1b', '4b', '12b', '27b'], tags: ['vision'] },
                { id: 'gemma2', name: 'Gemma 2', sizes: ['2b', '9b', '27b'], tags: [] },
                { id: 'phi4', name: 'Phi-4', sizes: ['14b'], tags: [] },
                { id: 'phi4-mini', name: 'Phi-4 Mini', sizes: ['3.8b'], tags: [] },
                { id: 'phi3', name: 'Phi-3', sizes: ['3.8b', '14b'], tags: [] },
                { id: 'mistral', name: 'Mistral', sizes: ['7b'], tags: [] },
                { id: 'mistral-small', name: 'Mistral Small', sizes: ['22b'], tags: ['tools'] },
                { id: 'mistral-nemo', name: 'Mistral Nemo', sizes: ['12b'], tags: ['tools'] },
                { id: 'mixtral', name: 'Mixtral', sizes: ['8x7b', '8x22b'], tags: [] },
                { id: 'command-r', name: 'Command R', sizes: ['35b'], tags: ['tools'] },
                { id: 'command-r-plus', name: 'Command R+', sizes: ['104b'], tags: ['tools'] }
            ]
        },
        'coding': {
            name: '💻 Coding',
            description: 'Modele do programowania',
            models: [
                { id: 'qwen2.5-coder', name: 'Qwen 2.5 Coder', sizes: ['0.5b', '1.5b', '3b', '7b', '14b', '32b'], tags: ['tools'] },
                { id: 'qwen3-coder', name: 'Qwen 3 Coder', sizes: ['30b', '480b'], tags: ['tools'] },
                { id: 'deepseek-coder-v2', name: 'DeepSeek Coder V2', sizes: ['16b', '236b'], tags: [] },
                { id: 'deepseek-coder', name: 'DeepSeek Coder', sizes: ['1.3b', '6.7b', '33b'], tags: [] },
                { id: 'codellama', name: 'Code Llama', sizes: ['7b', '13b', '34b', '70b'], tags: [] },
                { id: 'codegemma', name: 'CodeGemma', sizes: ['2b', '7b'], tags: [] },
                { id: 'starcoder2', name: 'StarCoder 2', sizes: ['3b', '7b', '15b'], tags: [] },
                { id: 'codestral', name: 'Codestral', sizes: ['22b'], tags: [] },
                { id: 'devstral', name: 'Devstral', sizes: ['24b'], tags: ['tools'] },
                { id: 'granite-code', name: 'Granite Code', sizes: ['3b', '8b', '20b', '34b'], tags: [] },
                { id: 'opencoder', name: 'OpenCoder', sizes: ['1.5b', '8b'], tags: [] },
                { id: 'yi-coder', name: 'Yi Coder', sizes: ['1.5b', '9b'], tags: [] },
                { id: 'codeqwen', name: 'CodeQwen', sizes: ['7b'], tags: [] },
                { id: 'magicoder', name: 'Magicoder', sizes: ['7b'], tags: [] }
            ]
        },
        'vision': {
            name: '👁️ Vision (Multimodal)',
            description: 'Modele rozumiejące obrazy',
            models: [
                { id: 'llama3.2-vision', name: 'Llama 3.2 Vision', sizes: ['11b', '90b'], tags: ['vision'] },
                { id: 'llava', name: 'LLaVA', sizes: ['7b', '13b', '34b'], tags: ['vision'] },
                { id: 'llava-llama3', name: 'LLaVA Llama3', sizes: ['8b'], tags: ['vision'] },
                { id: 'llava-phi3', name: 'LLaVA Phi3', sizes: ['3.8b'], tags: ['vision'] },
                { id: 'qwen3-vl', name: 'Qwen3-VL', sizes: ['2b', '4b', '8b', '30b', '32b', '235b'], tags: ['vision', 'tools'] },
                { id: 'qwen2.5vl', name: 'Qwen 2.5 VL', sizes: ['3b', '7b', '32b', '72b'], tags: ['vision'] },
                { id: 'minicpm-v', name: 'MiniCPM-V', sizes: ['8b'], tags: ['vision'] },
                { id: 'moondream', name: 'Moondream', sizes: ['2b'], tags: ['vision'] },
                { id: 'bakllava', name: 'BakLLaVA', sizes: ['7b'], tags: ['vision'] },
                { id: 'granite3.2-vision', name: 'Granite 3.2 Vision', sizes: ['2b'], tags: ['vision'] }
            ]
        },
        'embedding': {
            name: '📊 Embedding',
            description: 'Modele do wektoryzacji tekstu',
            models: [
                { id: 'nomic-embed-text', name: 'Nomic Embed Text', sizes: ['137m'], tags: ['embedding'] },
                { id: 'mxbai-embed-large', name: 'MxBai Embed Large', sizes: ['335m'], tags: ['embedding'] },
                { id: 'bge-m3', name: 'BGE-M3', sizes: ['567m'], tags: ['embedding'] },
                { id: 'bge-large', name: 'BGE Large', sizes: ['335m'], tags: ['embedding'] },
                { id: 'all-minilm', name: 'All-MiniLM', sizes: ['23m', '33m'], tags: ['embedding'] },
                { id: 'snowflake-arctic-embed', name: 'Snowflake Arctic Embed', sizes: ['22m', '33m', '110m', '335m', '568m'], tags: ['embedding'] },
                { id: 'embeddinggemma', name: 'Embedding Gemma', sizes: ['300m'], tags: ['embedding'] },
                { id: 'paraphrase-multilingual', name: 'Paraphrase Multilingual', sizes: ['278m'], tags: ['embedding'] }
            ]
        },
        'roleplay': {
            name: '🎭 Roleplay / Uncensored',
            description: 'Modele bez ograniczeń, do RP',
            models: [
                { id: 'dolphin3', name: 'Dolphin 3', sizes: ['8b'], tags: [] },
                { id: 'dolphin-llama3', name: 'Dolphin Llama3', sizes: ['8b', '70b'], tags: [] },
                { id: 'dolphin-mistral', name: 'Dolphin Mistral', sizes: ['7b'], tags: [] },
                { id: 'dolphin-mixtral', name: 'Dolphin Mixtral', sizes: ['8x7b'], tags: [] },
                { id: 'llama2-uncensored', name: 'Llama2 Uncensored', sizes: ['7b', '70b'], tags: [] },
                { id: 'wizard-vicuna-uncensored', name: 'Wizard Vicuna Uncensored', sizes: ['7b', '13b', '30b'], tags: [] },
                { id: 'wizardlm-uncensored', name: 'WizardLM Uncensored', sizes: ['13b'], tags: [] },
                { id: 'nous-hermes', name: 'Nous Hermes', sizes: ['7b', '13b'], tags: [] },
                { id: 'nous-hermes2', name: 'Nous Hermes 2', sizes: ['10.7b', '34b'], tags: ['tools'] },
                { id: 'hermes3', name: 'Hermes 3', sizes: ['8b', '70b', '405b'], tags: ['tools'] },
                { id: 'openhermes', name: 'OpenHermes', sizes: ['7b'], tags: [] },
                { id: 'samantha-mistral', name: 'Samantha Mistral', sizes: ['7b'], tags: [] }
            ]
        },
        'small': {
            name: '🪶 Small / Edge',
            description: 'Lekkie modele na słaby sprzęt',
            models: [
                { id: 'tinyllama', name: 'TinyLlama', sizes: ['1.1b'], tags: [] },
                { id: 'tinydolphin', name: 'TinyDolphin', sizes: ['1.1b'], tags: [] },
                { id: 'smollm2', name: 'SmolLM2', sizes: ['135m', '360m', '1.7b'], tags: [] },
                { id: 'smollm', name: 'SmolLM', sizes: ['135m', '360m', '1.7b'], tags: [] },
                { id: 'qwen2.5:0.5b', name: 'Qwen 2.5 0.5B', sizes: ['0.5b'], tags: [] },
                { id: 'phi3:mini', name: 'Phi-3 Mini', sizes: ['3.8b'], tags: [] },
                { id: 'gemma3:1b', name: 'Gemma 3 1B', sizes: ['1b'], tags: [] },
                { id: 'stablelm2', name: 'StableLM 2', sizes: ['1.6b'], tags: [] },
                { id: 'orca-mini', name: 'Orca Mini', sizes: ['3b', '7b', '13b'], tags: [] }
            ]
        },
        'specialized': {
            name: '🔬 Specialized',
            description: 'Modele specjalistyczne',
            models: [
                { id: 'sqlcoder', name: 'SQLCoder', sizes: ['7b', '15b'], tags: [] },
                { id: 'meditron', name: 'Meditron', sizes: ['7b', '70b'], tags: [] },
                { id: 'medllama2', name: 'MedLlama2', sizes: ['7b'], tags: [] },
                { id: 'wizard-math', name: 'Wizard Math', sizes: ['7b', '13b', '70b'], tags: [] },
                { id: 'mathstral', name: 'Mathstral', sizes: ['7b'], tags: [] },
                { id: 'qwen2-math', name: 'Qwen2 Math', sizes: ['1.5b', '7b', '72b'], tags: [] },
                { id: 'reader-lm', name: 'Reader-LM', sizes: ['0.5b', '1.5b'], tags: [] },
                { id: 'duckdb-nsql', name: 'DuckDB NSQL', sizes: ['7b'], tags: [] },
                { id: 'nuextract', name: 'NuExtract', sizes: ['3.8b'], tags: [] }
            ]
        }
    },

    /**
     * Get all models flattened
     */
    getAllModels() {
        const all = [];
        for (const [catId, cat] of Object.entries(this.categories)) {
            for (const model of cat.models) {
                all.push({ ...model, category: catId, categoryName: cat.name });
            }
        }
        return all;
    },

    /**
     * Filter models by max VRAM (in GB)
     */
    filterByVram(maxVram) {
        const result = {};
        for (const [catId, cat] of Object.entries(this.categories)) {
            const filtered = cat.models.filter(model => {
                // Check if any size fits in VRAM
                return model.sizes.some(size => {
                    const sizeKey = size.replace(/[^0-9.bm]/gi, '').toLowerCase();
                    const required = this.vramBySize[sizeKey] || this.estimateVram(sizeKey);
                    return required <= maxVram;
                });
            }).map(model => ({
                ...model,
                // Filter sizes to only those that fit
                sizes: model.sizes.filter(size => {
                    const sizeKey = size.replace(/[^0-9.bm]/gi, '').toLowerCase();
                    const required = this.vramBySize[sizeKey] || this.estimateVram(sizeKey);
                    return required <= maxVram;
                })
            })).filter(m => m.sizes.length > 0);

            if (filtered.length > 0) {
                result[catId] = { ...cat, models: filtered };
            }
        }
        return result;
    },

    /**
     * Estimate VRAM for unknown sizes
     */
    estimateVram(sizeStr) {
        const match = sizeStr.match(/(\d+\.?\d*)([mb])/i);
        if (!match) return 999;
        const num = parseFloat(match[1]);
        const unit = match[2].toLowerCase();
        if (unit === 'm') return Math.ceil(num / 500); // ~500M per 1GB
        if (unit === 'b') return Math.ceil(num * 1.2); // ~1.2GB per 1B params (4-bit)
        return 999;
    },

    /**
     * Get recommended models for Agent MG use case
     */
    getRecommended() {
        return {
            extraction: [
                { id: 'phi4-mini', size: '3.8b', vram: 4, reason: 'Szybki, dobry do strukturyzacji JSON' },
                { id: 'qwen2.5:7b', size: '7b', vram: 8, reason: 'Balans jakości i szybkości' },
                { id: 'llama3.2:3b', size: '3b', vram: 3, reason: 'Lekki, na słabszy sprzęt' }
            ],
            generation: [
                { id: 'mistral', size: '7b', vram: 8, reason: 'Kreatywny, dobry do narracji' },
                { id: 'qwen3:8b', size: '8b', vram: 8, reason: 'Rozumowanie + kreatywność' },
                { id: 'gemma3:4b', size: '4b', vram: 4, reason: 'Kompaktowy z dobrą jakością' }
            ]
        };
    }
};

module.exports = OLLAMA_MODELS;
