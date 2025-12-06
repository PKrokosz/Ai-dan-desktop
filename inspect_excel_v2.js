const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'docs', 'tabela podsumowan.xlsx');
console.log('--- START ---');

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Get headers
    const headers = [];
    const range = XLSX.utils.decode_range(sheet['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: C })];
        headers.push(cell ? cell.v : undefined);
    }
    console.log('DATA_HEADERS=' + JSON.stringify(headers));

    // Get first row of data
    const firstRow = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = sheet[XLSX.utils.encode_cell({ r: 1, c: C })];
        firstRow.push(cell ? cell.v : undefined);
    }
    console.log('DATA_ROW1=' + JSON.stringify(firstRow));

} catch (error) {
    console.error('ERROR:', error.message);
}
console.log('--- END ---');
