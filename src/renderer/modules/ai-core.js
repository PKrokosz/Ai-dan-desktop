/**
 * @module ai-core
 * @description Główne funkcje AI - runAI, budowanie kontekstu, optymalizacja promptów
 * ES6 Module - Faza 3 modularizacji
 */

import { state } from './state.js';
import { COMMAND_LABELS } from './config.js';
import { addLog, renderStep } from './ui-helpers.js';
import ContextManager from './context-manager.js';

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
// [REMOVED] Legacy buildDynamicContext - Replaced by ContextManager

// ==============================
// Main AI Execution
// ==============================

/**
 * Run AI command with streaming support
 * @param {string} commandType - AI command type
 */
/**
 * Run AI command with streaming support
 * @param {string} commandType - AI command type
 * @param {Object|null} overrideProfile - Optional profile override
 * @param {Object} options - Extra options (customGoal, etc.)
 */
export async function runAI(commandType, overrideProfile = null, options = {}) {
    if (state.aiProcessing) {
        addLog('warn', 'AI już przetwarza poprzednie polecenie...');
        return;
    }

    const profile = overrideProfile || state.sheetData?.rows?.[state.selectedRow];
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

    // Determine Label and Goal
    // If options.customGoal is present (from Chat), use it as the label
    const commandLabel = options.customGoal || COMMAND_LABELS[commandType] || commandType;
    addLog('info', `🤖 Uruchamiam AI: ${commandLabel.substring(0, 50)}${commandLabel.length > 50 ? '...' : ''} (model: ${selectedModel})`);

    state.aiProcessing = true;
    state.aiCommand = commandLabel;

    state.aiResult = null;

    // AUTO-ACTIVATE INTELLIGENT FLOW for Chat/Custom inputs
    if (!COMMAND_LABELS[commandType] && state.conversationFlow) {
        if (!state.conversationFlow.active) {
            state.conversationFlow.active = true;
            state.conversationFlow.stage = 'IDLE';
            state.conversationFlow.currentLayer = 0;
            state.conversationFlow.intent = null;
            addLog('info', '🔹 Tryb Konwersacji: Aktywowano (Stage 0 - Szybki Start)');
        }
    }

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
        thinkStartTime: Date.now(), // Start time for total duration
        timerInterval: null
    };

    renderStep();

    // Start Live Timer
    const loadingInd = document.getElementById('ai-loading-indicator');
    const timerDisplay = document.getElementById('thinking-timer-display');
    const thinkingDots = loadingInd ? loadingInd.querySelector('.thinking-dots') : null;

    if (timerDisplay) {
        state.streamData.timerInterval = setInterval(() => {
            const elapsed = ((Date.now() - state.streamData.thinkStartTime) / 1000).toFixed(1);
            timerDisplay.textContent = `(${elapsed}s)`;

            // Dynamic Status Update
            if (thinkingDots) {
                if (elapsed > 2.0 && elapsed < 5.0) thinkingDots.textContent = 'Ładowanie wiedzy...';
                else if (elapsed >= 5.0 && elapsed < 15.0) thinkingDots.textContent = 'Generowanie...';
                else if (elapsed >= 15.0) thinkingDots.textContent = 'Wciąż pracuję...';
            }
        }, 100);
    }

    try {
        // ===============================================
        // INTELLIGENT CONTEXT LOADING (State-Based)
        // ===============================================
        let systemContext = '';

        // Default (Layer 0 + Stats) - Fallback for Buttons
        if (!state.conversationFlow?.active) {
            systemContext = ContextManager.getProfileStats(profile);
            // Optionally add Layer 1 for context richness if needed, but keep it light
            // systemContext += await ContextManager.getLayer1_Identity(profile['Imie postaci']);
        } else {
            // Layer 1: Identity
            if (state.conversationFlow.currentLayer >= 1) {
                const identity = await ContextManager.getLayer1_Identity(profile['Imie postaci']);
                systemContext += identity;
            }
            // Layer 2: Relations
            if (state.conversationFlow.currentLayer >= 2) {
                const relations = await ContextManager.getLayer2_Relations(profile);
                systemContext += relations;
            }
            // Layer 3: World
            if (state.conversationFlow.currentLayer >= 3 && state.conversationFlow.intent) {
                const world = await ContextManager.getLayer3_World(state.conversationFlow.intent);
                systemContext += world;
            }
        }

        // STRICT LANGUAGE ENFORCEMENT (RECENCY BIAS)
        systemContext += `\n\n[SZYBKA INSTRUKCJA KOŃCOWA]\n1. Odpowiadaj WYŁĄCZNIE w języku POLSKIM.\n2. Zachowaj klimat Gothic (brutalny, surowy).\n3. Nie używaj anglicyzmów.`;

        // Optimizing Prompt
        const optimized = applyModelOptimization({
            role: 'Jesteś doświadczonym Mistrzem Gry w świecie Gothic LARP. Znam Kolonię Karną od podszewki. Pomagam tworzyć angażujące wątki fabularne, ale potrafię też prowadzić luźną rozmowę w klimacie.',
            context: `Świat gry to Górnicza Dolina z Gothic 1.\n\n${systemContext}`,
            dod: 'Jeśli to ZADANIE (quest, analiza): Output musi być GRYWALNY i ustrukturyzowany (## [Typ], ### Kontekst...). Jeśli to ROZMOWA: Odpowiadaj krótko i w klimacie, bez zbędnych nagłówków. Używaj języka POLSKIEGO.',
            negative: 'Nie używaj angielskich nazw. Nie moralizuj. Nie twórz postaci sprzecznych z lore.',
            examples: '',
            goal: commandLabel,
            useCoT: false
        }, selectedModel);

        // Context Suppression for Stage 0
        // We force-disable all external contexts (RAG, System, Geography) to ensure raw speed.
        const isStage0 = (!state.conversationFlow?.active) || (state.conversationFlow?.currentLayer === 0);

        const effectivePromptConfig = isStage0 ? {
            ...state.promptConfig,
            contexts: {
                geography: false,
                system: false,
                factions: false,
                magic: false,
                bestiary: false
            }
        } : state.promptConfig;

        // Backend Call Preparation
        // If commandType is 'chat', we must tell the backend it's a 'custom' prompt with specific content
        const backendCommandType = (commandType === 'chat') ? 'custom' : commandType;
        const backendOptions = {
            ...options,
            model: selectedModel,
            temperature: state.aiTemperature || 0.7,
            promptConfig: effectivePromptConfig,
            system: optimized.system,
            stream: true,
            // If chat/custom, pass the text as customPrompt
            customPrompt: (commandType === 'chat' || commandType === 'custom') ? commandLabel : undefined,

            // Optimization Flags for Stage 0 (Chat)
            disableRAG: isStage0,
            autoCorrect: isStage0 ? false : undefined, // Disable if Stage 0, else default
            disableIndexing: isStage0 // Don't index casual chat to keep vector store clean? Or maybe we DO want to index it?
            // User complained about "Vector store saved" (46.9s). So let's disable it for speed.
        };

        const result = await window.electronAPI.aiCommand(backendCommandType, profile, backendOptions);

        // Check for immediate errors
        if (!result.success && result.error) {
            state.aiResult = `❌ Błąd: ${result.error}`;
            addLog('error', `AI błąd: ${result.error}`);
            state.aiProcessing = false;

            if (state.streamData.timerInterval) clearInterval(state.streamData.timerInterval);
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

        if (state.streamData && state.streamData.timerInterval) clearInterval(state.streamData.timerInterval);
        if (state.streamData) {
            state.streamData.active = false;
            state.streamData.cardIndex = -1;
        }
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
