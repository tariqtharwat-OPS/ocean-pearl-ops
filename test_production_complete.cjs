/**
 * PHASE X - GATE 2 - COMPLETE PRODUCTION TEST
 * Full production run with proper selectors
 */

const { chromium } = require('playwright');
const path = require('path');

const PRODUCTION_URL = 'https://oceanpearl-ops.web.app';
const OPERATOR = { email: 'operator_kaimana@ops.com', password: 'OpsTeri2026!' };
const SCREENSHOT_DIR = path.join(__dirname, 'docs', 'active', 'artifacts', 'phase_x', 'gate2');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('=== GATE 2 - PRODUCTION RUN TEST ===\n');

        // Login
        console.log('1. Logging in as Operator...');
        await page.goto(PRODUCTION_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.fill('input[type="email"]', OPERATOR.email);
        await page.fill('input[type="password"]', OPERATOR.password);
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(3000);
        console.log('✅ Logged in\n');

        // Navigate to Production
        console.log('2. Navigating to Production...');
        await page.goto(`${PRODUCTION_URL}/production`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'prod_test_01_page_loaded.png'), fullPage: true });
        console.log('✅ Production page loaded\n');

        // Fill Input Weight
        console.log('3. Filling Input Weight (50 kg)...');
        await page.fill('input[placeholder*="0"]', '50');
        await page.waitForTimeout(1000);
        console.log('✅ Input weight filled\n');

        // Fill Output Weight - in the table row
        console.log('4. Filling Output Weight (35 kg)...');
        // The output weight is in a table row - look for the weight input in Processing Output section
        const outputWeightInput = await page.$('tbody input[type="number"]');
        if (outputWeightInput) {
            await outputWeightInput.fill('35');
            console.log('✅ Output weight filled\n');
        } else {
            console.log('⚠️  Could not find output weight input\n');
        }

        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'prod_test_02_form_filled.png'), fullPage: true });

        // Submit
        console.log('5. Submitting production run...');
        const submitButton = await page.$('button:has-text("Print Report"), button:has-text("Save"), button:has-text("Submit"), button[type="submit"]');
        if (submitButton) {
            await submitButton.click();
            await page.waitForTimeout(3000);
            console.log('✅ Production run submitted\n');
        } else {
            console.log('⚠️  Could not find submit button\n');
        }

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'prod_test_03_after_submit.png'), fullPage: true });

        // Check for success
        const bodyText = await page.textContent('body');
        if (bodyText.includes('NaN')) {
            console.log('❌ NaN ERROR DETECTED!');
        } else {
            console.log('✅ No NaN errors');
        }

        console.log('\n=== TEST COMPLETE ==');
        console.log('Check screenshots in:', SCREENSHOT_DIR);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'prod_test_error.png'), fullPage: true });
    } finally {
        await browser.close();
    }
})();
