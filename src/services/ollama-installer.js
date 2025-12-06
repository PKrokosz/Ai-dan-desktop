/**
 * Ollama Installer Module
 * Handles automatic installation of Ollama on Windows
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { app, shell } = require('electron');
const logger = require('../shared/logger');

// Ollama Windows installer URL (direct from GitHub releases)
const OLLAMA_DOWNLOAD_URL = 'https://github.com/ollama/ollama/releases/latest/download/OllamaSetup.exe';
const OLLAMA_EXE_PATH = 'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs\\Ollama\\ollama.exe';

class OllamaInstaller {
    constructor() {
        this.downloadPath = path.join(app.getPath('temp'), 'OllamaSetup.exe');
    }

    /**
     * Check if Ollama is installed on Windows
     */
    async isInstalled() {
        // Check if ollama.exe exists
        if (fs.existsSync(OLLAMA_EXE_PATH)) {
            logger.info('Ollama found at', { path: OLLAMA_EXE_PATH });
            return true;
        }

        // Try running ollama --version
        return new Promise((resolve) => {
            exec('ollama --version', { timeout: 5000 }, (error, stdout) => {
                if (error) {
                    logger.info('Ollama not found in PATH');
                    resolve(false);
                } else {
                    logger.info('Ollama found in PATH', { version: stdout.trim() });
                    resolve(true);
                }
            });
        });
    }

    /**
     * Check if Ollama service is running
     */
    async isRunning() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            const response = await fetch('http://localhost:11434/api/tags', {
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response.ok;
        } catch (e) {
            return false;
        }
    }

    /**
     * Download file with following redirects
     */
    async download(onProgress) {
        logger.info('Starting Ollama download', { url: OLLAMA_DOWNLOAD_URL });

        return new Promise((resolve, reject) => {
            const downloadWithRedirects = (url, redirectCount = 0) => {
                if (redirectCount > 5) {
                    reject(new Error('Too many redirects'));
                    return;
                }

                const protocol = url.startsWith('https') ? https : http;

                logger.info('Downloading from', { url: url.substring(0, 80), redirect: redirectCount });

                const request = protocol.get(url, {
                    headers: { 'User-Agent': 'Agent-MG/1.0' },
                    timeout: 30000
                }, (response) => {
                    // Handle redirects
                    if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
                        const newUrl = response.headers.location;
                        logger.info('Following redirect', { to: newUrl?.substring(0, 80) });
                        downloadWithRedirects(newUrl, redirectCount + 1);
                        return;
                    }

                    if (response.statusCode !== 200) {
                        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                        return;
                    }

                    const totalSize = parseInt(response.headers['content-length'], 10);
                    let downloadedSize = 0;

                    logger.info('Download started', { size: totalSize ? `${Math.round(totalSize / 1024 / 1024)}MB` : 'unknown' });

                    const file = fs.createWriteStream(this.downloadPath);

                    response.on('data', (chunk) => {
                        downloadedSize += chunk.length;
                        if (onProgress && totalSize) {
                            const percent = Math.round((downloadedSize / totalSize) * 100);
                            onProgress(percent);
                        }
                    });

                    response.pipe(file);

                    file.on('finish', () => {
                        file.close();
                        logger.info('Download complete', { path: this.downloadPath, size: downloadedSize });
                        resolve(this.downloadPath);
                    });

                    file.on('error', (err) => {
                        fs.unlink(this.downloadPath, () => { });
                        reject(err);
                    });
                });

                request.on('error', (err) => {
                    logger.error('Download error', { error: err.message });
                    reject(err);
                });

                request.on('timeout', () => {
                    request.destroy();
                    reject(new Error('Download timeout'));
                });
            };

            downloadWithRedirects(OLLAMA_DOWNLOAD_URL);
        });
    }

    /**
     * Run the Ollama installer
     */
    async install(silent = false) {
        logger.info('Running Ollama installer', { path: this.downloadPath, silent });

        // Check if file exists
        if (!fs.existsSync(this.downloadPath)) {
            throw new Error('Installer file not found');
        }

        return new Promise((resolve, reject) => {
            const args = silent ? ['/S'] : [];

            const installer = spawn(this.downloadPath, args, {
                detached: true,
                stdio: 'ignore',
                shell: true
            });

            installer.unref(); // Don't wait for installer to finish blocking

            // For non-silent mode, installer runs in foreground
            // We wait a bit then check if it's done
            if (!silent) {
                logger.info('Installer launched, waiting for user to complete...');

                // Poll to check when Ollama is installed
                const checkInstalled = async () => {
                    for (let i = 0; i < 60; i++) { // Max 5 minutes
                        await new Promise(r => setTimeout(r, 5000));
                        const installed = await this.isInstalled();
                        if (installed) {
                            logger.info('Ollama installation detected');
                            fs.unlink(this.downloadPath, () => { });
                            resolve(true);
                            return;
                        }
                    }
                    reject(new Error('Installation timeout - please complete the installer manually'));
                };

                checkInstalled();
            } else {
                installer.on('close', (code) => {
                    if (code === 0 || code === null) {
                        logger.info('Silent installer finished');
                        fs.unlink(this.downloadPath, () => { });
                        resolve(true);
                    } else {
                        reject(new Error(`Installer exited with code ${code}`));
                    }
                });

                installer.on('error', reject);
            }
        });
    }

    /**
     * Start Ollama service
     */
    async startService() {
        logger.info('Starting Ollama service');

        // On Windows, Ollama should auto-start, but let's try to start it
        const started = spawn('ollama', ['serve'], {
            detached: true,
            stdio: 'ignore',
            shell: true
        });
        started.unref();

        // Wait for service to be ready
        for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 1000));
            if (await this.isRunning()) {
                logger.info('Ollama service started');
                return true;
            }
        }

        logger.warn('Could not confirm Ollama service started');
        return false;
    }

    /**
     * Open manual download page
     */
    openDownloadPage() {
        shell.openExternal('https://ollama.com/download');
    }

    /**
     * Full installation flow
     */
    async fullInstall(onStatus, onProgress) {
        try {
            onStatus?.('checking', 'Sprawdzam czy Ollama jest zainstalowana...');

            const installed = await this.isInstalled();
            if (installed) {
                onStatus?.('installed', 'Ollama jest już zainstalowana');

                const running = await this.isRunning();
                if (!running) {
                    onStatus?.('starting', 'Uruchamiam serwis Ollama...');
                    await this.startService();
                }

                onStatus?.('ready', 'Ollama gotowa');
                return { success: true, wasInstalled: false };
            }

            onStatus?.('downloading', 'Pobieram Ollama (~350MB)...');
            await this.download(onProgress);

            onStatus?.('installing', 'Uruchamiam instalator... Postępuj zgodnie z instrukcjami.');
            await this.install(false);

            onStatus?.('starting', 'Uruchamiam serwis Ollama...');
            await this.startService();

            onStatus?.('ready', 'Ollama zainstalowana i gotowa!');
            return { success: true, wasInstalled: true };

        } catch (error) {
            logger.error('Ollama installation failed', { error: error.message });
            onStatus?.('error', `Błąd: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new OllamaInstaller();
