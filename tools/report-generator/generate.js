const fs = require('fs');
const path = require('path');

// Get runID from arguments (optional)
const runId = process.argv[2];
// Expected format: YYYY-MM-DDTHH-mm-ss
// We filter files where filename (timestamp) >= runId

const logsDir = path.join(__dirname, '..', '..', 'logs', 'generations');

let logFiles = [];

try {
    if (fs.existsSync(logsDir)) {
        const allFiles = fs.readdirSync(logsDir).filter(f => f.endsWith('.json'));

        if (runId) {
            // Filter files created AFTER or AT the start time of the test
            // Filename format example: 2025-12-16T07-57-11-143Z_...
            // runId format example:    2025-12-16T07-57-00
            logFiles = allFiles.filter(f => f >= runId).map(f => path.join(logsDir, f));
            console.log(`Found ${logFiles.length} log files for runId: ${runId}`);
        } else {
            // Default: Last 20 files
            logFiles = allFiles.sort().slice(-20).map(f => path.join(logsDir, f));
            console.log(`No runId provided. Using last ${logFiles.length} log files.`);
        }
    } else {
        console.error(`Logs directory not found: ${logsDir}`);
    }
} catch (e) {
    console.error("Error reading logs directory:", e);
}

logFiles.sort();

if (logFiles.length === 0) {
    console.warn("⚠️ No log files found! Report will be empty.");
}

// === ANALITYKA ===
const analytics = {
    totalTests: logFiles.length,
    totalTokens: 0,
    totalTime: 0,
    speeds: [],
    commands: {},
    models: {},
    slowest: null,
    fastest: null
};

logFiles.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf-8');
        const data = JSON.parse(content);

        // Rozpoznawanie komendy
        let cmd = 'nieznana';
        const prompt = data.prompt ? data.prompt.trim() : '';

        if (prompt.startsWith('/')) {
            cmd = prompt.match(/^\/(\w+)/)?.[1] || 'slash-blad';
        } else if (prompt.match(/^(Analizuj|Test|Generuj)/i)) {
            cmd = prompt.match(/^(\w+)/)?.[1].toLowerCase() || 'akcja';
        } else if (prompt.includes('kontekst')) {
            cmd = 'test-kontekstu';
        } else {
            cmd = 'custom';
        }

        const metrics = {
            tokens: data.stats?.evalCount || 0,
            time: data.stats?.evalDuration ? (data.stats.evalDuration / 1000000000) : 0,
            speed: 0
        };
        metrics.speed = metrics.tokens && metrics.time ? Math.round(metrics.tokens / metrics.time) : 0;

        analytics.totalTokens += metrics.tokens;
        analytics.totalTime += metrics.time;
        analytics.speeds.push(metrics.speed);

        analytics.commands[cmd] = (analytics.commands[cmd] || 0) + 1;
        analytics.models[data.model] = (analytics.models[data.model] || 0) + 1;

        if (!analytics.slowest || metrics.speed < analytics.slowest.speed) {
            analytics.slowest = { cmd, speed: metrics.speed, file: path.basename(file) };
        }
        if (!analytics.fastest || metrics.speed > analytics.fastest.speed) {
            analytics.fastest = { cmd, speed: metrics.speed, file: path.basename(file) };
        }
    } catch (err) {
        console.warn(`Skipping invalid file ${file}:`, err.message);
    }
});

// Avoid division by zero
if (analytics.totalTests > 0) {
    analytics.avgSpeed = Math.round(analytics.speeds.reduce((a, b) => a + b, 0) / analytics.speeds.length);
    analytics.avgTokens = Math.round(analytics.totalTokens / analytics.totalTests);
    analytics.avgTime = (analytics.totalTime / analytics.totalTests).toFixed(2);
} else {
    analytics.avgSpeed = 0;
    analytics.avgTokens = 0;
    analytics.avgTime = 0;
    analytics.slowest = { cmd: 'N/A', speed: 0 };
    analytics.fastest = { cmd: 'N/A', speed: 0 };
}


// === GENEROWANIE NARRACJI ===
const narratives = [];

