const { chromium } = require('playwright');

(async () => {
    console.log("🌊 DAY 1 STEP 1: CEO SETUP (UI ONLY - SIM5.1) 🌊");

    const USERS = {
        budi: { email: 'budi.sim5@oceanpearl.com', name: 'Pak Budi', role: 'location_admin', loc: 'kaimana' },
        susi: { email: 'susi.sim5@oceanpearl.com', name: 'Susi Susanti', role: 'site_user', loc: 'kaimana', unit: 'gudang_ikan_teri' }
    };

    const RAW_MATERIALS = [
        { name: 'Anchovy', category: 'small_fish' },
        { name: 'Yellowfin Tuna', category: 'tuna' }
    ];
    const FINISHED_PRODUCTS = [
        { name: 'Tuna Loin', category: 'tuna' },
        { name: 'Fillet', category: 'default' }
    ];

    const SEED_AMOUNT = '100000000'; // 100 Million

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);

    try {
        console.log("🔐 Logging in as CEO...");
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'tariq@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(10000);

        console.log("👥 Creating Users...");
        await page.goto('https://oceanpearl-ops.web.app/admin');
        await page.waitForTimeout(5000);

        if (await page.locator('h3:has-text("Switch Logic")').count() > 0) {
            await page.locator('button:has-text("Cancel")').click();
        }

        const userForm = page.locator('form:has(input[placeholder="Email"])');

        for (const key of ['budi', 'susi']) {
            const u = USERS[key];
            const usersText = await page.innerText('body');
            if (usersText.toLowerCase().includes(u.email)) {
                console.log(`   User ${u.email} already exists.`);
                continue;
            }

            console.log(`   Creating User: ${u.name} (${u.email})...`);
            await userForm.locator('input[type="email"]').fill(u.email);
            await userForm.locator('input[type="text"]').first().fill('Password123!');
            await userForm.locator('input[placeholder="Full Name"]').fill(u.name);
            await userForm.locator('select').nth(0).selectOption({ value: u.role });
            await page.waitForTimeout(500);
            await userForm.locator('select').nth(1).selectOption({ value: u.loc });
            await page.waitForTimeout(1000);

            if (u.unit) {
                const unitSelect = userForm.locator('select').nth(2);
                await unitSelect.evaluate((s, val) => {
                    const opt = Array.from(s.options).find(o => o.text.includes('Gudang') || o.text.includes('Teri'));
                    if (opt) s.value = opt.value;
                    s.dispatchEvent(new Event('change', { bubbles: true }));
                }, u.unit);
            }

            await userForm.locator('button:has-text("Create")').click();
            await page.waitForSelector('text=successfully', { timeout: 15000 });
            console.log(`   ✅ ${u.name} Created.`);
            await page.waitForTimeout(2000);
        }

        console.log("📦 Creating Items & Categories...");
        await page.click('button:has-text("Items")');
        await page.waitForTimeout(2000);

        await page.click('button:has-text("Raw Materials")');
        await page.waitForTimeout(2000);
        for (const item of RAW_MATERIALS) {
            if (!(await page.innerText('table')).includes(item.name)) {
                console.log(`   Creating Raw Material: ${item.name}...`);
                await page.locator('input[placeholder*="Yellowfin Tuna"]').fill(item.name);
                await page.locator('input[placeholder*="Tuna Sirip Kuning"]').fill(item.name);
                await page.locator('div:has-text("Biological Category") + select, select:near(:text("Biological Category"))').first().selectOption({ value: item.category });
                await page.locator('button:has-text("Create Material")').click();
                await page.waitForSelector('text=Created Raw Material', { timeout: 10000 });
                await page.waitForTimeout(2000);
            }
        }

        await page.click('button:has-text("Finished Products")');
        await page.waitForTimeout(2000);
        for (const item of FINISHED_PRODUCTS) {
            if (!(await page.innerText('table')).includes(item.name)) {
                console.log(`   Creating Finished Product: ${item.name}...`);
                await page.locator('input[placeholder*="Frozen Tuna Loin"]').fill(item.name);
                await page.locator('input[placeholder*="Loin Tuna Beku"]').fill(item.name);
                await page.locator('div:has-text("Process Family") + select, select:near(:text("Process Family"))').first().selectOption({ value: item.category });
                await page.locator('button:has-text("Create Finished")').click();
                await page.waitForSelector('text=Created Finished Product', { timeout: 10000 });
                await page.waitForTimeout(2000);
            }
        }

        console.log("💰 Seeding Capital (100M)...");
        await page.goto('https://oceanpearl-ops.web.app/wallet');
        await page.waitForTimeout(5000);

        const sendBtn = page.locator('button:has-text("Send Funds")');
        if (await sendBtn.count() > 0) {
            await sendBtn.first().click();
            await page.waitForTimeout(2000);
            const modal = page.locator('div.fixed.z-50').last();
            await modal.locator('select').first().selectOption({ value: 'kaimana' });
            await modal.locator('input[type="number"]').fill(SEED_AMOUNT);
            await modal.locator('button:has-text("Transfer")').click();
            await page.waitForSelector('text=Successfully', { timeout: 10000 });
            console.log("   ✅ Capital Transferred.");
        }

        console.log("✅ STEP 1 COMPLETE.");

    } catch (e) {
        console.error("❌ ERROR:", e);
        await page.screenshot({ path: 'd:/OPS/day1_step1_error.png' });
        process.exit(1);
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
