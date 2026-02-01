const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();

    let logs = [];
    const log = (msg) => { console.log(msg); logs.push(msg); };

    page.on('console', msg => log(`BROWSER CONSOLE: ${msg.text()}`));
    page.on('pageerror', err => log(`BROWSER PAGE ERROR: ${err.message}`));

    try {
        log("--- START PHASE 8: OPERATOR FLOW (DEBUG 4) ---");

        await page.goto('https://oceanpearl-ops.firebaseapp.com/login', { timeout: 60000 });
        await page.fill('input[type="email"]', 'usi@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);

        log("Navigating to /receiving...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/receiving', { timeout: 60000 });
        await page.waitForTimeout(5000);

        log("Filling Receiving...");
        // Select species
        await page.locator('tbody tr:first-child select').first().selectOption({ index: 1 });
        await page.fill('tbody tr:first-child input[placeholder="0.00"]', '100');
        await page.fill('tbody tr:first-child input[placeholder="0"]', '5000');

        log("Saving Invoice...");
        await page.click('button:has-text("Save Invoice")');

        // Wait for potential Dialog or Toast
        await page.waitForTimeout(8000);
        await page.screenshot({ path: 'd:/OPS/phase8_logs_receiving_v4.png' });

        log("Navigating to /expenses...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/expenses', { timeout: 60000 });
        await page.waitForTimeout(5000);

        log("Creating Expense...");
        await page.click('button:has-text("New Expense")');
        await page.waitForTimeout(2000);

        await page.fill('input[placeholder="0"]', '250000');
        await page.fill('textarea', 'Repair tools (Phase 8)');

        // Modal selects: 3rd is Type, 4th is Vendor
        await page.locator('select').nth(2).selectOption({ index: 1 });
        await page.locator('select').nth(3).selectOption({ index: 1 });

        log("Submitting Expense...");
        await page.click('button:has-text("Submit Check")');

        await page.waitForTimeout(8000);
        await page.screenshot({ path: 'd:/OPS/phase8_logs_expenses_v4.png' });

        log("--- END PHASE 8: OPERATOR FLOW ---");

    } catch (e) {
        log(`ERROR: ${e.message}`);
    } finally {
        await browser.close();
    }
})();
