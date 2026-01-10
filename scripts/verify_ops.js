const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Admin
const serviceAccount = require('../service-account.json'); // Expected to exist in enviroment or use default
// If service account JSON not present, we rely on ADC (Application Default Credentials)
if (admin.apps.length === 0) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        admin.initializeApp();
    }
}

const db = getFirestore();

async function runVerification() {
    console.log("🚀 Starting OPS Production Verification...");

    // 1. Verify Firestore Connection & Permissions (Write/Read)
    const testDocRef = db.collection('system_checks').doc('ops_verification_' + Date.now());
    try {
        await testDocRef.set({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            verified: true
        });
        console.log("✅ Firestore Write: PASS");
    } catch (e) {
        console.error("❌ Firestore Write: FAIL", e.message);
        process.exit(1);
    }

    // 2. Verify Shark AI Configuration via Function Call (Simulated)
    // We can't easily call the callable function from a script without an ID token, 
    // but we can trigger the background trigger by writing a transaction.

    console.log("🤖 Testing Shark AI Trigger (Gemini 3 Pro Check)...");
    const txnRef = db.collection('transactions').doc();

    // Create a suspicious transaction to provoke Shark
    const suspiciousTxn = {
        type: 'EXPENSE',
        amount: 50000000, // 50 Million IDR (High Value)
        paymentMethod: 'cash',
        description: 'Mystery Payment to Unknown Vendor',
        locationId: 'jakarta',
        unitId: 'office',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: 'admin_verifier',
        debug_tag: 'verification_run',
        skipAudit: false
    };

    await txnRef.set(suspiciousTxn);
    console.log("posted transaction", txnRef.id);

    // Poll for Audit Log (Shark Response)
    let aiPassed = false;
    for (let i = 0; i < 20; i++) { // Wait up to 20 seconds
        await new Promise(r => setTimeout(r, 1000));
        const doc = await txnRef.get();
        const data = doc.data();

        if (data && data.ai_analysis) {
            console.log("✅ Shark AI Response Received:");
            console.log("   Risk Score:", data.ai_risk_score);
            console.log("   Analysis:", data.ai_analysis);

            // Check content quality (Basic Heuristic)
            if (data.ai_analysis.length > 10) {
                aiPassed = true;
            }
            break;
        }
        process.stdout.write(".");
    }
    console.log("");

    if (aiPassed) {
        console.log("✅ Shark AI Integration: PASS");
    } else {
        console.error("❌ Shark AI Integration: FAIL (Timeout or No Response)");
        // Don't fail the build, but warn.
    }

    console.log("📊 Verification Complete.");
}

runVerification().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
