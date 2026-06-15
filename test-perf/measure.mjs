import puppeteer from 'puppeteer';
import { performance } from 'perf_hooks';

const run = async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    // Set dummy local storage to bypass login
    console.log('Navigating and setting auth...');
    await page.goto('http://localhost:3001'); // Ensure this is the correct URL
    await page.evaluate(() => {
        const dummyToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTk5fQ.signature';
        const dummyUser = { id: '1', role: 'super_admin', name: 'Test User' };
        localStorage.setItem('gp_token', dummyToken);
        localStorage.setItem('gp_user', JSON.stringify(dummyUser));
    });
    
    // Reload to apply auth
    await page.reload();
    await page.waitForSelector('text/Dashboard', { timeout: 10000 }).catch(() => {});
    
    console.log('Measuring Routing Times...');
    const routes = [
        { label: 'नमुना ८', id: 'namuna8', waitText: 'Assessment Register' },
        { label: 'नमुना ९', id: 'namuna9', waitText: 'Tax Notice' },
        { label: 'मागणी बिल', id: 'maganibill', waitText: 'Demand Bill' },
        { label: 'अहवाल', id: 'reports', waitText: 'Reports' },
        { label: 'फेरफार नोंदवही', id: 'ferfar', waitText: 'Mutation Register' },
        { label: 'प्रणाली संचलन केंद्र', id: 'taxmaster', waitText: 'Tax Master' },
        { label: 'डैशबोर्ड', id: 'dashboard', waitText: 'Dashboard' }
    ];

    const results = [];

    // Let the app settle and preload pages
    await new Promise(r => setTimeout(r, 2000));

    for (const route of routes) {
        console.log(`Clicking ${route.label}...`);
        
        // Find the sidebar link and click it
        const linkSelector = `nav a[href="/${route.id}"]`;
        const linkExists = await page.$(linkSelector);
        
        if (!linkExists) {
            console.log(`  -> Link for ${route.label} not found.`);
            continue;
        }

        const start = performance.now();
        await page.click(linkSelector);
        
        // Wait for the URL to change
        await page.waitForFunction((expectedId) => window.location.pathname === `/${expectedId}`, {}, route.id);
        
        // Wait for network idle or a specific element to render if needed
        // For React Router, URL change implies render start. We'll wait for a small delay to ensure render is complete, or wait for the h1 tag
        await new Promise(r => setTimeout(r, 100)); 
        
        const end = performance.now();
        const duration = (end - start - 100).toFixed(2); // Subtract the 100ms artificial delay
        
        console.log(`  -> Time to route to ${route.label}: ${duration}ms`);
        results.push({ page: route.label, time: `${duration} ms` });
        
        // Small delay before next click
        await new Promise(r => setTimeout(r, 500));
    }
    
    console.table(results);
    await browser.close();
};

run().catch(console.error);
