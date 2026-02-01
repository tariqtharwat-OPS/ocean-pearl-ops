const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
    const page = await context.newPage();

    page.on('console', msg => console.log('BROWSER:', msg.text()));

    try {
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'susi.sim5.official@oceanpearl.com');
        await page.fill('input[type="password"]', 'Password123!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);

        await page.goto('https://oceanpearl-ops.web.app/production');
        await page.waitForTimeout(10000);

        const rawStockHtml = await page.locator('select').first().innerHTML();
        console.log("RAW STOCK HTML:", rawStockHtml);

    } finally {
        await browser.close();
    }
})();
