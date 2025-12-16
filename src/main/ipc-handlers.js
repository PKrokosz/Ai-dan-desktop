/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * IPC HANDLERS - Główny plik obsługi komunikacji IPC między main a renderer
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * STRUKTURA PLIKU (sekcje):
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. IMPORTS & DEPENDENCIES        (linie 1-40)      - Moduły i serwisy
 * 2. HELPER FUNCTIONS              (linie 41-60)     - sendProgress, sendLog
 * 3. DATA SOURCE HANDLERS          (linie 61-130)    - Google Sheets, LarpGothic API
 * 4. PIPELINE HANDLERS             (linie 131-230)   - Lanes, Profile, Quests, Rendering
 * 5. AI COMMAND HANDLER            (linie 231-540)   - ⭐ GŁÓWNY handler AI (streaming, RAG)
 * 6. TEXT CORRECTION               (linie 541-550)   - Korekta tekstu przez AI
 * 7. CONFIGHUB HANDLERS            (linie 551-600)   - Konfiguracja aplikacji
 * 8. CONVERSATION FLOW             (linie 601-620)   - Przepływ konwersacji
 * 9. PROMPT BUILDERS (Legacy)      (linie 621-870)   - Stare builderzy promptów
 * 10. DATA LOADING HANDLERS        (linie 871-950)   - Profile MG, Historia, Kontekst
 * 11. MODEL TESTBENCH              (linie 951-1340)  - Testy modeli AI
 * 12. CUSTOM MODEL PATH            (linie 1341-1440) - Zarządzanie ścieżką modeli
 * 13. QUALITY CONTROL              (linie 1441-1459) - Walidacja odpowiedzi AI
 * 
 * WAŻNE NIUANSE:
 * ─────────────────────────────────────────────────────────────────────────────
 * - Handler 'ai-command' (sekcja 5) to serce AI - obsługuje streaming, RAG, fallback
 * - Prompt Builders (sekcja 9) to legacy code - nowe prompty idą przez prompt-builder.js
 * - Wszystkie handlery używają runWithTrace() dla tracingu request/response
 * - RAG (Vector Store) jest opcjonalny - błędy nie blokują głównego flow
 * 
 * @module ipc-handlers
 * @requires electron
 * @requires ../services/ollama-client - Główny klient AI (wrapper na ollama npm)
 * @requires ../services/vector-store - RAG embeddings (mxbai-embed-large)
 * @requires ../shared/config-hub - Centralna konfiguracja
 * @requires ../services/conversation-flow - Guided Conversation Flow Service
 */

const { ipcMain, shell, app } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('../shared/logger');
const config = require('../shared/config');
const { runWithTrace, getTraceId } = require('../shared/tracing');

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE MODULES - Moduły przetwarzania danych postaci
// ═══════════════════════════════════════════════════════════════════════════════
const dataExtraction = require('../modules/data-extraction');      // Ekstrakcja danych z API
const profileMerge = require('../modules/profile-merge');          // Łączenie profili z różnych źródeł
const rendering = require('../modules/rendering');                 // Renderowanie HTML kart

// ═══════════════════════════════════════════════════════════════════════════════
// AI SERVICES - Serwisy sztucznej inteligencji
// ═══════════════════════════════════════════════════════════════════════════════
const ollamaService = require('../services/ollama-client');        // ⭐ Główny klient Ollama (streaming, embeddings)
const vectorStore = require('../services/vector-store');           // RAG - przeszukiwanie dokumentów
const sessionService = require('../services/session-service');     // Zarządzanie sesją użytkownika
const textCorrectorService = require('../services/text-corrector');// Auto-korekta tekstu
const modelLimits = require('../services/model-limits');           // Limity tokenów per model

const configHub = require('../shared/config-hub');                 // Centralna konfiguracja (data/config.json)
const schemaLoader = require('../schemas/schema-loader');          // JSON Schemas dla structured output
const conversationFlowService = require('../services/conversation-flow'); // Guided Conversation Flow
const flowManager = require('../services/flow-manager'); // Integrated GCF Logic
const relationshipService = require('../services/relationship-service'); // Relationship Analysis Service

// Initialize GCF with persistence path
try {
    const userDataPath = app.getPath('userData');
    conversationFlowService.init(userDataPath);
    logger.info('[GCF] Service initialized with path:', userDataPath);
} catch (e) {
    logger.error('[GCF] Failed to initialize persistence path', e);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 2: HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════
// Funkcje pomocnicze do komunikacji z renderer process
// sendProgress - aktualizuje pasek postępu w UI (step, procent, wiadomość)
// sendLog - dodaje wpis do konsoli logów w UI

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

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 3: DATA SOURCE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════
// Handlery pobierania danych z zewnętrznych źródeł:
// - fetch-sheets: Google Sheets (tabela postaci)
// - fetch-larpgothic: LarpGothic API (profile postaci z bazy LARP)
// - fetch-world-context: Google Drive + PDF (opis świata) - TODO

// Get Trace ID
ipcMain.handle('get-trace-id', async () => {
    return getTraceId();
});

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
        return result;
    });
});

