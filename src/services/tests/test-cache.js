/**
 * @module test-cache
 * @description Cache manager for test results - isolated from main codebase
 */

const fs = require('fs');
const path = require('path');
const logger = require('../../shared/logger');

const CACHE_DIR = path.resolve(__dirname, '../../../output/test-cache');

class TestCache {
    constructor() {
        this.ensureCacheDir();
    }

    ensureCacheDir() {
        if (!fs.existsSync(CACHE_DIR)) {
            fs.mkdirSync(CACHE_DIR, { recursive: true });
        }
    }

    /**
     * Save test results to cache
     */
    save(testType, results) {
        const filename = `${testType}-${Date.now()}.json`;
        const filepath = path.join(CACHE_DIR, filename);

        const cacheEntry = {
            testType,
            timestamp: new Date().toISOString(),
            results
        };

        fs.writeFileSync(filepath, JSON.stringify(cacheEntry, null, 2), 'utf-8');
        logger.info(`Test results cached: ${filename}`);

        return filepath;
    }

    /**
     * Load latest cached results for a test type
     */
    loadLatest(testType) {
        this.ensureCacheDir();

        const files = fs.readdirSync(CACHE_DIR)
            .filter(f => f.startsWith(testType) && f.endsWith('.json'))
            .sort()
            .reverse();

        if (files.length === 0) return null;

        const filepath = path.join(CACHE_DIR, files[0]);
        const content = fs.readFileSync(filepath, 'utf-8');
        return JSON.parse(content);
    }

    /**
     * Load all cached results for a test type
     */
    loadAll(testType) {
        this.ensureCacheDir();

        const files = fs.readdirSync(CACHE_DIR)
            .filter(f => f.startsWith(testType) && f.endsWith('.json'))
            .sort()
            .reverse();

        return files.map(f => {
            const filepath = path.join(CACHE_DIR, f);
            const content = fs.readFileSync(filepath, 'utf-8');
            return JSON.parse(content);
        });
    }

    /**
     * Clear cache for a test type
     */
    clear(testType) {
        this.ensureCacheDir();

        const files = fs.readdirSync(CACHE_DIR)
            .filter(f => f.startsWith(testType) && f.endsWith('.json'));

        files.forEach(f => {
            fs.unlinkSync(path.join(CACHE_DIR, f));
        });

        logger.info(`Cleared cache for ${testType}: ${files.length} files`);
    }
}

module.exports = new TestCache();
