const { chromium } = require('playwright');

(async () => {
    console.log("🌊 DAY 2: PRODUCTION & YIELD SIMULATION (V2.5 - BRUTE FORCE) 🌊");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
    const page = await context.newPage();
    page.setDefaultTimeout(120000);

    page.on('console', msg => console.log('BROWSER:', msg.text()));

    page.on('dialog', async dialog => {
        console.log(`💬 Dialog appeared: [${dialog.type()}] ${dialog.message()}`);
        await dialog.accept();
    });

    try {
        console.log("🔐 Logging in as Operator (Susi)...");
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'susi.sim5.official@oceanpearl.com');
        await page.fill('input[type="password"]', 'Password123!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);

        // --- BATCH 1: ANCHOVY DRYING ---
        console.log("🔧 Starting Production Batch 1: Anchovy Drying...");
        await page.goto('https://oceanpearl-ops.web.app/production');
        await page.waitForSelector('text=Production Run');
        await page.waitForTimeout(8000); // Heavy wait for stock load

        console.log("   Selecting first available stock (Anchovy)...");
        const rawStockSelect = page.locator('select').first();
        // Index 1 is usually the first real item after "-- Available Stock --"
        await rawStockSelect.selectOption({ index: 1 });

        console.log("   Filling Input Weights...");
        await page.fill('input[placeholder="0.0"]', '100');

        console.log("   Filling Output Row 1...");
        await page.waitForTimeout(5000);
        const row1 = page.locator('tbody tr').first();
        const productSelect = row1.locator('select').nth(0);

        // Pick first outcome (Standard or Loin)
        await productSelect.selectOption({ index: 1 });
        await row1.locator('select').nth(1).selectOption({ index: 1 });
        await row1.locator('select').nth(2).selectOption({ index: 1 });
        await row1.locator('input[type="number"]').nth(0).fill('4'); // Boxes
        await row1.locator('input[type="number"]').nth(1).fill('70'); // Weight

        console.log("   Recording Waste...");
        await page.locator('.bg-orange-50 input[type="number"]').fill('30');

        console.log("   Submitting Batch 1...");
        await page.click('button:has-text("CONFIRM PRODUCTION")');

        await page.waitForSelector('text=Production Recorded', { timeout: 30000 });
        console.log("   ✅ Batch 1 Recorded.");
        await page.click('button:has-text("New Batch")');
        await page.waitForTimeout(5000);

        // --- BATCH 2: TUNA LOIN ---
        console.log("🔧 Starting Production Batch 2: Tuna Loin...");
        await page.locator('select').first().selectOption({ index: 2 }); // Second item
        await page.fill('input[placeholder="0.0"]', '50');

        console.log("   Filling Output Row 1...");
        await page.waitForTimeout(5000);
        const row2 = page.locator('tbody tr').first();
        await row2.locator('select').nth(0).selectOption({ index: 1 });
        await row2.locator('select').nth(1).selectOption({ index: 1 });
        await row2.locator('select').nth(2).selectOption({ index: 1 });
        await row2.locator('input[type="number"]').nth(0).fill('2'); // Boxes
        await row2.locator('input[type="number"]').nth(1).fill('25'); // Weight

        console.log("   Recording Waste...");
        await page.locator('.bg-orange-50 input[type="number"]').fill('25');

        console.log("   Submitting Batch 2...");
        await page.click('button:has-text("CONFIRM PRODUCTION")');

        await page.waitForSelector('text=Production Recorded', { timeout: 30000 });
        console.log("   ✅ Batch 2 Recorded.");

        console.log("✅ DAY 2 SIMULATION COMPLETE.");

    } catch (e) {
        console.error("❌ ERROR:", e);
        await page.screenshot({ path: 'd:/OPS/day2_sim_error.png' });
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
