/**
 * Schema Validator Service
 * Handles validation, normalization, and missing field detection for Guided Conversation Flow.
 */

const logger = require('../shared/logger');

class SchemaValidator {

    /**
     * Validate data against a GoalSchema
     * @param {object} schema - The GoalSchema definition
     * @param {object} data - The data object to validate
     * @returns {object} { valid: boolean, errors: [] }
     */
    validate(schema, data = {}) {
        const errors = [];

        if (!schema || !schema.fields) {
            return { valid: true, errors: [] }; // No schema = no errors
        }

        for (const [key, fieldDef] of Object.entries(schema.fields)) {
            // Check required
            if (fieldDef.required && (data[key] === undefined || data[key] === null || data[key] === '')) {
                errors.push({ field: key, code: 'MISSING_REQUIRED', message: `Field '${key}' is required.` });
                continue;
            }

            // If not required and missing, skip value checks
            if (data[key] === undefined || data[key] === null) {
                continue;
            }

            // Check Enum
            if (fieldDef.type === 'enum' && fieldDef.options) {
                // We assume data is already normalized here, but let's double check
                // In strict validation, the value must be one of the options
                if (!fieldDef.options.includes(data[key])) {
                    errors.push({
                        field: key,
                        code: 'INVALID_ENUM',
                        message: `Value '${data[key]}' is not a valid option for '${key}'. Expected: ${fieldDef.options.join(', ')}`
                    });
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get list of missing fields (required and recommended)
     * @param {object} schema 
     * @param {object} data 
     * @returns {object} { required: [], recommended: [] }
     */
    getMissingFields(schema, data = {}) {
        const missing = {
            required: [],
            recommended: []
        };

        if (!schema || !schema.fields) return missing;

        for (const [key, fieldDef] of Object.entries(schema.fields)) {
            const isMissing = data[key] === undefined || data[key] === null || data[key] === '';

            if (isMissing) {
                if (fieldDef.required) {
                    missing.required.push(key);
                } else {
                    missing.recommended.push(key);
                }
            }
        }

        return missing;
    }

    /**
     * Normalize data values based on schema rules
     * @param {object} schema 
     * @param {object} data 
     * @returns {object} Normalized data copy
     */
    normalize(schema, data = {}) {
        if (!schema || !schema.fields) return { ...data };

        const normalized = { ...data };

        for (const [key, fieldDef] of Object.entries(schema.fields)) {
            let val = normalized[key];

            // 1. Custom normalize function
            if (fieldDef.normalize && typeof fieldDef.normalize === 'function') {
                val = fieldDef.normalize(val);
            }

            // 2. Enum Synonyms (Typings)
            if (fieldDef.type === 'enum' && fieldDef.typings && val) {
                const lowerVal = String(val).toLowerCase().trim();
                // Check if it matches a synonym key
                if (fieldDef.typings[lowerVal]) {
                    val = fieldDef.typings[lowerVal];
                }
                // Also check if it matches an option directly (case-insensitive)
                else {
                    const foundOption = fieldDef.options.find(opt => opt.toLowerCase() === lowerVal);
                    if (foundOption) {
                        val = foundOption;
                    }
                }
            }

            // 3. Apply Default if missing and default exists
            if ((val === undefined || val === null || val === '') && fieldDef.default !== undefined) {
                val = fieldDef.default;
            }

            if (val !== undefined) {
                normalized[key] = val;
            }
        }

        return normalized;
    }
}

module.exports = new SchemaValidator();
