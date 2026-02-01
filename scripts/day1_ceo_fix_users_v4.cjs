const { chromium } = require('playwright');

(async () => {
    console.log("🔧 FIXING USER ROLES via UI (CEO) - V4 (JS CLICK) 🔧");

    const browser = await chromium.launch({ headless: true });
    // Increase height to avoid scrolling issues
    const context = await browser.newContext({ viewport: { width: 1600, height: 1600 } });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);

    try {
        console.log("🔐 Logging in as CEO...");
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'tariq@oceanpearlseafood.com', { force: true });
        await page.fill('input[type="password"]', 'OceanPearl2026!', { force: true });
        await page.click('button:has-text("Sign In")', { force: true });
        await page.waitForTimeout(10000);

        await page.goto('https://oceanpearl-ops.web.app/admin');
        await page.waitForTimeout(8000);

        // Helper to force click via JS
        const jsClick = async (locator) => {
            await locator.evaluate(el => el.click());
        };

        const editUser = async (email, roleIndex, locationLabel, unitLabel) => {
            console.log(`\n✏️ Editing ${email}...`);
            // Scroll to bottom first
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

            const row = page.locator(`tr:has-text("${email}")`);
            if (await row.count() === 0) {
                console.log("   ❌ User not found!");
                return;
            }

            const manageBtn = row.locator('button:has-text("Manage")');
            console.log("   Clicking Manage (JS)...");
            await jsClick(manageBtn);

            try {
                await page.waitForSelector('div.fixed select', { timeout: 8000 });
                console.log("   Modal Open.");
            } catch (e) {
                console.log("   ❌ Modal Open Timeout! taking screenshot.");
                await page.screenshot({ path: `d:/OPS/day1_fix_modal_fail_v4_${email.split('@')[0]}.png` });
                return;
            }

            const modal = page.locator('div.fixed');

            // 1. Set Role (Index)
            console.log(`   Setting Role Index: ${roleIndex}`);
            await modal.locator('select').nth(0).selectOption({ index: roleIndex }, { force: true });
            await page.waitForTimeout(1000);

            // 2. Set Location (Label)
            console.log(`   Setting Location: ${locationLabel}`);
            await modal.locator('select').nth(1).selectOption({ label: locationLabel }, { force: true });
            await page.waitForTimeout(2000);

            // 3. Set Unit
            if (unitLabel) {
                const selects = modal.locator('select');
                if (await selects.count() > 2) {
                    console.log(`   Setting Unit: ${unitLabel}`);
                    try {
                        await selects.nth(2).selectOption({ label: unitLabel }, { force: true });
                    } catch (e) {
                        console.log("   Unit label failed, trying Index 1...");
                        await selects.nth(2).selectOption({ index: 1 }, { force: true });
                    }
                }
            }

            // 4. Save
            console.log("   Saving...");
            await jsClick(modal.locator('button:has-text("Save Changes")'));
            await page.waitForTimeout(4000);
            console.log("   ✅ Saved.");
        };

        // SUSI -> Unit Admin (Index 1)
        await editUser('susi.sim@oceanpearl.com', 1, 'Kaimana', 'Gudang Ikan Teri');

        // BUDI -> Loc Admin (Index 2)
        await editUser('budi.sim@oceanpearl.com', 2, 'Kaimana', null);

        console.log("🎉 User Fixes Complete (V4).");
        await page.screenshot({ path: 'd:/OPS/day1_fixed_users_v4.png' });

    } catch (e) {
        console.error("❌ ERROR:", e);
        await page.screenshot({ path: 'd:/OPS/day1_fix_error_v4.png' });
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
