const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();

    console.log("--- QA OPERATOR SCENARIO: KAIMANA ---");
    try {
        console.log("Steps: 1. Login as Operator");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/login', { timeout: 60000 });
        await page.fill('input[type="email"]', 'operator_kaimana@ops.com');
        await page.fill('input[type="password"]', 'OpsTeri2026!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'd:/OPS/qa_01_op_login.png' });

        // 2. Receive Fish
        console.log("Steps: 2. Navigate to Receiving");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/receiving', { timeout: 60000 });
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'd:/OPS/qa_02_op_receiving.png' });

        console.log("Steps: 3. Fill Receiving Form (Without Supplier)");
        // Select species from first row
        const speciesSelect = page.locator('tbody tr:first-child select').first();
        await speciesSelect.selectOption({ index: 1 });
        await page.fill('tbody tr:first-child input[placeholder="0.00"]', '10.5'); // 10.5 kg
        await page.fill('tbody tr:first-child input[placeholder="0"]', '5000');   // 5000 / kg
        await page.screenshot({ path: 'd:/OPS/qa_03_op_receiving_filled.png' });

        console.log("Steps: 4. Submit Receiving");
        await page.click('button:has-text("Save Invoice")');
        await page.waitForTimeout(4000);
        await page.screenshot({ path: 'd:/OPS/qa_04_op_receiving_result.png' });

        // 3. Submit Expense
        console.log("Steps: 5. Navigate to Expenses");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/expenses', { timeout: 60000 });
        await page.waitForTimeout(5000);
        await page.click('button:has-text("New Expense")');
        await page.waitForTimeout(2000);

        console.log("Steps: 6. Fill Expense Form");
        await page.fill('input[type="number"]', '150000');
        await page.fill('textarea', 'Fuel for Boat (QA Test)');

        // Select Type
        const typeSelect = page.locator('select').nth(2);
        await typeSelect.selectOption({ index: 1 });
        const typeValueBefore = await typeSelect.inputValue();

        // Select Vendor
        const vendorSelect = page.locator('select').nth(3);
        await vendorSelect.selectOption({ index: 1 });

        console.log("Steps: 7. Verify dropdowns retain selection");
        const typeValueAfter = await typeSelect.inputValue();
        if (typeValueBefore === typeValueAfter) console.log("Dropdown check: PASS");
        else console.log(`Dropdown check: FAIL (Before: ${typeValueBefore}, After: ${typeValueAfter})`);

        await page.screenshot({ path: 'd:/OPS/qa_05_op_expense_modal.png' });

        console.log("Steps: 8. Submit Expense");
        await page.click('button:has-text("Submit Check")');
        await page.waitForTimeout(4000);
        await page.screenshot({ path: 'd:/OPS/qa_06_op_expense_result.png' });

        // 4. Run Production
        console.log("Steps: 9. Navigate to Production");
        // /production or /cold-storage? Let's check based on dashboard buttons
        await page.goto('https://oceanpearl-ops.firebaseapp.com/', { timeout: 60000 });
        await page.waitForTimeout(3000);
        const prodBtn = page.locator('button:has-text("Production Run"), button:has-text("Storage")');
        if (await prodBtn.isVisible()) {
            await prodBtn.click();
        } else {
            await page.goto('https://oceanpearl-ops.firebaseapp.com/production');
        }
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'd:/OPS/qa_07_op_production.png' });

        console.log("QA OPERATOR SCENARIO COMPLETE.");

    } catch (e) {
        console.error("QA FAILURE:", e.message);
        await page.screenshot({ path: 'd:/OPS/qa_error_op.png' });
    } finally {
        await browser.close();
    }
})();
