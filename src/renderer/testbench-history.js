// Update history dropdown
function updateHistoryDropdown() {
    const selector = document.getElementById('test-history-selector');
    if (!selector || !window.testbenchState.history) return;

    // Build options from history
    const options = [
        '<option value="current">📊 Aktualny wynik</option>',
        ...window.testbenchState.history.map((entry, index) => {
            const date = new Date(entry.timestamp);
            const timeStr = date.toLocaleString('pl-PL', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            const successRate = entry.metadata.successRate;
            const icon = successRate >= 70 ? '✅' : successRate >= 50 ? '⚠️' : '❌';

            return `<option value="${index}">${icon} ${timeStr} | ${entry.metadata.models.length}M × ${entry.metadata.scenarios.length}S | ${successRate}% sukces</option>`;
        })
    ];

    selector.innerHTML = options.join('');
}

// Load result from history
function loadHistoryResult(value) {
    if (value === 'current') {
        // Display current result
        if (window.testbenchState.lastSummary) {
            displayTestbenchResults(window.testbenchState.lastSummary);
        }
    } else {
        // Display historical result
        const index = parseInt(value);
        if (window.testbenchState.history && window.testbenchState.history[index]) {
            displayTestbenchResults(window.testbenchState.history[index].summary);
            addLog('info', `📑 Załadowano wyniki z ${new Date(window.testbenchState.history[index].timestamp).toLocaleString('pl-PL')}`);
        }
    }
}
