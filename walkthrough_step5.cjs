const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();

    console.log("--- PHASE 8 WALKTHROUGH: STEP 5 (CEO) ---");
    try {
        await page.goto('https://oceanpearl-ops.firebaseapp.com/login', { timeout: 60000 });
        await page.fill('input[type="email"]', 'tariq@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);

        log("CEO Dashboard (Global)...");
        await page.screenshot({ path: 'd:/OPS/walkthrough_11_ceo_global.png' });

        log("Switching to Kaimana...");
        await page.selectOption('header select', 'kaimana');
        await page.waitForTimeout(2000);
        await page.click('button:has-text("Confirm Switch")');
        await page.waitForTimeout(5000);

        log("CEO Dashboard (Kaimana Context)...");
        await page.screenshot({ path: 'd:/OPS/walkthrough_12_ceo_kaimana.png' });

        log("Checking Wallet (Treasury)...");
        await page.click('nav a:has-text("Treasury")');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'd:/OPS/walkthrough_13_ceo_wallet.png' });

    } catch (e) {
        console.error("FAILED STEP 5:", e.message);
        await page.screenshot({ path: 'd:/OPS/walkthrough_05_error.png' });
    } finally {
        await browser.close();
    }

    function log(m) { console.log(m); }
})();
