const { chromium } = require('playwright');

(async () => {
    console.log("🧪 CREATING TEMP USER (DIRECT LOC ADMIN) 🧪");

    // Config
    const TEMP_EMAIL = 'susi.temp2@oceanpearl.com'; // v2 just in case

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);

    try {
        // 1. CEO LOGIN
        console.log("🔐 Logging in as CEO...");
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'tariq@oceanpearlseafood.com', { force: true });
        await page.fill('input[type="password"]', 'OceanPearl2026!', { force: true });
        await page.click('button:has-text("Sign In")', { force: true });
        await page.waitForTimeout(8000);
        await page.goto('https://oceanpearl-ops.web.app/admin');
        await page.waitForTimeout(8000);

        // 2. CREATE USER
        console.log(`Creating ${TEMP_EMAIL}...`);
        const container = page.locator('div:has(h3:has-text("Provision Worker"))');
        await container.locator('input[type="email"]').fill(TEMP_EMAIL);
        await container.locator('input[type="text"]').first().fill('Password123!');
        await container.locator('input[placeholder="Full Name"]').fill('Susi Temp');

        // Select LOC ADMIN (Index 2) directly
        console.log("   Selecting Role: Loc Admin (Index 2)");
        await container.locator('select').nth(0).selectOption({ index: 2 }, { force: true });
        await page.waitForTimeout(500);

        // Select Kasi (Kaimana)
        console.log("   Selecting Location: Kaimana");
        await container.locator('select').nth(1).selectOption({ label: 'Kaimana' }, { force: true });

        // Create
        await container.locator('button:has-text("Create User")').click({ force: true });
        await page.waitForTimeout(5000);
        console.log("✅ Created.");

        // 3. LOGOUT & LOGIN AS TEMP
        console.log("🔐 Logging in as Temp...");
        await page.context().clearCookies(); // Force clean
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', TEMP_EMAIL, { force: true });
        await page.fill('input[type="password"]', 'Password123!', { force: true });
        await page.click('button:has-text("Sign In")', { force: true });
        await page.waitForTimeout(8000);

        await page.screenshot({ path: 'd:/OPS/day1_temp_dashboard.png' });

        // CHECK ROLE
        const text = await page.innerText('body');
        if (text.includes("READ ONLY")) {
            console.log("❌ TEMP IS READ ONLY!");
        } else {
            console.log("✅ TEMP IS ACTIVE/ADMIN!");
            // Check /command
            await page.goto('https://oceanpearl-ops.web.app/command');
            await page.waitForTimeout(4000);
            if (await page.locator('button:has-text("Receive")').count() > 0 || await page.locator('button:has-text("New Transaction")').count() > 0) {
                console.log("✅ Transaction Buttons Visible for Temp.");
            } else {
                console.log("⚠️ /command accessible but buttons missing for Temp.");
            }
        }

    } catch (e) {
        console.error("❌ ERROR:", e);
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
