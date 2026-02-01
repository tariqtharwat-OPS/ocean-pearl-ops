const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'tariq@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);
        await page.goto('https://oceanpearl-ops.web.app/admin');
        await page.waitForTimeout(8000);

        const placeholders = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('input')).map(i => i.placeholder);
        });
        console.log("PLACEHOLDERS:", JSON.stringify(placeholders));

        await page.screenshot({ path: 'd:/OPS/admin_dump.png' });

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
