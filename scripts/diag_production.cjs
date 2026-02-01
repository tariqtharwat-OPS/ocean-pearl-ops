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
        await page.waitForTimeout(5000);

        const options = await page.locator('select').first().evaluate(select => Array.from(select.options).map(o => o.text));
        console.log("PRODUCTION RAW OPTIONS:", JSON.stringify(options, null, 2));

        await page.screenshot({ path: 'd:/OPS/diag_production_options.png' });
    } finally {
        await browser.close();
    }
})();
