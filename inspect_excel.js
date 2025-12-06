const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'docs', 'tabela podsumowan.xlsx');
console.log('Reading file:', filePath);

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    console.log('Sheet Name:', sheetName);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (data.length > 0) {
        console.log('Headers:', data[0]);
        if (data.length > 1) {
            console.log('First Row:', data[1]);
        }
    } else {
        console.log('Sheet is empty');
    }
} catch (error) {
    console.error('Error reading file:', error);
}
