const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, 'docs', 'tabela podsumowan.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref']);

    const headers = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: C })];
        headers.push(cell ? cell.v : null); // Keep index alignment
    }

    const row1 = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = sheet[XLSX.utils.encode_cell({ r: 1, c: C })];
        row1.push(cell ? cell.v : null);
    }

    fs.writeFileSync('headers.json', JSON.stringify(headers, null, 2));
    fs.writeFileSync('row1.json', JSON.stringify(row1, null, 2));
    console.log('Files written.');

} catch (error) {
    console.error('ERROR:', error);
}
