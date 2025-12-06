/**
 * @module config
 * @description Ładowanie konfiguracji z .env
 */

const path = require('path');
const fs = require('fs');

// Load .env file
function loadEnv() {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        content.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=');
                if (key) {
                    process.env[key.trim()] = valueParts.join('=').trim();
                }
            }
        });
    }
}

loadEnv();

const config = {
    env: process.env.NODE_ENV || 'development',

    google: {
        serviceAccountPath: process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './credentials/service-account.json',
        sheetId: process.env.GOOGLE_SHEET_ID || '',
        sheetName: process.env.GOOGLE_SHEET_NAME || 'arkusz1',
        driveFiles: {
            worldBase: process.env.GOOGLE_DRIVE_WORLD_BASE_ID || '',
            questExamples: process.env.GOOGLE_DRIVE_QUEST_EXAMPLES_ID || '',
            questFilled: process.env.GOOGLE_DRIVE_QUEST_FILLED_ID || ''
        }
    },

    ollama: {
        host: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
        models: {
            extraction: process.env.OLLAMA_MODEL_EXTRACTION || 'phi4-mini:latest',
            generation: process.env.OLLAMA_MODEL_GENERATION || 'mistral:latest'
        }
    },

    output: {
        path: process.env.OUTPUT_PATH || './output'
    }
};

module.exports = config;
