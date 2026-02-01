const { chromium } = require('playwright');

(async () => {
    console.log("🌊 DAY 1 STEP 1 (Part 3): CEO RE-SEED (UI ONLY) 🌊");

    const SEED_AMOUNT = '250000000'; // 250 Million

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);

    page.on('console', msg => console.log('BROWSER:', msg.text()));

    try {
        console.log("🔐 Logging in as CEO...");
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'tariq@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(10000);

        console.log("💰 Seeding Capital (250M)...");
        await page.goto('https://oceanpearl-ops.web.app/wallet');
        await page.waitForTimeout(5000);

        const sendBtn = page.locator('button:has-text("Send Funds")');
        if (await sendBtn.count() > 0) {
            await sendBtn.first().click();
            await page.waitForTimeout(2000);
            const modal = page.locator('div.fixed.z-50').last();
            await modal.locator('select').first().selectOption({ value: 'kaimana' });
            await modal.locator('input[type="number"]').fill(SEED_AMOUNT);
            await modal.locator('textarea').fill('Initial Capital Injection for sim5');
            await modal.locator('button:has-text("Transfer")').click();

            // Look for specific error or success
            const toast = page.locator('.toast, .alert, div:has-text("Successful"), div:has-text("Error"), div:has-text("Failed")');
            await page.waitForTimeout(10000);
            const status = await toast.count() > 0 ? await toast.first().innerText() : "No Toast";
            console.log("   Status:", status);

            await page.screenshot({ path: 'd:/OPS/ceo_transfer_debug.png' });
        } else {
            console.error("❌ Send Funds button not found!");
        }

        console.log("✅ CEO RE-SEED ATTEMPT COMPLETE.");

    } catch (e) {
        console.error("❌ ERROR:", e);
        await page.screenshot({ path: 'd:/OPS/day1_ceo_p3_error.png' });
        process.exit(1);
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
