const service = require('./src/services/excel-search.js');

async function debugFullText() {
    const data = await service.loadData();
    // Specifically find Ukel since he had "3 edycja" in my manual inspection earlier? No, ans4 was "NULL".
    // I need to find A character who HAS text in ans4.

    const candidates = data.filter(r => {
        const txt = JSON.stringify(r).toLowerCase();
        return txt.includes('edycja') || txt.includes('raz');
    }).slice(0, 3);

    console.log("--- CANDIDATES WITH 'EDYCJA' ---");
    candidates.forEach(r => {
        console.log(`Name: ${r['Imie postaci'] || r['name']}`);
        console.log(`Full JSON: ${JSON.stringify(r, null, 2)}`);
    });
}

debugFullText();
