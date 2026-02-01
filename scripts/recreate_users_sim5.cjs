const { chromium } = require('playwright');

(async () => {
    console.log("🌊 CEO EMERGENCY: USER RECREATION (V4 - TARGETED) 🌊");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
    const page = await context.newPage();

    page.on('console', msg => console.log('BROWSER:', msg.text()));

    page.on('dialog', async dialog => {
        const msg = dialog.message();
        console.log(`DIALOG: [${dialog.type()}] ${msg}`);
        if (dialog.type() === 'prompt') {
            // Extract email from prompt if it asks for it
            const emailMatch = msg.match(/"([^"]+)"/);
            const emailFound = emailMatch ? emailMatch[1] : '';
            console.log(`   Accepting prompt with: ${emailFound}`);
            await dialog.accept(emailFound);
        } else if (dialog.type() === 'confirm') {
            await dialog.accept();
        } else {
            await dialog.accept();
        }
    });

    try {
        console.log("🔐 Logging in as CEO...");
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'tariq@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');

        await page.waitForTimeout(5000);
        await page.goto('https://oceanpearl-ops.web.app/admin');

        const emails = ['susi.sim5@oceanpearl.com', 'budi.sim5@oceanpearl.com'];

        for (const email of emails) {
            console.log(`🗑️ Targeting ${email}...`);

            // Wait for User List to load
            await page.waitForSelector('text=Active Personnel', { timeout: 30000 });
            console.log("   Personnel List Loaded.");

            const searchInput = page.locator('input[placeholder*="Search"]');
            await searchInput.waitFor({ state: 'visible' });
            await searchInput.fill(email);
            await page.waitForTimeout(3000);

            const row = page.locator('tr').filter({ hasText: email });
            if (await row.count() > 0) {
                console.log(`   Opening modal for ${email}...`);
                await row.locator('button:has-text("Manage")').first().click();

                await page.waitForSelector('text=Delete User Permanently', { timeout: 10000 });
                const deleteBtn = page.locator('button:has-text("Delete User Permanently")');

                console.log(`   Triggering Permanent Deletion...`);
                await deleteBtn.click();

                // Wait for modal to disappear or success message
                await page.waitForTimeout(10000);
                console.log(`   ✅ Deletion action sent for ${email}`);
            } else {
                console.log(`   Row for ${email} not found. skipping.`);
            }

            // Refresh to be clean
            await page.goto('https://oceanpearl-ops.web.app/admin');
            await page.waitForTimeout(3000);
        }

        console.log("✅ Deletion Phase Finished.");

    } catch (e) {
        console.error("❌ ERROR:", e);
        await page.screenshot({ path: 'd:/OPS/cleanup_error.png' });
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
