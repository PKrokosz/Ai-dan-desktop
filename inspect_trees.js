
const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('p:\\ai-dan-desktop\\docs\\drzewka postaci.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    console.log('Sheet Names:', workbook.SheetNames);

    workbook.SheetNames.forEach(sheetName => {
        console.log(`\n--- Sheet: ${sheetName} ---`);
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Array of arrays

        if (data.length > 0) {
            console.log('Headers:', data[0]);
            if (data.length > 1) {
                console.log('Sample Row 1:', data[1]);
            }
            if (data.length > 2) {
                console.log('Sample Row 2:', data[2]);
            }
        } else {
            console.log('Empty sheet');
        }
    });
} catch (e) {
    console.error('Error:', e);
}
