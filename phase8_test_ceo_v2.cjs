const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();

    let logs = [];
    const log = (msg) => { console.log(msg); logs.push(msg); };

    try {
        log("--- START PHASE 8: CEO FLOW (FIXED) ---");

        await page.goto('https://oceanpearl-ops.firebaseapp.com/login', { timeout: 60000 });
        await page.fill('input[type="email"]', 'tariq@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);

        log("Switching to Kaimana...");
        // Select Kaimana from the location dropdown in header
        await page.selectOption('header select', 'kaimana');
        await page.waitForTimeout(2000);

        // Confirmation modal should appear
        log("Confirming Switch...");
        await page.click('button:has-text("Confirm Switch")');
        await page.waitForTimeout(5000); // Switching delay

        const bodyText = await page.innerText('body');
        log(`Switched. Body contains KAIMANA: ${bodyText.includes("KAIMANA")}`);

        if (bodyText.includes("Invalid Date")) {
            log("FAIL: 'Invalid Date' found on Kaimana Dashboard.");
        } else {
            log("PASS: Kaimana Dashboard clean.");
        }

        // 2. Report Check
        log("Navigating to Reports...");
        await page.goto('https://oceanpearl-ops.firebaseapp.com/reports', { timeout: 60000 });
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'd:/OPS/phase8_v5_ceo_reports.png' });

        log("--- END PHASE 8: CEO FLOW ---");

    } catch (e) {
        log(`ERROR: ${e.message}`);
        await page.screenshot({ path: 'd:/OPS/phase8_v5_ceo_error.png' });
    } finally {
        await browser.close();
    }
})();
