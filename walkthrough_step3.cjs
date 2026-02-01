const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();

    console.log("--- PHASE 8 WALKTHROUGH: STEP 3 (EXPENSES) ---");
    try {
        await page.goto('https://oceanpearl-ops.firebaseapp.com/login', { timeout: 60000 });
        await page.fill('input[type="email"]', 'usi@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(3000);

        log("Navigating to /expenses...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/expenses', { timeout: 60000 });
        await page.waitForTimeout(5000);

        await page.screenshot({ path: 'd:/OPS/walkthrough_05_expenses_list.png' });

        log("Opening New Expense Modal...");
        await page.click('button:has-text("New Expense")');
        await page.waitForTimeout(2000);

        await page.fill('input[type="number"]', '50000'); // 50rb
        await page.fill('textarea', 'Transportation for samples');

        // Select Expense Type (3rd select)
        await page.locator('select').nth(2).selectOption({ index: 1 });
        // Select Vendor (4th select)
        await page.locator('select').nth(3).selectOption({ index: 1 });

        await page.screenshot({ path: 'd:/OPS/walkthrough_06_expenses_modal_filled.png' });

        log("Clicking Submit Check...");
        await page.click('button:has-text("Submit Check")');

        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'd:/OPS/walkthrough_07_expenses_result.png' });

        log("Checking Dashboard KPIs...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/', { timeout: 60000 });
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'd:/OPS/walkthrough_08_dashboard_updated.png' });

    } catch (e) {
        console.error("FAILED STEP 3:", e.message);
        await page.screenshot({ path: 'd:/OPS/walkthrough_03_error.png' });
    } finally {
        await browser.close();
    }

    function log(m) { console.log(m); }
})();
