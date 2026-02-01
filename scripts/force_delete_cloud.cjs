const { chromium } = require('playwright');

(async () => {
    console.log("🌊 CEO EMERGENCY: CLOUD FUNCTION FORCED DELETE 🌊");

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto('https://oceanpearl-ops.web.app/login');
        await page.fill('input[type="email"]', 'tariq@oceanpearlseafood.com');
        await page.fill('input[type="password"]', 'OceanPearl2026!');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(5000);

        const uidsToDelete = [
            'TaYdvcAERaaENQDQnWL3Hx6lnEY2', // Susi sim5
            'sLKfRbiVPvbPQL1avYzlV5MoF542'  // Budi sim5
        ];

        for (const uid of uidsToDelete) {
            console.log(`📡 Calling manageUser(delete_user) for ${uid}...`);
            const result = await page.evaluate(async (targetUid) => {
                try {
                    const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js');
                    const functions = getFunctions();
                    const manageUser = httpsCallable(functions, 'manageUser');
                    const res = await manageUser({
                        targetUid: targetUid,
                        action: 'delete_user',
                        payload: {}
                    });
                    return res.data;
                } catch (e) {
                    return { error: e.message };
                }
            }, uid);
            console.log(`   Result:`, result);
        }

        console.log("✅ Forced deletion attempt complete.");

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
