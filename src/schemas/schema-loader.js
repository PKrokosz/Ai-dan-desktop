/**
 * Schema Loader - loads JSON Schemas for structured AI outputs
 * Provides schema for each command type to enforce structured responses
 */

const fs = require('fs');
const path = require('path');
const logger = require('../shared/logger');

// Cache loaded schemas
const schemaCache = new Map();

// Map command types to schema files
const COMMAND_SCHEMA_MAP = {
    'main_quest': 'QuestSchema.json',
    'side_quest': 'QuestSchema.json',
    'redemption_quest': 'QuestSchema.json',
    'group_quest': 'QuestSchema.json',
    'extract_traits': 'TraitsSchema.json',
    'npc_connections': 'NpcProfileSchema.json',
    'analyze_relations': 'NpcProfileSchema.json',
    'secret': 'TraitsSchema.json',
    'story_hooks': 'QuestSchema.json',
    'potential_conflicts': 'QuestSchema.json'
};

/**
 * Enhanced Goal Schemas for Guided Conversation Flow
 * Contains metadata for validation, normalization, and UI rendering.
 */
const GOAL_SCHEMAS = {
    'GENERATE_QUEST': {
        id: 'GENERATE_QUEST',
        fields: {
            theme: {
                type: 'string',
                required: true,
                description: 'Mood/Theme like revenge, greed',
                normalize: (val) => val ? val.toLowerCase().trim() : null
            },
            type: {
                type: 'enum',
                options: ['Main', 'Side', 'Fetch', 'Investigation'],
                required: true,
                default: 'Side',
                typings: {
                    'główny': 'Main', 'main': 'Main',
                    'poboczny': 'Side', 'side': 'Side',
                    'przynieś': 'Fetch', 'fetch': 'Fetch',
                    'śledztwo': 'Investigation', 'investigation': 'Investigation'
                }
            },
            difficulty: {
                type: 'enum',
                options: ['Easy', 'Normal', 'Hard'],
                required: false,
                default: 'Normal',
                typings: {
                    'łatwy': 'Easy', 'easy': 'Easy',
                    'normalny': 'Normal', 'normal': 'Normal',
                    'trudny': 'Hard', 'hard': 'Hard'
                }
            },
            antagonist: {
                type: 'string',
                required: false,
                description: 'Główny przeciwnik lub przeszkoda'
            }
        }
    }
};

/**
 * Get JSON Schema for a specific command type
 * @param {string} commandType - AI command type
 * @returns {object|null} JSON Schema object or null if not applicable
 */
function getSchemaForCommand(commandType) {
    const schemaFile = COMMAND_SCHEMA_MAP[commandType];

    if (!schemaFile) {
        return null; // No schema for this command (free-form text)
    }

    // Check cache
    if (schemaCache.has(schemaFile)) {
        return schemaCache.get(schemaFile);
    }

    try {
        const schemaPath = path.join(__dirname, schemaFile);
        const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
        const schema = JSON.parse(schemaContent);

        schemaCache.set(schemaFile, schema);
        logger.info(`[SchemaLoader] Loaded schema: ${schemaFile}`);

        return schema;
    } catch (error) {
        logger.error(`[SchemaLoader] Failed to load schema ${schemaFile}:`, error.message);
        return null;
    }
}

/**
 * Check if a command type requires structured output
 * @param {string} commandType 
 * @returns {boolean}
 */
function requiresStructuredOutput(commandType) {
    return COMMAND_SCHEMA_MAP.hasOwnProperty(commandType);
}

/**
 * Get list of all available schemas
 * @returns {string[]}
 */
function getAvailableSchemas() {
    return Object.keys(COMMAND_SCHEMA_MAP);
}

/**
 * Clear schema cache (useful after hot reload)
 */
function clearCache() {
    schemaCache.clear();
    logger.info('[SchemaLoader] Cache cleared');
}

module.exports = {
    getSchemaForCommand,
    requiresStructuredOutput,
    getAvailableSchemas,
    clearCache,
    getGoalSchema: (id) => GOAL_SCHEMAS[id],
    GOAL_SCHEMAS
};
