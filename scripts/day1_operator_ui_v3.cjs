const { chromium } = require('playwright');

(async () => {
    console.log("🐟 OPERATOR SIMULATION (Attempt 3 - ALIAS EMAIL) 🐟");

    // Config
    const LOGIN_EMAIL = 'susi.sim@oceanpearl.com';
    const LOGIN_PASS = 'Password123!';

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
    const page = await context.newPage();
    page.setDefaultTimeout(90000);

    try {
        // 1. LOGIN
        console.log(`🔐 Logging in as ${LOGIN_EMAIL}...`);
        await page.goto('https://oceanpearl-ops.web.app/login');

        await page.fill('input[type="email"]', LOGIN_EMAIL, { force: true });
        await page.fill('input[type="password"]', LOGIN_PASS, { force: true });
        await page.click('button:has-text("Sign In")', { force: true });

        // Wait for Navigation confirming login
        await page.waitForTimeout(5000);
        await page.waitForURL('**/command**', { timeout: 15000 }).catch(() => console.log("   URL did not change to /command auto-redirect?"));

        // Handle Modal
        const handleModal = async () => {
            const modal = page.locator('div.fixed h3:has-text("Switch Logic")');
            if (await modal.isVisible()) {
                console.log("⚠️ Switch Logic Modal... Dismissing.");
                await page.locator('button:has-text("Cancel")').click({ force: true });
                await page.waitForTimeout(1000);
            }
        };
        await handleModal();

        // 2. VERIFY DASHBOARD
        const title = await page.title();
        console.log(`✅ Page Title: ${title}`);
        await page.screenshot({ path: 'd:/OPS/day1_susi_01_dashboard_v3.png' });

        // If not on command center, go there
        if (!page.url().includes('command')) {
            console.log("🏭 Navigating to Command Center...");
            await page.goto('https://oceanpearl-ops.web.app/command');
            await page.waitForTimeout(8000);
        }

        // 3. PURCHASE INTERACTION
        console.log("🛒 Looking for Transaction Controls...");

        // Try "Receive" (Standard Inbound)
        const receiveBtn = page.locator('button:has-text("Receive")');
        if (await receiveBtn.count() > 0) {
            console.log("   Clicking Receive...");
            await receiveBtn.first().click({ force: true });
        } else {
            console.log("   'Receive' not found. Looking for 'New Transaction'...");
            const newTxBtn = page.locator('button:has-text("New Transaction")');
            if (await newTxBtn.count() > 0) {
                await newTxBtn.click({ force: true });
            } else {
                console.log("❌ No transaction buttons found. Dumping page...");
                await page.screenshot({ path: 'd:/OPS/day1_susi_nobuttons_v3.png' });
                throw new Error("Cannot find transaction entry point");
            }
        }

        await page.waitForSelector('div.fixed', { timeout: 10000 }); // Wait for Modal
        console.log("   Modal Opened.");

        // 4. FILL TRANSACTION
        // Supplier: "Nelayan A"
        // Item: "Yellowfin Tuna" (Need to select correctly)
        // Qty: 50
        // Price: 60000

        const modal = page.locator('div.fixed');
        console.log("   Filling Form...");

        // Supplier Input
        await modal.locator('input').nth(0).fill('Nelayan A', { force: true });
        // Handle autocomplete
        await page.waitForTimeout(500);
        if (await page.locator('div[role="option"]').count() > 0) {
            await page.locator('div[role="option"]').first().click();
        }

        // Item Select (Using Hack)
        console.log("   Selecting Item...");
        await modal.locator('select').first().evaluate(s => {
            // Find Tuna option
            const opt = Array.from(s.options).find(o => o.text.toLowerCase().includes('tuna') || o.value.includes('tuna'));
            if (opt) s.value = opt.value;
            else s.selectedIndex = 1; // Fallback to first item if Tuna not found
            s.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Qty & Price
        await modal.locator('input[placeholder*="Qty"]').fill('50', { force: true }).catch(() => modal.locator('input[type="number"]').nth(0).fill('50'));
        await modal.locator('input[placeholder*="Price"]').fill('60000', { force: true }).catch(() => modal.locator('input[type="number"]').nth(1).fill('60000'));

        // Submit
        console.log("   Submitting...");
        await modal.locator('button[type="submit"]').click({ force: true });

        await page.waitForTimeout(5000);
        console.log("✅ Purchase Transaction Submitted.");
        await page.screenshot({ path: 'd:/OPS/day1_susi_02_purchase_done_v3.png' });

        console.log("SUCCESS: Operator Simulation Complete (V3)");

    } catch (e) {
        console.error("❌ ERROR:", e);
        await page.screenshot({ path: 'd:/OPS/day1_susi_error_v3.png' });
        process.exit(1);
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
