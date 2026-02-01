const { chromium } = require('playwright');

(async () => {
    console.log("🕵️ CHECKING BUDI (LOC ADMIN) STATUS");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);

    try {
        console.log("🔐 Logging in as Budi...");
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'budi.sim@oceanpearl.com', { force: true });
        await page.fill('input[type="password"]', 'Password123!', { force: true });
        await page.click('button:has-text("Sign In")', { force: true });
        await page.waitForTimeout(6000);

        await page.screenshot({ path: 'd:/OPS/day1_budi_dashboard.png' });
        console.log("   Dashboard Screenshot taken.");

        const title = await page.title();
        console.log(`   Page Title: ${title}`);

        // Check for Role text in UI
        const text = await page.innerText('body');
        if (text.includes("READ ONLY")) console.log("⚠️ Budi is READ ONLY");
        else console.log("✅ Budi is NOT Read Only (Text check)");

        // Try visiting Command
        await page.goto('https://oceanpearl-ops.web.app/command');
        await page.waitForTimeout(5000);
        const url = page.url();
        console.log(`   URL after /command: ${url}`);

        const content = await page.content();
        if (content.includes("Page Not Found")) {
            console.log("❌ Budi cannot access /command");
        } else {
            console.log("✅ Budi CAN access /command. Checking buttons...");
            await page.screenshot({ path: 'd:/OPS/day1_budi_command.png' });

            if (await page.locator('button:has-text("Receive")').count() > 0 || await page.locator('button:has-text("New Transaction")').count() > 0) {
                console.log("✅ Transaction Buttons Visible.");
            } else {
                console.log("⚠️ /command accessible but buttons missing.");
            }
        }

    } catch (e) {
        console.error("❌ ERROR:", e);
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
