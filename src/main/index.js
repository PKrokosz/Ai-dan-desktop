/**
 * Agent MG - Electron Main Process
 * Entry point for the desktop application
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { runWithTrace } = require('../shared/tracing');
const logger = require('../shared/logger');

// Keep a global reference to prevent garbage collection
let mainWindow = null;

function createWindow() {
    logger.info('Creating main window');

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        backgroundColor: '#0e0c09', // Dark gothic background
        titleBarStyle: 'default',
        icon: path.join(__dirname, '../assets/icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Load the renderer HTML
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// App lifecycle
app.whenReady().then(() => {
    runWithTrace(async () => {
        logger.info('Agent MG starting', { version: app.getVersion() });
        createWindow();

        // Start indexing documentation in background
        setTimeout(async () => {
            try {
                const knowledgeIndexer = require('../services/knowledge-indexer');
                await knowledgeIndexer.indexDocs();
            } catch (err) {
                logger.error('Background indexing failed', err);
            }
        }, 5000);
    });
});

app.on('window-all-closed', () => {
    logger.info('All windows closed');
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// ============================================
// IPC Handlers - Communication with renderer
// ============================================

// Check Ollama connection
ipcMain.handle('check-ollama', async () => {
    const ollamaService = require('../services/ollama-client'); // Using official npm library
    logger.info('Checking Ollama connection (via Service)');
    return await ollamaService.checkConnection();
});

// Pull Ollama model
ipcMain.handle('pull-model', async (event, modelName) => {
    const ollamaService = require('../services/ollama-client'); // Using official npm library
    logger.info('Pulling Ollama model', { model: modelName });

    const onProgress = (percent, status) => {
        event.sender.send('model-pull-progress', { modelName, percent, status });
    };

    const result = await ollamaService.pullModel(modelName, onProgress);

    if (result.success) {
        logger.info('Model pulled successfully', { model: modelName });
    } else {
        logger.error('Model pull failed', { model: modelName, error: result.error });
    }

    return result;
});

// Get current trace ID
ipcMain.handle('get-trace-id', () => {
    const { getTraceId } = require('../shared/tracing');
    return getTraceId();
});

// ============================================
// Ollama Installation Handlers
// ============================================
const ollamaInstaller = require('../services/ollama-installer');

// Check if Ollama is installed
ipcMain.handle('check-ollama-installed', async () => {
    const installed = await ollamaInstaller.isInstalled();
    const running = installed ? await ollamaInstaller.isRunning() : false;
    return { installed, running };
});

// Install Ollama (full flow)
ipcMain.handle('install-ollama', async (event) => {
    const onStatus = (status, message) => {
        event.sender.send('ollama-install-status', { status, message });
    };
    const onProgress = (percent) => {
        event.sender.send('ollama-install-progress', { percent });
    };

    return ollamaInstaller.fullInstall(onStatus, onProgress);
});

// Start Ollama service
ipcMain.handle('start-ollama', async () => {
    return ollamaInstaller.startService();
});

// ============================================
// System Diagnostics Handler
// ============================================
const systemDiagnostics = require('../services/system-diagnostics');

ipcMain.handle('get-system-specs', async () => {
    const specs = await systemDiagnostics.getSpecs();
    const recommendation = systemDiagnostics.getRecommendation();
    return { specs, recommendation };
});

// Search character mentions in Excel
// Search character mentions in Excel
ipcMain.handle('search-excel-mentions', async (event, characterName) => {
    return runWithTrace(async () => {
        logger.info('Searching Excel mentions', { characterName });
        const excelSearchService = require('../services/excel-search');
        try {
            const results = await excelSearchService.searchMentions(characterName);
            return { success: true, results };
        } catch (error) {
            logger.error('Excel search failed', { error: error.message });
            return { success: false, error: error.message };
        }
    });
});

// Handlers moved to ipc-handlers.js

// Load more IPC handlers
require('./ipc-handlers');


