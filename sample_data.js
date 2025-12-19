const { ipcRenderer } = require('electron');

async function debugSampleData() {
    try {
        // We can't access electron API directly in this script if running via node.
        // But if I write this as a temporary renderer script or modification to existing file, I can run it.
        // Better: logic to read the excel file directly using the service.
        const service = require('./src/services/excel-search.js');
        const data = await service.loadData();

        console.log("Total rows:", data.length);

        // Sample 5 diverse characters
        const sample = data.slice(0, 5).map(r => ({
            name: r['Imie postaci'] || r['name'],
            guild: r['Gildia'] || r['guild'],
            history: (r['Historia'] || r['history'] || '').substring(0, 200), // First 200 chars
            about: (r['O postaci'] || r['about'] || '').substring(0, 200),
            facts: (r['Fakty'] || r['facts'] || '').substring(0, 200)
        }));

        console.log(JSON.stringify(sample, null, 2));
    } catch (e) {
        console.error(e);
    }
}

debugSampleData();
