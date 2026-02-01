const { chromium } = require('playwright');

(async () => {
    console.log("🕵️ DEBUGGING ADMIN OPTIONS HTML");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'tariq@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(10000);
        await page.goto('https://oceanpearl-ops.web.app/admin');
        await page.waitForTimeout(10000);

        const container = page.locator('div:has(h3:has-text("Provision Worker"))');
        const roleSelect = container.locator('select').nth(0);
        const locSelect = container.locator('select').nth(1);

        console.log("--- ROLE SELECT HTML ---");
        console.log(await roleSelect.innerHTML());

        console.log("--- LOC SELECT HTML ---");
        console.log(await locSelect.innerHTML());

    } catch (e) { console.error(e); }
    finally { await browser.close(); }
})();
