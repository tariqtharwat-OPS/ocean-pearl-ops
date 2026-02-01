const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();

    let logs = [];
    const log = (msg) => { console.log(msg); logs.push(msg); };

    try {
        log("--- START PHASE 8: CEO FLOW ---");

        log("Navigating to login...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/login', { timeout: 60000 });

        log("Logging in as tariq@oceanpearlseafood.com...");
        await page.fill('input[type="email"]', 'tariq@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');

        await page.waitForTimeout(5000);
        log(`Logged in. Title: ${await page.title()}`);

        // 1. Dashboard
        log("Checking Global Dashboard...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/dashboard', { timeout: 60000 });
        await page.waitForTimeout(5000);

        const dashboardText = await page.innerText('body');
        if (dashboardText.includes("Invalid Date")) {
            log("FAIL: 'Invalid Date' found on CEO dashboard.");
        } else {
            log("PASS: Global Dashboard clean.");
        }
        await page.screenshot({ path: 'd:/OPS/phase8_v5_ceo_global.png' });

        // 2. Context Switch
        log("Switching to Kaimana...");
        // Look for location switcher. In Layout.jsx?
        // Let's assume there's a location dropdown in the header/nav.
        // Or we can just navigate to a URL that includes location if supported.
        // Most apps use a dropdown.

        await page.click('button:has-text("JAKARTA")' || 'header select'); // Try to find the location button
        await page.waitForTimeout(1000);
        await page.click('text=Kaimana');
        await page.waitForTimeout(3000);

        log(`Switched. Checking URL/Title...`);
        const switchedText = await page.innerText('body');
        if (switchedText.includes("KAIMANA")) {
            log("PASS: Context switch to Kaimana successful.");
        }

        if (switchedText.includes("Invalid Date")) {
            log("FAIL: 'Invalid Date' found after context switch.");
        } else {
            log("PASS: Kaimana view clean.");
        }
        await page.screenshot({ path: 'd:/OPS/phase8_v5_ceo_kaimana.png' });

        log("--- END PHASE 8: CEO FLOW ---");

    } catch (e) {
        log(`ERROR: ${e.message}`);
        await page.screenshot({ path: 'd:/OPS/phase8_v5_ceo_error.png' });
    } finally {
        await browser.close();
    }
})();
