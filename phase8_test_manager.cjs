const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();

    let logs = [];
    const log = (msg) => { console.log(msg); logs.push(msg); };

    try {
        log("--- START PHASE 8: MANAGER FLOW ---");

        // 1. Login as Budi
        log("Navigating to login...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/login', { timeout: 60000 });

        log("Logging in as budi@oceanpearlseafood.com...");
        await page.fill('input[type="email"]', 'budi@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');

        await page.waitForTimeout(5000);
        log(`Logged in. Title: ${await page.title()}`);

        // 2. Go to Expenses
        log("Navigating to /expenses...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/expenses', { timeout: 60000 });
        await page.waitForTimeout(5000);

        await page.screenshot({ path: 'd:/OPS/phase8_05_manager_expenses.png' });

        // 3. Find the expense created by Usi
        log("Looking for pending expense...");
        const expenseRow = await page.locator('tr:has-text("PENDING APPROVAL")').first();
        if (await expenseRow.count() > 0) {
            log("Found pending expense. Checking timestamp...");
            const rowText = await expenseRow.innerText();
            log(`Row Content: ${rowText}`);

            if (rowText.includes("Invalid Date")) {
                log("FAIL: 'Invalid Date' found in expense row.");
            } else {
                log("PASS: Valid timestamp found.");
            }

            // 4. Approve
            log("Clicking Approve button...");
            // Inside the row, find the check icon/button
            // Based on Expenses.jsx line 363: <button onClick={() => handleApproveReject(item, 'APPROVE')} ...><Check size={16} /></button>
            await expenseRow.locator('button:has(.lucide-check)').click();

            await page.waitForTimeout(3000);
            await page.screenshot({ path: 'd:/OPS/phase8_06_manager_approve_result.png' });

            // 5. Verify status change
            const status = await expenseRow.locator('span.rounded-full').innerText();
            log(`New Status: ${status}`);
            if (status.includes("APPROVED")) {
                log("PASS: Expense successfully approved.");
            } else {
                log(`FAIL: Expected APPROVED, got ${status}`);
            }
        } else {
            log("FAIL: No pending expense found to approve.");
        }

        log("--- END PHASE 8: MANAGER FLOW ---");

    } catch (e) {
        log(`ERROR: ${e.message}`);
        await page.screenshot({ path: 'd:/OPS/phase8_manager_error.png' });
    } finally {
        await browser.close();
    }
})();
