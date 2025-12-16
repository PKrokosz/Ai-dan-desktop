/**
 * @module automated-test
 * @description Automatyczny test sekwencyjny dla pipeline'u AI
 */

import { state } from './state.js';
import { runCustomPrompt } from './slash-commands.js';
import { addLog } from './ui-helpers.js';

export const TEST_SEQUENCE = [
    // --- Slash Commands ---
    { cmd: '/quest', label: 'Main Quest', inputField: 'Historia' },
    { cmd: '/q', label: 'Quest Shortcut', inputField: 'Historia' },
    { cmd: '/side', label: 'Side Quest', inputField: 'Historia' },
    { cmd: '/hook', label: 'Story Hooks', inputField: 'Historia' },
    { cmd: '/secret', label: 'Secret', inputField: 'Historia' },
    { cmd: '/analiza', label: 'Analysis', inputField: 'Relacje' },
    { cmd: '/cechy', label: 'Traits', inputField: 'Historia' },
    { cmd: '/frakcja', label: 'Faction', inputField: 'Historia' },
    { cmd: '/ksywka', label: 'Nickname', inputField: 'Historia' },
    { cmd: '/pomoc', label: 'Help' },

    // --- Context Mentions (@) ---
    { cmd: 'Test kontekstu: @imie', label: 'Ctx: Name', inputField: 'Imie postaci' },
    { cmd: 'Test kontekstu: @gildia', label: 'Ctx: Guild', inputField: 'Gildia' },
    { cmd: 'Test kontekstu: @slabosci', label: 'Ctx: Weakness', inputField: 'Słabości' },
    { cmd: 'Test kontekstu: @aspiracje', label: 'Ctx: Aspirations', inputField: 'Aspiracje' },
    { cmd: 'Test kontekstu: @historia', label: 'Ctx: History', inputField: 'Historia' },
    { cmd: 'Test kontekstu: @relacje', label: 'Ctx: Relations', inputField: 'Relacje' },
    { cmd: 'Test kontekstu: @sekret', label: 'Ctx: Secret', inputField: 'Sekret' },

    // --- Specific User Request ---
    { cmd: 'Test deep path: @cecha.imie', label: 'Deep Path: @cecha.imie', inputField: 'Imie postaci' }
];

let isTestRunning = false;
let currentTestIndex = 0;
let stopRequested = false;
let statusCallback = null;

/**
 * Uruchamia pełny test potoku (Pipeline Test)
 * @param {Function} onStatusUpdate - Callback (index, status, result)
 */
export async function runFullPipelineTest(onStatusUpdate = null) {
    if (isTestRunning) {
        addLog('warn', 'Test jest już w toku.');
        return;
    }

    if (state.selectedRow === null || state.selectedRow === undefined) {
        addLog('error', 'Wybierz postać przed rozpoczęciem testu.');
        return;
    }

    isTestRunning = true;
    stopRequested = false;
    currentTestIndex = 0;
    statusCallback = onStatusUpdate;

    addLog('info', '🚀 Rozpoczynanie automatycznego testu pipeline...');

    // Notify start
    if (statusCallback) statusCallback(-1, 'started');

    processNextTestStep();
}

export function stopPipelineTest() {
    stopRequested = true;
    addLog('warn', 'Zatrzymywanie testu...');
}

async function processNextTestStep() {
    if (stopRequested || currentTestIndex >= TEST_SEQUENCE.length) {
        addLog('success', stopRequested ? '🛑 Test zatrzymany.' : '✅ Automatyczny test zakończony pomyślnie.');
        if (statusCallback) statusCallback(-1, 'completed');
        isTestRunning = false;
        return;
    }

    const testItem = TEST_SEQUENCE[currentTestIndex];
    if (statusCallback) statusCallback(currentTestIndex, 'running');

    addLog('info', `🧪 [${currentTestIndex + 1}/${TEST_SEQUENCE.length}] ${testItem.label}: ${testItem.cmd}`);

    // Symulacja wpisania komendy
    const inp = document.getElementById('mainPromptInput');
    if (inp) inp.value = testItem.cmd;

    // Set prompt part manually because runCustomPrompt reads it
    if (window.updatePromptPart) window.updatePromptPart('goal', testItem.cmd);

    // Uruchomienie komendy
    try {
        await window.runCustomPrompt();

        // Polling until safe to proceed
        const checkInterval = setInterval(() => {
            if (!state.aiProcessing) {
                clearInterval(checkInterval);

                // Simple validation check: did we get a result?
                const lastItem = state.aiResultsFeed[state.aiResultsFeed.length - 1];
                const success = lastItem && !lastItem.content?.startsWith('❌');

                if (statusCallback) statusCallback(currentTestIndex, success ? 'success' : 'error', lastItem?.content);

                // Wait a small buffer before next step
                setTimeout(() => {
                    currentTestIndex++;
                    processNextTestStep();
                }, 1500);
            }
        }, 1000);
    } catch (e) {
        if (statusCallback) statusCallback(currentTestIndex, 'error', e.message);
        currentTestIndex++;
        processNextTestStep();
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.runFullPipelineTest = runFullPipelineTest;
    window.stopPipelineTest = stopPipelineTest;
}
