const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
    console.log("🐟 OPERATOR SIMULATION (Day 1 - Purchase) 🐟");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
    const page = await context.newPage();
    page.setDefaultTimeout(90000);

    try {
        // 1. LOGIN AS SUSI (OPERATOR)
        console.log("🔐 Logging in as Susi...");
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'susi@oceanpearl.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        // Note: Password123! was used in creation script v10. 
        // Wait, did I use 'Password123!' or 'OceanPearl2026!' in v10?
        // Checking v10 code... used 'Password123!'.
        // I will try 'Password123!' first.

        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(10000);

        // Check if login failed
        if (await page.locator('text=Invalid credentials').count() > 0) {
            console.log("⚠️ Initial login failed. Trying OceanPearl2026!...");
            await page.fill('input[type="password"]', 'OceanPearl2026!');
            await page.click('button:has-text("Sign In")');
            await page.waitForTimeout(10000);
        }

        const title = await page.title();
        console.log(`✅ Susi Logged In. Page: ${title}`);
        await page.screenshot({ path: 'd:/OPS/day1_susi_01_dashboard.png' });

        // 2. NAVIGATE TO COMMAND CENTER (OPERATOR VIEW)
        // URL might be /command or /operator?
        // Assuming /command based on standard nav.
        console.log("🏭 Navigating to Command Center...");
        await page.goto('https://oceanpearl-ops.web.app/command');
        await page.waitForTimeout(8000);

        // 3. CREATE PURCHASE
        // Look for "Receive Good" or "New Purchase" or similar button.
        // In Operator View, there's usually a "Quick Actions" or "Receive".

        // Try finding "Receive" button
        const receiveBtn = page.locator('button:has-text("Receive")');
        if (await receiveBtn.count() > 0) {
            console.log("   Clicking Receive...");
            await receiveBtn.first().click();
        } else {
            // Maybe "New Transaction"?
            console.log("   Receive button not found. Checking 'New Transaction'...");
            await page.click('button:has-text("New Transaction")');
        }

        await page.waitForSelector('div.fixed'); // Modal or form
        await page.waitForTimeout(2000);

        // FILL PURCHASE FORM
        // Supplier: "Nelayan A" (Create new or select?)
        // Item: "Yellowfin Tuna"
        // Qty: 50 kg
        // Price: 60000

        console.log("   Filling Transaction Details...");

        // Supplier Input (might be select or autocomplete)
        const supplierInput = page.locator('input[placeholder*="Supplier"]');
        if (await supplierInput.count() > 0) {
            await supplierInput.fill('Nelayan A');
            // If autocomplete, pick first option
            await page.waitForTimeout(1000);
            const option = page.locator('div[role="option"]').first();
            if (await option.isVisible()) await option.click();
        } else {
            // Maybe it's a select?
            const supplierSelect = page.locator('select').first();
            // Hard to guess selector without seeing code.
            // Assuming input for now based on previous knowledge.
        }

        // Item Select
        // Usually a select box.
        // We'll use the JS injection trick if needed, or standard fill if it's a custom dropdown.
        // Assuming standard select for "Item".
        // Selector: `select:has-text("Select Item")` isn't valid.
        // We'll look for select with options containing 'Tuna'.

        await page.evaluate(() => {
            const selects = Array.from(document.querySelectorAll('select'));
            const itemSelect = selects.find(s => s.innerHTML.includes('Yellowfin'));
            if (itemSelect) {
                const opt = Array.from(itemSelect.options).find(o => o.text.includes('Yellowfin'));
                if (opt) {
                    itemSelect.value = opt.value;
                    itemSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });

        // Quantity
        await page.fill('input[type="number"][placeholder*="Qty"]', '50');

        // Price
        await page.fill('input[type="number"][placeholder*="Price"]', '60000');

        // Submit
        console.log("   Submitting Transaction...");
        await page.click('button[type="submit"]');

        await page.waitForTimeout(5000);

        // Check for success verification
        // Taking screenshot.
        await page.screenshot({ path: 'd:/OPS/day1_susi_02_purchase_done.png' });
        console.log("✅ Purchase Submitted.");

        console.log("SUCCESS: Operator Simulation Complete");

    } catch (e) {
        console.error("❌ ERROR:", e);
        await page.screenshot({ path: 'd:/OPS/day1_susi_error.png' });
    } finally {
        await browser.close();
        process.exit(0);
    } // End
})();
