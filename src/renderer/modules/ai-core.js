/**
 * @module ai-core
 * @description Główne funkcje AI - runAI, budowanie kontekstu, optymalizacja promptów
 * ES6 Module - Faza 3 modularizacji
 */

import { state } from './state.js';
import { COMMAND_LABELS } from './config.js';
import { addLog, renderStep } from './ui-helpers.js';

// ==============================
// Prompt Configuration
// ==============================

/**
 * Update prompt configuration (nested path support)
 * @param {string} path - Dot-separated path like 'contexts.geography'
 * @param {*} value - Value to set
 */
export function updatePromptConfig(path, value) {
    const keys = path.split('.');
    let target = state.promptConfig;

    for (let i = 0; i < keys.length - 1; i++) {
        if (!target[keys[i]]) {
            target[keys[i]] = {};
        }
        target = target[keys[i]];
    }

    target[keys[keys.length - 1]] = value;
    renderStep();
}

// ==============================
// Model-Specific Optimization
// ==============================

/**
 * Get optimized system prompt for specific models
 * @param {string} modelName - Model name
 * @returns {string} System prompt
 */
export function getModelSpecificSystemPrompt(modelName) {
    const name = modelName.toLowerCase();
    const base = "Jesteś pomocnym asystentem AI. Odpowiadaj zawsze w języku polskim.";

    if (name.includes('qwen')) {
        return "Jesteś Qwen, stworzonym przez Alibaba Cloud. " + base;
    }
    if (name.includes('mistral')) {
        return "Zawsze pomagaj z szacunkiem i zgodnie z prawdą. " + base;
    }

    return base;
}

/**
 * Adjust prompt structure for specific models (Optimized for Ollama)
 * @param {Object} promptParts - Prompt parts
 * @param {string} modelName - Model name
 * @returns {Object} { system, prompt }
 */
export function applyModelOptimization(promptParts, modelName) {
    const name = modelName.toLowerCase();
    let system = getModelSpecificSystemPrompt(modelName);
    let userContent = '';

    // Build the core content from parts using Polish labels
    if (promptParts.role) system += `\nROLA: ${promptParts.role}`;
    if (promptParts.context) system += `\nKONTEKST: ${promptParts.context}`;
    if (promptParts.dod) system += `\nWYMAGANIA: ${promptParts.dod}`;
    if (promptParts.negative) system += `\nOGRANICZENIA (CZEGO UNIKAĆ): ${promptParts.negative}`;

    if (promptParts.examples) userContent += `PRZYKŁADY (Few-Shot):\n${promptParts.examples}\n\n`;
    if (promptParts.goal) userContent += `CEL/ZADANIE:\n${promptParts.goal}\n\n`;

    if (promptParts.useCoT) {
        userContent += `\nPrzeanalizuj to krok po kroku (Chain of Thought).\n`;
    }

    // Mistral: Prepend system to user prompt
    if (name.includes('mistral')) {
        return {
            system: null,
            prompt: `${system}\n\n${userContent}`
        };
    }

    return {
        system: system,
        prompt: userContent
    };
}

// ==============================
// Dynamic Context Building
// ==============================

/**
 * Build dynamic context based on Operator and Faction History
 * @param {Object} profile - Character profile
 * @param {string} commandType - AI command type
 * @returns {string} Context string
 */
