
const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('p:\\ai-dan-desktop\\docs\\tabela podsumowan.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Array of arrays

    if (data.length > 0) {
        const headers = data[0];
        console.log('Headers with indices:');
        headers.forEach((h, i) => {
            console.log(`${i}: ${h}`);
        });

        if (data.length > 1) {
            console.log('\nSample Row (Ukel):');
            data[1].forEach((val, i) => {
                console.log(`${i} (${headers[i]}): ${val}`);
            });
        }
    } else {
        console.log('Empty sheet');
    }
} catch (e) {
    console.error('Error:', e);
}
