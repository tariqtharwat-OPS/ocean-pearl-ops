const { chromium } = require('playwright');
const fs = require('fs');

async function expertCheck() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();

    const results = {
        operator: {},
        manager: {},
        ceo: {},
        shark: {}
    };

    try {
        console.log("--- STARTING EXPERT OPERATIONAL AUDIT ---");

        // SCENARIO A: RECEIVING (OPERATOR)
        console.log("Scenario A: Operator Mindset Check");
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'operator_kaimana@ops.com');
        await page.fill('input[type="password"]', 'OpsTeri2026!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);

        await page.goto('https://oceanpearl-ops.web.app/receiving');
        await page.waitForTimeout(3000);
        results.operator.pageLoad = await page.title();

        // Check dropdowns
        const supplierOptions = await page.locator('select').first().innerText();
        results.operator.suppliers = supplierOptions.split('\n').filter(t => t.trim().length > 0);

        // Record a complex receipt
        await page.locator('select').first().selectOption({ index: 1 });
        await page.locator('tbody tr:first-child select').first().selectOption({ index: 1 });
        await page.fill('tbody tr:first-child input[placeholder="0.00"]', '125.75'); // High precision test
        await page.fill('tbody tr:first-child input[placeholder="0"]', '45000');

        // Add second row
        await page.click('button:has-text("Add Line Item")');
        await page.locator('tbody tr:nth-child(2) select').first().selectOption({ index: 2 });
        await page.fill('tbody tr:nth-child(2) input[placeholder="0.00"]', '82.5');
        await page.fill('tbody tr:nth-child(2) input[placeholder="0"]', '38000');

        results.operator.grandTotal = await page.locator('tfoot tr td').nth(3).innerText();
        await page.screenshot({ path: 'd:/OPS/eval_operator_receiving.png' });
        await page.click('button:has-text("Save Invoice")');
        await page.waitForTimeout(5000);

        // Expense check
        await page.goto('https://oceanpearl-ops.web.app/expenses');
        await page.waitForTimeout(3000);
        await page.click('button:has-text("New Expense")');
        await page.fill('input[placeholder="0"]', '250000');
        await page.locator('select').first().selectOption({ label: 'Ice' });
        await page.fill('textarea', 'Expert Test: Ice purchase for quality maintenance');
        await page.click('button:has-text("Submit")');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'd:/OPS/eval_operator_expense.png' });

        // Logout
        await page.click('button[title="Logout"]');
        await page.waitForTimeout(2000);

        // SCENARIO B & C: MANAGER & FINANCE
        console.log("Scenario B/C: Manager & Finance Check");
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'manager_kaimana@ops.com');
        await page.fill('input[type="password"]', 'OpsKaimana2026!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);

        await page.goto('https://oceanpearl-ops.web.app/expenses');
        await page.waitForTimeout(3000);
        results.manager.pendingApprovals = await page.locator('button:has-text("Approve")').count();
        await page.screenshot({ path: 'd:/OPS/eval_manager_approval.png' });

        // Approve
        if (results.manager.pendingApprovals > 0) {
            await page.click('button:has-text("Approve")');
            await page.waitForTimeout(3000);
        }

        // Wallet check
        await page.goto('https://oceanpearl-ops.web.app/treasury'); // Wait, is it treasury or dashboard?
        // Layout shows "Treasury" or "Command Central"?
        // Let's check Dashboard KPIs
        await page.goto('https://oceanpearl-ops.web.app/');
        await page.waitForTimeout(5000);
        results.manager.kpis = await page.locator('.grid').first().innerText();
        await page.screenshot({ path: 'd:/OPS/eval_manager_kpis.png' });

        await page.click('button[title="Logout"]');

        // SCENARIO D: CEO DASHBOARD
        console.log("Scenario D: CEO Strategic Check");
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'tariq@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);

        // Test Context Switch
        await page.selectOption('select', { label: 'Saumlaki' }); // Saumlaki has processing
        await page.waitForTimeout(3000);
        results.ceo.saumlakiContext = await page.textContent('body');
        await page.screenshot({ path: 'd:/OPS/eval_ceo_saumlaki.png' });

        // Shark AI interaction
        console.log("Testing Shark AI Brain...");
        await page.click('button[title="Shark AI"]'); // Assuming there's a button or it's visible
        await page.waitForTimeout(2000);
        await page.fill('textarea[placeholder*="Ask Shark"]', "What is the cash flow risk in Kaimana for February?");
        await page.keyboard.press('Enter');
        await page.waitForTimeout(10000); // AI needs time
        results.shark.response = await page.locator('.shark-response, .chat-bubble').last().innerText();
        await page.screenshot({ path: 'd:/OPS/eval_shark_ai.png' });

    } catch (e) {
        console.error("EXPERT AUDIT FAILED:", e.message);
    } finally {
        await browser.close();
        console.log("AUDIT DATA CAPTURED.");
        console.log(JSON.stringify(results, null, 2));
    }
}

expertCheck();
