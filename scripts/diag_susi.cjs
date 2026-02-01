const { chromium } = require('playwright');

(async () => {
    console.log("🕵️ DIAGNOSTIC: WHAT DOES SUSI SEE? 🕵️");

    const LOGIN_EMAIL = 'susi.sim5@oceanpearl.com';
    const LOGIN_PASS = 'Password123!';

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
    const page = await context.newPage();

    try {
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', LOGIN_EMAIL);
        await page.fill('input[type="password"]', LOGIN_PASS);
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);

        await page.goto('https://oceanpearl-ops.web.app/receiving');
        await page.waitForTimeout(5000);

        const row1 = page.locator('table tbody tr').nth(0);
        const itemSelect = row1.locator('select').first();
        const options = await itemSelect.evaluate(s => Array.from(s.options).map(o => ({ text: o.text, value: o.value })));

        console.log("AVAILABLE OPTIONS IN ROW 1:");
        console.log(JSON.stringify(options, null, 2));

        await page.screenshot({ path: 'd:/OPS/susi_receiving_diagnostic.png' });

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
