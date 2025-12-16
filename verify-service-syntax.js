try {
    const service = require('./src/services/profile-service');
    console.log('ProfileService loaded successfully');

    // Test if parsing function exists
    if (typeof service._loadLocalData === 'function') {
        console.log('_loadLocalData method exists');
    } else {
        console.error('_loadLocalData method MISSING');
    }
} catch (e) {
    console.error('Syntax/Import Error:', e);
}
