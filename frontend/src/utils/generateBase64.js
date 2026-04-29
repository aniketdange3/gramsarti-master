import fs from 'fs';
import path from 'path';

const logoPath = 'd:/gramsarti-floder Final Update/gramsarti-master/frontend/public/images/logo.jpeg';
const base64 = fs.readFileSync(logoPath).toString('base64');
console.log(`data:image/jpeg;base64,${base64}`);
