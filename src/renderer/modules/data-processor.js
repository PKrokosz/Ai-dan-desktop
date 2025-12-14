/**
 * @module data-processor
 * @description Handles the core AI processing loops, quest generation, and export logic.
 */

// ==============================
// AI Processing Loop
// ==============================

export async function processAI() {
    if (window.state.selectedRow === null) {
        if (window.addLog) window.addLog('warn', 'Najpierw wybierz postać w kroku 2');
        return;
    }

    // Need to access AppModules.renderStep if available, or window.renderStep
    // We assume window.renderStep is set by app.js or similar
    const renderStep = window.renderStep || (() => { });

    window.state.isProcessing = true;
    renderStep();

    const lanes = ['historia', 'relacje', 'aspiracje', 'slabosci', 'umiejetnosci', 'geolore'];

    for (let i = 0; i < lanes.length; i++) {
        const lane = lanes[i];
        const el = document.getElementById(`lane-${lane}`);
        if (el) {
            el.classList.add('processing');
            el.querySelector('.lane-status').textContent = 'Przetwarzam...';
        }

        if (window.addLog) window.addLog('info', `[${i + 1}/${lanes.length}] Przetwarzam: ${lane}`);
        if (window.setProgress) window.setProgress(Math.round((i / lanes.length) * 100), `Analizuję: ${lane}`);

        const result = await window.electronAPI.processLane(lane, window.state.sheetData?.rows[window.state.selectedRow]);

        if (result.success) {
            if (!window.state.laneResults) window.state.laneResults = [];
            window.state.laneResults.push(result);

            // Save extraction history
            window.state.promptHistory.push({
                type: 'extraction',
                command: `Ekstrakcja: ${lane}`,
                model: 'extraction',
                prompt: result.prompt,
                response: typeof result.result === 'object' ? JSON.stringify(result.result, null, 2) : result.result,
                timestamp: new Date()
            });

            // Refresh history if visible
            // We use global renderPromptHistory if available (proxy in app.js or direct module calls)
            // Ideally should use AppModules if possible, but app.js hasn't proxied it yet for *modules* to call.
            // We'll trust the global scope for now or check AppModules.
            if (window.state.showPromptHistory) {
                if (window.AppModules && window.AppModules.renderPromptHistory) {
                    window.AppModules.renderPromptHistory();
                } else if (window.renderPromptHistory) {
                    window.renderPromptHistory();
                }
            }
        }

        if (el) {
            el.classList.remove('processing');
            el.classList.add('done');
            el.querySelector('.lane-status').textContent = 'Gotowe';
        }
    }

    // Reduce profile
    const reduceResult = await window.electronAPI.reduceProfile(window.state.laneResults);
    window.state.profile = reduceResult.profile;

    window.state.isProcessing = false;
    if (window.setProgress) window.setProgress(100, 'AI Processing zakończone');
    if (window.addLog) window.addLog('success', 'Wszystkie ścieżki przetworzone');
}

// ==============================
// Quest Generation
// ==============================

export async function generateQuests() {
    if (window.addLog) window.addLog('info', 'Generowanie questów...');
    if (window.setProgress) window.setProgress(0, 'Generowanie questów...');

    const result = await window.electronAPI.generateQuests(window.state.profile);
    window.state.quests = result.quests;

    if (window.setProgress) window.setProgress(100, 'Questy wygenerowane');
    if (window.addLog) window.addLog('success', `Wygenerowano ${window.state.quests.length} questów`);
    if (window.renderStep) window.renderStep();
}

// ==============================
// Export Logic
// ==============================

export async function exportResults() {
    if (window.addLog) window.addLog('info', 'Eksportowanie wyników...');

    const result = await window.electronAPI.renderCards(window.state.profile, window.state.quests);

    if (result.success) {
        if (window.addLog) window.addLog('success', `Wyeksportowano do: ${result.outputPath}`);
    }
}

export async function openOutputFolder() {
    await window.electronAPI.openOutputFolder();
}

export function editProfile() {
    if (window.addLog) window.addLog('info', 'Edycja profilu - funkcja w trakcie implementacji');
    // TODO: Implement profile editor modal
}
