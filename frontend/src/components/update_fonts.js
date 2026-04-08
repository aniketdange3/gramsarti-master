const fs = require('fs');

function updateFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace text-[...] and text-xs in all data cells (no-print)
    const regex = /(<td[^>]*no-print[^>]*>)([\s\S]*?)(<\/td>)/g;
    
    content = content.replace(regex, (match, p1, p2, p3) => {
        let inside = p2;
        inside = inside.replace(/text-\[[0-9]+px\]/g, 'text-[13px]');
        inside = inside.replace(/text-xs/g, 'text-[13px]');
        return p1 + inside + p3;
    });

    // Also update NamunaTable9 which doesn't use "no-print" on all td elements
    // In NamunaTable9, the cells are just <td className="px-3 py-2 ...">
    const regex9 = /(<td[^>]*px-3 py-2[^>]*>)([\s\S]*?)(<\/td>)/g;
    content = content.replace(regex9, (match, p1, p2, p3) => {
        let inside = p2;
        inside = inside.replace(/text-\[[0-9]+px\]/g, 'text-[13px]');
        inside = inside.replace(/text-xs/g, 'text-[13px]');
        return p1 + inside + p3;
    });

    fs.writeFileSync(filePath, content, 'utf8');
}

updateFile('C:/Users/rishi/OneDrive/Desktop/gramsarti-master/frontend/components/NamunaTable8.tsx');
updateFile('C:/Users/rishi/OneDrive/Desktop/gramsarti-master/frontend/components/NamunaTable9.tsx');
console.log('Update complete');
