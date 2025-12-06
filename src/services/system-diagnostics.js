/**
 * System Diagnostics Module
 * Detects GPU, RAM, CPU specifications on Windows
 */

const { exec } = require('child_process');
const os = require('os');
const logger = require('../shared/logger');

class SystemDiagnostics {
    constructor() {
        this.cache = null;
    }

    /**
     * Get full system specifications
     */
    async getSpecs() {
        if (this.cache) return this.cache;

        logger.info('Detecting system specifications...');

        const [gpu, ram, cpu] = await Promise.all([
            this.getGPU(),
            this.getRAM(),
            this.getCPU()
        ]);

        this.cache = { gpu, ram, cpu, timestamp: Date.now() };
        logger.info('System specs detected', this.cache);

        return this.cache;
    }

    /**
     * Get GPU info using WMIC (Windows) or nvidia-smi
     */
    async getGPU() {
        try {
            // Try nvidia-smi first (most accurate for NVIDIA)
            const nvidiaInfo = await this.runCommand(
                'nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits'
            );

            if (nvidiaInfo && !nvidiaInfo.includes('not recognized')) {
                const [name, vramMB] = nvidiaInfo.trim().split(', ');
                const vramGB = Math.round(parseInt(vramMB) / 1024);
                return {
                    name: name.trim(),
                    vram: vramGB,
                    type: 'nvidia',
                    detected: true
                };
            }
        } catch (e) {
            // nvidia-smi not available
        }

        try {
            // Fallback to WMIC for other GPUs
            const wmicInfo = await this.runCommand(
                'wmic path win32_videocontroller get name,adapterram /format:csv'
            );

            if (wmicInfo) {
                const lines = wmicInfo.trim().split('\n').filter(l => l.trim() && !l.startsWith('Node'));
                if (lines.length > 0) {
                    // Parse CSV: Node,AdapterRAM,Name
                    const parts = lines[0].split(',');
                    if (parts.length >= 3) {
                        const vramBytes = parseInt(parts[1]) || 0;
                        const vramGB = Math.round(vramBytes / 1024 / 1024 / 1024);
                        const name = parts.slice(2).join(',').trim();

                        // Detect GPU type
                        let type = 'unknown';
                        if (name.toLowerCase().includes('nvidia') || name.toLowerCase().includes('geforce') || name.toLowerCase().includes('rtx') || name.toLowerCase().includes('gtx')) {
                            type = 'nvidia';
                        } else if (name.toLowerCase().includes('amd') || name.toLowerCase().includes('radeon')) {
                            type = 'amd';
                        } else if (name.toLowerCase().includes('intel')) {
                            type = 'intel';
                        }

                        return {
                            name: name,
                            vram: vramGB > 0 ? vramGB : this.estimateVRAM(name),
                            type: type,
                            detected: true
                        };
                    }
                }
            }
        } catch (e) {
            logger.warn('WMIC GPU detection failed', { error: e.message });
        }

        return { name: 'Unknown GPU', vram: 4, type: 'unknown', detected: false };
    }

