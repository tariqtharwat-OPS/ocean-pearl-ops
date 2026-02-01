const { chromium } = require('playwright');

(async () => {
    console.log("🌊 DAY 1: OPERATOR ACTIONS (SIM 5.21 - PRECISION) 🌊");

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

        // 1. PURCHASE RECEIVING
        console.log("🐟 Performing Purchase Receiving...");
        await page.goto('https://oceanpearl-ops.web.app/receiving');

        // Wait for the form to be ready
        await page.waitForSelector('text=Receive Goods');
        await page.waitForTimeout(4000);

        // Select Supplier
        const supplierSelect = page.locator('div:has-text("Supplier / Source")').last().locator('select');
        await supplierSelect.waitFor({ state: 'visible' });

        const optionsText = await supplierSelect.innerText();
        if (optionsText.includes('Nelayan A')) {
            console.log("   Supplier Nelayan A exists. Selecting.");
            await supplierSelect.selectOption({ label: 'Nelayan A' });
        } else {
            console.log("   Adding New Supplier: Nelayan A...");
            await supplierSelect.selectOption('__ADD_NEW__');
            const modal = page.locator('div.fixed').filter({ hasText: 'Add New' }).last();
            await modal.waitFor({ state: 'visible' });
            await modal.locator('input').fill('Nelayan A');
            await modal.locator('button:has-text("Save & Select")').click();
            await page.waitForTimeout(4000);
        }

        // Fill Items
        console.log("   Adding Items...");
        const items = [
            { label: 'Anchovy (Ikan Teri)', qty: '100', price: '15000' },
            { label: 'Yellowfin Tuna (Tuna Sirip Kuning)', qty: '50', price: '60000' }
        ];

        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            console.log(`     Item ${i + 1}: ${it.label}...`);

            // Locate row specifically within the Receiving form table
            const row = page.locator('div:has-text("Receive Goods") table tbody tr').nth(i);
            const rowSelect = row.locator('select').first();

            await rowSelect.waitFor({ state: 'visible' });
            await rowSelect.selectOption({ label: it.label });
            await page.waitForTimeout(2000);

            const inputs = row.locator('input[type="number"]');
            await inputs.nth(0).fill(it.qty);
            await inputs.nth(1).fill(it.price);
        }

        console.log("   Submitting Purchase...");
        // Click the big blue button at the bottom right
        await page.click('button:has-text("Save Invoice")');

        await page.waitForSelector('text=Success|Saved|successfully|Disimpan', { timeout: 45000 });
        console.log("   ✅ Purchase Complete.");

        // 2. EXPENSE REQUEST
        console.log("🧊 Submitting Expense Request (Ice)...");
        await page.goto('https://oceanpearl-ops.web.app/wallet');
        await page.waitForSelector('button:has-text("Create Request")');
        await page.waitForTimeout(3000);

        await page.click('button:has-text("Create Request")');
        await page.waitForTimeout(3000);

        const expModal = page.locator('div.fixed').filter({ hasText: 'Financial Request' }).last();
        await expModal.waitFor({ state: 'visible' });

        await expModal.locator('select').first().selectOption({ label: 'Ice & Salt' });
        await expModal.locator('input[type="number"]').fill('500000');
        await expModal.locator('textarea').fill('Biaya es balok untuk SIM5 Day 1 (10 balok)');
        await expModal.locator('button:has-text("Submit Request")').click();

        await page.waitForSelector('text=successfully|Success|Terkirim', { timeout: 30000 });
        console.log("   ✅ Expense Request Submitted.");

        console.log("✅ OPERATOR ACTIONS COMPLETE.");

    } catch (e) {
        console.error("❌ ERROR:", e);
        await page.screenshot({ path: 'd:/OPS/operator_sim_v21_error.png' });
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
