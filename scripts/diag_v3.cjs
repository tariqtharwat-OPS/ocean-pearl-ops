const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
    const page = await context.newPage();

    try {
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'susi.sim5.official@oceanpearl.com');
        await page.fill('input[type="password"]', 'Password123!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);

        await page.goto('https://oceanpearl-ops.web.app/production');
        await page.waitForTimeout(10000);

        // This is a bit hacky but if we can't access state, 
        // we can check if the "available products" select is empty when it should not be.

        await page.locator('select').first().selectOption('RAW_rm-ml2nw6n6-wgj2m');
        await page.waitForTimeout(3000);

        const options = await page.locator('tbody tr select').first().evaluate(select =>
            Array.from(select.options).map(o => o.text)
        );
        console.log("PRODUCTS FOR rm-ml2nw6n6-wgj2m:", JSON.stringify(options, null, 2));

        // Let's try to see if the labels change if we manually match casing in the select?
        // Actually, let's just use the simulation script but with the FALLBACK logic.

    } finally {
        await browser.close();
    }
})();
