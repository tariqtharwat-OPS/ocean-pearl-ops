const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();

    let logs = [];
    const log = (msg) => { console.log(msg); logs.push(msg); };

    try {
        log("--- START PHASE 8: OPERATOR FLOW (DEBUG 3) ---");

        await page.goto('https://oceanpearl-ops.firebaseapp.com/login', { timeout: 60000 });
        await page.fill('input[type="email"]', 'usi@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);

        // 1. Receiving
        log("Receiving Step...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/receiving', { timeout: 60000 });
        await page.waitForTimeout(5000);

        const speciesSelect = page.locator('tbody select').first();
        await speciesSelect.selectOption({ index: 1 });
        await page.fill('input[placeholder="0.00"]', '100');
        await page.fill('input[placeholder="0"]', '5000');

        log("Saving Receiving...");
        await page.click('button:has-text("Save Invoice")');
        await page.waitForTimeout(3000);

        // 2. Expenses
        log("Expenses Step...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/expenses', { timeout: 60000 });
        await page.waitForTimeout(5000);

        log("Opening Expense Modal...");
        await page.click('button:has-text("New Expense")');
        await page.waitForTimeout(2000);

        await page.fill('input[placeholder="0"]', '250000');
        await page.fill('textarea', 'Ice and Salt (Phase 8 Test)');

        log("Configuring Selects...");
        const allSelects = await page.locator('select').all();
        log(`Found ${allSelects.length} selects in modal`);

        // Expense Type should be the 3rd or 4th select on the page if receiving left some?
        // No, we navigated to /expenses, so only expenses selects.
        // There are filters selects too!
        // Filters: Status, DateRange (2 selects)
        // Modal: Expense Type, Vendor (2 selects)
        // Total 4 selects.

        const expenseTypeSelect = page.locator('label:has-text("Expense Type") + div select, div:has(label:has-text("Expense Type")) select').first();
        await expenseTypeSelect.selectOption({ index: 1 });
        log("Expense Type selected.");

        log("Submitting Expense...");
        await page.click('button:has-text("Submit Check")');

        // Wait and check for toast
        await page.waitForTimeout(2000);
        const toast = page.locator('.hot-toast-bar, .toast, [role="status"]');
        if (await toast.count() > 0) {
            const toastText = await toast.first().innerText();
            log(`TOAST DETECTED: ${toastText}`);
        } else {
            log("No toast detected after submit.");
        }

        await page.screenshot({ path: 'd:/OPS/phase8_v3_expense_result.png' });

        log("--- END PHASE 8: OPERATOR FLOW ---");

    } catch (e) {
        log(`ERROR: ${e.message}`);
    } finally {
        await browser.close();
    }
})();
