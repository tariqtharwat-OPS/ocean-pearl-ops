
import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test('Fix and Verify Phase 2 Users (Manager, Operator, Investor)', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes

    const LOGIN_URL = 'https://oceanpearl-ops.web.app/login';
    const ADMIN_URL = 'https://oceanpearl-ops.web.app/admin';

    // --- HELPER: Admin Login ---
    async function loginAdmin() {
        // Console logging
        page.on('console', msg => console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`));
        page.on('pageerror', err => console.log(`[BROWSER ERROR] ${err.message}`));

        console.log("Navigating to Login...");
        await page.goto(LOGIN_URL);

        // Check if already logged in (redirected to home)
        if (page.url() === 'https://oceanpearl-ops.web.app/') {
            console.log("Already logged in. Logging out first to be safe...");
            await page.click('button[title="Logout"]');
            await page.waitForURL(LOGIN_URL);
        }

        await page.fill('input[type="email"]', 'info@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button:has-text("Sign In")');
        await page.waitForURL('https://oceanpearl-ops.web.app/');
    }

    // --- HELPER: Reset Password & Get It ---
    async function ensureUserExistsWithPassword(email) {
        // Clear previous listeners to avoid conflicts (e.g. create vs delete dialogs)
        page.removeAllListeners('dialog');

        console.log(`Ensuring clean state for ${email}...`);
        await page.goto(ADMIN_URL);

        // Wait for clean load
        await page.waitForTimeout(2000);
        // Check if we are really on Admin page
        if (page.url() !== ADMIN_URL) {
            console.log(`Redirected to ${page.url()} instead of Admin!`);
            throw new Error("Failed to reach Admin Panel");
        }

        // Click Users Tab
        const usersTab = page.locator('button:has-text("Users")');
        await usersTab.waitFor({ state: 'visible', timeout: 10000 });
        await usersTab.click();

        // Wait for list to load
        await page.waitForSelector('text=Fetching Personnel Data...', { state: 'detached', timeout: 30000 });
        await page.waitForTimeout(1000);

        // Search
        const searchInput = page.locator('input[placeholder*="Search"]');
        await searchInput.waitFor();
        await searchInput.fill(email);
        await page.waitForTimeout(2000); // UI Filter

        let row = page.locator(`tr:has-text("${email}")`);

        // IF FOUND -> DELETE
        const count = await row.count();
        if (count > 0) {
            console.log(`   User ${email} found (${count} rows)! DELETING to ensure clean state...`);

            // Dialog handling
            page.on('dialog', async dialog => {
                console.log(`[DIALOG] ${dialog.type()}: ${dialog.message()}`);
                if (dialog.type() === 'prompt') {
                    console.log(`   Accepting prompt with: ${email}`);
                    await dialog.accept(email);
                } else {
                    console.log('   Accepting confirmation');
                    await dialog.accept();
                }
            });

            try {
                await row.first().getByRole('button', { name: 'Manage' }).click();

                // Wait for Modal (Note: it's h3 not h2)
                await page.waitForSelector('h3:has-text("Edit")', { timeout: 5000 });
                console.log('   Edit Modal Visible');
                await page.waitForTimeout(500);

                const deleteBtn = page.locator('button:has-text("Delete User Permanently")');
                await deleteBtn.waitFor({ state: 'visible' });
                console.log('   Clicking Delete...');
                await deleteBtn.click({ force: true });
                console.log('   Delete Clicked');

                // Wait for deletion processing (toast or reload)
                // Modal should close
                await page.waitForSelector('h3:has-text("Edit")', { state: 'detached', timeout: 15000 });
                console.log('   Modal Closed (Deletion Successful)');
                await page.waitForTimeout(2000);
            } catch (e) {
                console.error(`   Deletion Failed for ${email}: ${e.message}`);
                await page.screenshot({ path: `failure_delete_${email}.png` });
                throw e;
            }
        }

        // CREATE NEW
        console.log(`   Creating fresh user ${email} with password123...`);

        // Form is inline
        const createForm = page.locator('form').filter({ hasText: 'Create User' });
        await createForm.waitFor();

        await createForm.locator('input[placeholder="Email"]').fill(email);
        await createForm.locator('input[placeholder="Password"]').fill('password123');
        await createForm.locator('input[placeholder="Full Name"]').fill(email.split('@')[0]);

        let role = 'UNIT_OP';
        if (email.includes('manager')) role = 'LOC_MANAGER';
        if (email.includes('investor')) role = 'INVESTOR';

        // Select Role
        const roleSelect = createForm.locator('select').first();
        await roleSelect.selectOption({ value: role });

        // Select Location
        const locSelect = createForm.locator('select').nth(1);
        await locSelect.selectOption({ label: 'Kaimana' });

        if (role === 'UNIT_OP' || role === 'INVESTOR') {
            await page.waitForTimeout(500); // Allow Unit select to render
            const unitSelect = createForm.locator('select').nth(2);
            await unitSelect.selectOption({ label: 'Gudang Teri' });
        }

        // Setup dialog handler for "Success" or "Error" alerts just in case
        page.on('dialog', async dialog => {
            console.log(`[CREATE DIALOG] ${dialog.type()}: ${dialog.message()}`);
            await dialog.accept();
        });

        await createForm.locator('button[type="submit"]').click();

        // Wait for creation to reflected in list
        await page.waitForTimeout(5000);

        // Check if created
        await page.fill('input[placeholder*="Search"]', '');
        await page.waitForTimeout(500);
        await page.fill('input[placeholder*="Search"]', email);
        await page.waitForTimeout(1000);

        row = page.locator(`tr:has-text("${email}")`);
        if (await row.count() === 0) {
            throw new Error(`Failed to create user ${email}`);
        }

        console.log(`   ✅ User ${email} Created.`);
        return 'password123';
    }

    // --- EXECUTION ---

    // 1. ADMIN - Reset All 3 Users First (to avoid constant re-login ops)
    // Actually we need to login as each to verify, so we have to toggle.

    // A. MANAGER
    console.log('\n--- 1. MANAGER (T06) ---');
    await loginAdmin();
    const managerPass = await ensureUserExistsWithPassword('manager@kaimana.com');
    await page.click('button[title="Logout"]');
    await page.waitForURL(LOGIN_URL);

    // Login & Verify
    console.log(`   Logging in as Manager...`);
    await page.fill('input[type="email"]', 'manager@kaimana.com');
    await page.fill('input[type="password"]', managerPass);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('https://oceanpearl-ops.web.app/');

    // Verify Manager has landed and has correct role
    const headerText = await page.locator('header').innerText();
    // Look for role badge or manager email
    if (!headerText.includes('LOC') && !headerText.includes('manager')) {
        console.log(`   Header Content: ${headerText}`);
        throw new Error('Manager role or identifier not found in header');
    }
    console.log('   ✅ Manager Verified (Header shows correct role)');
    await page.click('button[title="Logout"]');
    await page.waitForURL(LOGIN_URL);

    // B. OPERATOR
    console.log('\n--- 2. OPERATOR (T07) ---');
    await loginAdmin();
    const opPass = await ensureUserExistsWithPassword('operator@kaimana.com');
    await page.click('button[title="Logout"]');
    await page.waitForURL(LOGIN_URL);

    // Login & Verify
    console.log(`   Logging in as Operator...`);
    await page.fill('input[type="email"]', 'operator@kaimana.com');
    await page.fill('input[type="password"]', opPass);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('https://oceanpearl-ops.web.app/');

    const opHeader = await page.locator('header').innerText();
    // Should see Unit Label? Or just Location?
    console.log('   Operator Header:', opHeader);
    // Usually "Gudang Teri" is shown in sub-label
    // Or check Context Switcher presence (should NOT be there)
    // Check Nav
    const opNav = await page.locator('nav').innerText();
    expect(opNav).toContain('Requests'); // Base feature
    console.log('   ✅ Operator Verified');
    await page.click('button[title="Logout"]');
    await page.waitForURL(LOGIN_URL);


    // C. INVESTOR
    console.log('\n--- 3. INVESTOR (T08) ---');
    await loginAdmin();
    const invPass = await ensureUserExistsWithPassword('investor@kaimana.com');
    await page.click('button[title="Logout"]');
    await page.waitForURL(LOGIN_URL);

    // Login & Verify
    console.log(`   Logging in as Investor...`);
    await page.fill('input[type="email"]', 'investor@kaimana.com');
    await page.fill('input[type="password"]', invPass);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('https://oceanpearl-ops.web.app/');

    const invNav = await page.locator('nav').innerText();
    expect(invNav).not.toContain('Treasury');
    expect(invNav).toContain('Reports');

    await page.click('a[href="/reports"]');
    await page.waitForURL('**/reports');
    console.log('   ✅ Investor Verified (Reports Access)');

    await page.click('button[title="Logout"]');

    console.log('\n🎉 ALL PHASE 2 USERS VERIFIED!');
});
