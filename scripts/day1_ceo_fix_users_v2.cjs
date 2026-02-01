const { chromium } = require('playwright');

(async () => {
    console.log("🔧 FIXING USER ROLES via UI (CEO) - V2 🔧");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);

    try {
        // 1. LOGIN CEO
        console.log("🔐 Logging in as CEO...");
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'tariq@oceanpearlseafood.com', { force: true });
        await page.fill('input[type="password"]', 'OceanPearl2026!', { force: true });
        await page.click('button:has-text("Sign In")', { force: true });
        await page.waitForTimeout(10000);

        await page.goto('https://oceanpearl-ops.web.app/admin');
        await page.waitForTimeout(8000);

        // Helper: Edit User
        const editUser = async (email, roleLabel, locationLabel, unitLabel) => {
            console.log(`\n✏️ Editing ${email}...`);
            const row = page.locator(`tr:has-text("${email}")`);
            if (await row.count() === 0) {
                console.log("   ❌ User not found!");
                return;
            }

            // Open Modal
            console.log("   Clicking Manage...");
            await row.locator('button:has-text("Manage")').click({ force: true });

            // Wait for generic modal
            try {
                await page.waitForSelector('div.fixed select', { timeout: 8000 });
                console.log("   Modal Open.");
            } catch (e) {
                console.log("   ❌ Modal Open Timeout! taking screenshot.");
                await page.screenshot({ path: `d:/OPS/day1_fix_modal_fail_${email.split('@')[0]}.png` });
                return;
            }

            const modal = page.locator('div.fixed');

            // 1. Set Role
            console.log(`   Setting Role: ${roleLabel}`);
            await modal.locator('select').nth(0).selectOption({ label: roleLabel }, { force: true });
            await page.waitForTimeout(1000);

            // 2. Set Location
            console.log(`   Setting Location: ${locationLabel}`);
            await modal.locator('select').nth(1).selectOption({ label: locationLabel }, { force: true });
            await page.waitForTimeout(2000);

            // 3. Set Unit
            if (unitLabel) {
                const selects = modal.locator('select');
                if (await selects.count() > 2) {
                    console.log(`   Setting Unit: ${unitLabel}`);
                    await selects.nth(2).selectOption({ label: unitLabel }, { force: true });
                } else {
                    console.log("   ⚠️ Unit selector did NOT appear.");
                    // Dump modal content for debug
                    console.log("   Modal HTML:", await modal.innerHTML());
                }
            }

            // 4. Save
            console.log("   Saving...");
            await modal.locator('button:has-text("Save Changes")').click({ force: true });
            await page.waitForTimeout(4000);
            console.log("   ✅ Saved.");
        };

        // SUSI FIRST
        await editUser('susi.sim@oceanpearl.com', 'Site User', 'Kaimana', 'Gudang Ikan Teri');

        // BUDI SECOND
        await editUser('budi.sim@oceanpearl.com', 'Loc Admin', 'Kaimana', null);

        console.log("🎉 User Fixes Complete.");
        await page.screenshot({ path: 'd:/OPS/day1_fixed_users_v2.png' });

    } catch (e) {
        console.error("❌ ERROR:", e);
        await page.screenshot({ path: 'd:/OPS/day1_fix_error_v2.png' });
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
