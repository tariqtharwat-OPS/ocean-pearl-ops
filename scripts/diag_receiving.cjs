const { chromium } = require('playwright');

(async () => {
    console.log("🔍 DIAGNOSTIC: READ RECEIVING CATALOG 🔍");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log("🔐 Logging in...");
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'susi.sim5.official@oceanpearl.com');
        await page.fill('input[type="password"]', 'Password123!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);

        console.log("🐟 Navigating to Receiving...");
        await page.goto('https://oceanpearl-ops.web.app/receiving');
        await page.waitForSelector('select');
        await page.waitForTimeout(5000);

        const rowSelect = page.locator('tbody tr select').first();
        const options = await rowSelect.evaluate(select => Array.from(select.options).map(o => o.text));

        console.log("OPTIONS FOUND:", JSON.stringify(options, null, 2));

    } catch (e) {
        console.error("❌ ERROR:", e);
    } finally {
        await browser.close();
    }
})();
