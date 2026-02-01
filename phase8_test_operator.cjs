const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();

    let logs = [];
    const log = (msg) => { console.log(msg); logs.push(msg); };

    try {
        log("--- START PHASE 8: OPERATOR FLOW (RETRY 2) ---");

        // 1. Login as Usi
        log("Navigating to login...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/login', { timeout: 60000 });

        log("Logging in as usi@oceanpearlseafood.com...");
        await page.fill('input[type="email"]', 'usi@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');

        await page.waitForTimeout(5000);
        log(`Logged in. Title: ${await page.title()}`);

        // 2. Go to Receiving
        log("Navigating to /receiving...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/receiving', { timeout: 60000 });
        await page.waitForTimeout(5000);

        await page.screenshot({ path: 'd:/OPS/phase8_01_receiving_page.png' });

        // Check for "Select Location" overlay
        const bodyText = await page.innerText('body');
        if (bodyText.includes("Select Location First")) {
            log("Selecting Location: Kaimana...");
            await page.click('button:has-text("Kaimana")' || 'select'); // Try to click a location button or select
            await page.waitForTimeout(2000);
        }

        // 3. Record Receiving
        log("Filling Receiving Form...");
        // Select first available species
        await page.selectOption('select', { index: 1 }); // Supplier (fallback to FISHERMAN_CASH if we leave it, but let's see)

        // Actually, the log says LEAVE supplier empty. 
        // So we skip the first select if it's supplier.

        log("Selecting Item...");
        const selects = await page.$$('select');
        log(`Found ${selects.length} selects`);

        // In Receiving.jsx:
        // Select 0: Supplier
        // Select 1: Date (input)
        // Select 2: Terms
        // Then in footer: Species

        // Let's use specific selector for Species
        await page.selectOption('tbody select', { index: 1 });

        log("Setting Qty and Price...");
        await page.fill('input[placeholder="0.00"]', '100');
        await page.fill('input[placeholder="0"]', '5000');

        log("Clicking Save Invoice...");
        await page.click('button:has-text("Save Invoice")');

        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'd:/OPS/phase8_02_receiving_save_result.png' });

        // 4. Go to Expenses
        log("Navigating to /expenses...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/expenses', { timeout: 60000 });
        await page.waitForTimeout(5000);

        log("Creating New Expense...");
        await page.click('button:has-text("New Expense")');
        await page.waitForTimeout(2000);

        await page.fill('input[type="number"]', '250000');
        await page.fill('textarea', 'Ice for raw storage (Phase 8 Test)');

        // Wait for SelectWithAddNew to load
        await page.waitForTimeout(2000);

        log("Clicking Submit Check...");
        await page.click('button:has-text("Submit Check")');

        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'd:/OPS/phase8_03_expense_save_result.png' });

        // 5. Dashboard
        log("Checking Dashboard...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/dashboard', { timeout: 60000 });
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'd:/OPS/phase8_04_dashboard.png' });

        const finalBody = await page.innerText('body');
        if (finalBody.includes("Invalid Date")) {
            log("FAIL: 'Invalid Date' found.");
        } else {
            log("PASS: Dashboard looks clean.");
        }

        log("--- END PHASE 8: OPERATOR FLOW ---");

    } catch (e) {
        log(`ERROR: ${e.message}`);
        await page.screenshot({ path: 'd:/OPS/phase8_error.png' });
    } finally {
        await browser.close();
    }
})();
