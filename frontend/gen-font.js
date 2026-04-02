const fs = require('fs');
const path = require('path');
const fontPath = path.join(__dirname, 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf');
const outputPath = path.join(__dirname, 'utils', 'marathiFontBase64.ts');

try {
    const buffer = fs.readFileSync(fontPath);
    const base64 = buffer.toString('base64');
    const tsContent = `export const marathiFontBase64 = "${base64}";\n`;
    fs.writeFileSync(outputPath, tsContent);
    console.log('Successfully generated marathiFontBase64.ts');
} catch (err) {
    console.error('Error generating font file:', err);
    process.exit(1);
}
