/**
 * Data Extraction Module
 * Splits character data into 6 thematic lanes for parallel AI processing
 * Based on definiowanie sciezek from original workflow
 */

const logger = require('../shared/logger');
const { getTraceId } = require('../shared/tracing');
const { norm } = require('../shared/helpers');

/**
 * Lane definitions matching the original workflow
 */
const LANES = [
    'historia',
    'relacje',
    'aspiracje',
    'slabosci',
    'umiejetnosci',
    'geolore'
];

/**
 * Extract character ID from row data
 */
function extractCharacterId(row) {
    return row['E-learning']
        ?? row['ID']
        ?? row['id']
        ?? row['row_number']
        ?? 'UNKNOWN';
}

/**
 * Split character data into 6 lanes for parallel processing
 * @param {Object} row - Single row from Google Sheets
 * @returns {Object[]} Array of lane objects
 */
function splitIntoLanes(row) {
    const traceId = getTraceId();
    const characterId = extractCharacterId(row);

    logger.info('Splitting character into lanes', { traceId, characterId });

    // Build full historia context (all relevant fields combined)
    const historiaFull = [
        row['Jak zarabiala na zycie, kim byla'],
        row['Jak zarabia na zycie, kim jest'],
        row['Jak trafila do obozu'],
        row['Inne wydarzenia z przeszlosci'],
        row['Kim chce zostac'],
        row['Znajomi, przyjaciele i wrogowie'],
        row['Jakie zadania bedziesz kontynuowac'],
        row['Slabosci'],
        row['Umiejetnosci'],
        row['Region'],
        row['Miejscowosc']
    ].filter(Boolean).map(norm).join('\n');

    // Define lane-specific data extraction
    const lanes = [
        {
            lane: 'historia',
            value: historiaFull
        },
        {
            lane: 'relacje',
            value: norm(row['Znajomi, przyjaciele i wrogowie'])
        },
        {
            lane: 'aspiracje',
            value: norm(row['Kim chce zostac'])
        },
        {
            lane: 'slabosci',
            value: norm(row['Slabosci'])
        },
        {
            lane: 'umiejetnosci',
            value: norm(row['Umiejetnosci'])
        },
        {
            lane: 'geolore',
            value: norm([row['Region'], row['Miejscowosc']].filter(Boolean).join(' / '))
        }
    ];

    // Return structured output for each lane
    const result = lanes.map(l => ({
        lane: l.lane,
        postac_id: characterId,
        value: l.value,
        all_fields: row
    }));

    logger.info('Lanes created', {
        traceId,
        characterId,
        lanes: result.map(r => ({ lane: r.lane, valueLength: r.value.length }))
    });

    return result;
}

/**
 * Get lane names
 */
function getLaneNames() {
    return [...LANES];
}

module.exports = {
    splitIntoLanes,
    getLaneNames,
    extractCharacterId,
    LANES
};
