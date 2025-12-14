/**
 * @module slash-commands
 * @description Slash commands, runCustomPrompt, unified prompt execution
 * ES6 Module - Faza 8 modularizacji
 */

import { state } from './state.js';
import { addLog, renderStep } from './ui-helpers.js';
import { codexAgent } from './codex-agent.js';
import { applyModelOptimization } from './model-selector.js';

// ==============================
// Slash Command Definitions
// ==============================

export const SLASH_COMMANDS = {
    '/quest': 'quest_main',
    '/q': 'quest_main',
    '/side': 'side_quest',
    '/hook': 'story_hooks',
    '/secret': 'secret',
    '/analiza': 'analyze_relations',
    '/cechy': 'extract_traits',
    '/frakcja': 'faction_suggestion',
    '/ksywka': 'nickname',
    '/codex': 'codex_agent'
};

export const SLASH_COMMAND_LABELS = {
    '/quest': '🎯 Główny Quest',
    '/q': '🎯 Quest',
    '/side': '📜 Side Quest',
    '/hook': '🎣 Story Hook',
    '/secret': '🔒 Sekret',
    '/analiza': '🔍 Analiza',
    '/cechy': '✨ Cechy',
    '/frakcja': '⚔️ Frakcja',
    '/ksywka': '🏷️ Ksywka',
    '/codex': '🤖 Codex'
};

// ==============================
// Prompt Part Update
// ==============================

/**
 * Update prompt part in state
 * @param {string} part - Part name
 * @param {*} value - Value to set
 */
export function updatePromptPartLocal(part, value) {
    if (!state.promptParts) state.promptParts = {};
    state.promptParts[part] = value;
    // Mirror UI update logic from legacy app.js
    renderStep();
}

// ==============================
// Unified Prompt Execution
// ==============================

/**
 * Run custom prompt with unified logic
 */
export async function runCustomPrompt() {
    // 1. Validation
    if (state.aiProcessing) return;

    // 2. Get Input
    const promptText = (state.promptParts?.goal || '').trim() || document.getElementById('mainPromptInput')?.value.trim();
    if (!promptText) return;

    // 3. Get Profile
    const profile = state.sheetData?.rows?.[state.selectedRow];
    if (!profile) {
        addLog('error', 'Wybierz najpierw postać.');
        return;
    }

    // 4. Pre-process Input (Mentions & Slash Commands)
    let processedText = promptText;

    // Expand Mentions (legacy window.expandMentions)
    if (window.expandMentions && promptText.includes('@')) {
        const allProfiles = state.sheetData?.rows || [];
        processedText = window.expandMentions(promptText, profile, allProfiles);
    }

    // Handle Slash Commands
    if (window.SLASH_COMMAND_LABELS) {
        const slashMatch = Object.entries(window.SLASH_COMMAND_LABELS).find(([key]) =>
            processedText.toLowerCase().startsWith(key)
        );
        if (slashMatch) {
            const [cmd] = slashMatch;

            // SPECIAL HANDLER: Codex
            if (cmd === '/codex') {
                const instruction = processedText.substring(cmd.length).trim();
                await codexAgent.run(instruction);
                return;
            }

            processedText = processedText.substring(cmd.length).trim() || `Chcę ${cmd.substring(1)}`;
            console.log('🎯 Slash goal:', cmd, '→', processedText);
        }
    }

    // 5. Update UI (Feed & Input)
    if (!state.aiResultsFeed) state.aiResultsFeed = [];
    state.aiResultsFeed.push({
        type: 'user',
        content: processedText,
        isNew: true,
        timestamp: new Date()
    });

    // Clear UI Input
    if (typeof updatePromptPart === 'function') updatePromptPart('goal', '');
    const inp = document.getElementById('mainPromptInput');
    if (inp) inp.value = '';

    // Set Processing State
    state.aiProcessing = true;
    state.processingStatus = 'Analizuję...';
    renderStep();

    try {
        // 6. Conversation Flow Routing
        let useConversationFlow = false;

        if (window.electronAPI?.configGet) {
            useConversationFlow = (window.electronAPI.convFlowProcess !== undefined);
        }

        if (useConversationFlow) {
            const selectedModel = state.selectedModel || 'gemma2:2b';

            const result = await window.electronAPI.convFlowProcess(
                profile['Imie postaci'],
                processedText,
                profile,
                { model: selectedModel }
            );

            state.aiProcessing = false;

            if (result.success) {
                state.aiResultsFeed.push({
                    type: 'ai',
                    content: result.message,
                    metadata: { stage: result.stage, type: result.type },
                    isNew: true
                });

                if (!state.conversationFlow) state.conversationFlow = {};
                state.conversationFlow.convId = result.convId;
                state.conversationFlow.stage = result.stage;
                state.conversationFlow.active = true;

                if (result.type === 'FORCE_GENERATE') {
                    await runLegacyAICommand('custom', profile, {
                        customPrompt: result.recipe,
                        model: selectedModel,
                        stream: true
                    });
                }
            } else {
                state.aiResultsFeed.push({ type: 'ai', content: `❌ Błąd flow: ${result.error}` });
            }
        } else {
            // Legacy Path (Direct execution)
            await runLegacyAICommand('custom', profile, {
                customPrompt: processedText,
                stream: true
            });
        }

    } catch (error) {
        state.aiProcessing = false;
        state.aiResultsFeed.push({ type: 'ai', content: `❌ Błąd krytyczny: ${error.message}` });
        console.error('RunCustomPrompt Error:', error);
    } finally {
        if (state.aiProcessing && !state.streamData?.active) {
            state.aiProcessing = false;
            renderStep();
        }
    }
}

