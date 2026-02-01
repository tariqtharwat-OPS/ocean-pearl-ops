const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();

    let logs = [];
    const log = (msg) => { console.log(msg); logs.push(msg); };

    try {
        log("--- DEBUG PHASE 8: OPERATOR EXPENSE CREATION ---");

        await page.goto('https://oceanpearl-ops.firebaseapp.com/login', { timeout: 60000 });
        await page.fill('input[type="email"]', 'usi@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);

        await page.goto('https://oceanpearl-ops.firebaseapp.com/expenses', { timeout: 60000 });
        await page.waitForTimeout(5000);

        log("Opening Create Modal...");
        await page.click('button:has-text("New Expense")');
        await page.waitForTimeout(2000);

        await page.fill('input[type="number"]', '250000');
        await page.fill('textarea', 'Ice Test (Phase 8)');

        log("Selecting Expense Type...");
        // SelectWithAddNew uses a select inside it
        const selects = await page.$$('select');
        log(`Selects count: ${selects.length}`);

        // Find the one for Expense Type
        await page.selectOption('select:near(label:text("Expense Type"))', { index: 1 });

        log("Clicking Submit...");
        await page.click('button:has-text("Submit Check")');

        // Listen for toast
        await page.waitForTimeout(1000);
        const toast = await page.$('.hot-toast-bar, .toast, [role="status"]');
        if (toast) {
            log(`TOAST: ${await toast.innerText()}`);
        } else {
            log("No toast detected immediately.");
        }

        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'd:/OPS/phase8_debug_expense.png' });

        log("Checking list for PENDING status...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/expenses', { timeout: 60000 });
        await page.waitForTimeout(5000);
        const listText = await page.innerText('body');
        log(`Includes PENDING: ${listText.includes("PENDING APPROVAL")}`);

    } catch (e) {
        log(`ERROR: ${e.message}`);
    } finally {
        await browser.close();
    }
})();
