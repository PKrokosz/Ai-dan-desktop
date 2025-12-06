/**
 * @module test-report-generator
 * @description Generuje HTML raporty z wyników testów modeli
 */

/**
 * Generuje pełny HTML raport z wyników testbencha
 */
function generateHTMLReport(summary) {
    const timestamp = new Date().toLocaleString('pl-PL');
    const totalTime = summary.detailedResults[0]?.timestamp
        ? calculateTotalTime(summary.detailedResults)
        : 'N/A';

    return `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Model Testbench - Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            color: #333;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            overflow: hidden;
        }

        header {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }

        header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }

        header p {
            opacity: 0.9;
            font-size: 1.1em;
        }

        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }

        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            text-align: center;
        }

        .stat-card h3 {
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }

        .stat-card .value {
            font-size: 2.5em;
            font-weight: bold;
            color: #2a5298;
        }

        .section {
            padding: 30px;
        }

        .section h2 {
            color: #2a5298;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        th {
            background: #2a5298;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }

        td {
            padding: 12px;
            border-bottom: 1px solid #e0e0e0;
        }

        tr:hover {
            background: #f5f5f5;
        }

        .score-bar {
            height: 20px;
            background: #e0e0e0;
            border-radius: 10px;
            overflow: hidden;
            position: relative;
        }

        .score-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea, #764ba2);
            transition: width 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.8em;
            font-weight: bold;
        }

        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: 600;
        }

        .badge-success {
            background: #10b981;
            color: white;
        }

        .badge-warning {
            background: #f59e0b;
            color: white;
        }

        .badge-error {
            background: #ef4444;
            color: white;
        }

        .winner {
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            color: white;
            padding: 15px;
            border-radius: 8px;
            margin: 10px 0;
            font-weight: 600;
        }

        .response-preview {
            background: #f8f9fa;
            padding: 15px;
            border-left: 4px solid #667eea;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            max-height: 200px;
            overflow-y: auto;
            margin-top: 10px;
            white-space: pre-wrap;
        }

        .collapsible {
            cursor: pointer;
            user-select: none;
        }

        .collapsible:hover {
            background: #f0f0f0;
        }

        .details {
            display: none;
            padding: 15px;
            background: #fafafa;
        }

        .details.active {
            display: block;
        }

        footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🧪 Model Testbench Report</h1>
            <p>Wygenerowano: ${timestamp}</p>
        </header>

        <div class="summary">
            <div class="stat-card">
                <h3>Wszystkie Testy</h3>
                <div class="value">${summary.totalTests}</div>
            </div>
            <div class="stat-card">
                <h3>Udane</h3>
                <div class="value" style="color: #10b981;">${summary.successfulTests}</div>
            </div>
            <div class="stat-card">
                <h3>Nieudane</h3>
                <div class="value" style="color: #ef4444;">${summary.failedTests}</div>
            </div>
            <div class="stat-card">
                <h3>Czas Łączny</h3>
                <div class="value" style="font-size: 1.5em;">${totalTime}</div>
            </div>
        </div>

        <div class="section">
            <h2>📊 Statystyki Modeli</h2>
            <table>
                <thead>
                    <tr>
                        <th>Model</th>
                        <th>Testy</th>
                        <th>Udane</th>
                        <th>Średni Score</th>
                        <th>Średni Czas</th>
                        <th>Tokeny (Prompt)</th>
                        <th>Tokeny (Response)</th>
                        <th>Tok/sek</th>
                    </tr>
                </thead>
                <tbody>
                    ${generateModelStatsRows(summary.modelStats)}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>🏆 Top Performers (Najlepsze modele per scenariusz)</h2>
            ${generateTopPerformers(summary.topPerformers)}
        </div>

        <div class="section">
            <h2>📂 Statystyki Kategorii</h2>
            ${generateCategoryStats(summary.categoryStats)}
        </div>

        <div class="section">
            <h2>📝 Szczegółowe Wyniki</h2>
            ${generateDetailedResults(summary.detailedResults)}
        </div>

        <footer>
            <p>Agent MG - Model Testbench Framework</p>
            <p>Generated with ❤️ for LARP Gothic</p>
        </footer>
    </div>

    <script>
        // Toggle collapsible sections
        document.querySelectorAll('.collapsible').forEach(el => {
            el.addEventListener('click', function() {
                const details = this.nextElementSibling;
                details.classList.toggle('active');
            });
        });
    </script>
</body>
</html>`;
}