logFiles.forEach((file, idx) => {
    try {
        const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
        const parsed = parseResponse(data.response);

        if (!parsed) {
            narratives.push(`**Test ${idx + 1}:** Odpowiedź nie była w formacie JSON.`);
            return;
        }

        let narrative = '';
        const cmd = data.prompt ? data.prompt.trim() : 'Unknown';

        // Ksywka
        if (parsed.dane?.ksywka) {
            narrative = `AI zaproponowało ksywkę **"${parsed.dane.ksywka}"** dla postaci ${parsed.dane.postać || 'Vivienne'}`;
            if (parsed.dane.uzasadnienie) {
                narrative += `, argumentując: _"${parsed.dane.uzasadnienie.substring(0, 150)}..."_`;
            }
        }
        // Analiza intencji
        else if (parsed.intent) {
            narrative = `AI rozpoznało intencję: **${parsed.intent}** (pewność: ${parsed.confidence})`;
            if (parsed.reply) {
                const cleanReply = typeof parsed.reply === 'string'
                    ? parsed.reply.substring(0, 200)
                    : JSON.stringify(parsed.reply).substring(0, 200);
                narrative += `. Odpowiedź: _"${cleanReply}..."_`;
            }
        }
        // Analiza relacji
        else if (parsed.reply?.słabości || parsed.reply?.potencjał) {
            narrative = `AI przeanalizowało postać: `;
            if (parsed.reply.słabości) {
                narrative += `**Słabości:** ${parsed.reply.słabości.substring(0, 150)}... `;
            }
            if (parsed.reply.potencjał) {
                narrative += `**Potencjał:** ${parsed.reply.potencjał.substring(0, 150)}...`;
            }
        }
        // Ogólny proces myślowy
        else if (parsed._thought_process || parsed._meta?._thought_process) {
            narrative = `AI przeprowadziło wewnętrzną analizę i wygenerowało strukturalny output.`;
        }
        // Fallback
        else {
            const keys = Object.keys(parsed).filter(k => !k.startsWith('_')).slice(0, 3);
            narrative = `AI wygenerowało output zawierający: ${keys.map(k => `**${k}**`).join(', ')}`;
        }

        narratives.push(`**Test ${idx + 1} (${cmd.substring(0, 30)}${cmd.length > 30 ? '...' : ''}):** ${narrative}`);
    } catch (err) {
        narratives.push(`**Test ${idx + 1}:** Błąd odczytu pliku.`);
    }
});

