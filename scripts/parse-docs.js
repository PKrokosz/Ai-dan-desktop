/**
 * Skrypt do parsowania dokumentów z folderu docs
 * Wyciąga tekst z DOCX i PDF do analizy
 */

const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'parsed');

async function parseDocx(filePath) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
}

async function parsePdf(filePath) {
    const pdf = (await import('pdf-parse')).default;
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
}

async function parseAllDocs() {
    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const files = fs.readdirSync(DOCS_DIR);
    const results = [];

    for (const file of files) {
        const filePath = path.join(DOCS_DIR, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) continue;

        const ext = path.extname(file).toLowerCase();
        let text = '';
        let type = '';

        try {
            if (ext === '.docx') {
                text = await parseDocx(filePath);
                type = 'docx';
            } else if (ext === '.pdf') {
                text = await parsePdf(filePath);
                type = 'pdf';
            } else {
                continue;
            }

            // Save parsed text
            const baseName = path.basename(file, ext);
            const outputPath = path.join(OUTPUT_DIR, `${baseName}.txt`);
            fs.writeFileSync(outputPath, text, 'utf-8');

            // Extract summary info
            const lines = text.split('\n').filter(l => l.trim());
            const headings = lines.filter(l => l.length < 100 && l.trim().length > 3).slice(0, 10);

            results.push({
                file,
                type,
                size: stat.size,
                chars: text.length,
                lines: lines.length,
                headings,
                preview: text.slice(0, 500)
            });

            console.log(`✓ Parsed: ${file} (${text.length} chars)`);

        } catch (error) {
            console.error(`✗ Error parsing ${file}:`, error.message);
            results.push({ file, error: error.message });
        }
    }

    // Save summary
    const summaryPath = path.join(OUTPUT_DIR, '_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`\n📊 Summary saved to: ${summaryPath}`);

    return results;
}

parseAllDocs().then(results => {
    console.log('\n=== DOCUMENT SUMMARY ===\n');
    for (const r of results) {
        if (r.error) {
            console.log(`❌ ${r.file}: ${r.error}`);
        } else {
            console.log(`📄 ${r.file}`);
            console.log(`   Type: ${r.type}, Size: ${r.size} bytes, Chars: ${r.chars}`);
            console.log(`   First headings:`);
            r.headings.slice(0, 5).forEach(h => console.log(`     - ${h.slice(0, 80)}`));
            console.log('');
        }
    }
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
