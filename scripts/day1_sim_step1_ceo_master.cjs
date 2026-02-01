const { chromium } = require('playwright');

(async () => {
    console.log("🌊 DAY 1: MASTER CEO SETUP (SIM 5.13 - BUGFIX) 🌊");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
    const page = await context.newPage();
    page.setDefaultTimeout(120000);

    page.on('console', msg => console.log('BROWSER:', msg.text()));

    try {
        console.log("🔐 Logging in as CEO...");
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'tariq@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);

        // 1. RAW MATERIALS
        console.log("📦 Checking Raw Materials...");
        await page.goto('https://oceanpearl-ops.web.app/admin');
        await page.click('button:has-text("Items")');
        await page.waitForTimeout(4000);

        const materials = [
            { name: 'Anchovy', name_id: 'Ikan Teri', category: 'small_fish' },
            { name: 'Yellowfin Tuna', name_id: 'Tuna Sirip Kuning', category: 'tuna' }
        ];

        for (const m of materials) {
            const listText = await page.locator('table').innerText().catch(() => "");
            if (listText.includes(m.name)) {
                console.log(`   Material ${m.name} exists.`);
                continue;
            }

            console.log(`   Creating Material: ${m.name}...`);
            await page.fill('input[placeholder*="Yellowfin"]', m.name);
            await page.fill('input[placeholder*="Tuna Sirip"]', m.name_id);
            await page.locator('select').first().selectOption({ value: m.category });
            await page.click('button:has-text("Create Material")');
            await page.waitForTimeout(5000);
            console.log(`   ✅ ${m.name} Created.`);
        }

        // 2. FINISHED PRODUCTS
        console.log("🍱 Checking Finished Products...");
        await page.click('button:has-text("Finished Products")');
        await page.waitForTimeout(3000);

        const products = [
            { name: 'Tuna Loin', name_id: 'Tuna Loin (Export)' },
            { name: 'Anchovy Fillet', name_id: 'Teri Fillet' }
        ];

        for (const p of products) {
            const listText = await page.locator('table').innerText().catch(() => "");
            if (listText.includes(p.name)) {
                console.log(`   Product ${p.name} exists.`);
                continue;
            }

            console.log(`   Creating Product: ${p.name}...`);
            await page.fill('input[placeholder*="Frozen Tuna Loin"]', p.name);
            await page.fill('input[placeholder*="Loin Tuna Beku"]', p.name_id);
            await page.click('button:has-text("Create Finished Product")');
            await page.waitForTimeout(5000);
            console.log(`   ✅ ${p.name} Created.`);
        }

        // 3. SEED CAPITAL
        console.log("💰 Checking Capital...");
        await page.goto('https://oceanpearl-ops.web.app/wallet');
        await page.waitForTimeout(5000);

        const kaimanaRow = page.locator('tr:has-text("Kaimana")').first();
        const kaimanaText = await kaimanaRow.innerText().catch(() => "0");

        if (kaimanaText.includes('250,000,000') || kaimanaText.includes('250.000.000')) {
            console.log("   Capital already seeded.");
        } else {
            console.log("   Seeding 250M to Kaimana...");
            await page.click('button:has-text("Send Funds")');
            await page.waitForTimeout(4000);

            const modal = page.locator('div.fixed.z-50').last();
            await modal.locator('select').selectOption('kaimana');
            await modal.locator('input[type="number"]').fill('250000000');
            await modal.locator('textarea').fill('Initial Injection for Day 1 SIM5');
            await modal.locator('button:has-text("Transfer")').click();
            await page.waitForTimeout(10000);
            console.log("   ✅ Capital Seeded.");
        }

        console.log("✅ MASTER SETUP V5.13 COMPLETE.");

    } catch (e) {
        console.error("❌ ERROR:", e);
        await page.screenshot({ path: 'd:/OPS/ceo_master_setup_v13_error.png' });
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