    /**
     * Estimate VRAM from GPU name if wmic doesn't report it
     */
    estimateVRAM(gpuName) {
        const name = gpuName.toLowerCase();

        // NVIDIA RTX 40 series
        if (name.includes('4090')) return 24;
        if (name.includes('4080')) return 16;
        if (name.includes('4070 ti')) return 12;
        if (name.includes('4070')) return 12;
        if (name.includes('4060 ti')) return 8;
        if (name.includes('4060')) return 8;

        // NVIDIA RTX 30 series
        if (name.includes('3090')) return 24;
        if (name.includes('3080 ti')) return 12;
        if (name.includes('3080')) return 10;
        if (name.includes('3070 ti')) return 8;
        if (name.includes('3070')) return 8;
        if (name.includes('3060 ti')) return 8;
        if (name.includes('3060')) return 12;
        if (name.includes('3050')) return 8;

        // NVIDIA RTX 20 series
        if (name.includes('2080 ti')) return 11;
        if (name.includes('2080')) return 8;
        if (name.includes('2070')) return 8;
        if (name.includes('2060')) return 6;

        // NVIDIA GTX 16 series
        if (name.includes('1660')) return 6;
        if (name.includes('1650')) return 4;

        // NVIDIA GTX 10 series
        if (name.includes('1080 ti')) return 11;
        if (name.includes('1080')) return 8;
        if (name.includes('1070')) return 8;
        if (name.includes('1060')) return 6;
        if (name.includes('1050')) return 4;

        // AMD
        if (name.includes('7900 xtx')) return 24;
        if (name.includes('7900 xt')) return 20;
        if (name.includes('7800 xt')) return 16;
        if (name.includes('7700 xt')) return 12;
        if (name.includes('7600')) return 8;
        if (name.includes('6900')) return 16;
        if (name.includes('6800')) return 16;
        if (name.includes('6700')) return 12;
        if (name.includes('6600')) return 8;

        // Intel Arc
        if (name.includes('a770')) return 16;
        if (name.includes('a750')) return 8;
        if (name.includes('a580')) return 8;
        if (name.includes('a380')) return 6;

        // Default for integrated
        if (name.includes('intel') && (name.includes('uhd') || name.includes('iris'))) return 2;

        return 4; // Safe default
    }

    /**
     * Get RAM info
     */
    async getRAM() {
        const totalBytes = os.totalmem();
        const freeBytes = os.freemem();
        const totalGB = Math.round(totalBytes / 1024 / 1024 / 1024);
        const freeGB = Math.round(freeBytes / 1024 / 1024 / 1024);

        return {
            total: totalGB,
            free: freeGB,
            used: totalGB - freeGB
        };
    }

    /**
     * Get CPU info
     */
    async getCPU() {
        const cpus = os.cpus();
        return {
            model: cpus[0]?.model || 'Unknown CPU',
            cores: cpus.length,
            speed: cpus[0]?.speed || 0
        };
    }

    /**
     * Get recommended settings based on hardware
     * Supports both GPU and CPU-only systems
     */
    getRecommendation() {
        if (!this.cache) return { mode: 'cpu', maxSize: 4, reason: 'Nie wykryto specyfikacji' };

        const gpu = this.cache.gpu;
        const ram = this.cache.ram;

        // Check if we have a dedicated GPU with usable VRAM
        if (gpu.detected && gpu.vram >= 4 && gpu.type !== 'unknown') {
            const vram = gpu.vram;
            let maxSize = 4;

            if (vram >= 24) maxSize = 24;
            else if (vram >= 16) maxSize = 16;
            else if (vram >= 12) maxSize = 12;
            else if (vram >= 8) maxSize = 8;
            else if (vram >= 6) maxSize = 6;
            else maxSize = 4;

            return {
                mode: 'gpu',
                maxSize: maxSize,
                vram: vram,
                gpuName: gpu.name,
                reason: `${gpu.name} (${vram}GB VRAM)`
            };
        }

        // CPU-only mode - use RAM to determine model size
        // Ollama on CPU uses RAM, rule: model needs ~1.2x its size in RAM
        const availableRam = Math.floor(ram.total * 0.6); // 60% of RAM for model
        let maxSize = 4;

        if (availableRam >= 32) maxSize = 16;
        else if (availableRam >= 24) maxSize = 12;
        else if (availableRam >= 16) maxSize = 8;
        else if (availableRam >= 12) maxSize = 6;
        else if (availableRam >= 8) maxSize = 4;
        else maxSize = 2;

        return {
            mode: 'cpu',
            maxSize: maxSize,
            ram: ram.total,
            cpuName: this.cache.cpu.model,
            cores: this.cache.cpu.cores,
            reason: `CPU-only (${ram.total}GB RAM, ${this.cache.cpu.cores} rdzeni)`
        };
    }

    /**
     * Run a shell command and return output
     */
    runCommand(cmd) {
        return new Promise((resolve, reject) => {
            exec(cmd, { timeout: 10000 }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });
    }
}

module.exports = new SystemDiagnostics();
