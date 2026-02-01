const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();

    console.log("--- PHASE 8 WALKTHROUGH: STEP 2 (RECEIVING) ---");
    try {
        await page.goto('https://oceanpearl-ops.firebaseapp.com/login', { timeout: 60000 });
        await page.fill('input[type="email"]', 'usi@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(3000);

        log("Navigating to /receiving...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/receiving', { timeout: 60000 });
        await page.waitForTimeout(5000);

        await page.screenshot({ path: 'd:/OPS/walkthrough_02_receiving_ready.png' });

        log("Filling 100kg of Anchovy...");
        // Select species from first row
        // In Receiving.jsx, there's a catalog mapping
        const speciesSelect = page.locator('tbody tr:first-child select').first();
        await speciesSelect.selectOption({ index: 1 });

        await page.fill('tbody tr:first-child input[placeholder="0.00"]', '100');
        await page.fill('tbody tr:first-child input[placeholder="0"]', '10000'); // IDR 10,000 / kg -> 1,000,000 total

        await page.screenshot({ path: 'd:/OPS/walkthrough_03_receiving_filled.png' });

        log("Clicking Save Invoice...");
        await page.click('button:has-text("Save Invoice")');

        // Wait for result toast
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'd:/OPS/walkthrough_04_receiving_result.png' });

    } catch (e) {
        console.error("FAILED STEP 2:", e.message);
        await page.screenshot({ path: 'd:/OPS/walkthrough_02_error.png' });
    } finally {
        await browser.close();
    }

    function log(m) { console.log(m); }
})();
