const service = require('./src/services/excel-search.js');

async function testEnrichment() {
    try {
        console.log("Loading data...");
        const data = await service.loadData();
        console.log(`Loaded ${data.length} characters.`);

        // Test on specific known characters + randoms
        const testNames = ['Bagniak', 'Breed', 'Nefryt', 'Diego', 'Corristo', 'Lester'];

        // Find these characters
        const samples = data.filter(r =>
            testNames.some(n => (r['Imie postaci'] || '').includes(n))
        ).slice(0, 10); // Limit to 10

        // If no matches (maybe names are different), take first 5
        if (samples.length === 0) samples.push(...data.slice(0, 5));

        console.log("\n--- ENRICHMENT RESULTS ---\n");

        samples.forEach(row => {
            const enriched = service.enrichCharacterMetadata(row);
            console.log(`Name: ${row['Imie postaci'] || row['name']}`);
            console.log(`Guild: ${row['Gildia']}`);
            console.log(`Badge: ${enriched.badge}`);
            console.log(`Skills: ${enriched.skills.join(', ')}`);
            console.log(`Seniority: ${enriched.seniority}`);
            console.log("---------------------------");
        });

    } catch (e) {
        console.error(e);
    }
}

testEnrichment();
