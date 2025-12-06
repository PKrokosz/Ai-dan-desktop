/**
 * @module logger
 * @description Winston logger z trace_id
 */

const winston = require('winston');
const path = require('path');
const { getTraceId, getElapsedMs } = require('./tracing');

// Ensure logs directory exists
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format with trace_id
const traceFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const traceId = getTraceId();
    const elapsed = getElapsedMs();
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return JSON.stringify({
        timestamp,
        traceId,
        elapsedMs: elapsed,
        level,
        message,
        ...(metaStr ? { meta } : {})
    });
});

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        traceFormat
    ),
    transports: [
        // Console - colored for dev
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ level, message, timestamp }) => {
                    const traceId = getTraceId().slice(-8); // last 8 chars
                    const elapsed = `${(getElapsedMs() / 1000).toFixed(1)}s`;
                    return `[${traceId}] ${elapsed} ${level}: ${message}`;
                })
            )
        }),
        // File - full JSON
        new winston.transports.File({
            filename: path.join(logsDir, 'agent-mg.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 3
        })
    ]
});

// Export convenience methods
module.exports = {
    info: (msg, meta) => logger.info(msg, meta),
    warn: (msg, meta) => logger.warn(msg, meta),
    error: (msg, meta) => logger.error(msg, meta),
    debug: (msg, meta) => logger.debug(msg, meta),
    logger
};
