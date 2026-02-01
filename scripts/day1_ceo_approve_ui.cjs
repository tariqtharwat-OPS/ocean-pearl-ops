const { chromium } = require('playwright');

(async () => {
    console.log("👍 CEO APPROVING TRANSACTION (UI) 👍");

    const browser = await chromium.launch({ headless: true });
    // Increase viewport to ensures elements visible
    const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);

    try {
        // 1. LOGIN CEO
        console.log("🔐 Logging in as CEO...");
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'tariq@oceanpearlseafood.com', { force: true });
        await page.fill('input[type="password"]', 'OceanPearl2026!', { force: true });
        await page.click('button:has-text("Sign In")', { force: true });
        await page.waitForTimeout(8000);

        // 2. NAVIGATE TO APPROVALS
        // CEO might need to switch context to Kaimana to seeing Kaimana approvals?
        // OR HQ sees all?
        // Let's try Global view first.
        // Navigate to /treasury/approvals or just /approvals if shortcut exists.
        // Checking Dashboard for "Approvals" card.

        console.log("   Looking for Approvals...");
        const approvalsCard = page.locator('div:has-text("Approvals")').first();
        if (await approvalsCard.count() > 0) {
            console.log("   Clicking Approvals Card...");
            await approvalsCard.click({ force: true });
        } else {
            console.log("   Navigating manually to /treasury...");
            await page.goto('https://oceanpearl-ops.web.app/treasury');
        }
        await page.waitForTimeout(5000);

        // Look for our specific transaction (Amount 3,000,000)
        // Or any 'Approve' button.
        await page.screenshot({ path: 'd:/OPS/day1_approval_list.png' });

        const approveBtn = page.locator('button:has-text("Approve")').first();
        if (await approveBtn.count() > 0) {
            console.log("✅ Found Approval Request. Clicking Approve...");
            await approveBtn.click({ force: true });

            // Confirm Modal if exists
            await page.waitForTimeout(1000);
            const confirmBtn = page.locator('button:has-text("Confirm")');
            if (await confirmBtn.isVisible()) {
                await confirmBtn.click({ force: true });
            }

            await page.waitForTimeout(5000);
            console.log("✅ Transaction Approved.");
            await page.screenshot({ path: 'd:/OPS/day1_approval_success.png' });

        } else {
            console.log("⚠️ No pending approvals found in current view.");
            // Maybe we need to switch to Kaimana?
            console.log("   Switching to Kaimana to check...");
            await page.locator('nav select').first().selectOption({ label: 'Kaimana' }, { force: true });
            // Handle switch modal
            await page.waitForTimeout(1000);
            if (await page.locator('div.fixed').count() > 0) {
                await page.locator('button:has-text("Confirm")').click({ force: true }).catch(() => { });
            }
            await page.waitForTimeout(5000);
            console.log("   Checking Kaimana View...");
            // Look for approve again
            const approveBtn2 = page.locator('button:has-text("Approve")').first();
            if (await approveBtn2.count() > 0) {
                console.log("✅ Found Approval in Kaimana. Clicking Approve...");
                await approveBtn2.click({ force: true });
                await page.waitForTimeout(5000);
                console.log("✅ Transaction Approved in Kaimana.");
            } else {
                console.log("❌ Still no approvals found.");
                await page.screenshot({ path: 'd:/OPS/day1_approval_fail.png' });
            }
        }

    } catch (e) {
        console.error("❌ ERROR:", e);
        await page.screenshot({ path: 'd:/OPS/day1_approval_error.png' });
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
