const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();

    console.log("--- PHASE 8: CEO FINAL CHECK ---");
    try {
        await page.goto('https://oceanpearl-ops.firebaseapp.com/login', { timeout: 60000 });
        await page.fill('input[type="email"]', 'tariq@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);

        console.log("Switching to Kaimana...");
        // Use select Option by VALUE
        await page.selectOption('header select:first-of-type', 'kaimana');
        await page.waitForTimeout(2000);

        // Wait for specific unit dropdown to appear if any, or just click confirm
        await page.click('button:has-text("Confirm Switch")');
        await page.waitForTimeout(7000);

        await page.screenshot({ path: 'd:/OPS/final_ceo_kaimana_context.png' });

        console.log("Navigating to Wallet...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/wallet');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'd:/OPS/final_ceo_wallet_check.png' });

    } catch (e) {
        console.error("VERIFICATION FAILED:", e.message);
    } finally {
        await browser.close();
    }
})();
