const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();

    console.log("--- HUMAN QA: SCENARIO 1 (OPERATOR KAIMANA) ---");
    try {
        // 1. LOGIN
        console.log("Step: Login as Operator");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/login', { timeout: 60000 });
        await page.fill('input[type="email"]', 'operator_kaimana@ops.com');
        await page.fill('input[type="password"]', 'OpsTeri2026!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'd:/OPS/qa_human_01_op_login.png' });
        console.log(`Current URL after login: ${page.url()}`);

        // 2. RECEIVE FISH (With Supplier)
        console.log("Step: Receive Fish (With Supplier)");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/receiving', { timeout: 60000 });
        await page.waitForTimeout(5000);

        // Select Supplier
        await page.locator('select').first().selectOption({ index: 1 });
        // Select Species
        await page.locator('tbody tr:first-child select').first().selectOption({ index: 1 });
        await page.fill('tbody tr:first-child input[placeholder="0.00"]', '20'); // 20 kg
        await page.fill('tbody tr:first-child input[placeholder="0"]', '6000'); // 6k/kg
        await page.screenshot({ path: 'd:/OPS/qa_human_02_receive_with_supplier.png' });
        await page.click('button:has-text("Save Invoice")');
        await page.waitForTimeout(4000);

        // 3. RECEIVE FISH (Without Supplier - Fallback test)
        console.log("Step: Receive Fish (Without Supplier)");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/receiving', { timeout: 60000 });
        await page.waitForTimeout(5000);
        await page.locator('tbody tr:first-child select').first().selectOption({ index: 1 });
        await page.fill('tbody tr:first-child input[placeholder="0.00"]', '15'); // 15 kg
        await page.fill('tbody tr:first-child input[placeholder="0"]', '5500'); // 5.5k/kg
        await page.screenshot({ path: 'd:/OPS/qa_human_03_receive_no_supplier.png' });
        await page.click('button:has-text("Save Invoice")');
        await page.waitForTimeout(4000);

        // 4. SUBMIT EXPENSE
        console.log("Step: Submit Expense (Fuel)");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/expenses', { timeout: 60000 });
        await page.waitForTimeout(5000);
        await page.click('button:has-text("New Expense")');
        await page.waitForTimeout(2000);
        await page.fill('input[type="number"]', '300000');
        await page.fill('textarea', 'Fuel for logistics boat');

        const typeSel = page.locator('select').nth(2);
        await typeSel.selectOption({ index: 1 }); // Fuel
        await page.locator('select').nth(3).selectOption({ index: 1 }); // Vendor

        console.log("Verifying dropdown retention...");
        const val = await typeSel.inputValue();
        if (val) console.log("Dropdown retention: PASS");
        else console.log("Dropdown retention: FAIL (Selection lost)");

        await page.screenshot({ path: 'd:/OPS/qa_human_04_expense_form.png' });
        await page.click('button:has-text("Submit Check")');
        await page.waitForTimeout(4000);
        await page.screenshot({ path: 'd:/OPS/qa_human_05_expense_result.png' });

        // 5. PRODUCTION RUN
        console.log("Step: Production Run");
        // Navigation might be dynamic, check dashboard link
        await page.goto('https://oceanpearl-ops.firebaseapp.com/', { timeout: 60000 });
        await page.waitForTimeout(3000);
        await page.click('button:has-text("Production Run")');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'd:/OPS/qa_human_06_prod_run_start.png' });

        // Select Source Raw (should show Anchovy)
        await page.locator('select').first().selectOption({ index: 1 });
        await page.fill('input[placeholder="0.0"]', '50'); // Consume 50kg

        // Add output line
        await page.click('button:has-text("Add Output Line")');
        await page.locator('tbody tr:first-child select').first().selectOption({ index: 1 }); // Dried
        await page.fill('tbody tr:first-child input[placeholder="0.0"]', '20'); // Output 20kg

        await page.screenshot({ path: 'd:/OPS/qa_human_07_prod_run_filled.png' });
        await page.click('button:has-text("Save Run")');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'd:/OPS/qa_human_08_prod_run_result.png' });

        console.log("Step: Verify Remaining Stock on Dashboard");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/', { timeout: 60000 });
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'd:/OPS/qa_human_09_dashboard_stock.png' });

        console.log("MISSION SCENARIO 1: COMPLETE");

    } catch (e) {
        console.error("MISSION SCENARIO 1 FAILED:", e.message);
        await page.screenshot({ path: 'd:/OPS/qa_human_error.png' });
    } finally {
        await browser.close();
    }
})();
