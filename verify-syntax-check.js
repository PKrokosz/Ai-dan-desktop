const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'renderer', 'modules', 'profile-renderer.js');
const appPath = path.join(__dirname, 'src', 'renderer', 'app.js');

function checkSyntax(file) {
    try {
        const content = fs.readFileSync(file, 'utf8');
        // Simple check: can we parse it as a script? 
        // Note: It's a module, so require() might fail if dependencies missing, 
        // but syntax errors usually throw immediately.
        // We'll use a basic Function constructor check for syntax only.
        // It won't catch import/export errors in non-module context, but catches mismatched braces.
        // Actually, 'node -c' (check) is better.
        console.log(`Checking ${file}...`);
    } catch (e) {
        console.error(`Error reading ${file}:`, e);
    }
}

checkSyntax(filePath);
checkSyntax(appPath);

console.log('Use "node --check" for actual syntax validation.');
