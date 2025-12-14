/**
 * @module models-db
 * @description Baza danych modeli Ollama z funkcjami filtrowania VRAM
 * ES6 Module - Faza 2 modularizacji
 */

import { state } from './state.js';

// ==============================
// VRAM Requirements by Size
// ==============================
export const VRAM_BY_SIZE = {
    '0.5b': 1, '1b': 2, '1.5b': 2, '2b': 2, '3b': 3, '4b': 4, '7b': 8, '8b': 8,
    '13b': 16, '14b': 16, '27b': 24, '30b': 24, '32b': 24, '70b': 48, '72b': 48
};

// ==============================
// Model Categories
// ==============================
export const MODEL_CATEGORIES = {
    reasoning: {
        name: '🧠 Reasoning / Thinking',
        desc: 'Modele które "myślą" zanim odpowiedzą - lepsze do trudnych zadań',
        models: [
            { id: 'deepseek-r1', name: 'DeepSeek R1', sizes: ['1.5b', '7b', '8b', '14b', '32b', '70b'], tags: ['thinking'], desc: 'Bardzo mądry, pokazuje tok rozumowania' },
            { id: 'qwq', name: 'QwQ', sizes: ['32b'], tags: ['thinking'], desc: 'Chiński model myślący, świetny do matematyki' },
            { id: 'phi4-reasoning', name: 'Phi-4 Reasoning', sizes: ['14b'], tags: ['thinking'], desc: 'Microsoft, dobry stosunek jakości do rozmiaru' },
            { id: 'openthinker', name: 'OpenThinker', sizes: ['7b', '32b'], tags: ['thinking'], desc: 'Open source model myślący' },
            { id: 'exaone-deep', name: 'EXAONE Deep', sizes: ['7.8b', '32b'], tags: ['thinking'], desc: 'Koreański, dobry do analizy' }
        ]
    },
    general: {
        name: '💬 General Purpose',
        desc: 'Do wszystkiego - chatowanie, pisanie, Q&A',
        models: [
            { id: 'llama3.3', name: 'Llama 3.3', sizes: ['70b'], tags: ['tools'], desc: 'Najnowszy od Meta, bardzo mądry' },
            { id: 'llama3.2', name: 'Llama 3.2', sizes: ['1b', '3b'], tags: [], desc: 'Mały i szybki, dobry na start' },
            { id: 'llama3.1', name: 'Llama 3.1', sizes: ['8b', '70b'], tags: ['tools'], desc: 'Sprawdzony klasyk, stabilny' },
            { id: 'qwen3', name: 'Qwen 3', sizes: ['0.6b', '1.7b', '4b', '8b', '14b', '30b', '32b'], tags: ['tools', 'thinking'], desc: '🔥 Najlepszy chiński model, mega wszechstronny' },
            { id: 'qwen2.5', name: 'Qwen 2.5', sizes: ['0.5b', '1.5b', '3b', '7b', '14b', '32b', '72b'], tags: ['tools'], desc: 'Stabilna wersja, świetny do wielu zadań' },
            { id: 'gemma3', name: 'Gemma 3', sizes: ['1b', '4b', '12b', '27b'], tags: [], desc: 'Od Google, lekki i szybki' },
            { id: 'phi4', name: 'Phi-4', sizes: ['14b'], tags: [], desc: 'Microsoft, świetny na średnim sprzęcie' },
            { id: 'phi4-mini', name: 'Phi-4 Mini', sizes: ['3.8b'], tags: [], desc: '⭐ Polecany! Mały ale sprytny' },
            { id: 'mistral', name: 'Mistral', sizes: ['7b'], tags: [], desc: 'Francuski klasyk, szybki i dobry' },
            { id: 'mistral-nemo', name: 'Mistral Nemo', sizes: ['12b'], tags: ['tools'], desc: 'Nowszy Mistral z toolsami' }
        ]
    },
    coding: {
        name: '💻 Coding',
        desc: 'Specjaliści od programowania i kodu',
        models: [
            { id: 'qwen2.5-coder', name: 'Qwen 2.5 Coder', sizes: ['0.5b', '1.5b', '3b', '7b', '14b', '32b'], tags: ['tools'], desc: '⭐ Najlepszy do kodu, bardzo precyzyjny' },
            { id: 'deepseek-coder-v2', name: 'DeepSeek Coder V2', sizes: ['16b'], tags: [], desc: 'Chiński spec od kodu' },
            { id: 'codellama', name: 'Code Llama', sizes: ['7b', '13b', '34b', '70b'], tags: [], desc: 'Meta, dobry do dopełniania kodu' },
            { id: 'codegemma', name: 'CodeGemma', sizes: ['2b', '7b'], tags: [], desc: 'Google, lekki do kodu' },
            { id: 'starcoder2', name: 'StarCoder 2', sizes: ['3b', '7b', '15b'], tags: [], desc: 'BigCode, wiele języków programowania' },
            { id: 'codestral', name: 'Codestral', sizes: ['22b'], tags: [], desc: 'Mistral dla programistów' }
        ]
    },
    vision: {
        name: '👁️ Vision',
        desc: 'Widzą i rozumieją obrazki',
        models: [
            { id: 'llama3.2-vision', name: 'Llama 3.2 Vision', sizes: ['11b', '90b'], tags: ['vision'], desc: 'Meta, analizuje zdjęcia' },
            { id: 'llava', name: 'LLaVA', sizes: ['7b', '13b', '34b'], tags: ['vision'], desc: 'Rozpoznaje co jest na obrazku' },
            { id: 'llava-llama3', name: 'LLaVA Llama3', sizes: ['8b'], tags: ['vision'], desc: 'Nowsza wersja z Llama3' },
            { id: 'qwen3-vl', name: 'Qwen3-VL', sizes: ['2b', '4b', '8b', '30b'], tags: ['vision', 'tools'], desc: '⭐ Najlepszy do obrazów, wielozadaniowy' },
            { id: 'moondream', name: 'Moondream', sizes: ['2b'], tags: ['vision'], desc: 'Malutki ale widzi!' }
        ]
    },
    embedding: {
        name: '📊 Embedding',
        desc: 'Do wyszukiwania i RAG (nie do chatowania)',
        models: [
            { id: 'nomic-embed-text', name: 'Nomic Embed', sizes: ['137m'], tags: ['embedding'], desc: 'Popularny do wyszukiwania' },
            { id: 'mxbai-embed-large', name: 'MxBai Embed', sizes: ['335m'], tags: ['embedding'], desc: 'Duży embedding, dokładniejszy' },
            { id: 'bge-m3', name: 'BGE-M3', sizes: ['567m'], tags: ['embedding'], desc: 'Multilingual, wiele języków' },
            { id: 'all-minilm', name: 'All-MiniLM', sizes: ['23m', '33m'], tags: ['embedding'], desc: 'Maluteńki, szybki' }
        ]
    },
    roleplay: {
        name: '🎭 Roleplay / Uncensored',
        desc: 'Do kreatywnego pisania, bez cenzury',
        models: [
            { id: 'dolphin3', name: 'Dolphin 3', sizes: ['8b'], tags: [], desc: 'Bez filtrów, kreatywny' },
            { id: 'dolphin-llama3', name: 'Dolphin Llama3', sizes: ['8b', '70b'], tags: [], desc: 'Llama3 bez cenzury' },
            { id: 'llama2-uncensored', name: 'Llama2 Uncensored', sizes: ['7b', '70b'], tags: [], desc: 'Klasyk bez ograniczeń' },
            { id: 'nous-hermes2', name: 'Nous Hermes 2', sizes: ['10.7b', '34b'], tags: ['tools'], desc: 'Do storytellingu' },
            { id: 'hermes3', name: 'Hermes 3', sizes: ['8b', '70b'], tags: ['tools'], desc: 'Nowszy, lepszy do RP' }
        ]
    },
    small: {
        name: '🪶 Small / Edge',
        desc: 'Leciutkie, działają nawet na słabym sprzęcie',
        models: [
            { id: 'tinyllama', name: 'TinyLlama', sizes: ['1.1b'], tags: [], desc: 'Malutki ale działa!' },
            { id: 'smollm2', name: 'SmolLM2', sizes: ['135m', '360m', '1.7b'], tags: [], desc: 'Mikro-model od HuggingFace' },
            { id: 'phi3:mini', name: 'Phi-3 Mini', sizes: ['3.8b'], tags: [], desc: 'Microsoft, mały i mądry' },
            { id: 'gemma3:1b', name: 'Gemma 3 1B', sizes: ['1b'], tags: [], desc: 'Google, ultra lekki' },
            { id: 'orca-mini', name: 'Orca Mini', sizes: ['3b', '7b', '13b'], tags: [], desc: 'Zoptymalizowany do szybkości' }
        ]
    }
};

