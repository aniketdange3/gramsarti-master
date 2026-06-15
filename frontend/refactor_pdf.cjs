const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'utils', 'pdfGenerator.ts');
let content = fs.readFileSync(file, 'utf8');

// 1. Replace static imports with type import and helper
content = content.replace(
    /import { jsPDF } from 'jspdf';\nimport autoTable from 'jspdf-autotable';/,
    `import type { jsPDF as jsPDFType } from 'jspdf';

let jsPDFClass: any = null;
let autoTableFn: any = null;

const loadPDFLibs = async () => {
    if (!jsPDFClass) {
        jsPDFClass = (await import('jspdf')).jsPDF;
        autoTableFn = (await import('jspdf-autotable')).default;
    }
    return { jsPDF: jsPDFClass, autoTable: autoTableFn };
};`
);

// 2. Change `jsPDF` types to `jsPDFType` in doc params
content = content.replace(/doc: jsPDF/g, 'doc: jsPDFType');

// 3. Replace `new jsPDF` with `new (await loadPDFLibs()).jsPDF`
content = content.replace(/new jsPDF\(/g, 'new (await loadPDFLibs()).jsPDF(');

// 4. Update drawMaganiBillContent to be async
content = content.replace(
    /const drawMaganiBillContent = \(doc: jsPDFType, record: PropertyRecord, startX: number, startY: number, width: number, copyLabel: string, logo: string \| null\) => {/,
    'const drawMaganiBillContent = async (doc: jsPDFType, record: PropertyRecord, startX: number, startY: number, width: number, copyLabel: string, logo: string | null) => {'
);

// 5. Replace autoTable calls with `(await loadPDFLibs()).autoTable`
content = content.replace(/autoTable\(/g, '(await loadPDFLibs()).autoTable(');

// 6. Update calls to drawMaganiBillContent to await
content = content.replace(/drawMaganiBillContent\(/g, 'await drawMaganiBillContent(');
// Fix the declaration itself which was accidentally replaced to `await`
content = content.replace(/const await drawMaganiBillContent = async/g, 'const drawMaganiBillContent = async');


fs.writeFileSync(file, content);
console.log('Successfully refactored pdfGenerator.ts');
