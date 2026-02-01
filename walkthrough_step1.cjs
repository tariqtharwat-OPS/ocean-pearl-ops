const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();

    console.log("--- PHASE 8 WALKTHROUGH: STEP 1 (LOGIN) ---");
    try {
        await page.goto('https://oceanpearl-ops.firebaseapp.com/login', { timeout: 60000 });
        await page.fill('input[type="email"]', 'usi@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');

        await page.waitForTimeout(5000); // Wait for auth redirection

        const path = 'd:/OPS/walkthrough_01_login_result.png';
        await page.screenshot({ path });
        console.log(`Screenshot saved to ${path}`);
        console.log(`Current URL: ${page.url()}`);
        console.log(`Page Title: ${await page.title()}`);
    } catch (e) {
        console.error("FAILED STEP 1:", e.message);
        await page.screenshot({ path: 'd:/OPS/walkthrough_01_error.png' });
    } finally {
        await browser.close();
    }
})();
