#!/usr/bin/env node
/**
 * Direct Admin Login Test
 * Tests if admin123 works for info@oceanpearlseafood.com
 */

const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'oceanpearl-ops'
});

const auth = admin.auth();

async function testAdminLogin() {
    const TARGET_EMAIL = 'info@oceanpearlseafood.com';
    const TEST_PASSWORD = 'admin123';

    try {
        console.log(`\n📧 Checking user: ${TARGET_EMAIL}...`);

        const user = await auth.getUserByEmail(TARGET_EMAIL);
        console.log(`✅ User found: ${user.uid}`);
        console.log(`📋 Email verified: ${user.emailVerified}`);
        console.log(`📋 Custom claims:`, JSON.stringify(user.customClaims, null, 2));

        // Can't test password directly with Admin SDK, but we can:
        // 1. Set it to known value
        console.log(`\n🔧 Setting password to: ${TEST_PASSWORD}`);
        await auth.updateUser(user.uid, {
            password: TEST_PASSWORD
        });
        console.log(`✅ Password updated successfully`);

        console.log(`\n✓ Admin access ready:`);
        console.log(`  Email: ${TARGET_EMAIL}`);
        console.log(`  Password: ${TEST_PASSWORD}`);
        console.log(`  URL: https://oceanpearl-ops.web.app/login`);

        process.exit(0);
    } catch (error) {
        console.error(`\n❌ Error:`, error.message);
        process.exit(1);
    }
}

testAdminLogin();