// ==============================
// Legacy AI Command Execution
// ==============================

/**
 * Run legacy/direct AI command with streaming
 * @param {string} type - Command type
 * @param {Object} profile - Character profile
 * @param {Object} options - Command options
 */
export async function runLegacyAICommand(type, profile, options) {
    const newItemIndex = state.aiResultsFeed.length;
    state.aiResultsFeed.push({
        id: newItemIndex,
        type: 'ai',
        command: options.customPrompt || type,
        content: '',
        model: options.model || state.selectedModel,
        timestamp: new Date(),
        isNew: true,
        isStreaming: true
    });

    state.streamData = {
        active: true,
        cardIndex: newItemIndex,
        content: '',
        isThinking: true,
        thinkStartTime: Date.now(),
        timerInterval: null
    };

    // Reset parser
    if (state.thinkingParser) {
        state.thinkingParser = typeof ThinkingParser !== 'undefined' ? new ThinkingParser() : null;
    }

    // Start timer
    if (state.streamData.timerInterval) clearInterval(state.streamData.timerInterval);
    state.streamData.timerInterval = setInterval(() => {
        if (state.aiProcessing && state.streamData.thinkStartTime) {
            const elapsed = ((Date.now() - state.streamData.thinkStartTime) / 1000).toFixed(1);
            const timerEl = document.getElementById('thinking-timer-display');
            if (timerEl) timerEl.textContent = `(${elapsed}s)`;
        }
    }, 100);

    state.aiProcessing = true;
    renderStep();

    const aiResult = await window.electronAPI.aiCommand(type, profile, options);

    if (!aiResult.success) {
        if (state.streamData.timerInterval) clearInterval(state.streamData.timerInterval);

        state.aiResultsFeed[newItemIndex].content = `❌ Błąd: ${aiResult.error}`;
        state.aiResultsFeed[newItemIndex].isStreaming = false;
        state.aiProcessing = false;
        state.streamData.active = false;
        renderStep();
    }
}

// ==============================
// Result Actions
// ==============================

/**
 * Copy AI result to clipboard
 * @param {number} index - Result index
 */
export function copyAIResult(index) {
    const item = state.aiResultsFeed?.[index];
    if (item?.content) {
        navigator.clipboard.writeText(item.content).then(() => {
            addLog('success', 'Skopiowano do schowka');
        }).catch(err => {
            addLog('error', 'Błąd kopiowania: ' + err.message);
        });
    }
}

/**
 * Save AI result to profile
 * @param {number} index - Result index
 */
export function saveAIResult(index) {
    const item = state.aiResultsFeed?.[index];
    if (item?.content && state.selectedRow !== null) {
        const profile = state.sheetData?.rows?.[state.selectedRow];
        if (profile) {
            if (!profile.savedResults) profile.savedResults = [];
            profile.savedResults.push({
                content: item.content,
                command: item.command,
                timestamp: new Date()
            });
            addLog('success', 'Zapisano do profilu postaci');
        }
    }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 */
export function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        addLog('success', 'Skopiowano');
    }).catch(err => {
        addLog('error', 'Błąd: ' + err.message);
    });
}

/**
 * Save specific result to profile
 * @param {string} content - Content to save
 * @param {string} type - Result type
 */
export function saveSpecificResult(content, type) {
    if (content && state.selectedRow !== null) {
        const profile = state.sheetData?.rows?.[state.selectedRow];
        if (profile) {
            if (!profile.savedResults) profile.savedResults = [];
            profile.savedResults.push({
                content: content,
                type: type,
                timestamp: new Date()
            });
            addLog('success', `Zapisano ${type} do profilu`);
        }
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.SLASH_COMMANDS = SLASH_COMMANDS;
    window.SLASH_COMMAND_LABELS = SLASH_COMMAND_LABELS;
    window.runCustomPrompt = runCustomPrompt;
    window.runLegacyAICommand = runLegacyAICommand;
    window.copyAIResult = copyAIResult;
    window.saveAIResult = saveAIResult;
    window.copyToClipboard = copyToClipboard;
    window.saveSpecificResult = saveSpecificResult;
}
