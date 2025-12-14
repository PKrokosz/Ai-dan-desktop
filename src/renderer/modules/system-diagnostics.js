/**
 * @module system-diagnostics
 * @description Manages system hardware detection and reporting.
 */

export async function loadSystemSpecs() {
    const container = document.getElementById('system-specs-content');
    if (!container) return;

    // Inject styles only once
    if (!document.getElementById('specs-styles')) {
        const specsStyles = document.createElement('style');
        specsStyles.id = 'specs-styles';
        specsStyles.textContent = `
        .specs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 15px;
        }
        .spec-item {
          background: rgba(0, 0, 0, 0.3);
          padding: 12px 15px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .spec-item.recommendation {
          background: rgba(184, 138, 43, 0.15);
          border: 1px solid var(--border);
        }
        .spec-icon {
          font-size: 20px;
        }
        .spec-label {
          font-size: 11px;
          text-transform: uppercase;
          color: var(--text-dim);
          letter-spacing: 0.5px;
        }
        .spec-value {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
        }
        .spec-detail {
          font-size: 11px;
          color: var(--text-muted);
        }
      `;
        document.head.appendChild(specsStyles);
    }

    try {
        if (window.addLog) window.addLog('info', 'Wykrywam specyfikację sprzętu...');
        const { specs, recommendation } = await window.electronAPI.getSystemSpecs();

        const modeIcon = recommendation.mode === 'gpu' ? '🎮' : '💻';
        const modeLabel = recommendation.mode === 'gpu' ? 'GPU' : 'CPU-only';

        container.innerHTML = `
        <div class="specs-grid">
          <div class="spec-item">
            <span class="spec-icon">🎮</span>
            <span class="spec-label">GPU</span>
            <span class="spec-value">${specs.gpu.name}</span>
            ${specs.gpu.vram ? `<span class="spec-detail">${specs.gpu.vram} GB VRAM</span>` : ''}
          </div>
          <div class="spec-item">
            <span class="spec-icon">🧮</span>
            <span class="spec-label">RAM</span>
            <span class="spec-value">${specs.ram.total} GB</span>
            <span class="spec-detail">${specs.ram.free} GB wolne</span>
          </div>
          <div class="spec-item">
            <span class="spec-icon">⚡</span>
            <span class="spec-label">CPU</span>
            <span class="spec-value">${specs.cpu.cores} rdzeni</span>
            <span class="spec-detail">${specs.cpu.model.substring(0, 30)}...</span>
          </div>
          <div class="spec-item recommendation">
            <span class="spec-icon">${modeIcon}</span>
            <span class="spec-label">Rekomendacja</span>
            <span class="spec-value">${modeLabel} ≤${recommendation.maxSize}GB</span>
            <span class="spec-detail">${recommendation.reason}</span>
          </div>
        </div >
        `;

        // Auto-set VRAM filter based on recommendation
        const vramFilter = document.getElementById('vramFilter');
        if (vramFilter) {
            vramFilter.value = recommendation.maxSize.toString();
            if (window.state) window.state.currentVramFilter = recommendation.maxSize;
            if (window.addLog) window.addLog('success', `Auto - filtr: ≤${recommendation.maxSize} GB(${recommendation.reason})`);
        }

    } catch (error) {
        container.innerHTML = `<p style = "color: var(--text-dim);" > Nie udało się wykryć specyfikacji</p>`;
        if (window.addLog) window.addLog('warn', 'Błąd detekcji sprzętu: ' + error.message);
    }
}
