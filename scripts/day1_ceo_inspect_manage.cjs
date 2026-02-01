const { chromium } = require('playwright');

(async () => {
    console.log("🔍 INSPECTING SIM USERS (CEO View) 🔍");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);

    try {
        console.log("🔐 Logging in as CEO...");
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'tariq@oceanpearlseafood.com', { force: true });
        await page.fill('input[type="password"]', 'OceanPearl2026!', { force: true });
        await page.click('button:has-text("Sign In")', { force: true });
        await page.waitForTimeout(8000);

        console.log("👥 Navigating to Admin...");
        await page.goto('https://oceanpearl-ops.web.app/admin');
        await page.waitForTimeout(8000);

        // Check Susi Sim
        const susiEmail = 'susi.sim@oceanpearl.com';
        console.log(`   Looking for ${susiEmail}...`);
        const susiRow = page.locator(`tr:has-text("${susiEmail}")`);

        if (await susiRow.count() > 0) {
            const text = await susiRow.innerText();
            console.log(`   Susi Row Data: ${text.replace(/\n/g, ' | ')}`);

            // Check Budi Sim
            const budiEmail = 'budi.sim@oceanpearl.com';
            const budiRow = page.locator(`tr:has-text("${budiEmail}")`);
            if (await budiRow.count() > 0) {
                const budiText = await budiRow.innerText();
                console.log(`   Budi Row Data: ${budiText.replace(/\n/g, ' | ')}`);
            }

            // Click Manage on Susi
            console.log("   Clicking 'Manage' on Susi...");
            const manageBtn = susiRow.locator('button:has-text("Manage")');
            // If button text is "Manage" or similar
            if (await manageBtn.count() > 0) {
                await manageBtn.click({ force: true });
                await page.waitForTimeout(2000);
                console.log("   Manage Modal Opened checking...");
                await page.screenshot({ path: 'd:/OPS/day1_manage_modal_sim.png' });
            } else {
                console.log("❌ Manage button not found on row. Checking Actions column...");
                // Maybe text is "Edit" or icon?
                // Dump row HTML
                const html = await susiRow.innerHTML();
                console.log(`   Row HTML: ${html}`);
            }

        } else {
            console.log("⚠️ Susi Sim not found in list!");
            await page.screenshot({ path: 'd:/OPS/day1_admin_list_sim_missing.png' });
        }

    } catch (e) {
        console.error("❌ ERROR:", e);
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
