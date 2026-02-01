const { chromium } = require('playwright');

(async () => {
    console.log("🐟 OPERATOR SIMULATION (Attempt 5 - FIXED ROLE & PATH) 🐟");

    // Config
    const LOGIN_EMAIL = 'susi.sim3@oceanpearl.com';
    const LOGIN_PASS = 'Password123!';

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);

    try {
        // 1. LOGIN
        console.log(`🔐 Logging in as ${LOGIN_EMAIL}...`);
        await page.goto('https://oceanpearl-ops.web.app/login');

        await page.fill('input[type="email"]', LOGIN_EMAIL, { force: true });
        await page.fill('input[type="password"]', LOGIN_PASS, { force: true });
        await page.click('button:has-text("Sign In")', { force: true });

        // Wait for Dashboard
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'd:/OPS/day1_susi_dashboard_check.png' });

        // CHECK IF READ ONLY
        const bodyText = await page.innerText('body');
        if (bodyText.includes('READ ONLY')) {
            console.error("❌ STILL READ ONLY! AuthContext Fix Failed?");
            // But we will try navigating anyway...
        }

        // 2. NAVIGATE TO RECEIVING
        console.log("🏭 Navigating to /receiving...");
        await page.goto('https://oceanpearl-ops.web.app/receiving');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'd:/OPS/day1_susi_receiving_page.png' });

        // Check if 404
        if (await page.locator('text=Page Not Found').count() > 0) {
            throw new Error("Access Denied to /receiving");
        }

        console.log("📝 Filling Receiving Form...");

        // 3. FILL HEADER
        // 3. FILL HEADER
        // Supplier is a SELECT now
        const supplierSelect = page.locator('select').first();
        // wait for options
        await supplierSelect.click({ force: true }); // check if enabled

        // Select first valid supplier or add new?
        // Let's try adding "Nelayan A" by value if exists, or just index 1
        await supplierSelect.selectOption({ value: '__ADD_NEW__' });
        await page.waitForTimeout(500);
        await page.locator('input[placeholder*="e.g."]').fill('Nelayan A');
        await page.locator('button:has-text("Save & Select")').click();
        await page.waitForTimeout(1000);

        // 4. FILL GRID ITEM 1
        console.log("   Filling Item Row...");
        // Item Select (First select in TBody)
        const itemSelect = page.locator('table tbody tr').first().locator('select').first();
        // Option 'Yellowfin Tuna' (id might be 'tuna_yellowfin' or similar)
        // Let's match text
        await itemSelect.evaluate(s => {
            const opt = Array.from(s.options).find(o => o.text.toLowerCase().includes('tuna') || o.text.toLowerCase().includes('madidihang'));
            if (opt) s.value = opt.value;
            s.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Qty
        const qtyInput = page.locator('input[placeholder="0.00"]').first();
        await qtyInput.fill('50');

        // Price
        const priceInput = page.locator('input[placeholder="0"]').first();
        await priceInput.fill('60000');

        await page.waitForTimeout(1000);

        // 5. SUBMIT
        console.log("💾 Saving Invoice...");
        await page.locator('button:has-text("Save Invoice")').click({ force: true });

        // Wait for Success Toast
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'd:/OPS/day1_susi_submit_result.png' });

        const successText = await page.innerText('body');
        if (successText.includes('Invoice Saved') || successText.includes('RCV-')) {
            console.log("✅ Purchase Transaction Submitted Successfully via UI.");
        } else {
            console.log("⚠️ Did not see success message, checking screenshot.");
        }

    } catch (e) {
        console.error("❌ ERROR:", e);
        await page.screenshot({ path: 'd:/OPS/day1_susi_error_v5.png' });
        process.exit(1);
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