// === EKSTRAKCJA PROFILU POSTACI ===
let characterCard = null;
if (logFiles.length > 0) {
    try {
        const firstFile = logFiles[0];
        const firstData = JSON.parse(fs.readFileSync(firstFile, 'utf-8'));
        if (firstData.system) {
            const systemLines = firstData.system.split('\n');
            const profile = {};

            // Pola do wyciągnięcia
            const fields = [
                { key: 'name', marker: 'IMIE:' },
                { key: 'guild', marker: 'GILDIA:' },
                { key: 'weaknesses', marker: 'SLABOSCI:' },
                { key: 'background', marker: 'Fakty:' },
                { key: 'crime', marker: 'Wina:' },
                { key: 'future', marker: 'Przyszlosc:' },
                { key: 'quests', marker: 'Questy:' },
                { key: 'status', marker: 'Status:' },
                { key: 'discord', marker: 'Discord:' },
                { key: 'tags', marker: 'Tags:' },
                { key: 'edition', marker: 'Edycja:' }
            ];

            fields.forEach(({ key, marker }) => {
                const line = systemLines.find(l => l.trim().startsWith(marker));
                if (line) {
                    const value = line.split(marker)[1]?.trim();
                    if (value && value !== '[object Object]' && value !== '') {
                        profile[key] = value;
                    }
                }
            });

            // === INTEGRACJA TABELI PODSUMOWAŃ I PYTAŃ ===
            const summaryPath = path.join(__dirname, '..', '..', 'docs', 'parsed', 'tabela podsumowan.txt');
            if (fs.existsSync(summaryPath)) {
                const summaryContent = fs.readFileSync(summaryPath, 'utf-8');
                const entries = summaryContent.split('### Wpis');

                if (profile.name) {
                    const targetName = profile.name.toLowerCase().trim();
                    for (const entry of entries) {
                        const nameMatch = entry.match(/\*\*name\*\*:(.+)/);
                        if (nameMatch) {
                            const entryName = nameMatch[1].trim().toLowerCase();
                            if (entryName === targetName) {
                                const summaryMatch = entry.match(/\*\*summary\*\*:(.+?)(?=\*\*|$)/s);
                                if (summaryMatch) profile.lastSummary = summaryMatch[1].trim();

                                const classMatch = entry.match(/\*\*class\*\*:(.+?)(?=\*\*|$)/);
                                if (classMatch) profile.summaryClass = classMatch[1].trim();

                                profile.answers = {};
                                for (let i = 1; i <= 20; i++) {
                                    const ansKey = `ans${i}`;
                                    const ansMatch = entry.match(new RegExp(`\\*\\*${ansKey}\\*\\*:(.+?)(?=\\*\\*|$)`, 's'));
                                    if (ansMatch) {
                                        const val = ansMatch[1].trim();
                                        if (val && val !== 'NULL') {
                                            profile.answers[ansKey] = val;
                                        }
                                    }
                                }
                                break;
                            }
                        }
                    }
                }
            }
            characterCard = Object.keys(profile).length > 0 ? profile : null;
        }
    } catch (e) {
        console.error("Error extracting character profile:", e);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text.toString().replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function extractCommand(prompt) {
    if (!prompt) return 'unknown';
    const trimmed = prompt.trim();

    if (trimmed.startsWith('/')) {
        const match = trimmed.match(/^\/(\w+)/);
        return match ? `/${match[1]}` : '/unknown';
    } else if (trimmed.match(/^(Analizuj|Test|Generuj)/i)) {
        const match = trimmed.match(/^(\w+)/);
        return match ? match[1] : 'akcja';
    } else if (trimmed.includes('kontekst')) {
        return 'test-kontekstu';
    }
    return 'custom';
}

function parseResponse(responseText) {
    if (!responseText) return null;
    try {
        let clean = responseText.replace(/^```json\s*/gm, '').replace(/^```\s*/gm, '');
        return JSON.parse(clean);
    } catch (e) {
        return null;
    }
}

function extractKeyInfo(parsedJson) {
    if (!parsedJson) return null;
    return {
        intent: parsedJson.intent || null,
        confidence: parsedJson.confidence || null,
        title: parsedJson.title || parsedJson.dane?.postać || parsedJson.dane?.ksywka || null,
        summary: parsedJson.summary || parsedJson.pojawiowanie || null
    };
}

function getPerformanceMetrics(stats) {
    if (!stats) return { tokens: 0, time: 0, speed: 0 };
    const tokens = stats.evalCount || 0;
    const time = stats.evalDuration ? (stats.evalDuration / 1000000000).toFixed(2) : 0;
    const speed = tokens && time ? Math.round(tokens / time) : 0;
    return { tokens, time, speed };
}

// === GENEROWANIE HTML ===
let htmlContent = `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Raport Testów AI</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #0d1117;
            color: #c9d1d9;
            line-height: 1.6;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: #161b22;
            border-radius: 8px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
            overflow: hidden;
        }
        
        header {
            background: linear-gradient(135deg, #1f6feb 0%, #58a6ff 100%);
            padding: 30px;
            color: white;
        }
        
        header h1 {
            font-size: 32px;
            margin-bottom: 10px;
        }
        
        header .meta {
            opacity: 0.9;
            font-size: 14px;
        }
        
        .toc {
            background: #0d1117;
            padding: 20px 30px;
            border-bottom: 1px solid #30363d;
        }
        
        .toc h2 {
            color: #58a6ff;
            margin-bottom: 15px;
            font-size: 20px;
        }
        
        .toc ul {
            list-style: none;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 10px;
        }
        
        .toc a {
            color: #8b949e;
            text-decoration: none;
            padding: 8px 12px;
            display: block;
            border-radius: 6px;
            transition: all 0.2s;
            font-family: 'Consolas', monospace;
            font-size: 13px;
        }
        
        .toc a:hover {
            background: #21262d;
            color: #58a6ff;
        }
        
        .test-section {
            padding: 30px;
            border-bottom: 1px solid #30363d;
        }
        
        .test-section:last-child {
            border-bottom: none;
        }
        
        .test-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        
        .test-header h2 {
            color: #f0f6fc;
            font-size: 24px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .test-header .cmd {
            background: #21262d;
            color: #79c0ff;
            padding: 4px 12px;
            border-radius: 6px;
            font-family: 'Consolas', monospace;
            font-size: 14px;
        }
        
        .quick-summary {
            background: #0d1117;
            border-left: 4px solid #58a6ff;
            padding: 15px 20px;
            margin-bottom: 20px;
            border-radius: 6px;
        }
        
        .quick-summary .row {
            display: grid;
            grid-template-columns: 150px 1fr;
            gap: 10px;
            padding: 5px 0;
        }
        
        .quick-summary .label {
            color: #8b949e;
            font-weight: 600;
        }
        
        .quick-summary .value {
            color: #c9d1d9;
            font-family: 'Consolas', monospace;
            font-size: 13px;
        }
        
        details {
            margin: 15px 0;
            background: #0d1117;
            border: 1px solid #30363d;
            border-radius: 6px;
            overflow: hidden;
        }
        
        summary {
            padding: 15px 20px;
            cursor: pointer;
            font-weight: 600;
            color: #58a6ff;
            user-select: none;
            transition: background 0.2s;
        }
        
        summary:hover {
            background: #161b22;
        }
        
        summary::marker {
            color: #58a6ff;
        }
        
        details[open] summary {
            border-bottom: 1px solid #30363d;
            background: #161b22;
        }
        
        .details-content {
            padding: 20px;
            max-height: 500px;
            overflow-y: auto;
        }
        
        pre {
            background: #0d1117;
            border: 1px solid #30363d;
            padding: 15px;
            border-radius: 6px;
            overflow: auto;
            font-family: 'Consolas', monospace;
            font-size: 12px;
            line-height: 1.5;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #30363d;
        }
        
        th {
            background: #21262d;
            color: #58a6ff;
            font-weight: 600;
        }
        
        tr:hover {
            background: #161b22;
        }
        
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        
        ::-webkit-scrollbar-track {
            background: #0d1117;
        }
        
        ::-webkit-scrollbar-thumb {
            background: #30363d;
            border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: #484f58;
        }
        
        /* Responsywność Mobilna */
        @media screen and (max-width: 768px) {
            .container { width: 100%; border-radius: 0; }
            .grid, .stats-grid, .toc-grid, .character-card { grid-template-columns: 1fr !important; }
            table { display: block; overflow-x: auto; white-space: nowrap; }
            .character-card > div[style*="grid-column: 1 / -1"] { grid-column: auto !important; }
            body { padding: 10px; }
            header, .content { padding: 20px; }
            .test-section div[style*="display: grid;"] { grid-template-columns: 1fr !important; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📊 Raport Testów AI Pipeline</h1>
            <div class="meta">
                Wygenerowano: ${new Date().toLocaleString('pl-PL')} | Liczba testów: ${logFiles.length}
            </div>
        </header>
        
        ${characterCard ? `
        <div class="test-section" style="background: #161b22; border-bottom: 1px solid #30363d;">
            <details style="border: none;">
                <summary style="color: #58a6ff; font-size: 18px; cursor: pointer;">👤 Karta Testowanej Postaci</summary>
                <div style="padding: 20px 0; display: grid; grid-template-columns: 150px 1fr; gap: 15px;">
                    ${characterCard.name ? `
                    <div style="color: #8b949e; font-weight: 600;">Imię:</div>
                    <div style="color: #f0f6fc; font-size: 16px;">${escapeHtml(characterCard.name)}</div>
                    ` : ''}
                    ${characterCard.guild ? `
                    <div style="color: #8b949e; font-weight: 600;">Gildia:</div>
                    <div style="color: #f0f6fc;">${escapeHtml(characterCard.guild)}</div>
                    ` : ''}
                    ${characterCard.background ? `
                    <div style="color: #8b949e; font-weight: 600;">Historia:</div>
                    <div style="color: #c9d1d9; line-height: 1.6;">${escapeHtml(characterCard.background)}</div>
                    ` : ''}
                    ${characterCard.weaknesses ? `
                    <div style="color: #8b949e; font-weight: 600;">Słabości:</div>
                    <div style="color: #f85149;">${escapeHtml(characterCard.weaknesses)}</div>
                    ` : ''}
                    ${characterCard.crime ? `
                    <div style="color: #8b949e; font-weight: 600;">Wina:</div>
                    <div style="color: #d29922;">${escapeHtml(characterCard.crime)}</div>
                    ` : ''}
                    ${characterCard.future ? `
                    <div style="color: #8b949e; font-weight: 600;">Przyszłość:</div>
                    <div style="color: #79c0ff;">${escapeHtml(characterCard.future)}</div>
                    ` : ''}
                    ${characterCard.quests ? `
                    <div style="color: #8b949e; font-weight: 600;">Questy:</div>
                    <div style="color: #c9d1d9;">${escapeHtml(characterCard.quests)}</div>
                    ` : ''}
                    ${characterCard.status ? `
                    <div style="color: #8b949e; font-weight: 600;">Status:</div>
                    <div style="color: #3fb950;">${escapeHtml(characterCard.status)}</div>
                    ` : ''}
                    ${characterCard.discord ? `
                    <div style="color: #8b949e; font-weight: 600;">Discord:</div>
                    <div style="color: #8b949e; font-family: 'Consolas', monospace;">${escapeHtml(characterCard.discord)}</div>
                    ` : ''}
                    ${characterCard.tags ? `
                    <div style="color: #8b949e; font-weight: 600;">Tagi:</div>
                    <div style="color: #8b949e;">${escapeHtml(characterCard.tags)}</div>
                    ` : ''}
                    ${characterCard.edition ? `
                    <div style="color: #8b949e; font-weight: 600;">Edycja:</div>
                    <div style="color: #8b949e;">${escapeHtml(characterCard.edition)}</div>
                    ` : ''}
                    ${characterCard.lastSummary ? `
                    <div style="color: #8b949e; font-weight: 600; grid-column: 1 / -1; margin-top: 10px; border-top: 1px solid #30363d; padding-top: 10px;">📜 Ostatnie Podsumowanie:</div>
                    <div style="color: #c9d1d9; grid-column: 1 / -1; font-style: italic; white-space: pre-wrap;">${escapeHtml(characterCard.lastSummary)}</div>
                    ` : ''}
                    
                    ${(characterCard.answers && Object.keys(characterCard.answers).length > 0) ? `
                    <div style="color: #8b949e; font-weight: 600; grid-column: 1 / -1; margin-top: 10px; border-top: 1px solid #30363d; padding-top: 10px;">❓ Pytania Dodatkowe:</div>
                    <div style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 8px;">
                        ${(() => {
                try {
                    const qPath = path.join(__dirname, '..', '..', 'docs', 'parsed', 'questions_mapping.json');
                    if (fs.existsSync(qPath)) {
                        const questionsMap = require(qPath);
                        let cls = characterCard.summaryClass || characterCard.class || characterCard.guild || 'Skazaniec';

                        const map = {
                            'cien': 'Cień',
                            'cień': 'Cień',
                            'strażnik': 'Strażnik',
                            'straznik': 'Strażnik',
                            'mag ognia': 'Mag Ognia',
                            'mag wody': 'Mag Wody',
                            'nowicjusz': 'Nowicjusz',
                            'strażnik świątynny': 'Strażnik Świątynny',
                            'straznik swiatynny': 'Strażnik Świątynny',
                            'szkodnik': 'Szkodnik',
                            'najemnik': 'Najemnik',
                            'kret': 'Kret',
                            'służący': 'Służący',
                            'sluzacy': 'Służący',
                            'kopacz': 'Kopacz',
                            'skazaniec': 'Skazaniec',
                            'magnat': 'Magnat',
                            'guru': 'Guru'
                        };

                        const norm = cls.toLowerCase().trim();
                        let realKey = 'Skazaniec';
                        for (const k in map) {
                            if (norm.includes(k)) {
                                realKey = map[k];
                                break;
                            }
                        }

                        const questions = questionsMap[realKey] || [];

                        return Object.keys(characterCard.answers).sort((a, b) => {
                            const nA = parseInt(a.replace('ans', ''));
                            const nB = parseInt(b.replace('ans', ''));
                            return nA - nB;
                        }).map(key => {
                            const idx = parseInt(key.replace('ans', '')) - 1;
                            const question = questions[idx] || `Pytanie ${idx + 1}`;
                            const answer = characterCard.answers[key];
                            return `
                                        <div style="background: #161b22; padding: 8px; border-radius: 4px; border: 1px solid #30363d;">
                                            <div style="font-size: 0.9em; color: #8b949e; margin-bottom: 4px;">${escapeHtml(question)}</div>
                                            <div style="color: #e6edf3;">${escapeHtml(answer)}</div>
                                        </div>`;
                        }).join('');
                    } else { return ''; }
                } catch (e) {
                    return '<div style="color:red">Błąd ładowania pytań: ' + e.message + '</div>';
                }
            })()}
                    </div>
                    ` : ''}
                </div>
            </details>
        </div>
        ` : ''}
        
        <div class="test-section" style="background: linear-gradient(135deg, #1c2128 0%, #161b22 100%); border-bottom: 3px solid #58a6ff;">
            <h2 style="color: #58a6ff; margin-bottom: 20px;">📖 Podsumowanie Narracyjne</h2>
            <div style="background: #0d1117; padding: 20px; border-radius: 8px; border-left: 4px solid #58a6ff; line-height: 1.8;">
                ${narratives.length > 0 ? narratives.map((n, i) => `
                    <div style="margin-bottom: 15px; padding-bottom: 15px; ${i < narratives.length - 1 ? 'border-bottom: 1px solid #30363d;' : ''}">
                        ${n}
                    </div>
                `).join('') : '<div style="color: #8b949e;">Brak danych do wygenerowania narracji.</div>'}
            </div>
        </div>
        
        <div class="test-section" style="background: #1c2128; border-bottom: 2px solid #58a6ff;">
            <h2 style="color: #58a6ff; margin-bottom: 20px;">⚡ Podsumowanie Wykonawcze</h2>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px;">
                <div style="background: #0d1117; padding: 15px; border-radius: 6px; border-left: 3px solid #58a6ff;">
                    <div style="color: #8b949e; font-size: 12px; margin-bottom: 5px;">ŚR. PRĘDKOŚĆ</div>
                    <div style="font-size: 24px; font-weight: 600; color: #58a6ff;">${analytics.avgSpeed} tok/s</div>
                </div>
                <div style="background: #0d1117; padding: 15px; border-radius: 6px; border-left: 3px solid #3fb950;">
                    <div style="color: #8b949e; font-size: 12px; margin-bottom: 5px;">ŁĄCZNIE TOKENÓW</div>
                    <div style="font-size: 24px; font-weight: 600; color: #3fb950;">${analytics.totalTokens.toLocaleString()}</div>
                </div>
                <div style="background: #0d1117; padding: 15px; border-radius: 6px; border-left: 3px solid #d29922;">
                    <div style="color: #8b949e; font-size: 12px; margin-bottom: 5px;">ŚR. CZAS</div>
                    <div style="font-size: 24px; font-weight: 600; color: #d29922;">${analytics.avgTime}s</div>
                </div>
                <div style="background: #0d1117; padding: 15px; border-radius: 6px; border-left: 3px solid #f85149;">
                    <div style="color: #8b949e; font-size: 12px; margin-bottom: 5px;">NAJWOLNIEJSZY</div>
                    <div style="font-size: 18px; font-weight: 600; color: #f85149;">/${analytics.slowest.cmd} (${analytics.slowest.speed})</div>
                </div>
            </div>
            
            <h3 style="color: #f0f6fc; margin: 25px 0 15px 0; font-size: 18px;">🎯 Kluczowe Wnioski</h3>
            <ul style="list-style: none; padding: 0;">
                ${analytics.fastest.speed > 0 && analytics.slowest.speed > 0 && analytics.fastest.speed / analytics.slowest.speed > 2 ?
        `<li style="padding: 10px; background: #0d1117; margin: 8px 0; border-radius: 6px; border-left: 3px solid #d29922;">
                    ⚠️ <strong>Różnice w wydajności:</strong> Najszybszy test (/${analytics.fastest.cmd}) jest <strong>${Math.round(analytics.fastest.speed / analytics.slowest.speed)}x szybszy</strong> niż najwolniejszy (/${analytics.slowest.cmd})
                </li>` : ''}
                ${Object.keys(analytics.commands).length > 1 ?
        `<li style="padding: 10px; background: #0d1117; margin: 8px 0; border-radius: 6px; border-left: 3px solid #58a6ff;">
                    📊 <strong>Najczęściej testowane:</strong> /${Object.entries(analytics.commands).sort((a, b) => b[1] - a[1])[0][0]} (${Object.entries(analytics.commands).sort((a, b) => b[1] - a[1])[0][1]} razy)
                </li>` : ''}
                ${Object.keys(analytics.models).length > 0 ? `<li style="padding: 10px; background: #0d1117; margin: 8px 0; border-radius: 6px; border-left: 3px solid #3fb950;">
                    ✅ <strong>Spójność modelu:</strong> Wszystkie testy użyły <code>${Object.keys(analytics.models)[0]}</code>
                </li>` : ''}
            </ul>
        </div>
        
        <div class="toc">
            <h2>📋 Spis Treści</h2>
            <ul>
                ${logFilesBuffer = logFiles.map((file, i) => {
            try {
                const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
                const cmd = extractCommand(data.prompt);
                return `<li><a href="#test-${i + 1}">${i + 1}. ${cmd}</a></li>`;
            } catch (e) { return `<li>Error: ${path.basename(file)}</li>`; }
        }).join('\n')}
            </ul>
        </div>
        
        ${logFiles.map((file, index) => {
            try {
                const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
                const cmd = extractCommand(data.prompt);
                const parsed = parseResponse(data.response);
                const keyInfo = extractKeyInfo(parsed);
                const metrics = getPerformanceMetrics(data.stats);

                return `
                <div class="test-section" id="test-${index + 1}">
                    <div class="test-header">
                        <h2>Test ${index + 1}</h2>
                        <span class="cmd">${escapeHtml(cmd)}</span>
                    </div>
                    
                    <div class="quick-summary">
                        <div class="row">
                            <span class="label">Model:</span>
                            <span class="value">${escapeHtml(data.model)}</span>
                        </div>
                        ${keyInfo?.intent ? `
                        <div class="row">
                            <span class="label">Intencja:</span>
                            <span class="value">${escapeHtml(keyInfo.intent)} (${keyInfo.confidence})</span>
                        </div>` : ''}
                        ${keyInfo?.title ? `
                        <div class="row">
                            <span class="label">Wynik:</span>
                            <span class="value">${escapeHtml(keyInfo.title)}</span>
                        </div>` : ''}
                        <div class="row">
                            <span class="label">Wydajność:</span>
                            <span class="value">${metrics.tokens} tokenów | ${metrics.time}s | ${metrics.speed} tok/s</span>
                        </div>
                    </div>
                    
                    <details>
                        <summary>🔎 Kontekst Wejściowy (System Prompt)</summary>
                        <div class="details-content">
                            <pre>${escapeHtml((data.system || '').substring(0, 1500))}...</pre>
                        </div>
                    </details>
                    
                    <details>
                        <summary>🤖 Pełna Odpowiedź AI</summary>
                        <div class="details-content">
                            <pre>${escapeHtml(parsed ? JSON.stringify(parsed, null, 2) : data.response)}</pre>
                        </div>
                    </details>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Metryka</th>
                                <th>Wartość</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Tokeny</td>
                                <td>${metrics.tokens}</td>
                            </tr>
                            <tr>
                                <td>Czas trwania</td>
                                <td>${metrics.time}s</td>
                            </tr>
                            <tr>
                                <td>Prędkość</td>
                                <td>${metrics.speed} tok/s</td>
                            </tr>
                        </tbody>
                    </table>
                </div>`;
            } catch (e) { return `<div class="test-section">Błąd w pliku ${file}</div>`; }
        }).join('')}
    </div>
</body>
</html>`;

// Output path adjusted (outputting to root as test_report.html)
const outputPath = path.join(__dirname, '..', '..', 'test_report.html');
fs.writeFileSync(outputPath, htmlContent);
console.log(`✅ Raport HTML zapisany w: ${outputPath}`);
console.log('');
console.log(`Otwórz w przeglądarce: file:///${outputPath.replace(/\\/g, '/')}`);
