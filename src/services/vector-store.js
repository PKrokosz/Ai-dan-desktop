const fs = require('fs');
const path = require('path');
const ollamaService = require('./ollama');
const logger = require('../shared/logger');

class VectorStore {
    constructor(storagePath) {
        this.storagePath = storagePath || path.join(process.cwd(), 'data', 'vector-store.json');
        this.documents = []; // { id, text, metadata, embedding }
        this.ensureStorage();
    }

    ensureStorage() {
        const dir = path.dirname(this.storagePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (fs.existsSync(this.storagePath)) {
            try {
                const data = fs.readFileSync(this.storagePath, 'utf8');
                this.documents = JSON.parse(data);
                logger.info(`Loaded ${this.documents.length} documents from vector store.`);
            } catch (e) {
                logger.error('Failed to load vector store', e);
                this.documents = [];
            }
        }
    }

    async save() {
        try {
            fs.writeFileSync(this.storagePath, JSON.stringify(this.documents, null, 2));
            logger.info('Vector store saved.');
        } catch (e) {
            logger.error('Failed to save vector store', e);
        }
    }

    /**
     * Add a document to the store
     * @param {string} text Content to embed
     * @param {object} metadata Extra info (source, type, date)
     */
    async addDocument(text, metadata = {}) {
        try {
            // Check for potential duplicates (simple check)
            const exists = this.documents.find(d => d.text === text && d.metadata.source === metadata.source);
            if (exists) return exists;

            const result = await ollamaService.generateEmbeddings(text);

            if (result.success) {
                const doc = {
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                    text,
                    metadata,
                    embedding: result.embedding,
                    timestamp: Date.now()
                };
                this.documents.push(doc);
                await this.save();
                return doc;
            } else {
                logger.error('Failed to generate embedding', result.error);
                return null;
            }
        } catch (e) {
            logger.error('Error adding document to vector store', e);
            return null;
        }
    }

    /**
     * Search for similar documents
     * @param {string} query Search query
     * @param {number} limit Max results
     */
    async search(query, limit = 3) {
        const result = await ollamaService.generateEmbeddings(query);
        if (!result.success) {
            logger.error('Search embedding failed', result.error);
            return [];
        }

        const queryEmbedding = result.embedding;

        // Calculate Cosine Similarity
        const scoredDocs = this.documents.map(doc => {
            const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
            return { ...doc, score: similarity };
        });

        // Sort by score DESC
        scoredDocs.sort((a, b) => b.score - a.score);

        return scoredDocs.slice(0, limit);
    }

    cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    getStats() {
        return {
            count: this.documents.length,
            path: this.storagePath
        };
    }

    clear() {
        this.documents = [];
        this.save();
    }
}

module.exports = new VectorStore();
