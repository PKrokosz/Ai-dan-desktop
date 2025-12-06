/**
 * @module helpers
 * @description Wspólne funkcje utility (z oryginalnego workflow)
 */

/**
 * Normalizuje string - usuwa nadmiarowe spacje i newlines
 * @param {string} s 
 * @returns {string}
 */
function norm(s) {
    if (!s) return '';
    return String(s)
        .replace(/\r?\n/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .trim();
}

/**
 * Przycina string do max długości
 * @param {string} s 
 * @param {number} maxLen 
 * @returns {string}
 */
function clip(s, maxLen) {
    if (!s) return '';
    return String(s).slice(0, maxLen);
}

/**
 * Sprawdza czy wartość jest pusta
 * @param {any} v 
 * @returns {boolean}
 */
function isBlank(v) {
    return v == null || (typeof v === 'string' && v.trim() === '');
}

/**
 * Zwraca pierwszą niepustą wartość
 * @param {any} a 
 * @param {any} b 
 * @returns {any}
 */
function coalesce(a, b) {
    return isBlank(a) ? b : a;
}

/**
 * Zapewnia że wartość jest tablicą
 * @param {any} x 
 * @returns {Array}
 */
function toArray(x) {
    return Array.isArray(x) ? x : (x == null ? [] : [x]);
}

/**
 * Usuwa duplikaty z tablicy
 * @param {Array} arr 
 * @returns {Array}
 */
function uniq(arr) {
    return [...new Set(arr.filter(v => v != null))];
}

/**
 * Usuwa polskie znaki diakrytyczne
 * @param {string} s 
 * @returns {string}
 */
function ascii(s) {
    return s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

/**
 * Escape dla RegExp
 * @param {string} s 
 * @returns {string}
 */
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
    norm,
    clip,
    isBlank,
    coalesce,
    toArray,
    uniq,
    ascii,
    escapeRegex
};
