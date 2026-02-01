const { chromium } = require('playwright');

(async () => {
    console.log("🌊 DAY 1 STEP 1 (Part 2): CEO COMPLETION (UI ONLY) 🌊");

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

        console.log("📦 Creating Finished Products...");
        await page.goto('https://oceanpearl-ops.web.app/admin');
        await page.waitForTimeout(5000);
        await page.click('button:has-text("Items")');
        await page.waitForTimeout(2000);

        await page.click('button:has-text("Finished Products")');
        await page.waitForTimeout(2000);
        for (const item of FINISHED_PRODUCTS) {
            const tableText = await page.innerText('table');
            if (!tableText.includes(item.name)) {
                console.log(`   Creating Finished Product: ${item.name}...`);
                await page.locator('input[placeholder*="Frozen Tuna Loin"]').fill(item.name);
                await page.locator('input[placeholder*="Loin Tuna Beku"]').fill(item.name);
                // Select Process Family
                const selects = await page.locator('select').all();
                let foundSelect = false;
                for (const s of selects) {
                    const opts = await s.evaluate(el => Array.from(el.options).map(o => o.value));
                    if (opts.includes('tuna') && opts.includes('default')) {
                        await s.selectOption({ value: item.category });
                        foundSelect = true;
                        break;
                    }
                }
                if (!foundSelect) console.warn("   ⚠️ Could not find category select for " + item.name);

                await page.locator('button:has-text("Create Finished")').click();
                await page.waitForTimeout(3000);
            } else {
                console.log(`   Finished Product ${item.name} already exists.`);
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
            await page.waitForTimeout(5000);
            console.log("   ✅ Capital Transferred.");
        } else {
            console.error("❌ Send Funds button not found!");
        }

        console.log("✅ CEO SETUP COMPLETE.");

    } catch (e) {
        console.error("❌ ERROR:", e);
        await page.screenshot({ path: 'd:/OPS/day1_ceo_p2_error.png' });
        process.exit(1);
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
