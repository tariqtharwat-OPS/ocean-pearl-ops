const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();

    let logs = [];
    const log = (msg) => { console.log(msg); logs.push(msg); };

    try {
        log("--- START PHASE 8: OPERATOR FLOW (VERIFIED INDEXES) ---");

        log("Navigating to login...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/login', { timeout: 60000 });

        log("Logging in as usi@oceanpearlseafood.com...");
        await page.fill('input[type="email"]', 'usi@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');

        await page.waitForTimeout(5000);
        const title = await page.title();
        log(`Logged in. Title: ${title}`);
        if (title.includes("Login")) {
            throw new Error("Login failed - still on login page");
        }

        // 1. Receiving
        log("Navigating to /receiving...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/receiving', { timeout: 60000 });
        await page.waitForTimeout(5000);

        // Take screenshot for verification
        await page.screenshot({ path: 'd:/OPS/phase8_v2_01_receiving.png' });

        log("Filling Receiving Form...");
        // Species dropdown is in the table row
        const speciesSelect = page.locator('tbody select').first();
        await speciesSelect.selectOption({ index: 1 });

        const qtyInput = page.locator('input[placeholder="0.00"]').first();
        await qtyInput.fill('100');

        const priceInput = page.locator('input[placeholder="0"]').first();
        await priceInput.fill('5000');

        log("Clicking Save Invoice (Supplier empty)...");
        await page.click('button:has-text("Save Invoice")');

        // Check for success alert or toast
        try {
            const dialog = await page.waitForEvent('dialog', { timeout: 5000 });
            log(`DIALOG: ${dialog.message()}`);
            await dialog.accept();
        } catch (e) {
            log("No browser dialog appeared within 5s, checking for toast...");
            const toast = await page.locator('.hot-toast-bar, .toast').first();
            if (await toast.isVisible()) {
                log(`TOAST: ${await toast.innerText()}`);
            }
        }

        await page.screenshot({ path: 'd:/OPS/phase8_v2_02_receiving_saved.png' });

        // 2. Expenses
        log("Navigating to /expenses...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/expenses', { timeout: 60000 });
        await page.waitForTimeout(5000);

        log("Creating New Expense...");
        await page.click('button:has-text("New Expense")');
        await page.waitForTimeout(2000);

        await page.fill('input[type="number"]', '250000');
        await page.fill('textarea', 'Ice and Salt (Phase 8 Test)');

        // Expense Type Select (using SelectWithAddNew)
        const typeSelect = page.locator('select').first();
        await typeSelect.selectOption({ index: 1 });

        log("Clicking Submit Check (Vendor empty)...");
        await page.click('button:has-text("Submit Check")');

        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'd:/OPS/phase8_v2_03_expense_saved.png' });

        // 3. Dashboard
        log("Navigating to /dashboard...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/dashboard', { timeout: 60000 });
        await page.waitForTimeout(5000);

        const dashboardText = await page.innerText('body');
        if (dashboardText.includes("Invalid Date")) {
            log("FAIL: 'Invalid Date' found on dashboard.");
        } else {
            log("PASS: Dashboard looks clean.");
        }

        await page.screenshot({ path: 'd:/OPS/phase8_v2_04_dashboard.png' });

        log("--- END PHASE 8: OPERATOR FLOW ---");

    } catch (e) {
        log(`ERROR: ${e.message}`);
        await page.screenshot({ path: 'd:/OPS/phase8_v2_error.png' });
    } finally {
        await browser.close();
    }
})();
