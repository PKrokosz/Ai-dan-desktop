const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'docs/Fabuła Cienie 2025.xlsx');
console.log('Reading:', filePath);

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (rows.length > 0) {
        console.log('Columns:', Object.keys(rows[0]));
        console.log('Sample Row 0:', rows[0]);
    } else {
        console.log('No rows found');
    }
} catch (e) {
    console.error('Error:', e);
}
