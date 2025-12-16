/**
 * @module character-test-runner
 * @description Automates the 18-step character testing sequence with consolidated UI
 */

import { addLog } from './ui-helpers.js';
import { state } from './state.js';

const TEST_PROMPTS = [
    "Test deep path: @cecha.imie",
    "Analizuj",
    "Test kontekstu: [@sekret?]",
    "Analizuj",
    "Test kontekstu: [@relacje?]",
    "Analizuj",
    "Test kontekstu: [@historia?]",
    "Analizuj",
    "Test kontekstu: [@aspiracje?]",
    "Analizuj",
    "Test kontekstu: [@slabosci?]",
    "Analizuj",
    "Analizuj",
    "Test kontekstu: [Imię: Vivienne]",
    "Analizuj",
    "/pomoc",
    "Analizuj",
    "/ksywka"
];

let isTestRunning = false;
let currentRunId = null;

// Global listener setup (idempotent)
if (window.electronAPI && window.electronAPI.onAIStream) {
    window.electronAPI.onAIStream((data) => {
        if (!isTestRunning || !currentRunId) return;

        const streamElem = document.getElementById(`test-stream-output-${currentRunId}`);
        if (streamElem && data.chunk) {
            // Append chunk to the stream display
            // "Szybko przemykające myśli" - maybe we just keep the last N chars or show flow?
            // Let's just append for now, CSS can handle "fleeting" if needed, 
            // but standard streaming is usually what is desired.

            const span = document.createElement('span');
            span.textContent = data.chunk;
            span.style.opacity = '0';
            span.style.transition = 'opacity 0.2s';
            streamElem.appendChild(span);

            // Trigger reflow for fade-in effect
            requestAnimationFrame(() => span.style.opacity = '1');

            // Auto-scroll
            streamElem.scrollTop = streamElem.scrollHeight;

            // Optional: Limit history for "fleeting" effect? 
            // If text gets too long, remove old children
            while (streamElem.childNodes.length > 50) { // Keep last ~50 chunks
                streamElem.removeChild(streamElem.firstChild);
            }
        }
    });
}