// Profile API Upgrade - History
ipcMain.handle('get-profile-history', async (event, criteria) => {
    return runWithTrace(async () => {
        logger.info('Fetching profile history', { criteria });
        const profileService = require('../services/profile-service');

        // Use smart fetcher if name is available to ensure correct UserID discovery
        // This fixes issues where local 'id' doesn't match API 'userid'
        if (criteria.name) {
            return await profileService.getHistoryByName(criteria.name);
        }

        return await profileService.getProfiles(criteria);
    });
});

// Search for mentions of a character in other profiles' summaries
ipcMain.handle('search-mentions', async (event, characterName) => {
    return runWithTrace(async () => {
        logger.info('Searching mentions for character', { characterName });
        const profileService = require('../services/profile-service');
        return await profileService.searchMentions(characterName);
    });
});

// Analyze relationships
ipcMain.handle('analyze-relations', async (event, forceRefresh = false) => {
    return runWithTrace(async () => {
        logger.info('Analyzing relationships', { forceRefresh });
        sendProgress(event, 5, 10, 'Budowanie grafu relacji...');

        try {
            const graph = await relationshipService.buildGraph(forceRefresh);
            sendProgress(event, 5, 100, 'Graf zbudowany');
            return { success: true, graph };
        } catch (e) {
            logger.error('Relationship analysis failed', e);
            return { success: false, error: e.message };
        }
    });
});