// ==============================
// Helper Functions
// ==============================

/**
 * Get VRAM requirement for a model size
 * @param {string} sizeStr - Size string like '7b', '70b', '1.5b'
 * @returns {number} VRAM in GB
 */
export function getVramForSize(sizeStr) {
    const key = sizeStr.replace(/[^0-9.bm]/gi, '').toLowerCase();
    if (VRAM_BY_SIZE[key]) return VRAM_BY_SIZE[key];

    const match = key.match(/(\d+\.?\d*)([mb])/i);
    if (!match) return 999;

    const num = parseFloat(match[1]);
    return match[2] === 'm' ? Math.ceil(num / 500) : Math.ceil(num * 1.2);
}

/**
 * Filter models by maximum VRAM
 * @param {number} maxVram - Maximum VRAM in GB
 * @returns {Object} Filtered categories
 */
export function filterModelsByVram(maxVram) {
    const result = {};

    for (const [catId, cat] of Object.entries(MODEL_CATEGORIES)) {
        const filtered = cat.models
            .filter(m => m.sizes.some(s => getVramForSize(s) <= maxVram))
            .map(m => ({ ...m, sizes: m.sizes.filter(s => getVramForSize(s) <= maxVram) }))
            .filter(m => m.sizes.length > 0);

        if (filtered.length > 0) {
            result[catId] = { ...cat, models: filtered };
        }
    }

    // Inject Local/Custom models (bypass VRAM filter)
    if (state.ollamaModels && state.ollamaModels.length > 0) {
        const knownIds = new Set();

        for (const cat of Object.values(MODEL_CATEGORIES)) {
            cat.models.forEach(m => knownIds.add(m.id));
        }

        const customModels = state.ollamaModels.filter(m => {
            return !Array.from(knownIds).some(id => m.name === id || m.name.startsWith(id + ':'));
        });

        if (customModels.length > 0) {
            result['custom'] = {
                name: '📂 Lokalne / Inne',
                desc: 'Modele znalezione na dysku (spoza listy oficjalnej)',
                models: customModels.map(m => {
                    const parts = m.name.split(':');
                    const base = parts[0];
                    const tag = parts[1] || 'latest';
                    return {
                        id: base,
                        name: m.name,
                        sizes: [tag],
                        tags: ['local'],
                        desc: 'Znaleziony lokalnie'
                    };
                })
            };
        }
    }

    return result;
}

/**
 * Get all model IDs across categories
 * @returns {Set<string>} Set of model IDs
 */
export function getAllModelIds() {
    const ids = new Set();
    for (const cat of Object.values(MODEL_CATEGORIES)) {
        cat.models.forEach(m => ids.add(m.id));
    }
    return ids;
}

// Legacy OLLAMA_MODELS object for backward compatibility
export const OLLAMA_MODELS = {
    vramBySize: VRAM_BY_SIZE,
    categories: MODEL_CATEGORIES,
    getVram: getVramForSize,
    filterByVram: filterModelsByVram
};

// Make globally available
if (typeof window !== 'undefined') {
    window.OLLAMA_MODELS = OLLAMA_MODELS;
}
