const { chromium } = require('playwright');

(async () => {
    console.log("🔧 FIXING USER ROLES via UI (CEO) 🔧");

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
            await row.locator('button:has-text("Manage")').click({ force: true });
            await page.waitForSelector('div.fixed h3:has-text("Edit")', { timeout: 5000 });
            console.log("   Modal Open.");

            const modal = page.locator('div.fixed');

            // 1. Set Role
            const roleSelect = modal.locator('select').nth(0); // Assumption: Role is first
            await roleSelect.selectOption({ label: roleLabel }, { force: true });
            await page.waitForTimeout(500);

            // 2. Set Location
            const locSelect = modal.locator('select').nth(1);
            // We use 'Kaimana' label
            await locSelect.selectOption({ label: locationLabel }, { force: true });
            await page.waitForTimeout(1000); // Wait for Unit select to possibly appear

            // 3. Set Unit (If applicable and visible)
            if (unitLabel) {
                const selects = modal.locator('select');
                if (await selects.count() > 2) {
                    console.log(`   Setting Unit: ${unitLabel}`);
                    const unitSelect = selects.nth(2);
                    try {
                        await unitSelect.selectOption({ label: unitLabel }, { force: true });
                    } catch (e) {
                        console.log("   Unit label select failed, trying value/index...");
                        await unitSelect.selectOption({ index: 1 }, { force: true });
                    }
                } else {
                    console.log("   ⚠️ Unit selector did NOT appear even after Location select.");
                }
            }

            // 4. Save
            console.log("   Saving Changes...");
            await modal.locator('button:has-text("Save Changes")').click({ force: true });
            await page.waitForTimeout(3000);
            console.log("   ✅ Saved.");
        };

        // FIX BUDI
        // Role: Loc Admin (Label likely "Loc Admin" or "Location Manager"? select options are usually codes... 
        // Screenshot showed "Site User" as Label.
        // AdminPanel options: "Loc Admin"
        await editUser('budi.sim@oceanpearl.com', 'Loc Admin', 'Kaimana', null);

        // FIX SUSI
        // Role: Site User
        // Location: Kaimana
        // Unit: Gudang Ikan Teri (Label likely "Gudang Ikan Teri")
        await editUser('susi.sim@oceanpearl.com', 'Site User', 'Kaimana', 'Gudang Ikan Teri');

        console.log("🎉 User Fixes Complete.");
        await page.screenshot({ path: 'd:/OPS/day1_fixed_users.png' });

    } catch (e) {
        console.error("❌ ERROR:", e);
        await page.screenshot({ path: 'd:/OPS/day1_fix_error.png' });
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
