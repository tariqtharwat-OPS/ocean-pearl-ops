const { chromium } = require('playwright');

(async () => {
    console.log("🕵️ DIAGNOSTIC 2 🕵️");

    const LOGIN_EMAIL = 'susi.sim5@oceanpearl.com';
    const LOGIN_PASS = 'Password123!';

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
    const page = await context.newPage();

    try {
        console.log("Logging in...");
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', LOGIN_EMAIL);
        await page.fill('input[type="password"]', LOGIN_PASS);
        await page.click('button:has-text("Sign In")');

        await page.waitForURL('**/', { timeout: 20000 });
        console.log("Login Success. Redirected to Home.");

        console.log("Navigating to Receiving...");
        await page.goto('https://oceanpearl-ops.web.app/receiving');

        // Wait for ANY content that indicates the page loaded
        await page.waitForSelector('h1:has-text("Receive"), h1:has-text("Receiving")', { timeout: 20000 });
        console.log("Receiving Page Loaded.");

        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'd:/OPS/diag_receiving.png' });

        const tableCount = await page.locator('table').count();
        console.log(`Tables found: ${tableCount}`);

        if (tableCount > 0) {
            const rows = await page.locator('table tbody tr').count();
            console.log(`Rows found: ${rows}`);
        }

    } catch (e) {
        console.error("❌ ERROR:", e.message);
        await page.screenshot({ path: 'd:/OPS/diag_error.png' });
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
