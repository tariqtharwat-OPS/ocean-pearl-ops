const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Admin SDK with potential fallback
if (admin.apps.length === 0) {
    try {
        const serviceAccount = require('../functions/service-account.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.log("⚠️ No service-account.json found. Trying default credentials...");
        admin.initializeApp({
            projectId: 'oceanpearl-ops'
        });
    }
}
const db = getFirestore();

// Simulation Config
const SIM_USERS = [
    { email: 'manager_sim@ops.com', role: 'location_admin', loc: 'jakarta', name: 'Sim Manager' },
    { email: 'staff_sim@ops.com', role: 'operator', loc: 'jakarta', unit: 'unit_a', name: 'Sim Worker' },
    { email: 'tariq_sim@ops.com', role: 'admin', loc: 'global', name: 'Sim CEO' }
];

async function runGrandTour() {
    console.log("🦈 Starting SHARK Grand Tour Simulation...");

    // 1. Create/Verify Users
    console.log("\n[1] Verifying User Team...");
    for (const u of SIM_USERS) {
        try {
            // Check if exists
            let userRecord;
            try {
                userRecord = await admin.auth().getUserByEmail(u.email);
            } catch (e) {
                if (e.code === 'auth/user-not-found') {
                    console.log(`Creating ${u.name}...`);
                    userRecord = await admin.auth().createUser({
                        email: u.email,
                        password: 'password123',
                        displayName: u.name
                    });
                } else throw e;
            }

            // Update Firestore Profile
            await db.collection('users').doc(userRecord.uid).set({
                displayName: u.name,
                email: u.email,
                role: u.role,
                locationId: u.loc,
                unitId: u.unit || null,
                createdAt: new Date().toISOString()
            }, { merge: true });

            u.uid = userRecord.uid; // Store UID for later
            console.log(`✅ ${u.name} Ready (${u.uid})`);

        } catch (e) {
            console.error(`❌ Failed to prep ${u.name}:`, e.message);
        }
    }

    // 2. Simulate User Actions (Calling Functions directly via HTTP triggers logic or mocking)
    // Since we are running as a script, we can mock the "Callable" context by invoking logic or just inserting directly
    // but the user wants to test "Permissions".
    // Best way to test permissions is to try to write to Firestore via CLIENT SDK rules which we can't do easily here.
    // Instead, we will simulate the "Business Logic" flow via function calls (by updating DB state that triggers functions).

    // Task A: Worker Stock In
    console.log("\n[2] Worker Sim: Receiving Tuna...");
    const worker = SIM_USERS.find(u => u.role === 'operator');
    if (worker) {
        const txnRef = db.collection('transactions').doc();
        await txnRef.set({
            type: 'PURCHASE_RECEIVE',
            locationId: worker.loc,
            unitId: worker.unit,
            itemId: 'tuna_yellowfin',
            quantityKg: 100,
            pricePerKg: 50000,
            supplierId: 'sup_budi',
            paymentMethod: 'cash',
            finalized: true,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            userId: worker.uid,
            skipAudit: false // Let Shark see it
        });
        console.log(`✅ Worker submitted Transaction ${txnRef.id}`);

        // Wait for Shark
        console.log("... Waiting for Shark Analysis ...");
        await new Promise(r => setTimeout(r, 4000));

        const updated = await txnRef.get();
        const data = updated.data();
        if (data.auditStatus) {
            console.log(`🦈 Shark Analysis: ${data.auditStatus} (Risk: ${data.risk_score})`);
            console.log(`📝 Note: ${data.ai_analysis}`);
        } else {
            console.warn("⚠️ Shark did not reply in time (or trigger failed).");
        }
    }

    // Task B: Manager Check Stock (Read)
    console.log("\n[3] Manager Sim: Checking Stock...");
    const mgr = SIM_USERS.find(u => u.role === 'location_admin');
    if (mgr) {
        const stockRef = db.doc(`locations/${mgr.loc}/units/unit_a/stock/tuna_yellowfin`); // simplified path
        // In V1 structure: locations/{loc}/stock/{itemId} ? Or unit level?
        // Let's check logic: functions write to locations/{loc}/stock usually for aggregation? 
        // Actually shark_brain.js reads `locations/${userContext.locationId}/stock`.
        const stockSnap = await db.collection(`locations/${mgr.loc}/stock`).limit(1).get();
        console.log(`✅ Manager sees ${stockSnap.size} stock items.`);
    }

    // Task C: CEO High Risk Alert
    console.log("\n[4] CEO Sim: Triggering High Risk Event...");
    const ceo = SIM_USERS.find(u => u.role === 'admin');
    if (ceo && worker) {
        const riskyRef = db.collection('transactions').doc();
        await riskyRef.set({
            type: 'Production_Out', // Invalid type? Or just high value
            locationId: worker.loc,
            unitId: worker.unit,
            itemId: 'gold_bars', // Suspicious
            quantityKg: 1000,
            pricePerKg: 1000000,
            finalized: true,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            userId: worker.uid,
            skipAudit: false
        });
        console.log(`⚠️ Submitted Risky Transaction ${riskyRef.id}`);

        await new Promise(r => setTimeout(r, 4000));
        const check = await riskyRef.get();
        console.log(`🦈 Shark Verdict: ${check.data().auditStatus} / ${check.data().risk_score}`);
    }

    console.log("\n🦈 Grand Tour Complete.");
    process.exit(0);
}

runGrandTour();
