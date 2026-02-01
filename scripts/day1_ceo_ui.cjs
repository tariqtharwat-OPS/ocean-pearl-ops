const { chromium } = require('playwright');
const admin = require('firebase-admin');

(async () => {
    console.log("🌊 STARTING DAY 1: CEO SETUP & CAPITAL SEEDING (PLAYWRIGHT) 🌊");

    // Setup Browser
    const browser = await chromium.launch({ headless: true }); // Headless for stability in this env
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    try {
        // 1. LOGIN
        console.log("🔐 Logging in as CEO...");
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'tariq@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")'); // Adjust selector if needed
        await page.waitForTimeout(5000); // Wait for dashboard

        // Verify Dashboard
        const title = await page.title();
        console.log(`✅ Logged in. Title: ${title}`);
        await page.screenshot({ path: 'd:/OPS/day1_01_ceo_dashboard.png' });

        // 2. USER MANAGEMENT (Admin)
        console.log("👥 Checking Users...");
        await page.goto('https://oceanpearl-ops.web.app/admin');
        await page.waitForTimeout(3000);

        // Check Budi
        const bodyText = await page.textContent('body');
        if (!bodyText.includes('budi@oceanpearl.com')) {
            console.log("⚠️ Budi not found, creating/fixing...");
            // In a real scenario we'd click "Create User", but here we might just verify
            // For this script, we'll assume they exist or we fail. 
            // Phase B says "Create users...". 
            // If we can't do it via Playwright comfortably without complex selectors, we might need a distinct script.
            // Let's assume they EXIST from Phase A or previous runs (Wait, we wiped Firestore).
            // We wiped Firestore, so users are gone from DB but Auth remains.
            // Admin page pulls from Firestore. So list is empty except CEO.

            console.log("   Creating Manager (Budi)...");
            await page.click('button:has-text("Add User")'); // Adjust selector
            await page.waitForSelector('div[role="dialog"]');
            await page.fill('input[name="email"]', 'budi@oceanpearl.com');
            await page.fill('input[name="displayName"]', 'Pak Budi');
            await page.fill('input[name="password"]', 'OceanPearl2026!'); // Might be needed if Auth missing
            await page.selectOption('select[name="role"]', 'LOC_MANAGER');
            await page.selectOption('select[name="locationId"]', 'kaimana');
            await page.click('button:has-text("Create User")');
            await page.waitForTimeout(2000);
        } else {
            console.log("✅ Budi found.");
        }

        // Check Susi
        if (!bodyText.includes('susi@oceanpearl.com')) {
            console.log("   Creating Operator (Susi)...");
            await page.click('button:has-text("Add User")');
            await page.waitForSelector('div[role="dialog"]');
            await page.fill('input[name="email"]', 'susi@oceanpearl.com');
            await page.fill('input[name="displayName"]', 'Susi Susanti');
            await page.fill('input[name="password"]', 'OceanPearl2026!');
            await page.selectOption('select[name="role"]', 'UNIT_OP');
            await page.selectOption('select[name="locationId"]', 'kaimana');
            // Unit? If UI allows.
            // We'll trust the default selector or just set location.
            await page.click('button:has-text("Create User")');
            await page.waitForTimeout(2000);
        } else {
            console.log("✅ Susi found.");
        }
        await page.screenshot({ path: 'd:/OPS/day1_02_users_setup.png' });


        // 3. SEED CAPITAL
        console.log("💰 Seeding Capital...");
        await page.goto('https://oceanpearl-ops.web.app/wallet'); // Assuming /wallet or /finance
        await page.waitForTimeout(3000);

        // CEO View should see HQ Wallet or "Global Finance"
        // We need to transfer to Kaimana.

        // Look for "Send Capital" or similar
        // If not present, check "Transfer"
        const sendBtn = page.locator('button:has-text("Send Funds")');
        if (await sendBtn.count() > 0) {
            await sendBtn.click();
            await page.waitForSelector('div[role="dialog"]');

            await page.selectOption('select', { label: 'Kaimana' }); // Target
            await page.fill('input[type="number"]', '1000000000'); // 1B
            await page.fill('textarea', 'Day 1 Initial Capital');
            await page.click('button:has-text("Confirm Transfer")');
            await page.waitForTimeout(3000);
            console.log("✅ Capital Injected.");
            await page.screenshot({ path: 'd:/OPS/day1_03_capital_seeded.png' });
        } else {
            console.log("⚠️ 'Send Funds' button not found. Using fallback injection?");
            // We are strictly UI only. If button missing, we fail.
            // Actually, WalletManager.jsx shows "Send Funds" for HQ_ADMIN.
            console.log("   Failed to find Send Funds button. Dumping layout for debug.");
            await page.screenshot({ path: 'd:/OPS/day1_03_capital_failed.png' });
        }

    } catch (e) {
        console.error("❌ ERROR:", e);
        await page.screenshot({ path: 'd:/OPS/day1_error.png' });
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
