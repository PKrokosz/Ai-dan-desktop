const fs = require('fs');
const path = require('path');
const logger = require('../shared/logger');
const vectorStore = require('./vector-store');

class KnowledgeIndexer {
    constructor() {
        this.docsPath = path.join(__dirname, '../../docs/parsed');
    }

    /**
     * Index all .txt files from docs/parsed into VectorStore
     */
    async indexDocs() {
        try {
            if (!fs.existsSync(this.docsPath)) {
                logger.warn('[KnowledgeIndexer] docs/parsed folder not found');
                return;
            }

            const files = fs.readdirSync(this.docsPath);
            const txtFiles = files.filter(f => f.endsWith('.txt'));

            logger.info(`[KnowledgeIndexer] Found ${txtFiles.length} documentation files to check.`);

            let indexedCount = 0;

            for (const file of txtFiles) {
                const filePath = path.join(this.docsPath, file);
                const content = fs.readFileSync(filePath, 'utf-8');

                // Check if already indexed
                // vectorStore.documents has metadata.source
                // We will use filename as source identifier
                const alreadyIndexed = vectorStore.documents.some(d => d.metadata?.source === file);

                if (!alreadyIndexed) {
                    logger.info(`[KnowledgeIndexer] Indexing new file: ${file}`);

                    // Chunking large files (simple paragraph split for better RAG)
                    // If file is too large, better to split. 
                    // For now, we assume reasonable size or simple chunking.
                    const chunks = this.chunkText(content);

                    for (let i = 0; i < chunks.length; i++) {
                        await vectorStore.addDocument(chunks[i], {
                            source: file,
                            type: 'documentation',
                            chunk: i,
                            totalChunks: chunks.length,
                            timestamp: Date.now()
                        }, false); // autoSave = false for batch performance
                    }

                    // Save once per file to ensure data safety but reduce I/O spam
                    await vectorStore.save();
                    indexedCount++;
                }
            }

            if (indexedCount > 0) {
                logger.info(`[KnowledgeIndexer] Successfully indexed ${indexedCount} new files.`);
            } else {
                logger.info('[KnowledgeIndexer] All documentation files already indexed.');
            }

        } catch (error) {
            logger.error('[KnowledgeIndexer] Indexing failed', { error: error.message });
        }
    }

    /**
     * Split text into meaningful chunks (~500-1000 chars)
     * RAG works better with smaller context chunks (passages).
     */
    chunkText(text) {
        // Split by paragraphs first
        const paragraphs = text.split(/\n\s*\n/);
        const chunks = [];
        let currentChunk = '';

        for (const p of paragraphs) {
            if (p.trim().length === 0) continue;

            if ((currentChunk.length + p.length) > 1000) {
                if (currentChunk) chunks.push(currentChunk.trim());
                currentChunk = p;
            } else {
                currentChunk += (currentChunk ? '\n\n' : '') + p;
            }
        }

        if (currentChunk) chunks.push(currentChunk.trim());
        return chunks.filter(c => c.length > 50); // Filter tiny chunks
    }
}

module.exports = new KnowledgeIndexer();
