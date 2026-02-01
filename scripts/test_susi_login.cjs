const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        console.log("LOGIN TEST: susi.sim5@oceanpearl.com / Password123!");
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'susi.sim5@oceanpearl.com');
        await page.fill('input[type="password"]', 'Password123!');
        await page.click('button:has-text("Sign In")');

        await page.waitForTimeout(5000);
        console.log("Current URL:", page.url());

        const error = await page.locator('.text-red-500, .bg-red-50').innerText().catch(() => "No error visible");
        console.log("Error text:", error);

        await page.screenshot({ path: 'd:/OPS/susi_login_test.png' });

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