export function buildDynamicContext(profile, commandType) {
    let context = [];

    // 1. Operator Style (Tone & Preferences)
    if (state.activeMgProfile) {
        const mg = state.activeMgProfile;
        context.push(`--- STYL MISTRZA GRY (${mg.name}) ---`);
        if (mg.style_strengths) context.push(`MOCNE STRONY: ${mg.style_strengths}`);
        if (mg.style_weaknesses) context.push(`OBSZARY DO WSPARCIA PRZEZ AI: ${mg.style_weaknesses}`);
        if (mg.preferences) context.push(`PREFERENCJE: ${mg.preferences}`);
        context.push('--- DYREKTYWA: Dopasuj output do powyższego stylu Mistrza Gry ---');
    }

    // 2. World Context (Lore, Weaknesses, Plots)
    if (state.worldContext) {
        const { weaknesses, plots, world, factions } = state.worldContext;

        // A. Weakness Analysis
        const weaknessCommands = ['extract_traits', 'potential_conflicts', 'story_hooks', 'secret', 'redemption_quest'];
        if (weaknessCommands.includes(commandType)) {
            context.push('--- KONTEKST LORE: SŁABOŚCI I ZAGROŻENIA ---');
            context.push(weaknesses);
        }

        // B. Plot & Intrigue Context
        const plotCommands = ['main_quest', 'side_quest', 'group_quest', 'potential_conflicts'];
        if (plotCommands.includes(commandType)) {
            context.push('--- KONTEKST LORE: INTRYGI I SPISKI ---');
            context.push(plots);
        }

        // C. Faction Context
        const guild = profile['Gildia'] || '';
        if (guild && factions) {
            if (['faction_suggestion', 'main_quest', 'analyze_relations', 'potential_conflicts'].includes(commandType)) {
                context.push('--- KONTEKST LORE: SYSTEM FRAKCJI ---');
                context.push(factions);
            }
        }

        // D. General World Context
        if (commandType === 'nickname' || commandType === 'story_hooks') {
            context.push('--- KONTEKST LORE: ŚWIAT I GEOGRAFIA ---');
            context.push(world);
        }
    } else {
        // Fallback if world context not loaded yet
        const guild = profile['Gildia'] || '';
        if (guild && state.factionHistory) {
            let relevantFactionKey = Object.keys(state.factionHistory).find(k =>
                guild.toLowerCase().includes(k.replace('Fabuła ', '').toLowerCase())
            );
            if (relevantFactionKey && state.factionHistory[relevantFactionKey]?.length) {
                context.push(`--- SKŁAD FRAKCJI (${relevantFactionKey}) ---`);
                context.push(`(Contains list of ${state.factionHistory[relevantFactionKey].length} members)`);
            }
        }
    }

    return context.join('\n\n');
}

// ==============================
// Main AI Execution
// ==============================

/**
 * Run AI command with streaming support
 * @param {string} commandType - AI command type
 */
