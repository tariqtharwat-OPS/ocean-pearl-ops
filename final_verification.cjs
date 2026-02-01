const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();

    console.log("--- PHASE 8: FINAL PRODUCTION VERIFICATION ---");
    try {
        // 1. OPERATOR
        console.log("Testing Operator (Ibu Usi)...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/login', { timeout: 60000 });
        await page.fill('input[type="email"]', 'usi@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'd:/OPS/final_01_operator_dashboard.png' });

        // 2. MANAGER
        console.log("Testing Manager (Pak Budi)...");
        await page.click('button[title="Logout"], button:has-text("Logout"), [aria-label="Logout"], .lucide-log-out');
        // If logout is just an icon in top bar, let's try direct navigation to login
        await page.goto('https://oceanpearl-ops.firebaseapp.com/login');
        await page.fill('input[type="email"]', 'budi@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'd:/OPS/final_02_manager_dashboard.png' });

        // 3. CEO
        console.log("Testing CEO (Tariq)...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/login');
        await page.fill('input[type="email"]', 'tariq@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'd:/OPS/final_03_ceo_global.png' });

        console.log("CEO Switching Context...");
        await page.selectOption('header select', 'kaimana');
        await page.waitForTimeout(1000);
        await page.selectOption('header select:nth-child(2)', 'gudang_ikan_teri');
        await page.waitForTimeout(1000);
        await page.click('button:has-text("Confirm Switch")');
        await page.waitForTimeout(6000);

        await page.screenshot({ path: 'd:/OPS/final_04_ceo_kaimana_context.png' });

        console.log("Checking CEO Wallet Context...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/wallet');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'd:/OPS/final_05_ceo_wallet_check.png' });

        console.log("Verification Complete.");

    } catch (e) {
        console.error("VERIFICATION FAILED:", e.message);
    } finally {
        await browser.close();
    }
})();
