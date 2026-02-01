const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();

    console.log("--- PHASE 8 WALKTHROUGH: STEP 4 (MANAGER) ---");
    try {
        await page.goto('https://oceanpearl-ops.firebaseapp.com/login', { timeout: 60000 });
        await page.fill('input[type="email"]', 'budi@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);

        log("Navigating to /expenses...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/expenses', { timeout: 60000 });
        await page.waitForTimeout(5000);

        await page.screenshot({ path: 'd:/OPS/walkthrough_09_manager_expenses.png' });

        log("Looking for Pending Expense (row with 50,000)...");
        // We look for a row that has "50,000" and "PENDING APPROVAL"
        const rows = page.locator('tr');
        const count = await rows.count();
        log(`Found ${count} rows`);

        let found = false;
        for (let i = 0; i < count; i++) {
            const text = await rows.nth(i).innerText();
            if (text.includes("50,000") && text.includes("PENDING APPROVAL")) {
                log(`Found target expense at row ${i}`);
                // Click the check icon button
                const approveBtn = rows.nth(i).locator('button').filter({ has: page.locator('svg.lucide-check') }).first();
                await approveBtn.click();
                log("Clicked Approve.");
                found = true;
                break;
            }
        }

        if (!found) log("WARNING: Could not find the 50,000 pending expense.");

        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'd:/OPS/walkthrough_10_manager_result.png' });

    } catch (e) {
        console.error("FAILED STEP 4:", e.message);
        await page.screenshot({ path: 'd:/OPS/walkthrough_04_error.png' });
    } finally {
        await browser.close();
    }

    function log(m) { console.log(m); }
})();
