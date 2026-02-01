const { chromium } = require('playwright');

(async () => {
    console.log("🔧 FIXING USER ROLES via UI (CEO) - V5 (PROMOTE TO LOC ADMIN) 🔧");

    const browser = await chromium.launch({ headless: true });
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

        const jsClick = async (locator) => await locator.evaluate(el => el.click());

        const editUser = async (email, roleIndex) => {
            console.log(`\n✏️ Editing ${email}...`);
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

            const row = page.locator(`tr:has-text("${email}")`);
            if (await row.count() === 0) return;

            const manageBtn = row.locator('button:has-text("Manage")');
            await jsClick(manageBtn);

            try {
                await page.waitForSelector('div.fixed select', { timeout: 8000 });
            } catch (e) {
                await page.screenshot({ path: `d:/OPS/day1_fix_modal_fail_v5.png` });
                return;
            }

            const modal = page.locator('div.fixed');

            // Promote to Loc Admin (Index 2)
            console.log(`   Setting Role Index: ${roleIndex}`);
            await modal.locator('select').nth(0).selectOption({ index: roleIndex }, { force: true });
            await page.waitForTimeout(1000);

            // Ensure Location is Kaimana (Index 2 or Label Kaimana)
            // Label 'Kaimana'
            await modal.locator('select').nth(1).selectOption({ label: 'Kaimana' }, { force: true });

            // Save
            console.log("   Saving...");
            await jsClick(modal.locator('button:has-text("Save Changes")'));
            await page.waitForTimeout(4000);
            console.log("   ✅ Saved.");
        };

        // SUSI -> Loc Admin (Index 2)
        await editUser('susi.sim@oceanpearl.com', 2);

        // Budi -> Loc Admin (Index 2) - Just to be sure he is also Loc Admin
        await editUser('budi.sim@oceanpearl.com', 2);

        console.log("🎉 User Fixes Complete (V5).");
        await page.screenshot({ path: 'd:/OPS/day1_fixed_users_v5.png' });

    } catch (e) {
        console.error("❌ ERROR:", e);
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