export async function runAI(commandType) {
    if (state.aiProcessing) {
        addLog('warn', 'AI już przetwarza poprzednie polecenie...');
        return;
    }

    const profile = state.sheetData?.rows?.[state.selectedRow];
    if (!profile) {
        addLog('error', 'Brak wybranej postaci do przetworzenia.');
        return;
    }

    // Get selected model
    const modelSelect = document.getElementById('aiModelSelect');
    const selectedModel = modelSelect?.value || state.selectedModel || (state.ollamaModels?.[0]?.name);

    if (!selectedModel) {
        addLog('error', 'Brak modelu AI. Zainstaluj model w Ollama.');
        return;
    }

    const commandLabel = COMMAND_LABELS[commandType] || commandType;
    addLog('info', `🤖 Uruchamiam AI: ${commandLabel} (model: ${selectedModel})`);

    state.aiProcessing = true;
    state.aiCommand = commandLabel;
    state.aiResult = null;

    // Clear isNew flag for all previous items
    state.aiResultsFeed.forEach(item => item.isNew = false);

    // Push placeholder for streaming
    const newItemIndex = state.aiResultsFeed.length;
    state.aiResultsFeed.push({
        id: newItemIndex,
        itemType: 'ai',
        command: commandLabel,
        content: '',
        model: selectedModel,
        timestamp: new Date(),
        isNew: true,
        isStreaming: true
    });

    // Initialize stream state
    state.streamData = {
        active: true,
        cardIndex: newItemIndex,
        content: '',
        isThinking: false,
        thinkStartTime: 0
    };

    renderStep();

    try {
        // Build Dynamic Context
        const dynamicContext = buildDynamicContext(profile, commandType);

        const optimized = applyModelOptimization({
            role: 'Jesteś doświadczonym Mistrzem Gry w świecie Gothic LARP. Znam Kolonię Karną od podszewki. Pomagam tworzyć angażujące wątki fabularne, ale potrafię też prowadzić luźną rozmowę w klimacie.',
            context: `Świat gry to Górnicza Dolina z Gothic 1.\n\n${dynamicContext}`,
            dod: 'Jeśli to ZADANIE (quest, analiza): Output musi być GRYWALNY i ustrukturyzowany (## [Typ], ### Kontekst...). Jeśli to ROZMOWA: Odpowiadaj krótko i w klimacie, bez zbędnych nagłówków. Używaj języka POLSKIEGO.',
            negative: 'Nie używaj angielskich nazw. Nie moralizuj. Nie twórz postaci sprzecznych z lore.',
            examples: '',
            goal: commandLabel,
            useCoT: false
        }, selectedModel);

        const options = {
            model: selectedModel,
            temperature: state.aiTemperature || 0.7,
            promptConfig: state.promptConfig,
            system: optimized.system,
            stream: true
        };

        const result = await window.electronAPI.aiCommand(commandType, profile, options);

        // Check for immediate errors
        if (!result.success && result.error) {
            state.aiResult = `❌ Błąd: ${result.error}`;
            addLog('error', `AI błąd: ${result.error}`);
            state.aiProcessing = false;
            state.streamData.active = false;
            state.streamData.cardIndex = -1;
            renderStep();
        }
        // Success: streaming handler will manage state

    } catch (error) {
        state.aiResult = `❌ Błąd połączenia: ${error.message}`;
        addLog('error', `AI błąd: ${error.message}`);
        state.aiProcessing = false;
        state.aiCommand = null;
        state.streamData.active = false;
        state.streamData.cardIndex = -1;
        renderStep();
    }
}

// ==============================
// Queue Processing
// ==============================

/**
 * Run all AI commands sequentially
 */
export async function runAllSequentially() {
    if (state.aiProcessing) {
        addLog('warn', 'AI jest zajęte...');
        return;
    }

    state.showPromptHistory = true;

    state.executionQueue = [
        'extract_traits', 'analyze_relations', 'summarize',
        'main_quest', 'side_quest', 'redemption_quest', 'group_quest',
        'story_hooks', 'potential_conflicts', 'npc_connections',
        'nickname', 'faction_suggestion', 'secret'
    ];
    state.executionStatus = 'running';

    addLog('info', `🚀 Rozpoczynam sekwencyjne wykonywanie ${state.executionQueue.length} poleceń...`);
    renderStep();

    await processQueue();
}

/**
 * Process command queue
 */
export async function processQueue() {
    while (state.executionQueue.length > 0 && state.executionStatus === 'running') {
        if (state.currentStep !== 3) {
            state.executionStatus = 'idle';
            state.executionQueue = [];
            break;
        }

        const cmd = state.executionQueue.shift();
        renderStep();

        await runAI(cmd);

        if (state.executionStatus === 'paused') {
            addLog('info', '⏸ Wstrzymano wykonywanie kolejki.');
            break;
        }

        await new Promise(r => setTimeout(r, 500));
    }

    if (state.executionQueue.length === 0) {
        state.executionStatus = 'idle';
        addLog('success', '🏁 Zakończono sekwencyjne wykonywanie poleceń!');
    }

    renderStep();
}

/**
 * Toggle pause/resume queue
 */
export function togglePause() {
    if (state.executionStatus === 'running') {
        state.executionStatus = 'paused';
        renderStep();
    } else if (state.executionStatus === 'paused') {
        state.executionStatus = 'running';
        addLog('info', '▶ Wznawiam wykonywanie kolejki...');
        renderStep();
        processQueue();
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.runAI = runAI;
    window.runAllSequentially = runAllSequentially;
    window.togglePause = togglePause;
    window.updatePromptConfig = updatePromptConfig;
}
