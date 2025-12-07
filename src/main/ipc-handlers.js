/**
 * IPC Handlers for pipeline operations
 */

const { ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('../shared/logger');
const config = require('../shared/config');
const { runWithTrace, getTraceId } = require('../shared/tracing');

// Pipeline modules
const dataExtraction = require('../modules/data-extraction');
const profileMerge = require('../modules/profile-merge');
const rendering = require('../modules/rendering');
const ollamaService = require('../services/ollama');

// Helper to send progress to renderer
function sendProgress(event, step, progress, message) {
    if (event?.sender) {
        event.sender.send('progress', { step, progress, message, traceId: getTraceId() });
    }
}

// Helper to send log to renderer
function sendLog(event, level, message) {
    if (event?.sender) {
        event.sender.send('log', { level, message, timestamp: new Date().toISOString(), traceId: getTraceId() });
    }
}

// Fetch data from Google Sheets
ipcMain.handle('fetch-sheets', async (event) => {
    return runWithTrace(async () => {
        logger.info('Fetching Google Sheets data');
        sendProgress(event, 1, 0, 'Łączenie z Google Sheets...');

        const googleSheetsService = require('../services/google-sheets');
        const result = await googleSheetsService.fetchRows();

        if (result.success) {
            sendProgress(event, 1, 100, 'Pobrano dane');
            logger.info('Sheets data fetched', { rowCount: result.rows.length });
        } else {
            sendProgress(event, 1, 100, 'Błąd pobierania');
            logger.error('Failed to fetch sheets', { error: result.error });
        }

        return result;
    });
});

// Fetch data from LarpGothic API
ipcMain.handle('fetch-larpgothic', async (event, search = {}) => {
    return runWithTrace(async () => {
        logger.info('Fetching LarpGothic profiles', { search });
        sendProgress(event, 1, 0, 'Łączenie z LarpGothic API...');

        const larpgothicService = require('../services/larpgothic-api');
        const result = await larpgothicService.fetchProfiles(search);

        if (result.success) {
            sendProgress(event, 1, 100, `Pobrano ${result.rows.length} profili`);
            logger.info('LarpGothic data fetched', { count: result.rows.length });
        } else {
            sendProgress(event, 1, 100, 'Błąd pobierania');
            logger.error('Failed to fetch LarpGothic', { error: result.error });
        }

        return result;
    });
});

// Fetch world context from Google Drive
ipcMain.handle('fetch-world-context', async (event) => {
    return runWithTrace(async () => {
        logger.info('Fetching world context PDF');
        sendProgress(event, 1, 50, 'Pobieranie opisu świata...');

        // TODO: Implement Google Drive fetching + PDF parsing
        await new Promise(r => setTimeout(r, 500));

        return {
            success: true,
            worldContext: 'Świat gry to ponury, gotycki setting...'
        };
    });
});

// Process a single lane through AI
ipcMain.handle('process-lane', async (event, lane, data) => {
    return runWithTrace(async () => {
        logger.info('Processing lane', { lane });
        sendLog(event, 'info', `Przetwarzam ścieżkę: ${lane}`);

        try {
            const result = await ollamaService.processLane(lane, data);

            if (result.success) {
                sendLog(event, 'success', `Ścieżka ${lane} przetworzona`);
                return { success: true, lane, result: result.result, prompt: result.prompt };
            } else {
                sendLog(event, 'warn', `Błąd AI dla ${lane}: ${result.error}`);
                return { success: false, lane, error: result.error };
            }
        } catch (error) {
            logger.error('Lane processing failed', { lane, error: error.message });
            sendLog(event, 'error', `Błąd: ${error.message}`);
            return { success: false, lane, error: error.message };
        }
    });
});

// Process all lanes in parallel
ipcMain.handle('process-all-lanes', async (event, lanes) => {
    return runWithTrace(async () => {
        logger.info('Processing all lanes', { count: lanes.length });
        const results = {};

        for (let i = 0; i < lanes.length; i++) {
            const lane = lanes[i];
            sendProgress(event, 3, Math.round((i / lanes.length) * 100), `Analizuję: ${lane.name}`);
            sendLog(event, 'info', `[${i + 1}/${lanes.length}] Wysyłam do Ollama: ${lane.name}`);

            // TODO: Actual processing
            await new Promise(r => setTimeout(r, 1500));
            results[lane.name] = { processed: true };
        }

        sendProgress(event, 3, 100, 'Analiza AI zakończona');
        return { success: true, results };
    });
});

// Reduce/merge profile from lanes
ipcMain.handle('reduce-profile', async (event, laneResults) => {
    return runWithTrace(async () => {
        logger.info('Reducing profile from lanes');
        sendProgress(event, 4, 50, 'Scalanie profilu...');

        try {
            const profile = profileMerge.mergeProfile(laneResults || []);
            // Apply heuristic quest seeding
            const seededProfile = profileMerge.seedQuests(profile);

            sendProgress(event, 4, 100, 'Profil scalony');
            return { success: true, profile: seededProfile };
        } catch (error) {
            logger.error('Profile merge failed', { error: error.message });
            return { success: false, error: error.message };
        }
    });
});

// Generate quests
ipcMain.handle('generate-quests', async (event, profile) => {
    return runWithTrace(async () => {
        logger.info('Generating quests');
        sendProgress(event, 5, 0, 'Generowanie questów...');

        // TODO: Implement quest generation with Ollama
        await new Promise(r => setTimeout(r, 3000));

        sendProgress(event, 5, 100, 'Questy wygenerowane');
        return {
            success: true,
            quests: []
        };
    });
});

// Render HTML cards
ipcMain.handle('render-cards', async (event, profile, quests) => {
    return runWithTrace(async () => {
        logger.info('Rendering HTML cards');
        sendProgress(event, 6, 50, 'Renderowanie kart HTML...');

        try {
            const paths = await rendering.saveCards(profile, quests);

            sendProgress(event, 6, 100, 'Karty zapisane');
            sendLog(event, 'success', `Zapisano do: ${paths.outputDir}`);
            return { success: true, ...paths };
        } catch (error) {
            logger.error('Rendering failed', { error: error.message });
            return { success: false, error: error.message };
        }
    });
});

// Save output file
ipcMain.handle('save-output', async (event, filename, content) => {
    const outputDir = path.resolve(config.output.path);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, content, 'utf-8');
    logger.info('File saved', { path: filePath });

    return { success: true, path: filePath };
});

