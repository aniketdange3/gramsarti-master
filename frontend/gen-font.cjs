const fs = require('fs');
const path = require('path');

const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf');
const outputPath = path.join(process.cwd(), 'utils', 'marathiFontBase64.ts');

try {
    const buffer = fs.readFileSync(fontPath);
    const base64 = buffer.toString('base64');
    const tsContent = `export const marathiFontBase64 = "${base64}";\n`;
    fs.writeFileSync(outputPath, tsContent);
    console.log('SUCCESS: Generated ' + outputPath);
} catch (err) {
    console.error('FAILURE: ' + err.message);
    process.exit(1);
}
