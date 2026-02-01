const { chromium } = require('playwright');

(async () => {
    console.log("🌊 DAY 10: FINAL REPORTING & ANALYTICS 🌊");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
    const page = await context.newPage();
    page.setDefaultTimeout(120000);

    page.on('console', msg => {
        if (msg.text().includes('REPORT') || msg.text().includes('DASH')) {
            console.log('BROWSER:', msg.text());
        }
    });

    try {
        console.log("🔐 Logging in as Manager (Pak Budi)...");
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'budi.sim5.official@oceanpearl.com');
        await page.fill('input[type="password"]', 'Password123!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(8000);

        console.log("📊 Viewing Main Dashboard...");
        await page.screenshot({ path: 'd:/OPS/day10_dashboard.png' });

        console.log("📈 Navigating to Reports...");
        await page.goto('https://oceanpearl-ops.web.app/reports');
        await page.waitForTimeout(8000);
        await page.screenshot({ path: 'd:/OPS/day10_reports.png' });

        console.log("🦈 Checking Shark AI feed...");
        await page.goto('https://oceanpearl-ops.web.app/shark');
        await page.waitForTimeout(10000);
        await page.screenshot({ path: 'd:/OPS/day10_shark.png' });

        console.log("✅ DAY 10 SIMULATION COMPLETE.");

    } catch (e) {
        console.error("❌ ERROR:", e);
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