function createStatusCard(runId) {
    const feed = document.getElementById('ai-feed-content');
    if (!feed) return null;

    const div = document.createElement('div');
    div.className = 'ai-message bot';
    div.id = `test-card-${runId}`;
    div.style.borderLeft = '4px solid var(--gold)';
    div.style.background = 'rgba(0,0,0,0.2)';
    div.style.marginBottom = '200px'; // Ensure visibility above input bar
    div.innerHTML = `
        <div class="ai-avatar" style="background: var(--gold); color: black;">🧪</div>
        <div class="ai-message-content" style="width: 100%;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="margin: 0; color: var(--gold); font-size: 14px;">Test Postaci w toku...</h3>
                <span id="test-timer-${runId}" style="font-size: 12px; color: var(--text-dim);">00:00</span>
            </div>
            
            <div class="progress-container" style="background: #333; height: 6px; border-radius: 3px; margin-bottom: 15px; overflow: hidden;">
                <div id="test-progress-${runId}" style="width: 0%; height: 100%; background: var(--gold); transition: width 0.3s ease;"></div>
            </div>

            <div id="test-current-step-${runId}" style="margin-bottom: 10px; font-family: monospace; color: var(--text-bright); background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px;">
                Inicjalizacja...
            </div>

            <!-- Streaming Thoughts Area -->
            <div id="test-stream-container-${runId}" style="margin-bottom: 15px; display: none;">
                <div style="font-size: 10px; color: var(--gold-dim); text-transform: uppercase; margin-bottom: 4px;">Strumień Myśli</div>
                <div id="test-stream-output-${runId}" style="
                    height: 60px; 
                    overflow-y: hidden; 
                    font-family: 'Consolas', monospace; 
                    font-size: 11px; 
                    color: rgba(255, 255, 255, 0.6); 
                    line-height: 1.4;
                    white-space: pre-wrap;
                    mask-image: linear-gradient(to bottom, transparent, black 20%, black 80%, transparent);
                    -webkit-mask-image: linear-gradient(to bottom, transparent, black 20%, black 80%, transparent);
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-end;
                "></div>
            </div>

            <details id="test-details-${runId}" style="display: none;">
                <summary style="cursor: pointer; color: var(--text-dim); font-size: 12px;">Pokaż log operacji</summary>
                <div id="test-logs-${runId}" style="margin-top: 10px; max-height: 200px; overflow-y: auto; font-size: 11px; font-family: monospace; color: var(--text-dim);"></div>
            </details>
        </div>
    `;
    feed.appendChild(div);
    // Center the card to ensure it's not covered by the bottom input bar
    setTimeout(() => div.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    return div;
}

function updateStatus(runId, stepIndex, prompt, statusText) {
    const progress = document.getElementById(`test-progress-${runId}`);
    const stepLabel = document.getElementById(`test-current-step-${runId}`);
    const logs = document.getElementById(`test-logs-${runId}`);
    const details = document.getElementById(`test-details-${runId}`);
    const streamContainer = document.getElementById(`test-stream-container-${runId}`);
    const streamOutput = document.getElementById(`test-stream-output-${runId}`);

    if (progress) {
        const pct = Math.round(((stepIndex) / TEST_PROMPTS.length) * 100);
        progress.style.width = `${pct}%`;
    }
    if (stepLabel) {
        stepLabel.innerHTML = `
            <div style="color: var(--gold-dim); font-size: 10px; text-transform: uppercase;">Krok ${stepIndex + 1} / ${TEST_PROMPTS.length}</div>
            <div style="font-weight: bold;">${prompt}</div>
            <div style="margin-top: 4px; color: var(--text-dim); font-style: italic;">${statusText || 'Przetwarzanie...'}</div>
        `;
    }
    if (logs && statusText) {
        const entry = document.createElement('div');
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${statusText}`;
        logs.appendChild(entry);
        logs.scrollTop = logs.scrollHeight;
    }
    if (details && stepIndex > 0) {
        details.style.display = 'block';
    }

    // Reset/Show stream container
    if (streamContainer) {
        if (statusText === 'Wysyłanie zapytania...' || statusText.startsWith('G:')) {
            streamContainer.style.display = 'block';
        }
        // Clear stream on new step start
        if (statusText === 'Wysyłanie zapytania...' && streamOutput) {
            streamOutput.innerHTML = '';
        }
    }
}

export async function runCharacterTest() {
    if (isTestRunning) return;
    isTestRunning = true;

    // Use current time as RunID for generate.js mapping
    const startTimeResult = new Date();
    // Format to match logger filename roughly or just use ISO for filtering
    // generate.js expects a filter string.
    // If we pass ISO '2025-12-16T12:00:00', generate.js will look for files >= that.
    const runId = startTimeResult.toISOString().split('.')[0].replace(/:/g, '-');
    // Wait, generate.js filtering logic (which I updated) expects string comparison.
    // Logger uses: new Date().toISOString().replace(/:/g, '-')...
    // So we should be consistent.

    // We'll pass the exact timestamp "threshold" to generate.js
    const reportFilterId = new Date().toISOString().replace(/:/g, '-'); // slightly before?

    currentRunId = runId;

    createStatusCard(runId);

    const timerElem = document.getElementById(`test-timer-${runId}`);
    let seconds = 0;
    const interval = setInterval(() => {
        seconds++;
        if (timerElem) timerElem.textContent = new Date(seconds * 1000).toISOString().substr(14, 5);
    }, 1000);

    try {
        const profile = state.currentProfile || {};
        const model = state.currentModel || 'mistral:latest';

        for (let i = 0; i < TEST_PROMPTS.length; i++) {
            const prompt = TEST_PROMPTS[i];
            updateStatus(runId, i, prompt, 'Wysyłanie zapytania...');

            if (!window.electronAPI || !window.electronAPI.aiCommand) {
                throw new Error("Electron API niedostępne");
            }

            // Execute via IPC directly
            // ENABLE STREAM: true to trigger events
            // We use 'stream: true' but we also await the result?
            // aiCommand returns a FINAL result object even if stream was true (usually).
            // Based on ipc-handlers.js, it waits for 'done' and resolves `result.text`.

            const result = await window.electronAPI.aiCommand('chat', profile, {
                model: model,
                customPrompt: prompt,
                stream: true, // ENABLED STREAMING
                autoCorrect: false
            });

            if (result.success) {
                updateStatus(runId, i, prompt, `G: ${result.text ? result.text.substring(0, 50).replace(/\n/g, ' ') + '...' : 'OK'}`);
            } else {
                updateStatus(runId, i, prompt, `Błąd: ${result.error}`);
            }

            // Short delay
            await new Promise(r => setTimeout(r, 500));
        }

        clearInterval(interval);
        updateStatus(runId, TEST_PROMPTS.length, "Zakończono", "Generowanie raportu HTML...");

        // Generate Report
        if (window.electronAPI.generateReport) {
            // Pass the timestamp filter
            const result = await window.electronAPI.generateReport(reportFilterId);

            const card = document.getElementById(`test-card-${runId}`);
            if (card) {
                if (result.success) {
                    card.innerHTML = `
                        <div class="ai-avatar" style="background: var(--green); color: black;">✅</div>
                        <div class="ai-message-content">
                            <h3 style="margin: 0; color: var(--green);">Test Zakończony Pomyślnie</h3>
                            <div style="margin-top: 10px;">
                                Raport został wygenerowany.<br>
                                <a href="#" onclick="window.electronAPI.openOutputFolder(); return false;" style="color: var(--blue);">Otwórz folder wyników</a>
                            </div>
                            <div style="font-size: 11px; color: var(--text-dim); margin-top: 10px;">
                                Czas trwania: ${timerElem ? timerElem.textContent : '??'}
                            </div>
                        </div>
                    `;

                    // Add the "Łap gotowca" message as a separate bubble
                    const feed = document.getElementById('ai-feed-content');
                    if (feed) {
                        const dlDiv = document.createElement('div');
                        dlDiv.className = 'ai-message bot';
                        dlDiv.innerHTML = `
                            <div class="ai-avatar" style="background: var(--gold); color: black;">🦅</div>
                            <div class="ai-message-content">
                                <div>Łap gotowca, pastuszku:</div>
                                <div style="margin-top: 5px;">
                                    <a href="#" onclick="window.electronAPI.openFile('test_report.html'); return false;" 
                                       style="color: var(--gold); text-decoration: underline; font-weight: bold;">
                                       📄 Otwórz test_report.html
                                    </a>
                                </div>
                            </div>
                        `;
                        feed.appendChild(dlDiv);
                        feed.scrollTop = feed.scrollHeight;
                    }

                } else {
                    card.innerHTML += `<div style="color: red; margin-top: 10px;">Błąd raportu: ${result.error}</div>`;
                }
            }
        }

    } catch (e) {
        clearInterval(interval);
        addLog('error', `Test error: ${e.message}`);
        const card = document.getElementById(`test-card-${runId}`);
        if (card) card.innerHTML += `<div style="color: red;">CRITICAL ERROR: ${e.message}</div>`;
    } finally {
        isTestRunning = false;
        currentRunId = null;
        clearInterval(interval);
    }
}
