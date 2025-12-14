
import mermaid from 'mermaid';

/**
 * Initializes and renders Mermaid diagrams.
 */

let isInitialized = false;

export function initializeMermaid() {
    if (isInitialized) return;

    mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        fontFamily: 'Inter, sans-serif',
    });

    isInitialized = true;
}

/**
 * Renders a Mermaid diagram into the specific container.
 * @param {HTMLElement} element - The container element.
 * @param {string} graphDefinition - The Mermaid graph definition string.
 * @returns {Promise<void>}
 */
export async function renderMermaid(element, graphDefinition) {
    if (!element) {
        console.warn('Mermaid Adapter: No element provided for rendering.');
        return;
    }

    if (!isInitialized) {
        initializeMermaid();
    }

    try {
        const id = `mermaid-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const { svg } = await mermaid.render(id, graphDefinition);
        element.innerHTML = svg;
    } catch (error) {
        console.error('Mermaid Rendering Error:', error);
        element.innerHTML = `<div style="color: red; padding: 10px; border: 1px solid red;">
            <strong>Błąd renderowania grafu:</strong><br>
            ${error.message}
            <pre style="margin-top:5px; font-size:10px; opacity:0.8; white-space:pre-wrap;">${graphDefinition}</pre>
        </div>`;
    }
}
