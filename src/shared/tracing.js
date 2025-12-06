/**
 * @module tracing
 * @description Propagacja trace_id przez cały pipeline
 */

const { AsyncLocalStorage } = require('async_hooks');
const crypto = require('crypto');

const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Generuje unikalny trace ID
 * @returns {string} Format: timestamp-randomhex
 */
function generateTraceId() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `${timestamp}-${random}`;
}

/**
 * Uruchamia funkcję w kontekście trace
 * @param {Function} fn - Funkcja async do wykonania
 * @returns {Promise<any>}
 */
async function runWithTrace(fn) {
    const traceId = generateTraceId();
    return asyncLocalStorage.run({ traceId, startTime: Date.now() }, fn);
}

/**
 * Pobiera aktualny trace ID z kontekstu
 * @returns {string}
 */
function getTraceId() {
    return asyncLocalStorage.getStore()?.traceId || 'no-trace';
}

/**
 * Pobiera czas od startu trace'a
 * @returns {number} Milisekundy
 */
function getElapsedMs() {
    const store = asyncLocalStorage.getStore();
    return store ? Date.now() - store.startTime : 0;
}

module.exports = {
    generateTraceId,
    runWithTrace,
    getTraceId,
    getElapsedMs
};
