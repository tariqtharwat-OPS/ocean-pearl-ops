const { chromium } = require('playwright');

(async () => {
    console.log("🕵️ DIAGNOSTIC 3: DROPDOWN OPTIONS 🕵️");

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
        await page.waitForURL('**/', { timeout: 20000 });

        await page.goto('https://oceanpearl-ops.web.app/receiving');
        await page.waitForSelector('h1:has-text("Receive")', { timeout: 20000 });
        await page.waitForTimeout(8000); // Give plenty of time for items to load

        const itemSelect = page.locator('table tbody tr select').first();
        const options = await itemSelect.evaluate(s => Array.from(s.options).map(o => o.text));
        console.log("ITEM OPTIONS:", JSON.stringify(options));

    } catch (e) {
        console.error("❌ ERROR:", e.message);
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
