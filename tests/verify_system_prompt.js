
const http = require('http');
const ollamaService = require('../src/services/ollama');

// Mock config to avoid loading real env and to point to our mock server
// actually ollamaService requires config first, but we can patch the instance
ollamaService.baseUrl = 'http://127.0.0.1:9999';

// Create a mock server to intercept the request
const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        console.log('--- RECEIVED REQUEST ---');
        console.log(`Method: ${req.method}`);
        console.log(`Path: ${req.url}`);

        try {
            const json = JSON.parse(body);
            console.log('Payload:', JSON.stringify(json, null, 2));

            // Check for System Prompt
            if (json.system) {
                console.log('VERIFICATION: ✅ SYSTEM PROMPT FOUND:', json.system);
            } else {
                console.log('VERIFICATION: ❌ SYSTEM PROMPT MISSING');
            }
        } catch (e) {
            console.log('Invalid JSON body');
        }

        // Send mock response
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            response: "Mock response",
            eval_count: 10,
            eval_duration: 100,
            total_duration: 200
        }));
    });
});

server.listen(9999, async () => {
    console.log('Mock Ollama server running on port 9999');

    try {
        console.log('Sending test request...');
        await ollamaService.generateText('Test user prompt', {
            model: 'test-model',
            system: 'THIS IS THE SYSTEM PROMPT', // The critical test parameter
            temperature: 0.7
        });
    } catch (e) {
        console.error('Request failed:', e.message);
    } finally {
        server.close();
        console.log('Test finished');
    }
});
