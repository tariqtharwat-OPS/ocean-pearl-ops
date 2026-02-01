const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();

    let logs = [];
    const log = (msg) => { console.log(msg); logs.push(msg); };

    try {
        log("--- START PHASE 8: OPERATOR FLOW (FIX SELECTORS) ---");

        await page.goto('https://oceanpearl-ops.firebaseapp.com/login', { timeout: 60000 });
        await page.fill('input[type="email"]', 'usi@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);

        // Expenses Only (Skip receiving for speed if already tested, but okay to keep)
        log("Expenses Step...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/expenses', { timeout: 60000 });
        await page.waitForTimeout(5000);

        await page.click('button:has-text("New Expense")');
        await page.waitForTimeout(2000);

        await page.fill('input[placeholder="0"]', '250000');
        await page.fill('textarea', 'Ice and Salt (Phase 8 Final)');

        const selects = await page.locator('select').all();
        log(`Found ${selects.length} selects.`);

        // Select Expense Type (3rd select on page)
        log("Selecting Expense Type (Select 3)...");
        await page.locator('select').nth(2).selectOption({ index: 1 });

        // Select Vendor (4th select on page)
        log("Selecting Vendor (Select 4)...");
        await page.locator('select').nth(3).selectOption({ index: 1 });

        log("Submitting Expense...");
        await page.click('button:has-text("Submit Check")');

        await page.waitForTimeout(2000);
        const toast = page.locator('.hot-toast-bar, .toast, [role="status"]');
        if (await toast.count() > 0) {
            log(`TOAST: ${await toast.first().innerText()}`);
        }

        await page.screenshot({ path: 'd:/OPS/phase8_v4_expense_result.png' });

        log("--- END PHASE 8: OPERATOR FLOW ---");

    } catch (e) {
        log(`ERROR: ${e.message}`);
    } finally {
        await browser.close();
    }
})();
