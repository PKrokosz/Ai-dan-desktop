const profileService = require('./src/services/profile-service');

(async () => {
    console.log('--- Debugging Status/Death fields ---');
    try {
        const result = await profileService.getHistoryByName("Tuna");

        if (result.success && result.profiles) {
            // Inspect the latest profile (most likely to have death flag)
            const latest = result.profiles[0];
            console.log(`Latest Profile (Edycja ${latest.Edycja}):`);
            console.log(`- Status (Mapped): ${latest.Status}`);
            console.log(`- Raw Status:`, latest._raw.status);
            console.log(`- Raw Summary:`, latest._raw.summary ? 'YES' : 'NO');

            // Inspect for death related keys
            console.log('--- Potential Death Keys ---');
            const keys = Object.keys(latest._raw);
            keys.forEach(k => {
                if (k.includes('death') || k.includes('smierc') || k.includes('dead') || k.includes('die')) {
                    console.log(`Found key '${k}':`, latest._raw[k]);
                }
            });

            // Also check keys that might be status-related
            console.log('--- Status Related Keys ---');
            keys.forEach(k => {
                if (k.includes('status') || k.includes('state') || k.includes('tryb')) {
                    console.log(`Found key '${k}':`, latest._raw[k]);
                }
            });

        }

    } catch (e) {
        console.error('Error:', e);
    }
})();