// Open output folder in explorer
ipcMain.handle('open-output-folder', async () => {
    const outputDir = path.resolve(config.output.path);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    shell.openPath(outputDir);
    return { success: true };
});

// AI Command handler - process different AI commands on profile data
ipcMain.handle('ai-command', async (event, commandType, profile, options = {}) => {
    return runWithTrace(async () => {
        logger.info('AI Command received', {
            commandType,
            profileName: profile?.['Imie postaci'],
            model: options.model,
            temperature: options.temperature
        });
        sendLog(event, 'info', `AI: ${commandType}`);

        // Handle custom prompt
        if (commandType === 'custom' && options.customPrompt) {
            try {
                const result = await ollamaService.generateText(options.customPrompt, {
                    model: options.model,
                    temperature: options.temperature || 0.7,
                    system: options.system, // Pass system prompt
                    maxTokens: 2000
                });

                if (result.success) {
                    sendLog(event, 'success', 'Własny prompt wykonany');
                    // Return prompt for history tracking
                    return { success: true, text: result.text, prompt: options.customPrompt };
                } else {
                    return { success: false, error: result.error };
                }
            } catch (error) {
                logger.error('Custom prompt failed', { error: error.message });
                return { success: false, error: error.message };
            }
        }

        // Try to use new configurable prompt builder if config is provided
        let prompt;
        if (options.promptConfig) {
            try {
                const promptBuilder = require('../prompts/prompt-builder');
                prompt = promptBuilder.buildPrompt(commandType, profile, options.promptConfig);
                logger.info('Using configurable prompt builder', { commandType, style: options.promptConfig.style });
            } catch (err) {
                logger.warn('Fallback to legacy prompts', { error: err.message });
                // Fallback to legacy prompts
                const prompts = {
                    'summarize': buildSummarizePrompt(profile),
                    'extract_traits': buildExtractTraitsPrompt(profile),
                    'analyze_relations': buildRelationsPrompt(profile),
                    'main_quest': buildMainQuestPrompt(profile),
                    'side_quest': buildSideQuestPrompt(profile),
                    'redemption_quest': buildRedemptionQuestPrompt(profile),
                    'group_quest': buildGroupQuestPrompt(profile),
                    'story_hooks': buildStoryHooksPrompt(profile),
                    'potential_conflicts': buildConflictsPrompt(profile),
                    'npc_connections': buildNpcConnectionsPrompt(profile),
                    'nickname': buildNicknamePrompt(profile),
                    'faction_suggestion': buildFactionPrompt(profile),
                    'secret': buildSecretPrompt(profile)
                };
                prompt = prompts[commandType];
            }
        } else {
            // Legacy mode - use old prompts
            const prompts = {
                'summarize': buildSummarizePrompt(profile),
                'extract_traits': buildExtractTraitsPrompt(profile),
                'analyze_relations': buildRelationsPrompt(profile),
                'main_quest': buildMainQuestPrompt(profile),
                'side_quest': buildSideQuestPrompt(profile),
                'redemption_quest': buildRedemptionQuestPrompt(profile),
                'group_quest': buildGroupQuestPrompt(profile),
                'story_hooks': buildStoryHooksPrompt(profile),
                'potential_conflicts': buildConflictsPrompt(profile),
                'npc_connections': buildNpcConnectionsPrompt(profile),
                'nickname': buildNicknamePrompt(profile),
                'faction_suggestion': buildFactionPrompt(profile),
                'secret': buildSecretPrompt(profile)
            };
            prompt = prompts[commandType];
        }

        if (!prompt) {
            return { success: false, error: `Unknown command: ${commandType}` };
        }

        try {
            // Use text generation with selected model and temperature
            const result = await ollamaService.generateText(prompt, {
                model: options.model,
                temperature: options.temperature || 0.7,
                system: options.system, // Pass system prompt override if provided
                maxTokens: 1500
            });

            if (result.success) {
                sendLog(event, 'success', `AI: ${commandType} zakończone`);
                // Return prompt for history tracking
                return { success: true, text: result.text, prompt: prompt };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            logger.error('AI Command failed', { commandType, error: error.message });
            return { success: false, error: error.message };
        }
    });
});

// ==============================
// AI Prompt Builders
// ==============================

function buildSummarizePrompt(profile) {
    return `Jesteś Mistrzem Gry w gotyckiej grze fabularnej.

POSTAĆ:
Imię: ${profile['Imie postaci'] || 'Nieznane'}
Gildia: ${profile['Gildia'] || 'Brak'}
Region: ${profile['Region'] || 'Nieznany'}
Za co siedzi: ${profile['Wina'] || 'Nieznane'}
Historia: ${profile['O postaci'] || profile['Jak zarabiala na zycie, kim byla'] || 'Brak'}

ZADANIE: Podsumuj tę postać w MAKSYMALNIE 3 zdaniach. Skup się na tym, kim jest, co robi i co ją motywuje.`;
}

function buildExtractTraitsPrompt(profile) {
    return `Przeanalizuj profil postaci i wypisz jej kluczowe cechy.

POSTAĆ:
Imię: ${profile['Imie postaci'] || 'Nieznane'}
Historia: ${profile['O postaci'] || profile['Jak zarabiala na zycie, kim byla'] || 'Brak'}
Słabości: ${profile['Slabosci'] || 'Brak'}
Umiejętności: ${profile['Umiejetnosci'] || 'Brak'}

WYPISZ:
1. Główne cechy charakteru (3-5 punktów)
2. Mocne strony
3. Słabe strony
4. Potencjalne motywacje`;
}

function buildRelationsPrompt(profile) {
    return `Przeanalizuj relacje postaci.

POSTAĆ: ${profile['Imie postaci'] || 'Nieznane'}
OPIS RELACJI: ${profile['Znajomi, przyjaciele i wrogowie'] || 'Brak danych'}
HISTORIA: ${profile['O postaci'] || 'Brak'}

WYPISZ:
1. SOJUSZNICY - kto i dlaczego
2. WROGOWIE - kto i dlaczego
3. NEUTRALNE KONTAKTY - potencjalne relacje do rozwinięcia`;
}

function buildMainQuestPrompt(profile) {
    return `Jesteś Mistrzem Gry w gotyckiej grze fabularnej (styl Gothic 1/2).

POSTAĆ:
Imię: ${profile['Imie postaci'] || 'Nieznane'}
Gildia: ${profile['Gildia'] || 'Brak'}
Region: ${profile['Region'] || 'Nieznany'}
Za co siedzi: ${profile['Wina'] || 'Nieznane'}
Historia: ${profile['O postaci'] || profile['Jak zarabiala na zycie, kim byla'] || 'Brak'}
Cele: ${profile['Przyszlosc'] || 'Brak'}

ZADANIE: Zaproponuj GŁÓWNY QUEST dla tej postaci.
Quest powinien:
- Być powiązany z jej przeszłością lub winą
- Wymagać 3-5 konkretnych kroków
- Angażować inne frakcje w obozie
- Mieć jasną nagrodę

FORMAT:
# [Nazwa questa]
## Opis
[2-3 zdania]
## Kroki
1. [krok]
2. [krok]
...
## Nagroda
[co postać zyskuje]`;
}

function buildSideQuestPrompt(profile) {
    return `Jesteś Mistrzem Gry. Zaproponuj QUEST POBOCZNY dla postaci:

POSTAĆ: ${profile['Imie postaci'] || 'Nieznane'} (${profile['Gildia'] || 'Brak'})
HISTORIA: ${profile['O postaci'] || 'Brak'}
UMIEJĘTNOŚCI: ${profile['Umiejetnosci'] || 'Brak'}

Quest poboczny powinien być krótki (1-2 sesje), wykorzystywać umiejętności postaci i dawać małą, ale użyteczną nagrodę.

FORMAT:
# [Nazwa]
## Zleceniodawca
[kto daje quest]
## Zadanie
[co trzeba zrobić]
## Nagroda
[co się zyskuje]`;
}

function buildRedemptionQuestPrompt(profile) {
    return `Jesteś Mistrzem Gry. Zaproponuj QUEST ODKUPIENIA dla postaci:

POSTAĆ: ${profile['Imie postaci'] || 'Nieznane'}
ZA CO SIEDZI: ${profile['Wina'] || 'Nieznane'}
HISTORIA: ${profile['O postaci'] || 'Brak'}

Quest odkupienia powinien pozwolić postaci zadośćuczynić za swoją winę lub zmazać przeszłość. Może być trudny i wymagający poświęceń.

FORMAT:
# [Nazwa questa odkupienia]
## Wina do zmazania
[co postać musi odkupić]
## Sposób odkupienia
[jak może to zrobić]
## Cena / Poświęcenie
[czego to kosztuje]
## Nagroda duchowa
[jak zmieni to postać]`;
}

function buildGroupQuestPrompt(profile) {
    return `Zaproponuj QUEST GRUPOWY angażujący tę postać i innych graczy:

POSTAĆ: ${profile['Imie postaci'] || 'Nieznane'} (${profile['Gildia'] || 'Brak'})
UMIEJĘTNOŚCI: ${profile['Umiejetnosci'] || 'Brak'}
RELACJE: ${profile['Znajomi, przyjaciele i wrogowie'] || 'Brak'}

Quest powinien wymagać współpracy 3-5 graczy o różnych umiejętnościach.

FORMAT:
# [Nazwa questa grupowego]
## Cel wspólny
[co drużyna musi osiągnąć]
## Rola tej postaci
[jak ta konkretna postać może pomóc]
## Potrzebne role
[jakich innych specjalistów potrzeba]
## Wyzwania
[przeszkody do pokonania]`;
}

function buildStoryHooksPrompt(profile) {
    return `Zaproponuj 3 HOOKI FABULARNE dla postaci:

POSTAĆ: ${profile['Imie postaci'] || 'Nieznane'} (${profile['Gildia'] || 'Brak'})
HISTORIA: ${profile['O postaci'] || 'Brak'}
WINA: ${profile['Wina'] || 'Nieznane'}
SŁABOŚCI: ${profile['Slabosci'] || 'Brak'}

Hook fabularny to krótka sytuacja/wydarzenie które wciąga postać w akcję.

FORMAT:
1. [Hook 1 - nazwa]
   [1-2 zdania opisu]
   
2. [Hook 2 - nazwa]
   [1-2 zdania opisu]
   
3. [Hook 3 - nazwa]
   [1-2 zdania opisu]`;
}

function buildConflictsPrompt(profile) {
    return `Zaproponuj MOŻLIWE KONFLIKTY dla postaci:

POSTAĆ: ${profile['Imie postaci'] || 'Nieznane'} (${profile['Gildia'] || 'Brak'})
REGION: ${profile['Region'] || 'Nieznany'}
RELACJE: ${profile['Znajomi, przyjaciele i wrogowie'] || 'Brak'}
SŁABOŚCI: ${profile['Slabosci'] || 'Brak'}

Wymień 3-4 potencjalne konflikty z innymi frakcjami/postaciami w obozie.

FORMAT:
1. KONFLIKT Z [frakcja/osoba]
   Powód: [dlaczego]
   Jak może się rozwinąć: [scenariusz]
   
2. [kolejny konflikt...]`;
}

function buildNpcConnectionsPrompt(profile) {
    return `Zasugeruj POWIĄZANIA Z NPC dla postaci:

POSTAĆ: ${profile['Imie postaci'] || 'Nieznane'} (${profile['Gildia'] || 'Brak'})
HISTORIA: ${profile['O postaci'] || 'Brak'}
REGION: ${profile['Region'] || 'Nieznany'}

Zaproponuj 3-4 NPC (niegraczy) którzy mogą być powiązani z tą postacią.

FORMAT:
1. [Imię NPC] - [rola/profesja]
   Relacja: [jaka relacja]
   Potencjał fabularny: [jak można to wykorzystać]
   
2. [kolejny NPC...]`;
}

function buildNicknamePrompt(profile) {
    return `Wymyśl KSYWKĘ dla postaci:

IMIĘ: ${profile['Imie postaci'] || 'Nieznane'}
GILDIA: ${profile['Gildia'] || 'Brak'}
HISTORIA: ${profile['O postaci'] || 'Brak'}
CECHY: ${profile['Slabosci'] || ''} ${profile['Umiejetnosci'] || ''}

Zaproponuj 3 ksywki pasujące do stylu gotyckiego uniwersum. Każda z krótkim uzasadnieniem.

FORMAT:
1. "[Ksywka]" - [uzasadnienie]
2. "[Ksywka]" - [uzasadnienie]
3. "[Ksywka]" - [uzasadnienie]`;
}

function buildFactionPrompt(profile) {
    return `Zasugeruj FRAKCJĘ dla postaci:

POSTAĆ: ${profile['Imie postaci'] || 'Nieznane'}
OBECNA GILDIA: ${profile['Gildia'] || 'Brak'}
UMIEJĘTNOŚCI: ${profile['Umiejetnosci'] || 'Brak'}
CELE: ${profile['Przyszlosc'] || 'Brak'}
HISTORIA: ${profile['O postaci'] || 'Brak'}

Frakcje w kolonii: Stary Obóz (Gomez), Nowy Obóz (rebelia), Bractwo Śniących, Najemnicy, Cienie.

Zasugeruj którą frakcję powinna wybrać ta postać i dlaczego. Przedstaw argumenty za i przeciw.`;
}

function buildSecretPrompt(profile) {
    return `Wymyśl SEKRET dla postaci:

POSTAĆ: ${profile['Imie postaci'] || 'Nieznane'} (${profile['Gildia'] || 'Brak'})
HISTORIA: ${profile['O postaci'] || 'Brak'}
WINA: ${profile['Wina'] || 'Nieznane'}

Zaproponuj sekret który postać skrywa. Sekret powinien:
- Pasować do jej historii
- Mieć potencjał fabularny (co się stanie jak wyjdzie na jaw?)
- Motywować jej działania

FORMAT:
# SEKRET: [tytuł sekretu]
## Co skrywa
[opis sekretu]
## Dlaczego to ukrywa
[motywacja]
## Co się stanie gdy wyjdzie na jaw
[konsekwencje]`;
}

// ==============================
// Data Loading Handlers
// ==============================

ipcMain.handle('data:load-mg-profiles', async (event) => {
    return runWithTrace(async () => {
        const excelSearchService = require('../services/excel-search');
        try {
            const profiles = await excelSearchService.loadMgProfiles();
            return { success: true, profiles };
        } catch (error) {
            logger.error('Error loading MG profiles:', error);
            return { success: false, error: error.message };
        }
    });
});

ipcMain.handle('data:load-faction-history', async (event) => {
    return runWithTrace(async () => {
        const excelSearchService = require('../services/excel-search');
        try {
            const history = await excelSearchService.loadFactionHistory();
            return { success: true, history };
        } catch (error) {
            logger.error('Error loading faction history:', error);
            return { success: false, error: error.message };
        }
    });
});

ipcMain.handle('data:load-char-history', async (event) => {
    return runWithTrace(async () => {
        const excelSearchService = require('../services/excel-search');
        try {
            const history = await excelSearchService.loadCharHistory();
            return { success: true, history };
        } catch (error) {
            logger.error('Error loading character history:', error);
            return { success: false, error: error.message };
        }
    });
});

ipcMain.handle('data:load-world-context', async (event) => {
    return runWithTrace(async () => {
        const worldContextService = require('../services/world-context');
        try {
            const context = worldContextService.getAllContexts();
            return { success: true, context };
        } catch (error) {
            logger.error('Error loading world context:', error);
            return { success: false, error: error.message };
        }
    });
});

ipcMain.handle('get-profile-by-name', async (event, name) => {
    return runWithTrace(async () => {
        const excelSearchService = require('../services/excel-search');
        try {
            const profile = await excelSearchService.getProfileByName(name);
            return { success: true, profile };
        } catch (error) {
            logger.error('Error fetching profile by name:', error);
            return { success: false, error: error.message };
        }
    });
});

ipcMain.handle('get-all-character-names', async (event) => {
    return runWithTrace(async () => {
        const excelSearchService = require('../services/excel-search');
        try {
            const names = await excelSearchService.getAllNames();
            return { success: true, names };
        } catch (error) {
            logger.error('Error fetching all character names:', error);
            return { success: false, error: error.message };
        }
    });
});

// ==============================
// MODEL TESTBENCH HANDLERS
// ==============================

const modelTestbench = require('../services/model-testbench');
const reportGenerator = require('../services/test-report-generator');

// Get available Ollama models for testing
ipcMain.handle('testbench:get-models', async (event) => {
    return runWithTrace(async () => {
        try {
            const models = await modelTestbench.getAvailableModels();
            return { success: true, models };
        } catch (error) {
            logger.error('Failed to get models for testbench:', error);
            return { success: false, error: error.message };
        }
    });
});

// Get all available test scenarios
ipcMain.handle('testbench:get-scenarios', async (event) => {
    return runWithTrace(async () => {
        try {
            const testScenarios = require('../services/test-scenarios');
            const scenarios = testScenarios.getAllScenarios();

            // Remove non-serializable data (functions, large objects) for IPC
            const serializableScenarios = scenarios.map(s => ({
                id: s.id,
                name: s.name,
                category: s.category,
                commandType: s.commandType,
                promptVariation: s.promptVariation,
                profileName: s.profile?.['Imie postaci'] || 'Unknown'
            }));

            return { success: true, scenarios: serializableScenarios };
        } catch (error) {
            logger.error('Failed to get test scenarios:', error);
            return { success: false, error: error.message };
        }
    });
});

// Run test suite
ipcMain.handle('testbench:run-tests', async (event, modelNames, scenarioIds) => {
    return runWithTrace(async () => {
        logger.info('Starting testbench run', { models: modelNames, scenarios: scenarioIds });
        sendLog(event, 'info', `🧪 Rozpoczynam testy: ${modelNames.length} modeli, ${scenarioIds?.length || 'wszystkie'} scenariuszy`);

        // Progress callback for real-time updates
        const progressCallback = (progress) => {
            if (event?.sender && !event.sender.isDestroyed()) {
                event.sender.send('testbench-progress', progress);
            }
        };

        try {
            const summary = await modelTestbench.runTestSuite(modelNames, scenarioIds, { progressCallback });

            sendLog(event, 'success', `✓ Testy zakończone! ${summary.successfulTests}/${summary.totalTests} udanych`);
            return { success: true, summary };
        } catch (error) {
            logger.error('Testbench run failed:', error);
            sendLog(event, 'error', `✗ Błąd testów: ${error.message}`);
            return { success: false, error: error.message };
        }
    });
});

// Cancel running tests
ipcMain.handle('testbench:cancel', async (event) => {
    return runWithTrace(async () => {
        logger.info('Cancelling testbench run');
        modelTestbench.cancel();
        sendLog(event, 'warn', '⚠️ Testy anulowane przez użytkownika');
        return { success: true };
    });
});

// Get current progress
ipcMain.handle('testbench:get-progress', async (event) => {
    const progress = modelTestbench.getProgress();
    return { success: true, progress };
});

// Export report as HTML file
ipcMain.handle('testbench:export-report', async (event, summary, filename) => {
    return runWithTrace(async () => {
        try {
            const htmlContent = reportGenerator.generateHTMLReport(summary);
            const outputDir = path.resolve(config.output.path);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const reportPath = path.join(outputDir, filename || 'testbench-report.html');
            fs.writeFileSync(reportPath, htmlContent, 'utf-8');

            logger.info('Testbench report exported', { path: reportPath });
            sendLog(event, 'success', `Raport zapisany: ${reportPath}`);

            // Open report in browser
            shell.openPath(reportPath);

            return { success: true, path: reportPath };
        } catch (error) {
            logger.error('Failed to export report:', error);
            return { success: false, error: error.message };
        }
    });
});

// ============================================
// ADVANCED TESTS - Isolated handlers
// ============================================

const contextLimitsTest = require('../services/tests/context-limits');

// Context Limits Test
ipcMain.handle('tests:context-limits:run-all', async (event, modelNames) => {
    return runWithTrace(async () => {
        logger.info('Running Context Limits test on all models');
        sendLog(event, 'info', '📏 Rozpoczynam test Context Limits...');

        try {
            const results = await contextLimitsTest.testAllModels(modelNames);
            sendLog(event, 'success', `✓ Test zakończony dla ${results.results.length} modeli`);
            return { success: true, ...results };
        } catch (error) {
            logger.error('Context Limits test failed:', error);
            sendLog(event, 'error', `✗ Błąd testu: ${error.message}`);
            return { success: false, error: error.message };
        }
    });
});

ipcMain.handle('tests:context-limits:load-cache', async (event) => {
    const cached = contextLimitsTest.loadCached();
    return { success: true, cached };
});

// Memory Usage Test
const memoryUsageTest = require('../services/tests/memory-usage');

ipcMain.handle('tests:memory-usage:run-all', async (event, modelNames) => {
    return runWithTrace(async () => {
        logger.info('Running Memory Usage test on all models');
        sendLog(event, 'info', '💾 Rozpoczynam test Memory Usage...');

        try {
            const results = await memoryUsageTest.testAllModels(modelNames);
            sendLog(event, 'success', `✓ Test zakończony dla ${results.results.length} modeli`);
            return { success: true, ...results };
        } catch (error) {
            logger.error('Memory Usage test failed:', error);
            sendLog(event, 'error', `✗ Błąd testu: ${error.message}`);
            return { success: false, error: error.message };
        }
    });
});

ipcMain.handle('tests:memory-usage:load-cache', async (event) => {
    const cached = memoryUsageTest.loadCached();
    return { success: true, cached };
});

// Consistency Test
const consistencyTest = require('../services/tests/consistency');

ipcMain.handle('tests:consistency:run-all', async (event, modelNames) => {
    return runWithTrace(async () => {
        logger.info('Running Consistency test on all models');
        sendLog(event, 'info', '🔄 Rozpoczynam test Consistency (3x per model)...');

        try {
            const results = await consistencyTest.testAllModels(modelNames);
            sendLog(event, 'success', `✓ Test zakończony dla ${results.results.length} modeli`);
            return { success: true, ...results };
        } catch (error) {
            logger.error('Consistency test failed:', error);
            sendLog(event, 'error', `✗ Błąd testu: ${error.message}`);
            return { success: false, error: error.message };
        }
    });
});

ipcMain.handle('tests:consistency:load-cache', async (event) => {
    const cached = consistencyTest.loadCached();
    return { success: true, cached };
});

// Prompt Sensitivity Test
const promptSensitivityTest = require('../services/tests/prompt-sensitivity');

ipcMain.handle('tests:prompt-sensitivity:run-all', async (event, modelNames) => {
    return runWithTrace(async () => {
        logger.info('Running Prompt Sensitivity test on all models');
        sendLog(event, 'info', '📐 Rozpoczynam test Prompt Sensitivity (short/medium/long)...');

        try {
            const results = await promptSensitivityTest.testAllModels(modelNames);
            sendLog(event, 'success', `✓ Test zakończony dla ${results.results.length} modeli`);
            return { success: true, ...results };
        } catch (error) {
            logger.error('Prompt Sensitivity test failed:', error);
            sendLog(event, 'error', `✗ Błąd testu: ${error.message}`);
            return { success: false, error: error.message };
        }
    });
});

ipcMain.handle('tests:prompt-sensitivity:load-cache', async (event) => {
    const cached = promptSensitivityTest.loadCached();
    return { success: true, cached };
});

// Instruction Following Test
const instructionFollowingTest = require('../services/tests/instruction-following');

ipcMain.handle('tests:instruction-following:run-all', async (event, modelNames) => {
    return runWithTrace(async () => {
        logger.info('Running Instruction Following test on all models');
        sendLog(event, 'info', '✅ Rozpoczynam test Instruction Following...');

        try {
            const results = await instructionFollowingTest.testAllModels(modelNames);
            sendLog(event, 'success', `✓ Test zakończony dla ${results.results.length} modeli`);
            return { success: true, ...results };
        } catch (error) {
            logger.error('Instruction Following test failed:', error);
            return { success: false, error: error.message };
        }
    });
});

ipcMain.handle('tests:instruction-following:load-cache', async (event) => {
    const cached = instructionFollowingTest.loadCached();
    return { success: true, cached };
});

// Hallucination Test
const hallucinationTest = require('../services/tests/hallucination');

ipcMain.handle('tests:hallucination:run-all', async (event, modelNames) => {
    return runWithTrace(async () => {
        logger.info('Running Hallucination test on all models');
        sendLog(event, 'info', '🔍 Rozpoczynam test Hallucination Detection...');

        try {
            const results = await hallucinationTest.testAllModels(modelNames);
            sendLog(event, 'success', `✓ Test zakończony dla ${results.results.length} modeli`);
            return { success: true, ...results };
        } catch (error) {
            logger.error('Hallucination test failed:', error);
            return { success: false, error: error.message };
        }
    });
});

ipcMain.handle('tests:hallucination:load-cache', async (event) => {
    const cached = hallucinationTest.loadCached();
    return { success: true, cached };
});

// Latency Test
const latencyTest = require('../services/tests/latency');

ipcMain.handle('tests:latency:run-all', async (event, modelNames) => {
    return runWithTrace(async () => {
        logger.info('Running Latency test on all models');
        sendLog(event, 'info', '⏱️ Rozpoczynam test Latency (TTFT + tok/s)...');

        try {
            const results = await latencyTest.testAllModels(modelNames);
            sendLog(event, 'success', `✓ Test zakończony dla ${results.results.length} modeli`);
            return { success: true, ...results };
        } catch (error) {
            logger.error('Latency test failed:', error);
            return { success: false, error: error.message };
        }
    });
});

ipcMain.handle('tests:latency:load-cache', async (event) => {
    const cached = latencyTest.loadCached();
    return { success: true, cached };
});

// Cost Efficiency Test
const costEfficiencyTest = require('../services/tests/cost-efficiency');

ipcMain.handle('tests:cost-efficiency:run-all', async (event, modelNames) => {
    return runWithTrace(async () => {
        logger.info('Running Cost Efficiency test on all models');
        sendLog(event, 'info', '💰 Rozpoczynam test Cost Efficiency...');

        try {
            const results = await costEfficiencyTest.testAllModels(modelNames);
            sendLog(event, 'success', `✓ Test zakończony dla ${results.results.length} modeli`);
            return { success: true, ...results };
        } catch (error) {
            logger.error('Cost Efficiency test failed:', error);
            return { success: false, error: error.message };
        }
    });
});

ipcMain.handle('tests:cost-efficiency:load-cache', async (event) => {
    const cached = costEfficiencyTest.loadCached();
    return { success: true, cached };
});

// Needle in a Haystack Test
const needleHaystackTest = require('../services/tests/needle-haystack');

ipcMain.handle('tests:needle-haystack:run-all', async (event, modelNames) => {
    return runWithTrace(async () => {
        logger.info('Running Needle in a Haystack test on all models');
        sendLog(event, 'info', '🧵 Rozpoczynam test Igła w Stogu Siana...');

        try {
            const results = await needleHaystackTest.testAllModels(modelNames);
            sendLog(event, 'success', `✓ Test zakończony dla ${results.results.length} modeli`);
            return { success: true, ...results };
        } catch (error) {
            logger.error('Needle test failed:', error);
            return { success: false, error: error.message };
        }
    });
});

ipcMain.handle('tests:needle-haystack:load-cache', async (event) => {
    const cached = needleHaystackTest.loadCached();
    return { success: true, cached };
});

// Safety Limits Test
const safetyLimitsTest = require('../services/tests/safety-limits');

ipcMain.handle('tests:safety-limits:run-all', async (event, modelNames) => {
    return runWithTrace(async () => {
        logger.info('Running Safety Limits test on all models');
        sendLog(event, 'info', '🛡️ Rozpoczynam test Granic Cenzury...');

        try {
            const results = await safetyLimitsTest.testAllModels(modelNames);
            sendLog(event, 'success', `✓ Test zakończony dla ${results.results.length} modeli`);
            return { success: true, ...results };
        } catch (error) {
            logger.error('Safety test failed:', error);
            return { success: false, error: error.message };
        }
    });
});

ipcMain.handle('tests:safety-limits:load-cache', async (event) => {
    const cached = safetyLimitsTest.loadCached();
    return { success: true, cached };
});

// Language Stability Test
const languageStabilityTest = require('../services/tests/language-stability');

ipcMain.handle('tests:language-stability:run-all', async (event, modelNames) => {
    return runWithTrace(async () => {
        logger.info('Running Language Stability test on all models');
        sendLog(event, 'info', '🌍 Rozpoczynam test Stabilności Językowej...');

        try {
            const results = await languageStabilityTest.testAllModels(modelNames);
            sendLog(event, 'success', `✓ Test zakończony dla ${results.results.length} modeli`);
            return { success: true, ...results };
        } catch (error) {
            logger.error('Language test failed:', error);
            return { success: false, error: error.message };
        }
    });
});

ipcMain.handle('tests:language-stability:load-cache', async (event) => {
    const cached = languageStabilityTest.loadCached();
    return { success: true, cached };
});
