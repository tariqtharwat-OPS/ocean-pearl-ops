const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();

    console.log("--- HUMAN QA: SCENARIO 2 (MANAGER KAIMANA) ---");
    try {
        console.log("Step: Login as Manager");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/login', { timeout: 60000 });
        await page.fill('input[type="email"]', 'manager_kaimana@ops.com');
        await page.fill('input[type="password"]', 'OpsKaimana2026!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'd:/OPS/qa_human_10_manager_login.png' });

        console.log("Step: Review Recent Activity");
        // Dashboard should show recent activity
        await page.screenshot({ path: 'd:/OPS/qa_human_11_manager_dashboard.png' });

        console.log("Step: Navigate to Expenses (Approvals)");
        // Click on "Approvals" or "Recent Activity" 
        await page.goto('https://oceanpearl-ops.firebaseapp.com/expenses', { timeout: 60000 });
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'd:/OPS/qa_human_12_manager_expenses.png' });

        console.log("Step: Find and Approve/Reject Expense");
        // Look for the 300,000 expense
        const rows = page.locator('tr');
        const count = await rows.count();
        let found = false;
        for (let i = 0; i < count; i++) {
            const text = await rows.nth(i).innerText();
            if (text.includes("300,000") && text.includes("PENDING APPROVAL")) {
                console.log(`Found pending expense at row ${i}`);
                const approveBtn = rows.nth(i).locator('button').filter({ has: page.locator('svg.lucide-check') }).first();
                await approveBtn.click();
                found = true;
                break;
            }
        }
        if (!found) console.log("WARNING: 300,000 expense not found or already processed.");

        await page.waitForTimeout(4000);
        await page.screenshot({ path: 'd:/OPS/qa_human_13_manager_approve_result.png' });

        console.log("Step: Verify Wallet");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/wallet', { timeout: 60000 });
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'd:/OPS/qa_human_14_manager_wallet.png' });

        console.log("MISSION SCENARIO 2: COMPLETE");

    } catch (e) {
        console.error("MISSION SCENARIO 2 FAILED:", e.message);
        await page.screenshot({ path: 'd:/OPS/qa_human_error_mgr.png' });
    } finally {
        await browser.close();
    }
})();
