const http = require('http');

const data = JSON.stringify({
    id: 'final_check',
    srNo: 99,
    wastiName: 'वेळाहरी',
    wardNo: '1',
    khasraNo: '123',
    layoutName: 'Test Layout',
    plotNo: '101',
    ownerName: 'Test Owner',
    occupantName: 'Test Occupant',
    sections: [],
    createdAt: new Date().toISOString()
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/properties',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('STATUS:', res.statusCode);
        console.log('BODY:', body);
    });
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
