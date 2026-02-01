const { chromium } = require('playwright');

(async () => {
    console.log("🐟 OPERATOR SIMULATION (Attempt 2 - Correct Password) 🐟");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
    const page = await context.newPage();
    page.setDefaultTimeout(90000);

    try {
        // 1. LOGIN
        console.log("🔐 Logging in as Susi...");
        await page.goto('https://oceanpearl-ops.web.app/login');

        // Correct Password from Creation Step
        await page.fill('input[type="email"]', 'susi@oceanpearl.com', { force: true });
        await page.fill('input[type="password"]', 'Password123!', { force: true });
        await page.click('button:has-text("Sign In")', { force: true });

        // Wait for Navigation confirming login
        await page.waitForTimeout(5000);
        await page.waitForURL('**/command**', { timeout: 15000 }).catch(() => console.log("   URL did not change to /command auto-redirect?"));

        // Handle potential Modal (Operator Context)
        const handleModal = async () => {
            const modal = page.locator('div.fixed h3:has-text("Switch Logic")');
            if (await modal.isVisible()) {
                console.log("⚠️ Switch Logic Modal Detected! Dismissing (Confirming or Cancel?)...");
                // For operator, we might need to CONFIRM the context?
                // But Cancel should keep us in default (Kaimana/Gudang).
                // Let's click "Confirm" if it exists, otherwise Cancel?
                // Actually, if we created user with Unit, it shouldn't switch.
                // It might just say "Welcome to Kaimana".
                // I'll dismiss.
                await page.locator('button:has-text("Cancel")').click({ force: true });
                await page.waitForTimeout(1000);
            }
        };
        await handleModal();

        // 2. VERIFY DASHBOARD
        const title = await page.title();
        console.log(`✅ Page Title: ${title}`);
        await page.screenshot({ path: 'd:/OPS/day1_susi_01_dashboard_v2.png' });

        // If not on command center, go there
        if (!page.url().includes('command')) {
            console.log("🏭 Navigating to Command Center...");
            await page.goto('https://oceanpearl-ops.web.app/command');
            await page.waitForTimeout(8000);
        }

        // 3. PURCHASE INTERACTION
        console.log("🛒 Looking for Transaction Controls...");

        // Dump buttons for debug
        // const buttons = await page.locator('button').allInnerTexts();
        // console.log("   Buttons on page:", buttons);

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
                await page.screenshot({ path: 'd:/OPS/day1_susi_nobuttons.png' });
                throw new Error("Cannot find transaction entry point");
            }
        }

        await page.waitForSelector('div.fixed', { timeout: 10000 }); // Wait for Modal
        console.log("   Modal Opened.");

        // 4. FILL TRANSACTION (JS Injection for reliability)
        // Supplier: "Nelayan A"
        // Item: "Yellowfin Tuna" (or similar)
        // Qty: 50
        // Price: 60000

        // Target Inputs inside Modal
        const modal = page.locator('div.fixed');

        // Supplier & Item (Selects or Inputs?)
        // Let's assume Inputs/Autocompletes based on "Material UI" or "Tailwind UI" styles often using inputs.
        // But if previous analysis said "Select", we try both.

        console.log("   Filling Form...");

        // Supplier
        // Try filling input first
        const inputs = modal.locator('input');
        const supplierInput = inputs.nth(0); // Assuming order is Supplier, Item...
        await supplierInput.fill('Nelayan A', { force: true });
        // Handle autocomplete dropdown if appears
        await page.waitForTimeout(500);
        if (await page.locator('div[role="option"]').count() > 0) {
            await page.locator('div[role="option"]').first().click();
        }

        // Item
        // If it's a select?
        const selects = modal.locator('select');
        if (await selects.count() > 0) {
            console.log("   Selecting Item via Dropdown...");
            // Try to find Tuna
            await selects.first().evaluate(s => {
                const opt = Array.from(s.options).find(o => o.text.toLowerCase().includes('tuna'));
                if (opt) s.value = opt.value;
                s.dispatchEvent(new Event('change', { bubbles: true }));
            });
        }

        // Qty & Price
        // Locate by placeholder or type
        await modal.locator('input[placeholder*="Qty"]').fill('50', { force: true }).catch(() => modal.locator('input[type="number"]').nth(0).fill('50'));
        await modal.locator('input[placeholder*="Price"]').fill('60000', { force: true }).catch(() => modal.locator('input[type="number"]').nth(1).fill('60000'));

        // Submit
        console.log("   Submitting...");
        await modal.locator('button[type="submit"]').click({ force: true });

        await page.waitForTimeout(5000);
        console.log("✅ Purchase Transaction Submitted.");
        await page.screenshot({ path: 'd:/OPS/day1_susi_02_purchase_done_v2.png' });

        console.log("SUCCESS: Operator Simulation Complete");

    } catch (e) {
        console.error("❌ ERROR:", e);
        await page.screenshot({ path: 'd:/OPS/day1_susi_error_v2.png' });
        process.exit(1);
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
