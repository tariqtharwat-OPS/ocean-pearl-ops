/**
 * PHASE X - GATE 2 - SIMPLIFIED PRODUCTION TEST
 * Single test to validate form interaction before full cycle
 */

const { chromium } = require('playwright');

const PRODUCTION_URL = 'https://oceanpearl-ops.web.app';
const OPERATOR = { email: 'operator_kaimana@ops.com', password: 'OpsTeri2026!' };

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('1. Logging in...');
        await page.goto(PRODUCTION_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.fill('input[type="email"]', OPERATOR.email);
        await page.fill('input[type="password"]', OPERATOR.password);
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(3000);
        console.log('✅ Logged in');

        console.log('2. Navigating to Production...');
        await page.goto(`${PRODUCTION_URL}/production`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'd:/OPS/test_production_page.png', fullPage: true });
        console.log('✅ Production page loaded');

        console.log('3. Analyzing form structure...');
        const allInputs = await page.$$('input');
        console.log(`Found ${allInputs.length} input elements`);

        const numberInputs = await page.$$('input[type="number"]');
        console.log(`Found ${numberInputs.length} number input elements`);

        const selects = await page.$$('select');
        console.log(`Found ${selects.length} select elements`);

        // Try to fill the input weight field
        console.log('4. Attempting to fill Input Weight...');
        try {
            // The input weight field - try different selectors
            const inputWeightSelectors = [
                'input[placeholder*="0"]',
                'input[type="number"]',
                '[name*="input"], [name*="weight"]'
            ];

            for (const selector of inputWeightSelectors) {
                try {
                    await page.fill(selector, '50', { timeout: 5000 });
                    console.log(`✅ Filled using selector: ${selector}`);
                    break;
                } catch (e) {
                    console.log(`❌ Selector failed: ${selector}`);
                }
            }
        } catch (error) {
            console.log('❌ Could not fill input weight:', error.message);
        }

        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'd:/OPS/test_production_filled.png', fullPage: true });

        console.log('✅ Test complete - check screenshots');

    } catch (error) {
        console.error('ERROR:', error);
        await page.screenshot({ path: 'd:/OPS/test_production_error.png', fullPage: true });
    } finally {
        await browser.close();
    }
})();
