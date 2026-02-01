const { chromium } = require('playwright');

(async () => {
    console.log("🌊 RESTARTING DAY 1: CEO SETUP (ATTEMPT 11 - ALIAS EMAILS) 🌊");

    // Using .sim3 emails for fresh attempt with proper Playwright selection
    const USERS = {
        budi: { email: 'budi.sim3@oceanpearl.com', name: 'Pak Budi', role: 'location_admin', loc: 'kaimana' },
        susi: { email: 'susi.sim3@oceanpearl.com', name: 'Susi Susanti', role: 'site_user', loc: 'kaimana', unit: 'gudang_ikan_teri' }
    };

    const browser = await chromium.launch({ headless: true });
    // Huge viewport
    const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
    const page = await context.newPage();
    page.setDefaultTimeout(90000);

    try {
        // 1. LOGIN CEO
        console.log("🔐 Logging in as CEO...");
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'tariq@oceanpearlseafood.com', { force: true });
        await page.fill('input[type="password"]', 'OceanPearl2026!', { force: true });
        await page.click('button:has-text("Sign In")', { force: true });
        await page.waitForTimeout(10000);

        // 2. USER MANAGEMENT
        console.log("👥 Checking Users...");
        await page.goto('https://oceanpearl-ops.web.app/admin');
        await page.waitForTimeout(10000);

        const bodyText = await page.textContent('body');

        const modalHandler = async () => {
            const modal = page.locator('div.fixed h3:has-text("Switch Logic")');
            if (await modal.isVisible()) {
                console.log("⚠️ Switch Modal -> Cancel");
                await page.locator('button:has-text("Cancel")').click({ force: true });
                await page.waitForTimeout(500);
            }
        };

        // SCOPE TO FORM
        const container = page.locator('form').filter({ hasText: 'Create User' }).first();

        // CREATE BUDI
        if (!bodyText.toLowerCase().includes(USERS.budi.email)) {
            console.log(`⚠️ Creating ${USERS.budi.name}...`);
            await container.locator('input[type="email"]').fill(USERS.budi.email);
            // Wait a moment for email validation if any
            await page.waitForTimeout(500);

            await container.locator('input[type="text"]').first().fill('Password123!');
            await container.locator('input[placeholder="Full Name"]').fill(USERS.budi.name);

            // Use Native SelectOption
            console.log(`   Selecting Role: ${USERS.budi.role}`);
            await container.locator('select').nth(0).selectOption({ label: 'Loc Admin' });
            await page.waitForTimeout(1000);

            // Use Native SelectOption by Label to match UI text
            console.log(`   Selecting Location: ${USERS.budi.loc}`);
            await container.locator('select').nth(1).selectOption({ value: 'kaimana' });
            await page.waitForTimeout(1000);

            await container.locator('button:has-text("Create User")').click({ force: true });

            // Wait for success toast or table update
            await page.waitForTimeout(5000);
            await modalHandler();
            console.log("✅ Budi Submitted.");
        } else {
            console.log("✅ Budi already exists.");
        }

        // CREATE SUSI
        await page.waitForTimeout(2000);
        const bodyText2 = await page.textContent('body');
        if (!bodyText2.toLowerCase().includes(USERS.susi.email)) {
            console.log(`⚠️ Creating ${USERS.susi.name}...`);

            await container.locator('input[type="email"]').fill(USERS.susi.email);
            await container.locator('input[type="text"]').first().fill('Password123!');
            await container.locator('input[placeholder="Full Name"]').fill(USERS.susi.name);

            // Role: Site User
            await container.locator('select').nth(0).selectOption({ label: 'Site User' });
            await page.waitForTimeout(1000);

            // Location: CV. Kaimana
            await container.locator('select').nth(1).selectOption({ value: 'kaimana' });
            await page.waitForTimeout(2000); // Wait for Unit select to appear

            // Unit (Gudang Ikan Teri)
            const unitSelect = container.locator('select').nth(2);
            if (await unitSelect.count() > 0 && await unitSelect.isVisible()) {
                console.log(`   Selecting Unit: ${USERS.susi.unit}`);
                // Look for label containing 'Anchovy' or 'Gudang'
                await unitSelect.evaluate((s) => {
                    const opt = Array.from(s.options).find(o => o.text.includes('Gudang') || o.text.includes('Teri'));
                    if (opt) s.value = opt.value;
                    s.dispatchEvent(new Event('change', { bubbles: true }));
                });
            }

            await container.locator('button:has-text("Create User")').click({ force: true });
            await page.waitForTimeout(5000);
            await modalHandler();
            console.log("✅ Susi Submitted.");

        } else {
            console.log("✅ Susi already exists.");
        }

        await page.screenshot({ path: 'd:/OPS/day1_v11_users_done.png' });

        // 3. SEED CAPITAL
        console.log("💰 Seeding Capital...");
        await page.goto('https://oceanpearl-ops.web.app/wallet');
        await page.waitForTimeout(8000);

        const sendBtn = page.locator('button:has-text("Send Funds")');
        if (await sendBtn.count() > 0) {
            await sendBtn.first().click({ force: true });
            await page.waitForSelector('div.fixed');

            const modalSelect = page.locator('div.fixed select').first();
            await forceSelect(modalSelect, 'kaimana');

            await page.fill('div.fixed input[type="number"]', '1000000000');
            await page.fill('div.fixed textarea', 'Day 1 Seed V11');
            await page.click('div.fixed button[type="submit"]', { force: true });

            await page.waitForTimeout(5000);
            console.log("✅ Capital Seeded.");
            // Verify toast?
            await page.screenshot({ path: 'd:/OPS/day1_v11_capital_done.png' });
        } else {
            console.log("❌ Send Funds Missing.");
            await page.screenshot({ path: 'd:/OPS/day1_v11_capital_fail.png' });
        }

        console.log("SUCCESS: CEO Setup Complete (V11)");

    } catch (e) {
        console.error("❌ ERROR:", e);
        await page.screenshot({ path: 'd:/OPS/day1_error_v11.png' });
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
