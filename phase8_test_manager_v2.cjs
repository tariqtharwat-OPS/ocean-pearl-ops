const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();

    let logs = [];
    const log = (msg) => { console.log(msg); logs.push(msg); };

    try {
        log("--- START PHASE 8: MANAGER FLOW (VERIFIED INDEXES) ---");

        log("Navigating to login...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/login', { timeout: 60000 });

        log("Logging in as budi@oceanpearlseafood.com...");
        await page.fill('input[type="email"]', 'budi@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');

        await page.waitForTimeout(5000);
        log(`Logged in. Title: ${await page.title()}`);

        // 1. Expenses
        log("Navigating to /expenses...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/expenses', { timeout: 60000 });
        await page.waitForTimeout(5000);

        await page.screenshot({ path: 'd:/OPS/phase8_v2_05_manager_expenses.png' });

        log("Looking for pending expense...");
        // Wait for table to load
        await page.waitForSelector('table', { timeout: 10000 });

        // Find row with PENDING_APPROVAL or PENDING
        const rows = page.locator('tr');
        const count = await rows.count();
        log(`Found ${count} rows`);

        let found = false;
        for (let i = 0; i < count; i++) {
            const row = rows.nth(i);
            const text = await row.innerText();
            if (text.includes("PENDING")) {
                log(`Found Pending Expense at row ${i}: ${text.replace(/\n/g, ' ')}`);
                if (text.includes("Invalid Date")) {
                    log("FAIL: 'Invalid Date' found in pending row.");
                } else {
                    log("PASS: Valid date format.");
                }

                log("Approving...");
                // Click the check icon. lucide-check is usually in a button.
                await row.locator('button').filter({ has: page.locator('svg.lucide-check') }).first().click();

                await page.waitForTimeout(3000);
                log("Approval clicked. Checking status...");
                const newText = await row.innerText();
                log(`Row after approval: ${newText.replace(/\n/g, ' ')}`);

                if (newText.includes("APPROVED")) {
                    log("PASS: Expense successfully approved.");
                    found = true;
                }
                break;
            }
        }

        if (!found) {
            log("FAIL: No pending expense found to approve.");
            // Print table body text for debugging
            const tableText = await page.innerText('tbody');
            log("Table Body Content:");
            log(tableText);
        }

        log("--- END PHASE 8: MANAGER FLOW ---");

    } catch (e) {
        log(`ERROR: ${e.message}`);
        await page.screenshot({ path: 'd:/OPS/phase8_v2_manager_error.png' });
    } finally {
        await browser.close();
    }
})();
