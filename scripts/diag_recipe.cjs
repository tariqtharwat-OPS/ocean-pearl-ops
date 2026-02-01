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
        await page.waitForTimeout(10000); // Wait longer

        // Select the anchovy
        await page.locator('select').first().selectOption('RAW_rm-ml2nw6n6-wgj2m');
        await page.waitForTimeout(3000);

        const filterText = await page.locator('span:has-text("Filter")').innerText();
        console.log("FILTER TEXT:", filterText);

        const options = await page.locator('tbody tr select').first().evaluate(select =>
            Array.from(select.options).map(o => o.text)
        );
        console.log("AVAILABLE PRODUCTS:", JSON.stringify(options, null, 2));

        // Let's dump the rawMeta if we can via console (if exposed) or eval
        // Actually, let's just use the filter text to confirm.

    } finally {
        await browser.close();
    }
})();