function generateModelStatsRows(modelStats) {
    return Object.entries(modelStats)
        .map(([modelName, stats]) => {
            const scoreColor = stats.averageScore >= 70 ? '#10b981'
                : stats.averageScore >= 50 ? '#f59e0b'
                    : '#ef4444';

            return `
                <tr>
                    <td><strong>${modelName}</strong></td>
                    <td>${stats.totalTests}</td>
                    <td>${stats.successfulTests}</td>
                    <td>
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${stats.averageScore}%; background: ${scoreColor};">
                                ${stats.averageScore}%
                            </div>
                        </div>
                    </td>
                    <td>${stats.averageResponseTime}ms</td>
                    <td>${stats.tokenMetrics?.avgPromptTokens || 'N/A'}</td>
                    <td>${stats.tokenMetrics?.avgResponseTokens || 'N/A'}</td>
                    <td><strong>${stats.tokenMetrics?.avgTokensPerSecond || 'N/A'}</strong></td>
                </tr>
            `;
        })
        .join('');
}

function generateTopPerformers(topPerformers) {
    return topPerformers
        .map(perf => `
            <div class="winner">
                <strong>${perf.scenarioName}</strong><br>
                🏆 Winner: <strong>${perf.winnerModel}</strong> (${perf.score}% score)
            </div>
        `)
        .join('');
}

function generateCategoryStats(categoryStats) {
    return Object.entries(categoryStats)
        .map(([category, stats]) => `
            <div style="margin-bottom: 15px;">
                <strong style="font-size: 1.1em;">${category}</strong><br>
                Testy: ${stats.totalTests} | Udane: ${stats.successfulTests} | 
                Najlepszy model: <span class="badge badge-success">${stats.bestModel || 'N/A'}</span>
            </div>
        `)
        .join('');
}

function generateDetailedResults(results) {
    return results
        .map((result, index) => {
            const statusBadge = result.success
                ? `<span class="badge badge-success">✓ Success</span>`
                : `<span class="badge badge-error">✗ Failed</span>`;

            const evaluationBadge = result.evaluation && result.evaluation.passed
                ? `<span class="badge badge-success">PASS</span>`
                : `<span class="badge badge-warning">FAIL</span>`;

            return `
                <div style="margin-bottom: 10px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                    <div class="collapsible" style="padding: 15px; background: #fafafa;">
                        <strong>${index + 1}. ${result.modelName}</strong> - ${result.scenarioName} 
                        ${statusBadge}
                        ${result.evaluation ? evaluationBadge : ''}
                        ${result.evaluation ? `(Score: ${result.evaluation.scorePercent}%)` : ''}
                        <span style="float: right; color: #666;">${result.responseTime}ms</span>
                    </div>
                    <div class="details">
                        ${result.success ? `
                            <p><strong>Command Type:</strong> ${result.commandType}</p>
                            <p><strong>Prompt Variation:</strong> ${result.promptVariation}</p>
                            <p><strong>Response Length:</strong> ${result.responseLength} characters</p>
                            ${result.tokenMetrics ? `
                                <p><strong>Token Usage:</strong> ${result.tokenMetrics.promptTokens} prompt + ${result.tokenMetrics.responseTokens} response = ${result.tokenMetrics.totalTokens} total (${result.tokenMetrics.tokensPerSecond} tok/s)</p>
                            ` : ''}
                            
                            ${result.evaluation ? `
                                <h4 style="margin-top: 15px;">Evaluation Checks:</h4>
                                <ul>
                                    ${result.evaluation.checks.map(check => `
                                        <li>
                                            ${check.passed ? '✓' : '✗'} 
                                            <strong>${check.name}</strong>: ${check.message}
                                        </li>
                                    `).join('')}
                                </ul>
                            ` : ''}

                            <h4 style="margin-top: 15px;">Response Preview:</h4>
                            <div class="response-preview">${result.response ? escapeHtml(String(result.response).substring(0, 500)) + (String(result.response).length > 500 ? '...' : '') : 'No response'}</div>
                        ` : `
                            <p style="color: #ef4444;"><strong>Error:</strong> ${result.error}</p>
                        `}
                    </div>
                </div>
            `;
        })
        .join('');
}

function calculateTotalTime(results) {
    const totalMs = results.reduce((sum, r) => sum + (r.responseTime || 0), 0);
    const seconds = Math.round(totalMs / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

module.exports = {
    generateHTMLReport
};
