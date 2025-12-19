
const larpgothicService = require('./src/services/larpgothic-api');
const excelSearch = require('./src/services/excel-search');
const fs = require('fs');

async function debugNa() {
    console.log('--- Checking API ---');
    const profiles = await larpgothicService.fetchProfiles({});
    const naProfiles = profiles.rows.filter(p =>
        (p['Imie postaci'] && p['Imie postaci'].trim() === 'Na') ||
        (p['nick'] && p['nick'].trim() === 'Na')
    );
    console.log('API "Na" profiles:', JSON.stringify(naProfiles, null, 2));

    console.log('\n--- Checking Character Trees ---');
    const trees = await excelSearch.loadCharTrees();
    const naTrees = trees.filter(t => t['Indeks_postaci'] === 'Na');
    console.log('Tree "Na" matches:', JSON.stringify(naTrees, null, 2));
}

debugNa();
