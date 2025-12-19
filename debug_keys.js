const service = require('./src/services/excel-search.js');

async function debugKeys() {
    const data = await service.loadData();
    if (data.length > 0) {
        console.log("Keys in first row:", Object.keys(data[0]));
        console.log("First row:", JSON.stringify(data[0], null, 2));
    }
}
debugKeys();
