/**
 * Parse all Fabuła Excel files to TXT for analysis
 * Usage: node scripts/parse-fabula-xlsx.js
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const PARSED_DIR = path.join(DOCS_DIR, 'parsed');

// Ensure parsed directory exists
if (!fs.existsSync(PARSED_DIR)) {
    fs.mkdirSync(PARSED_DIR, { recursive: true });
}

// Find all Excel files (Fabuła + others)
const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.xlsx'));

console.log(`Found ${files.length} Excel files to parse...\n`);

files.forEach(file => {
    const filePath = path.join(DOCS_DIR, file);
    const outputPath = path.join(PARSED_DIR, file.replace('.xlsx', '.txt'));

    try {
        console.log(`Parsing: ${file}`);

        const workbook = XLSX.readFile(filePath);
        let output = `# ${file}\n${'='.repeat(80)}\n\n`;

        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            if (data.length === 0) return;

            output += `## Arkusz: ${sheetName}\n${'-'.repeat(40)}\n\n`;

            // Get headers from first row
            const headers = data[0] || [];

            // Process each row
            data.slice(1).forEach((row, rowIndex) => {
                if (!row || row.every(cell => !cell)) return; // Skip empty rows

                output += `### Wpis ${rowIndex + 1}\n`;

                headers.forEach((header, colIndex) => {
                    const value = row[colIndex];
                    if (value !== undefined && value !== null && value !== '') {
                        output += `**${header}**: ${value}\n`;
                    }
                });

                output += '\n';
            });
        });

        fs.writeFileSync(outputPath, output, 'utf8');
        console.log(`  ✓ Saved to: ${path.basename(outputPath)}`);

    } catch (err) {
        console.error(`  ✗ Error parsing ${file}: ${err.message}`);
    }
});

console.log('\nDone! Check docs/parsed/ for output files.');
