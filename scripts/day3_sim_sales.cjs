const { chromium } = require('playwright');

(async () => {
    console.log("🌊 DAY 3: SALES & REVENUE SIMULATION (V3.1 - ALIGNED) 🌊");

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

        // --- SALE 1: ANCHOVY ---
        console.log("💰 Recording Sale 1: 70kg Anchovy Fillet...");
        await page.goto('https://oceanpearl-ops.web.app/sales');
        await page.waitForSelector('text=New Sales Invoice');
        await page.waitForTimeout(5000);

        console.log("   Selecting Buyer (Buyer B)...");
        await page.locator('select[name="buyer"]').selectOption({ index: 1 });

        console.log("   Selecting Product (Anchovy Fillet)...");
        await page.locator('select[name="itemId"]').selectOption({ label: 'Anchovy Fillet' });

        console.log("   Filling Grade & Price...");
        await page.locator('select[name="gradeId"]').selectOption('A');
        await page.fill('input[name="pricePerKg"]', '55000');
        await page.fill('input[name="quantityKg"]', '70');

        console.log("   Submitting Sale 1...");
        await page.click('button:has-text("Confirm & Issue Invoice")');

        await page.waitForTimeout(5000);
        console.log("   ✅ Sale 1 Recorded.");

        // --- SALE 2: TUNA ---
        console.log("💰 Recording Sale 2: 25kg Tuna Loin...");
        await page.goto('https://oceanpearl-ops.web.app/sales');
        await page.waitForTimeout(5000);

        await page.locator('select[name="buyer"]').selectOption({ index: 1 });
        await page.locator('select[name="itemId"]').selectOption({ label: 'Tuna Loin' });
        await page.locator('select[name="gradeId"]').selectOption('A');
        await page.fill('input[name="pricePerKg"]', '165000');
        await page.fill('input[name="quantityKg"]', '25');

        console.log("   Submitting Sale 2...");
        await page.click('button:has-text("Confirm & Issue Invoice")');

        await page.waitForTimeout(5000);
        console.log("   ✅ Sale 2 Recorded.");

        console.log("✅ DAY 3 SIMULATION COMPLETE.");

    } catch (e) {
        console.error("❌ ERROR:", e);
        await page.screenshot({ path: 'd:/OPS/day3_sim_error.png' });
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
