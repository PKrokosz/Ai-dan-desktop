const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'docs/tabela podsumowan.xlsx');
console.log('Reading file:', filePath);

const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

const targets = ['Lotka', 'Billy', 'Iblis', 'Sójeczka'];

console.log('Searching for targets:', targets);

data.forEach(row => {
    const name = row['Imie postaci'] || row['name'];
    const nick = row['nick'];

    // Check if any target is "fuzzy" contained
    targets.forEach(t => {
        if (name && name.includes(t)) {
            console.log(`\nMatch found for "${t}":`);
            console.log(`  Row Name: "${name}" (Length: ${name.length})`);
            console.log(`  Row Nick: "${nick}"`);
            console.log(`  Comparison: "${name.toLowerCase().trim()}" === "${t.toLowerCase()}" -> ${name.toLowerCase().trim() === t.toLowerCase()}`);
        }
    });
});