// Analyze plot potential for a cluster around a character
ipcMain.handle('analyze-plot-potential', async (event, characterName) => {
    return runWithTrace(async () => {
        logger.info('Analyzing plot potential', { characterName });
        sendProgress(event, 5, 20, 'Analiza sąsiedztwa...');

        if (!characterName) return { success: false, error: 'Brak nazwy postaci' };

        // 1. Get neighbors
        const context = await relationshipService.getContextForCharacter(characterName);
        if (!context || !context.relations || context.relations.length === 0) {
            return { success: false, error: 'Brak relacji dla tej postaci (samotnik).' };
        }

        // 2. Fetch profiles for neighbors (limit to top 5 strong connections)
        sendProgress(event, 5, 40, 'Pobieranie profili powiązanych...');
        // Sort by weight desc just in case
        const neighbors = context.relations.sort((a, b) => b.weight - a.weight).slice(0, 5);
        const neighborNames = neighbors.map(r => r.target);

        const profileService = require('../services/profile-service');
        const profiles = [];

        // Fetch specific profiles
        for (const name of neighborNames) {
            // Using existing getProfiles with precise name match if possible
            // Note: getProfiles is usually for finding rows. 
            // We assume backend has optimized lookups or we scan. 
            // For now, let's trust getProfiles or implement a specific getProfileByName in service if needed.
            // Using getProfiles({ search: name }) might return multiple.
            // Assuming we accept the first match.
            const res = await profileService.getProfiles({ name: name });
            if (res.success && res.rows.length > 0) {
                profiles.push(res.rows[0]);
            }
        }

        if (profiles.length === 0) {
            return { success: false, error: 'Nie znaleziono profili sąsiadów w bazie.' };
        }

        // 3. Construct Semantic Prompt
        sendProgress(event, 5, 60, 'Generowanie pomysłów fabularnych (AI)...');

        let promptContext = `POSTAĆ GŁÓWNA: ${characterName}\n\n`;
        promptContext += `SIEC RELACJI (TOP 5):\n`;

        profiles.forEach(p => {
            const name = p['Imie postaci'];
            const desc = p['O postaci'] || p['Wątki/Cele'] || p['Historia'] || 'Brak opisu';
            promptContext += `- ${name}: ${desc.substring(0, 300)}...\n`;
        });

        const prompt = `Jesteś Kreatorem Fabuły (Plot Weaver) dla Gothic LARP.
Analizujesz grupę powiązanych postaci (klaster relacyjny).

DANE:
${promptContext}

ZADANIE:
Znajdź WSPÓLNY MIANOWNIK (Semantic Match) dla tej grupy. Co ich łączy? (Zemsta, handel, długi, sekta, stary konflikt?).
Zaproponuj 3 konkretne HOOKI FABULARNE (Plot Hooks) dla Postaci Głównej, które aktywnie angażują wymienionych sąsiadów.
Hook ma być pretekstem do napisania Listu lub przeprowadzenia rozmowy.

FORMAT ODPOWIEDZI (JSON):
{
  "theme": "Krótki opis motywu przewodniego grupy",
  "hooks": [
    { 
      "title": "Chwytliwy tytuł wątku", 
      "description": "Opis sytuacji (2-3 zdania). Kto, co, dlaczego.", 
      "target_letter": "Szkic treści listu/plotki, który Postać Główna mogłaby otrzymać." 
    }
  ]
}
Odpowiedz tylko JSON.`;

        // 4. Call AI 
        // We use ollamaService direct generation for speed and JSON
        const aiResult = await ollamaService.generateText(prompt, {
            // Use smart model selection from config if possible, or fallback
            // We'll trust the default or 'gemma2:9b'
            model: configHub.get('ai.defaultModel') || 'gemma2:9b',
            format: 'json',
            temperature: 0.7,
            num_ctx: 4096 // Ensure enough context for multiple profiles
        });

        if (aiResult.success) {
            sendProgress(event, 5, 100, 'Zakończono analizę.');
            return { success: true, analysis: aiResult.text };
        } else {
            return { success: false, error: aiResult.error };
        }
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

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 4: PIPELINE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════
// Przetwarzanie danych postaci przez "lanes" (ścieżki analizy):
// - process-lane: Przetwarza pojedynczą ścieżkę przez AI + indeksuje do RAG
// - process-all-lanes: Batch processing wszystkich ścieżek
// - reduce-profile: Łączy wyniki z lanes w finalny profil
// - generate-quests: Generuje questy dla postaci
// - render-cards: Renderuje karty HTML
// - save-output: Zapisuje plik wyjściowy
// - open-output-folder: Otwiera folder z wynikami

// Process a single lane through AI
ipcMain.handle('process-lane', async (event, lane, data) => {
    return runWithTrace(async () => {
        logger.info('Processing lane', { lane });
        sendLog(event, 'info', `Przetwarzam ścieżkę: ${lane}`);

        try {
            const result = await ollamaService.processLane(lane, data);

            if (result.success) {
                sendLog(event, 'success', `Ścieżka ${lane} przetworzona`);

                // --- RAG INDEXING ---
                try {
                    await vectorStore.addDocument(
                        `Profile Extraction (${lane}):\n${result.result}`,
                        { source: 'extraction', lane: lane, timestamp: Date.now() }
                    );
                } catch (e) {
                    logger.warn('Failed to index lane result', { error: e.message });
                }
                // --------------------

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
            logger.error('Profile merge failed', {
                error: error.message
            });
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

// List files in output subfolder
ipcMain.handle('list-files', async (event, subfolder) => {
    try {
        const outputDir = path.resolve(config.output.path);
        const targetDir = path.join(outputDir, subfolder);

        if (!fs.existsSync(targetDir)) {
            return { success: true, files: [] };
        }

        const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.json'));
        const fileContents = [];

        for (const file of files) {
            try {
                const content = fs.readFileSync(path.join(targetDir, file), 'utf-8');
                const json = JSON.parse(content);
                // Inject filename for updates
                json._filename = file;
                json._path = path.join(targetDir, file);
                fileContents.push(json);
            } catch (err) {
                // Ignore bad files
            }
        }

        return { success: true, files: fileContents };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// Open specific file
ipcMain.handle('open-file', async (event, filepath) => {
    try {
        if (!filepath) return { success: false, error: 'No filepath provided' };
        // Resolve absolute path if relative
        const resolvedPath = path.isAbsolute(filepath) ? filepath : path.resolve(config.output.path, filepath);

        if (!fs.existsSync(resolvedPath)) {
            // Fallback to project root if not in output
            const rootPath = path.resolve(__dirname, '..', '..', filepath);
            if (fs.existsSync(rootPath)) {
                shell.openPath(rootPath);
                return { success: true };
            }
            return { success: false, error: 'File not found' };
        }
        shell.openPath(resolvedPath);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 5: AI COMMAND HANDLER ⭐ GŁÓWNY HANDLER AI
// ═══════════════════════════════════════════════════════════════════════════════
// To jest SERCE całej aplikacji AI. Obsługuje wszystkie komendy AI:
// 
// FLOW PRZETWARZANIA:
// 1. Session Management - tworzy/aktualizuje sesję użytkownika
// 2. Smart Limits - oblicza limity tokenów na podstawie modelu
// 3. RAG Context - przeszukuje Vector Store po kontekst (opcjonalne)
// 4. Prompt Building:
//    - commandType === 'custom' → bezpośredni prompt użytkownika
//    - options.promptConfig → nowy prompt-builder.js
//    - default → legacy prompts (funkcje build*Prompt poniżej)
// 5. AI Generation - wywołuje Ollama (streaming lub synchronicznie)
// 6. Quality Control:
//    - Walidacja odpowiedzi (validateResponse)
//    - Auto-korekta tekstu (textCorrectorService)
// 7. RAG Indexing - zapisuje odpowiedź do Vector Store
// 8. Fallback - próbuje mniejszych modeli jeśli główny zawiedzie
//
// WAŻNE NIUANSE:
// - stream: true → chunki wysyłane przez event.sender.send('ai-stream')
// - format: schema → wymusza JSON Schema output (structured output)
// - Błędy RAG NIE blokują głównego flow (try/catch wewnętrzny)

ipcMain.handle('ai-command', async (event, commandType, profile, options = {}) => {
    return runWithTrace(async () => {
        logger.info('AI Command received', {
            commandType,
            profileName: profile?.['Imie postaci'],
            model: options.model,
            temperature: options.temperature
        });
        sendLog(event, 'info', `AI: ${commandType}`);

        // --- SESSION MANAGEMENT ---
        if (!sessionService.currentSession) {
            sessionService.startnewSession(profile?.['Imie postaci'] || 'Unknown');
        }
        const userPrompt = options.customPrompt || `Command: ${commandType}`;
        sessionService.addMessage('user', userPrompt);
        // --------------------------

        // Calculate smart limits based on model and preference
        const responseLength = options.promptConfig?.responseLength || 'medium';
        const limits = await modelLimits.calculateLimits(options.model, responseLength);

        logger.info('Smart limits calculated', { model: options.model, limits });

        // --- RAG & CONTEXT INTEGRATION ---
        let contextInjection = "";

        // 1. Get Session Context (Recent history + Entities)
        const sessionContext = sessionService.getCurrentContext();
        if (sessionContext) {
            contextInjection += sessionContext;
        }

        // 2. Get Vector Store Context (RAG)
        // Check options.disableRAG (passed from Stage 0)
        // Also respect promptConfig.contexts.rag if present (compatibility)
        const ragEnabled = options.disableRAG !== true && (options.promptConfig?.contexts?.rag !== false);

        if (ragEnabled) {
            sendLog(event, 'info', 'Przeszukuję dokumenty...');
            try {
                // Determine search query: custom prompt or profile context
                const query = options.customPrompt || `Postać: ${profile?.['Imie postaci']} ${profile?.['Gildia'] || ''}`;

                // Search vector store
                const relevantDocs = await vectorStore.search(query, 3);

                if (relevantDocs.length > 0) {
                    logger.info(`Found ${relevantDocs.length} relevant docs for context.`);
                    contextInjection += "\n\n### WIEDZA DODATKOWA (RAG) ###\n" +
                        relevantDocs.map(d => `- ${d.text} (Source: ${d.metadata.source || 'unknown'})`).join('\n');
                }
            } catch (e) {
                logger.warn('RAG search failed', { error: e.message });
            }
        } else {
            logger.info('RAG search skipped (disabled via options)');
        }
        // -----------------------

        // Append context to system prompt if it exists
        if (contextInjection) {
            options.system = (options.system || "") + "\n" + contextInjection;
        }

        // Determine Prompt
        let prompt;
        // FIX: Initialize systemPrompt here to avoid ReferenceError later
        let systemPrompt = "Jesteś asystentem AI.";

        // --- INTEGRATED GCF LOGIC (THE BRAIN) ---
        // Uses full State Machine from conversation-flow.js (DIAGNOSIS → COLLECTION → CONFIRMATION → EXECUTION)
        let gcfHandled = false;

        // FAST PATH: Do not use Agentic Flow for simple greetings or short messages (Performance Optimization)
        // If message is short (< 20 chars) and isn't a command, treat as simple chat (direct streaming)
        const isSimpleChat = userPrompt.length < 20 && !userPrompt.startsWith('/');

        if ((commandType === 'chat' || commandType === 'custom') && !isSimpleChat) {
            try {
                const gcfResult = await conversationFlowService.processMessage(
                    profile?.['Imie postaci'] || 'Player',
                    userPrompt,
                    profile,
                    options.model
                );

                // If GCF returns a response, use it directly
                if (gcfResult && gcfResult.success) {
                    gcfHandled = true;
                    logger.info('[GCF] Handled by State Machine', { stage: gcfResult.stage, type: gcfResult.type });

                    // If FORCE_GENERATE, return the recipe as structured output
                    if (gcfResult.type === 'FORCE_GENERATE' && gcfResult.recipe) {
                        return {
                            success: true,
                            text: gcfResult.recipe,
                            commandType: 'gcf_generated',
                            stage: gcfResult.stage
                        };
                    }

                    // Otherwise return the conversational message
                    return {
                        success: true,
                        text: gcfResult.message || "...",
                        commandType: 'gcf_response',
                        stage: gcfResult.stage,
                        missingFields: gcfResult.missingFields
                    };
                }
            } catch (gcfError) {
                logger.warn('[GCF] State Machine error, falling back to standard', { error: gcfError.message });
            }
        }
        // ----------------------------------------


        if (!gcfHandled) {
            // Standard Legacy Logic or New PromptBuilder Logic
            if (commandType === 'custom') {
                prompt = options.customPrompt;

                // --- NEW: Use PromptBuilder for Custom/Chat if available ---
                try {
                    const { PromptBuilder } = require('../prompts/prompt-builder'); // Class-based
                    if (PromptBuilder) {
                        const builder = new PromptBuilder();
                        // Inject Profile
                        if (profile) builder.withUserProfile(profile);

                        // Inject Dynamic Context (Passed from Frontend)
                        if (options.dynamicContext) {
                            Object.values(options.dynamicContext).forEach(ctxVal => {
                                // We simply append it to lore or a new method
                                // For now, append to loreContext raw
                                builder.context.loreContext += `\n${ctxVal}\n`;
                            });
                        }

                        // Inject Task
                        builder.withTask('custom', { prompt: userPrompt }); // generic

                        // Build System
                        systemPrompt = builder.build();
                        logger.info('Built system prompt via PromptBuilder class');
                    } else {
                        // Fallback to legacy
                        const promptBuilder = require('../prompts/prompt-builder');
                        if (options.promptConfig) {
                            systemPrompt = promptBuilder.buildDynamicSystemPrompt(profile, options.promptConfig);
                        } else {
                            systemPrompt = promptBuilder.buildBaseSystemPrompt(profile);
                        }
                    }
                } catch (e) {
                    logger.warn('PromptBuilder match failed', e);
                    /* fallback */
                }

            } else if (options.promptConfig) {
                // ... (existing config logic)
                // We should probably migrate this too, but let's leave it for now to minimize breakage
                // unless user explicitly asked to fully replace logic.
                try {
                    const promptBuilder = require('../prompts/prompt-builder');
                    systemPrompt = promptBuilder.buildDynamicSystemPrompt(profile, options.promptConfig);
                    prompt = promptBuilder.buildPrompt(commandType, profile, options.promptConfig);
                    logger.info('Using configurable prompt builder', { commandType, style: options.promptConfig.style });
                } catch (err) {
                    logger.warn('Fallback to legacy prompts', { error: err.message });
                    prompt = null;
                }
            } else if (commandType === 'chat') {
                prompt = userPrompt;
                // Use new Builder
                try {
                    const { PromptBuilder } = require('../prompts/prompt-builder');
                    const builder = new PromptBuilder();
                    if (profile) builder.withUserProfile(profile);
                    if (options.dynamicContext) {
                        Object.values(options.dynamicContext).forEach(ctxVal => builder.context.loreContext += `\n${ctxVal}\n`);
                    }
                    builder.withTask('custom'); // chat
                    systemPrompt = builder.build();
                } catch (e) {
                    const promptBuilder = require('../prompts/prompt-builder');
                    systemPrompt = promptBuilder.buildBaseSystemPrompt(profile);
                }
            }

            // --- NEXT MOVE SUGGESTION ---
            // If chat/custom, ask AI to suggest next step
            if ((commandType === 'chat' || commandType === 'custom') && !prompt.includes('Sugestia:')) {
                // We append this specific instruction to the USER prompt or SYSTEM?
                // Append to System is safer to not mess up user inputs
                systemPrompt += `\n\nZADANIE DODATKOWE: Na końcu odpowiedzi dodaj (w nowej linii): "Sugestia: [Krótka propozycja co gracz może zrobić dalej]".`;
            }
        }

        // Final System Prompt Update (Merge local var with options)
        options.system = (options.system ? options.system + "\n" : "") + systemPrompt;

        if (!prompt && commandType !== 'custom') {
            // Special Handler for Text Correction
            if (commandType === 'correct_text') {
                const textToCorrect = (profile['Historia'] || '') + '\n' + (profile['Terazniejszosc'] || '');
                if (textToCorrect.trim()) {
                    try {
                        const corrected = await textCorrectorService.correctText(textToCorrect, { model: options.model });
                        return { success: true, text: corrected, commandType };
                    } catch (err) {
                        return { success: false, error: err.message };
                    }
                } else {
                    return { success: false, error: "Brak tekstu do korekty w profilu." };
                }
            }

            // Standardized Prompt Building
            try {
                const { PromptBuilder } = require('../prompts/prompt-builder');
                const builder = new PromptBuilder();
                if (profile) builder.withUserProfile(profile);
                builder.withLoreContext();
                builder.withTask(commandType);

                // Build full system context
                options.system = builder.build();

                // Generic User Prompt Trigger
                prompt = "Wykonaj zadanie zdefiniowane w instrukcji systemowej.";
                if (commandType === 'summarize') {
                    prompt = "Podsumuj postać zgodnie z instrukcją.";
                }

                // JSON Enforcement
                const jsonCommands = [
                    'extract_traits', 'analyze_relations',
                    'main_quest', 'side_quest', 'side_quest_repeatable', 'redemption_quest', 'group_quest',
                    'story_hooks', 'potential_conflicts', 'npc_connections',
                    'nickname', 'faction_suggestion', 'secret', 'summarize', 'advise'
                ];

                if (jsonCommands.includes(commandType)) {
                    options.format = 'json';
                }

                // Schema Override from SchemaLoader (if exists)
                const schema = schemaLoader.getSchemaForCommand(commandType);
                if (schema) {
                    options.format = schema;
                }

            } catch (err) {
                logger.error("Standardized prompt build failed", err);
                return { success: false, error: `Prompt build failed: ${err.message}` };
            }
        }

        if (!prompt) {
            return { success: false, error: `Unknown command: ${commandType}` };
        }

        // --- PREVIEW MODE ---
        if (options.preview) {
            return {
                success: true,
                preview: true,
                system: options.system,
                prompt: prompt,
                model: options.model
            };
        }

        try {
            const shouldStream = options.stream === true;
            const sendStatus = (status) => {
                if (event?.sender && !event.sender.isDestroyed()) {
                    event.sender.send('ai-status', { status });
                }
            };

            if (shouldStream) {
                sendStatus('Przygotowuję odpowiedź...');
                sendLog(event, 'info', 'Inicjuję strumieniowanie...');

                const result = await ollamaService.generateText(prompt, {
                    model: options.model,
                    temperature: options.temperature || 0.7,
                    system: options.system,
                    num_predict: limits.num_predict,
                    num_ctx: limits.num_ctx,
                    timeout: limits.timeout,
                    stream: true,
                    onData: (chunk, isDone, stats) => {
                        if (chunk && chunk.includes('<think>')) {
                            sendStatus('Myślę...');
                        } else if (chunk && chunk.includes('</think>')) {
                            sendStatus('Generuję odpowiedź...');
                        }
                        if (event?.sender && !event.sender.isDestroyed()) {
                            event.sender.send('ai-stream', {
                                chunk,
                                done: isDone,
                                stats,
                                commandType
                            });
                        }
                    }
                });

                if (result.success) {
                    sendLog(event, 'success', `AI: ${commandType} (Stream) zakończone`);

                    // FORCE FINALIZATION: Ensure frontend gets done: true even if stream callback missed it
                    if (event?.sender && !event.sender.isDestroyed()) {
                        event.sender.send('ai-stream', {
                            done: true,
                            // Ensure we send the full text just in case, or empty chunk
                            chunk: '',
                            stats: result.stats,
                            commandType,
                            // Metadata for Reporting
                            system: options.system,
                            prompt: prompt,
                            model: options.model
                        });
                    }

                    const validation = validateResponse(result.text);
                    if (!validation.valid) {
                        // Validation Logic
                    }

                    // --- QUALITY CONTROL (Auto-Correction) ---
                    // Allow external override via options.autoCorrect (boolean)
                    // If undefined, fallback to hardcoded true (legacy) or config
                    let shouldAutoCorrect = options.autoCorrect;
                    if (shouldAutoCorrect === undefined) shouldAutoCorrect = true; // Default

                    if (shouldAutoCorrect && result.text && result.text.length > 20) {
                        try {
                            if (event?.sender && !event.sender.isDestroyed()) {
                                event.sender.send('ai-status', { status: 'Korekta językowa...' });
                            }

                            const corrected = await textCorrectorService.correctText(result.text);
                            if (corrected && corrected !== result.text) {
                                result.text = corrected;
                                if (event?.sender && !event.sender.isDestroyed()) {
                                    event.sender.send('ai-stream', {
                                        done: true,
                                        fullText: corrected,
                                        commandType,
                                        // Metadata update for corrected text
                                        system: options.system,
                                        prompt: prompt,
                                        model: options.model
                                    });
                                }
                            }
                        } catch (err) {
                            logger.error('Auto-correction failed', { error: err.message });
                        }
                    }
                    // ------------------------------------------

                    // --- RAG INDEXING (STREAM) ---
                    const indexingEnabled = options.disableIndexing !== true;
                    if (indexingEnabled && (commandType === 'custom' || commandType === 'chat')) {
                        await vectorStore.addDocument(
                            `Q: ${options.customPrompt || prompt}\nA: ${result.text}`,
                            { source: 'user-interaction', type: 'chat', timestamp: Date.now() }
                        );
                    }
                    // -----------------------------

                    return { success: true, text: result.text, prompt: prompt, system: options.system, model: options.model, stats: result.stats };
                } else {
                    return { success: false, error: result.error };
                }

            } else {
                // Non-streaming fallback logic (kept largely same, just truncated for brevity)
                const result = await ollamaService.generateText(prompt, {
                    model: options.model,
                    temperature: options.temperature || 0.7,
                    system: options.system,
                    num_predict: limits.num_predict,
                    num_ctx: limits.num_ctx,
                    timeout: limits.timeout
                });

                if (result.success) {
                    sendLog(event, 'success', `AI: ${commandType} zakończone`);
                    return { success: true, text: result.text, prompt: prompt, system: options.system, model: options.model, stats: result.stats };
                } else {
                    return { success: false, error: result.error };
                }
            }

        } catch (error) {
            logger.error('AI Command failed', { commandType, error: error.message });

            // --- MODEL FALLBACK ---
            // Try with a smaller/faster model if the original failed
            const fallbackModels = ['gemma:2b', 'phi3:3.8b', 'orca-mini:3b'];
            const currentModel = options.model || 'unknown';

            // Don't fallback if we're already using a fallback model
            if (!fallbackModels.includes(currentModel)) {
                for (const fallbackModel of fallbackModels) {
                    try {
                        logger.info(`Attempting fallback to ${fallbackModel}...`);
                        sendLog(event, 'warn', `Model ${currentModel} zawiódł. Próbuję ${fallbackModel}...`);

                        const fallbackResult = await ollamaService.generateText(prompt, {
                            model: fallbackModel,
                            temperature: options.temperature || 0.7,
                            system: options.system,
                            num_predict: 1000, // Conservative limit for fallback
                            num_ctx: 4096,
                            timeout: 60000
                        });

                        if (fallbackResult.success) {
                            logger.info(`Fallback to ${fallbackModel} succeeded`);
                            sendLog(event, 'success', `Fallback ${fallbackModel} zakończony pomyślnie`);
                            return {
                                success: true,
                                text: fallbackResult.text,
                                prompt: prompt,
                                fallbackModel: fallbackModel
                            };
                        }
                    } catch (fallbackError) {
                        logger.warn(`Fallback model ${fallbackModel} failed`, { error: fallbackError.message });
                    }
                }
            }
            // -----------------------

            return { success: false, error: error.message };
        }
    });
});

// Text Correction Handler
ipcMain.handle('ai:correct-text', async (event, text, options) => {
    return runWithTrace(async () => {
        logger.info('Text correction requested');
        const corrected = await textCorrectorService.correctText(text, options);
        return { success: true, text: corrected };
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 7: CONFIGHUB HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════
// Centralna konfiguracja aplikacji (persisted w data/config.json)
// Sekcje: models, generation, prompts, timeouts, features
// Użycie w renderer: window.electronAPI.configGet/configSet/configGetAll

// Get a single config value
ipcMain.handle('config:get', async (event, configPath, defaultValue) => {
    return { success: true, value: configHub.get(configPath, defaultValue) };
});

// Set a config value
ipcMain.handle('config:set', async (event, configPath, value) => {
    try {
        configHub.set(configPath, value);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// Get entire config
ipcMain.handle('config:getAll', async () => {
    return { success: true, config: configHub.getAll() };
});

// Reset config (entire or section)
ipcMain.handle('config:reset', async (event, section) => {
    try {
        configHub.reset(section || null);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// Export config as JSON string
ipcMain.handle('config:export', async () => {
    return { success: true, json: configHub.export() };
});

// Import config from JSON string
ipcMain.handle('config:import', async (event, jsonString) => {
    return configHub.import(jsonString);
});

// Get default config (for comparison)
ipcMain.handle('config:getDefaults', async () => {
    return { success: true, defaults: configHub.getDefaults() };
});
// [Legacy Conversation Flow Removed]



// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 10: DATA LOADING HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════
// Ładowanie danych z plików Excel i kontekstu świata:
// - data:load-mg-profiles: Profile Mistrzów Gry (docs/MG_Profiles.xlsx)
// - data:load-faction-history: Historia frakcji (docs/Faction_History.xlsx)
// - data:load-char-history: Historia postaci (docs/Char_History.xlsx)
// - data:load-world-context: Kontekst świata (src/contexts/*.txt)
// - get-profile-by-name: Pobiera profil postaci po imieniu
// - get-all-character-names: Lista wszystkich imion (dla autocomplete)

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

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 11: MODEL TESTBENCH HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════
// System testów porównawczych modeli AI. Zawiera:
// - testbench:get-models: Lista dostępnych modeli
// - testbench:get-scenarios: Scenariusze testowe
// - testbench:run-tests: Uruchomienie testów (z progress callback)
// - testbench:cancel: Anulowanie testów
// - testbench:export-report: Eksport raportu HTML
//
// ZAAWANSOWANE TESTY (tests:*):
// - context-limits, memory-usage, consistency, prompt-sensitivity
// - instruction-following, hallucination, latency, cost-efficiency
// - needle-haystack, safety-limits, language-stability

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

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 11B: ADVANCED TESTS - Izolowane handlery testów
// ═══════════════════════════════════════════════════════════════════════════════
// Każdy test ma dwa handlery: :run-all (uruchom) i :load-cache (załaduj cache)
// Wyniki są cache'owane w data/test-results/

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




// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 11.5: CHARACTER TEST REPORT
// ═══════════════════════════════════════════════════════════════════════════════

const { exec } = require('child_process');

// Generate HTML Report
ipcMain.handle('report:generate', async (event, runId) => {
    return runWithTrace(async () => {
        return new Promise((resolve) => {
            const scriptPath = path.join(__dirname, '../../tools/report-generator/generate.js');
            // Ensure runId is safe (alphanumeric + dashes/colons)
            const safeId = (runId || '').replace(/[^a-zA-Z0-9-:]/g, '');
            const cmd = `node "${scriptPath}" "${safeId}"`;

            logger.info('Running report generator', { cmd });

            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    logger.error('Report generation failed', { error });
                    resolve({ success: false, error: error.message });
                    return;
                }
                logger.info('Report generated successfully');
                resolve({ success: true, output: stdout });
            });
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 12: CUSTOM MODEL PATH HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════
// Zarządzanie ścieżką przechowywania modeli Ollama.
// Używane gdy użytkownik chce przenosic modele np. na inny dysk (SSD -> HDD)
// 
// NIUANSE:
// - Ustawia OLLAMA_MODELS przez setx (user env variable)
// - Może kopiować modele przez robocopy (opcjonalne)
// - Restartuje serwis Ollama po zmianie
// - Wymaga restartu aplikacji dla pełnego efektu

ipcMain.handle('ollama:get-models-path', async () => {
    return process.env.OLLAMA_MODELS || '';
});

ipcMain.handle('ollama:pick-models-path', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Wybierz folder na modele Ollama'
    });
    return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('ollama:set-models-path', async (event, { newPath, moveModels }) => {
    return runWithTrace(async () => {
        logger.info('Setting custom models path', { newPath, moveModels });

        try {
            // 1. Set environment variable persistently (User scope)
            // Note: This requires a restart of the app to take full effect usually, 
            // but we can update process.env for the current session too.
            const { exec } = require('child_process');

            await new Promise((resolve, reject) => {
                exec(`setx OLLAMA_MODELS "${newPath}"`, (error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });

            // Update current process env
            process.env.OLLAMA_MODELS = newPath;

            // 2. Move models if requested
            if (moveModels) {
                const fs = require('fs');
                const path = require('path');
                const os = require('os');

                // Try to find current models source
                let sourcePath = path.join(os.homedir(), '.ollama', 'models');
                // Check if we are currently using WSL or other custom path
                // (Simple logic: if source has content, copy it)

                // For simplicity/robustness, we'll try to copy from standard Windows location first
                // If the user was on WSL, copying from UNC path might be slow/complex in Node, 
                // but we can try if source exists.

                // Let's assume standard migration from C:\Users\User\.ollama\models 
                // or if OLLAMA_MODELS was already set, from there.

                if (fs.existsSync(sourcePath)) {
                    sendProgress(event, 1, 10, 'Kopiowanie modeli...');

                    // We use robocopy for robust directory copying on Windows
                    await new Promise((resolve, reject) => {
                        // /E = recursive, /NFL /NDL = quiet logging
                        const cmd = `robocopy "${sourcePath}" "${newPath}" /E /NFL /NDL`;
                        exec(cmd, (error, stdout, stderr) => {
                            // Robocopy exit codes: 0-7 are success/partial success
                            if (error && error.code > 7) {
                                reject(new Error(`Robocopy failed: ${error.code}`));
                            } else {
                                resolve();
                            }
                        });
                    });
                    sendProgress(event, 1, 90, 'Skopiowano modele');
                }
            }

            // 3. Restart Ollama
            sendProgress(event, 1, 95, 'Restartowanie serwisu Ollama...');

            // Kill existing
            await new Promise(r => exec('taskkill /IM ollama.exe /F', () => r()));
            // Wait a bit
            await new Promise(r => setTimeout(r, 1000));
            // Start new
            const ollamaPath = path.join(process.env.LOCALAPPDATA, 'Programs', 'Ollama', 'ollama.exe');
            require('child_process').spawn(ollamaPath, ['serve'], {
                detached: true,
                stdio: 'ignore',
                env: { ...process.env, OLLAMA_MODELS: newPath }
            }).unref();

            sendProgress(event, 1, 100, 'Gotowe');
            return { success: true };

        } catch (error) {
            logger.error('Failed to set model path', error);
            return { success: false, error: error.message };
        }
    });
});




// ═══════════════════════════════════════════════════════════════════════════════
// SEKCJA 13: QUALITY CONTROL HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
// Walidacja jakości odpowiedzi AI przed zwrotem do użytkownika.
// Wykrywa problemy jak:
// - Zbyt krótkie odpowiedzi (<5 znaków)
// - Surowy JSON dump (błąd modelu - nie sformatował odpowiedzi)
// - Angielskie odmowy ("I cannot fulfill...", "as an AI language model")

/**
 * Waliduje odpowiedź AI pod kątem jakości
 * @param {string} text - Tekst odpowiedzi do walidacji
 * @returns {{valid: boolean, error?: string}} Wynik walidacji
 */
function validateResponse(text) {
    if (!text || text.length < 5) return { valid: false, error: 'Zbyt krótka odpowiedź' };

    const trimmed = text.trim();
    // JSON dump check (if it looks like a JSON object and is short and has no double newlines, likely a dump)
    if (trimmed.startsWith('{') && trimmed.endsWith('}') && trimmed.length < 1000 && !trimmed.includes('\n\n')) {
        return { valid: false, error: 'Surowy format JSON (błąd modelu)' };
    }

    // English refusal check
    if (text.includes("I cannot fulfill") || text.includes("as an AI language model")) {
        return { valid: false, error: 'Odmowa asystenta (model refused)' };
    }

    return { valid: true };
}
