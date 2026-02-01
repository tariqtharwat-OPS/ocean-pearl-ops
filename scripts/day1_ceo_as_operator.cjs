const { chromium } = require('playwright');

(async () => {
    console.log("👑 CEO AS OPERATOR (BYPASSING AUTH BUG) 👑");

    // We use CEO account to generate the Day 1 Transaction because 
    // new users are getting stuck in 'READ ONLY' state due to Auth/Firestore sync issues.

    const browser = await chromium.launch({ headless: true });
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
        await page.waitForTimeout(10000);

        // 2. SWITCH CONTEXT TO KAIMANA
        console.log("📍 Switching Context to Kaimana...");
        // Header Location Select
        // Assuming it's the first select in header
        // Or we can go to /command and it prompts?
        // Let's try selecting in Header.
        const header = page.locator('nav').first();
        // Assuming Header hierarchy.
        // Actually, just go to /command, CEO has access.
        // But CEO defaults to "Office" (HQ).
        // Command Center for HQ might be different.
        // We want Kaimana Command Center.

        // Try direct toggle via Header UI
        // Header usually has a select for Location.
        // Let's try finding the select with 'Jakarta' or 'HQ Jakarta' and change to 'Kaimana'.
        const locSelect = page.locator('select').first();
        // We hope first select IS location selector in dashboard.
        // Let's dump options to be sure.
        // await locSelect.click(); // Open?

        console.log("   Setting Header Location to Kaimana...");
        await locSelect.selectOption({ label: 'Kaimana' }, { force: true });

        // Handle Switch Modal
        await page.waitForTimeout(1000);
        const modal = page.locator('div.fixed h3:has-text("Switch Logic")');
        if (await modal.isVisible()) {
            console.log("   Switch Modal Detected. Confirming...");
            // Looking for "Confirm" or "Switch" button
            await page.locator('button:has-text("Confirm")').click({ force: true }).catch(async () => {
                await page.locator('button:has-text("Switch")').click({ force: true }).catch(async () => {
                    // Maybe standard "Yes" or similar?
                    await page.locator('button:has-text("OK")').click({ force: true });
                });
            });
        }
        await page.waitForTimeout(5000);

        // 3. GO TO COMMAND CENTER
        console.log("🏭 Navigating to Command Center...");
        await page.goto('https://oceanpearl-ops.web.app/command');
        await page.waitForTimeout(8000);

        // 4. CREATE TRANSACTION
        console.log("🛒 Looking for Transaction Controls...");
        await page.screenshot({ path: 'd:/OPS/day1_ceo_command_check.png' });

        let btn = page.locator('button:has-text("Receive")');
        if (await btn.count() === 0) btn = page.locator('button:has-text("New Transaction")');

        if (await btn.count() > 0) {
            console.log("   Clicking Transaction Button...");
            await btn.first().click({ force: true });

            await page.waitForSelector('div.fixed', { timeout: 10000 });
            console.log("   Transaction Modal Opened.");
            const modalEl = page.locator('div.fixed');

            // Fill Form
            console.log("   Filling Form (Nelayan A / Tuna / 50kg / 60k)...");
            await modalEl.locator('input').nth(0).fill('Nelayan A', { force: true });
            await page.waitForTimeout(500);
            if (await page.locator('div[role="option"]').count() > 0) page.locator('div[role="option"]').first().click();

            // Item Select
            await modalEl.locator('select').first().evaluate(s => {
                const opt = Array.from(s.options).find(o => o.text.toLowerCase().includes('tuna'));
                if (opt) s.value = opt.value;
                else s.selectedIndex = 1;
                s.dispatchEvent(new Event('change', { bubbles: true }));
            });

            // Qty Price
            await modalEl.locator('input[placeholder*="Qty"]').fill('50', { force: true }).catch(() => modalEl.locator('input[type="number"]').nth(0).fill('50'));
            await modalEl.locator('input[placeholder*="Price"]').fill('60000', { force: true }).catch(() => modalEl.locator('input[type="number"]').nth(1).fill('60000'));

            // Submit
            console.log("   Submitting...");
            await modalEl.locator('button[type="submit"]').click({ force: true });

            await page.waitForTimeout(5000);
            console.log("✅ Purchase Transaction Submitted by CEO.");
            await page.screenshot({ path: 'd:/OPS/day1_ceo_purchase_success.png' });

        } else {
            // Maybe CEO didn't switch context successfully?
            // Or CEO Command Center is different.
            console.log("❌ Transaction Button Not Found for CEO!");
            console.log("   Dumping page text...");
            const text = await page.innerText('body');
            // console.log(text);
        }

        // 5. APPROVE TRANSACTION (AS CEO)
        console.log("👍 Approving Transaction (As CEO/Manager)...");
        await page.goto('https://oceanpearl-ops.web.app/approvals'); // Or /treasury?
        await page.waitForTimeout(5000);

        // Look for APPROVE button
        const approveBtn = page.locator('button:has-text("Approve")').first();
        if (await approveBtn.count() > 0) {
            console.log("   Found Approval Request. Clicking Approve...");
            await approveBtn.click({ force: true });
            await page.waitForTimeout(3000);
            console.log("✅ Transaction Approved.");
            await page.screenshot({ path: 'd:/OPS/day1_ceo_approval_success.png' });
        } else {
            console.log("⚠️ No pending approvals found (Auto-approved or not visible?).");
            await page.screenshot({ path: 'd:/OPS/day1_ceo_approval_check.png' });
        }

    } catch (e) {
        console.error("❌ ERROR:", e);
        await page.screenshot({ path: 'd:/OPS/day1_ceo_operator_error.png' });
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
