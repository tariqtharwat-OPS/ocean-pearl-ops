const { chromium } = require('playwright');

(async () => {
    console.log("🌊 DAY 1: OPERATOR ACTIONS - EXPENSE ONLY (SIM 5.23 - FIX SELECTORS) 🌊");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
    const page = await context.newPage();
    page.setDefaultTimeout(120000);

    page.on('console', msg => console.log('BROWSER:', msg.text()));

    try {
        console.log("🔐 Logging in as Operator (Susi)...");
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'susi.sim5.official@oceanpearl.com');
        await page.fill('input[type="password"]', 'Password123!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);

        // 2. EXPENSE REQUEST
        console.log("🧊 Submitting Expense Request (Ice)...");
        await page.goto('https://oceanpearl-ops.web.app/wallet');
        await page.waitForSelector('text=Requests');
        await page.waitForTimeout(3000);

        // Click "New Request" button (matches screenshot)
        await page.click('button:has-text("Request")');
        await page.waitForTimeout(3000);

        const expModal = page.locator('div.fixed').filter({ hasText: 'Create Request' }).last();
        await expModal.waitFor({ state: 'visible' });

        console.log("   Filling Request Form...");
        // Susi only has EXPENSE type usually, but let's be safe
        await expModal.locator('input[type="number"]').fill('500000');
        await expModal.locator('textarea').fill('Biaya es balok untuk SIM5 Day 1 (10 balok)');

        console.log("   Submitting...");
        await expModal.locator('button:has-text("Submit")').click();

        // Wait for success toast or modal close
        await page.waitForSelector('text=successfully|Success|Terkirim|Created', { timeout: 30000 });
        console.log("   ✅ Expense Request Submitted.");

        console.log("✅ OPERATOR EXPENSE COMPLETE.");

    } catch (e) {
        console.error("❌ ERROR:", e);
        await page.screenshot({ path: 'd:/OPS/operator_expense_v23_error.png' });
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
