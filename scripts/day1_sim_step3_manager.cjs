const { chromium } = require('playwright');

(async () => {
    console.log("🌊 DAY 1: MANAGER ACTIONS (SIM 5.30 - SHARK VERIFY) 🌊");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
    const page = await context.newPage();
    page.setDefaultTimeout(120000);

    page.on('console', msg => console.log('BROWSER:', msg.text()));

    try {
        console.log("🔐 Logging in as Manager (Budi)...");
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'budi.sim5.official@oceanpearl.com');
        await page.fill('input[type="password"]', 'Password123!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);

        // 1. CHECK SHARK AI (Post-Approval)
        console.log("🦈 Accessing Shark AI Center (/shark)...");
        await page.goto('https://oceanpearl-ops.web.app/shark');

        console.log("   Waiting for Shark analysis to populate...");
        await page.waitForTimeout(20000); // Wait for background analysis to finish and reflect

        // Take multiple screenshots to capture the feed
        await page.screenshot({ path: 'd:/OPS/manager_shark_feed_sim5_final.png', fullPage: true });
        console.log("   ✅ Shark Feed Snapshot (Full Page) taken.");

        // Check if there are any "Anomalies" or "Insights" labels
        const feedText = await page.innerText('body');
        if (feedText.includes('Shark Analysis') || feedText.includes('Alert') || feedText.includes('Insight')) {
            console.log("   ✅ Shark AI has active insights.");
        } else {
            console.log("   ⚠️ Shark AI feed appears empty. Background processing might be delayed.");
        }

        console.log("✅ MANAGER ACTIONS COMPLETE.");

    } catch (e) {
        console.error("❌ ERROR:", e);
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
