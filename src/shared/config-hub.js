/**
 * @module ConfigHub
 * @description Centralny punkt konfiguracji AI dla ai-dan-desktop.
 * 
 * Zastępuje rozproszone hardcody w:
 * - model-configs.js
 * - prompt-config.js
 * - model-limits.js
 * - ipc-handlers.js
 * - ollama.js
 * 
 * Persystuje konfigurację w data/config.json
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const CONFIG_FILE = path.join(process.cwd(), 'data', 'config.json');

/**
 * Domyślna konfiguracja - używana przy pierwszym uruchomieniu
 * lub gdy plik config.json jest uszkodzony
 */
const DEFAULT_CONFIG = {
    version: 1,

    // === MODEL DEFAULTS ===
    models: {
        default: 'mistral:latest',
        fallbackChain: ['gemma:2b', 'phi3:3.8b', 'orca-mini:3b'],

        // Per-model overrides (merged with model-configs.js)
        overrides: {
            // Example: 'mistral:latest': { temperature: 0.8 }
        }
    },

    // === GENERATION DEFAULTS ===
    generation: {
        temperature: 0.7,
        temperatureClassify: 0.1,
        temperatureCreative: 0.85,

        numPredict: {
            short: 800,
            medium: 2000,
            long: 5000,
            fallback: 1000
        },

        numCtx: {
            default: 4096,
            max: 32768
        },

        repeatPenalty: 1.1,
        topP: 0.9,
        topK: 40
    },

    // === PROMPT DEFAULTS ===
    prompts: {
        language: 'pl',  // 'pl' | 'en'

        contexts: {
            geography: true,
            system: true,
            quests: true,
            aspirations: false,
            weaknesses: false
        },

        style: 'auto',  // 'auto' | 'political' | 'mystical' | 'personal' | 'action'
        responseLength: 'medium',
        fewShotCount: 2,
        usePlaceholders: true
    },

    // === PERSONALITY ===
    personality: {
        default: 'default_mg',
        custom: {}  // User-defined personalities
    },

    // === TIMEOUTS ===
    timeouts: {
        baseMs: 300000,  // 5 minutes
        reasoningMultiplier: 2.5,
        largeModelMultiplier: 1.5
    },

    // === FEATURE FLAGS ===
    features: {
        conversationFlow: true,  // Now fully implemented
        ragEnabled: true,
        sessionContext: true,
        streamingDefault: true,
        debugLogging: false
    }
};

class ConfigHub {
    constructor() {
        this.config = null;
        this.listeners = [];
        this.initialized = false;
    }

    /**
     * Initialize the config hub (load from file or create default)
     */
    init() {
        if (this.initialized) return;

        try {
            const dir = path.dirname(CONFIG_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            if (fs.existsSync(CONFIG_FILE)) {
                const data = fs.readFileSync(CONFIG_FILE, 'utf8');
                const loaded = JSON.parse(data);

                // Merge with defaults to handle new config keys
                this.config = this._deepMerge(DEFAULT_CONFIG, loaded);

                // Check if we need to save (new keys added)
                if (JSON.stringify(this.config) !== JSON.stringify(loaded)) {
                    this._save();
                    logger.info('[ConfigHub] Config migrated with new defaults');
                }

                logger.info('[ConfigHub] Loaded config from file');
            } else {
                this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
                this._save();
                logger.info('[ConfigHub] Created default config');
            }

            this.initialized = true;
        } catch (e) {
            logger.error('[ConfigHub] Init failed, using defaults', { error: e.message });
            this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
            this.initialized = true;
        }
    }

    /**
     * Get a config value by dot-path
     * @param {string} path - e.g. 'generation.temperature'
     * @param {*} defaultValue - fallback if path not found
     */
    get(configPath, defaultValue = null) {
        if (!this.initialized) this.init();

        try {
            const value = configPath.split('.').reduce((obj, key) => obj?.[key], this.config);
            return value !== undefined ? value : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }

    /**
     * Set a config value by dot-path
     * @param {string} path - e.g. 'generation.temperature'
     * @param {*} value - value to set
     */
    set(configPath, value) {
        if (!this.initialized) this.init();

        const keys = configPath.split('.');
        const last = keys.pop();
        let target = this.config;

        for (const key of keys) {
            if (!(key in target)) target[key] = {};
            target = target[key];
        }

        target[last] = value;
        this._save();
        this._notifyListeners(configPath, value);

        logger.info('[ConfigHub] Config updated', { path: configPath, value });
    }

    /**
     * Get entire config object
     */
    getAll() {
        if (!this.initialized) this.init();
        return JSON.parse(JSON.stringify(this.config));
    }

    /**
     * Reset config (entire or section)
     * @param {string|null} section - e.g. 'generation' or null for full reset
     */
    reset(section = null) {
        if (!this.initialized) this.init();

        if (section && DEFAULT_CONFIG[section]) {
            this.config[section] = JSON.parse(JSON.stringify(DEFAULT_CONFIG[section]));
            logger.info('[ConfigHub] Section reset', { section });
        } else {
            this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
            logger.info('[ConfigHub] Full config reset');
        }

        this._save();
        this._notifyListeners('*', this.config);
    }

    /**
     * Subscribe to config changes
     * @param {Function} callback - (path, value) => void
     */
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    /**
     * Get default config (for reference/comparison)
     */
    getDefaults() {
        return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }

    /**
     * Export config to clipboard-friendly JSON
     */
    export() {
        if (!this.initialized) this.init();
        return JSON.stringify(this.config, null, 2);
    }

    /**
     * Import config from JSON string
     * @param {string} jsonString
     */
    import(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            this.config = this._deepMerge(DEFAULT_CONFIG, imported);
            this._save();
            this._notifyListeners('*', this.config);
            logger.info('[ConfigHub] Config imported');
            return { success: true };
        } catch (e) {
            logger.error('[ConfigHub] Import failed', { error: e.message });
            return { success: false, error: e.message };
        }
    }

    // === PRIVATE METHODS ===

    _save() {
        try {
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf8');
        } catch (e) {
            logger.error('[ConfigHub] Save failed', { error: e.message });
        }
    }

    _notifyListeners(path, value) {
        for (const listener of this.listeners) {
            try {
                listener(path, value);
            } catch (e) {
                // Ignore listener errors
            }
        }
    }

    _deepMerge(defaults, overrides) {
        const result = JSON.parse(JSON.stringify(defaults));

        for (const key of Object.keys(overrides || {})) {
            if (
                typeof overrides[key] === 'object' &&
                overrides[key] !== null &&
                !Array.isArray(overrides[key]) &&
                typeof defaults[key] === 'object' &&
                defaults[key] !== null
            ) {
                result[key] = this._deepMerge(defaults[key], overrides[key]);
            } else {
                result[key] = overrides[key];
            }
        }

        return result;
    }
}

// Singleton instance
const instance = new ConfigHub();

// Auto-init on require
instance.init();

module.exports = instance;
