const fs = require('fs');
const path = require('path');
const config = require('../shared/config');
const logger = require('../shared/logger');

class GenerationLogger {
    constructor() {
        this.baseDir = path.join(process.cwd(), 'logs', 'generations');
    }

    ensureDir() {
        if (!fs.existsSync(this.baseDir)) {
            try {
                fs.mkdirSync(this.baseDir, { recursive: true });
            } catch (err) {
                logger.error('Failed to create generation logs directory', { error: err.message });
            }
        }
    }

    async logGeneration(data) {
        this.ensureDir();

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const traceId = data.traceId || 'no-trace';
        const filename = `${timestamp}_${traceId}.json`;
        const filePath = path.join(this.baseDir, filename);

        const logEntry = {
            timestamp: new Date().toISOString(),
            traceId: traceId,
            model: data.model,
            type: data.type || 'text',
            prompt: data.prompt,
            system: data.system,
            options: data.options,
            response: data.response,
            stats: data.stats,
            error: data.error
        };

        try {
            await fs.promises.writeFile(filePath, JSON.stringify(logEntry, null, 2), 'utf-8');
            logger.info('Generation logged', { path: filePath });
            return filePath;
        } catch (err) {
            logger.error('Failed to write generation log', { error: err.message });
            return null;
        }
    }
}

module.exports = new GenerationLogger();
