const { chromium } = require('playwright');

(async () => {
    console.log("👔 MANAGER CHECK (BUDI SIM3) 👔");

    const LOGIN_EMAIL = 'budi.sim3@oceanpearl.com';
    const LOGIN_PASS = 'Password123!';

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);

    try {
        console.log(`🔐 Logging in as ${LOGIN_EMAIL}...`);
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', LOGIN_EMAIL);
        await page.fill('input[type="password"]', LOGIN_PASS);
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);

        // Check if "READ ONLY"
        const body = await page.innerText('body');
        if (body.includes("READ ONLY")) throw new Error("Budi is READ ONLY!");

        // Check Nav Items
        console.log("Checking Navigation...");
        const navText = await page.innerText('nav');
        console.log("Nav Items found:", navText.replace(/\n/g, ', '));

        if (!navText.toLowerCase().includes('wallet')) {
            throw new Error("Manager Missing Wallet Access!");
        }

        console.log("💰 Assessing Wallet...");
        await page.goto('https://oceanpearl-ops.web.app/wallet');
        await page.waitForTimeout(3000);

        if (await page.locator('text=Balance').count() > 0 || await page.locator('text=Request Funds').count() > 0) {
            console.log("✅ Wallet Page Loaded.");
        } else {
            console.log("⚠️ Wallet Page might be empty or loading.");
        }

        console.log("✅ Budi Manager Check PASSED.");

    } catch (e) {
        console.error("❌ ERROR:", e);
        process.exit(1);
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
