import { test, expect } from '@playwright/test';

const BASE_URL = 'https://oceanpearl-ops.web.app';
const PASSWORD = 'OceanPearl2026!';

test.describe('CEO Release Gate - Production Acceptance', () => {

    test('1. CEO Login & Context Guard', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.fill('input[type="email"]', 'tariq@oceanpearlseafood.com');
        await page.fill('input[type="password"]', PASSWORD);
        await page.click('button[type="submit"]');

        // Verify Dashboard
        await expect(page.locator('h1')).toContainText(/Dashboard|Beranda/);

        // Context Switch to Kaimana (VIEW_AS)
        await page.click('[id^="context-switcher"]');
        await page.selectOption('select#location-select', 'kaimana');
        await page.selectOption('select#mode-select', 'VIEW_AS');
        await page.click('button#confirm-context');

        // Verify Read Only Curtain/Indicator
        await expect(page.locator('text=View Mode (Read Only)')).toBeVisible();

        // Verify Wallet Action Blocked
        await page.goto(`${BASE_URL}/wallet`);
        const addBtn = page.locator('button:has-text("New Request")');
        if (await addBtn.isVisible()) {
            await expect(addBtn).toBeDisabled();
        }
    });

    test('2. Unsaved Changes Modal', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.fill('input[type="email"]', 'op_teri_usi@ops.com');
        await page.fill('input[type="password"]', PASSWORD);
        await page.click('button[type="submit"]');

        await page.goto(`${BASE_URL}/receiving`);
        await page.fill('input[placeholder="0.00"]', '10'); // Trigger dirty

        // Try to navigate to home
        await page.click('a[href="/"]');

        // Verify Modal
        await expect(page.locator('text=Unsaved Changes')).toBeVisible();
    });
});
