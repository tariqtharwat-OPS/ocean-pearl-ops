/**
 * Fix Admin Password - Direct Admin SDK
 */

const admin = require('firebase-admin');

// Initialize with Application Default Credentials
admin.initializeApp({
    projectId: 'oceanpearl-ops'
});

const auth = admin.auth();

async function fixAdminPassword() {
    const TARGET_UID = '5bQd2V96ZIMcr2PMBxNrXozlDcy1';
    const NEW_PASSWORD = 'admin123';

    try {
        console.log(`🔧 Updating password for UID: ${TARGET_UID}...`);

        await auth.updateUser(TARGET_UID, {
            password: NEW_PASSWORD
        });

        console.log(`✅ Password updated successfully!`);
        console.log(`\nCredentials:`);
        console.log(`  Email: info@oceanpearlseafood.com`);
        console.log(`  Password: ${NEW_PASSWORD}`);

        // Verify user exists
        const user = await auth.getUser(TARGET_UID);
        console.log(`\n📋 User verified:`);
        console.log(`  UID: ${user.uid}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Email Verified: ${user.emailVerified}`);
        console.log(`  Custom Claims:`, user.customClaims);

        process.exit(0);
    } catch (error) {
        console.error(`❌ Error:`, error.message);
        process.exit(1);
    }
}

fixAdminPassword();
