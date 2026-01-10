const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth'); // Correct modular import for Auth
const { getFirestore } = require('firebase-admin/firestore');

// Initialize (if running locally/standalone)
if (admin.apps.length === 0) {
    const serviceAccount = require('../functions/service-account.json'); // You'll need this locally, or use default if on cloud
    // For this simulation script, we assume specific env var or authenticated gcloud session if no key.
    // simpler: use existing functions config if running via 'firebase functions:shell' but here we are script.
    // Let's assume we run this with `firebase emulators:exec` OR we just use standard admin init if we have creds.
    // For now, let's try default.
    admin.initializeApp();
}

const db = getFirestore();
const auth = getAuth();

async function seed() {
    console.log("🌱 Seeding Mock Data...");

    // 1. Create Users
    const users = [
        {
            uid: 'manager_jakarta',
            email: 'manager_jakarta@ops.com',
            password: 'password123',
            displayName: 'Budi Manager',
            role: 'location_admin',
            locationId: 'jakarta',
            unitId: null,
            phone: '+628123456789'
        },
        {
            uid: 'staff_unit_a',
            email: 'staff_unit_a@ops.com',
            password: 'password123',
            displayName: 'Sari Operator',
            role: 'operator',
            locationId: 'jakarta',
            unitId: 'unit_a',
            phone: '+628987654321'
        }
    ];

    for (const u of users) {
        try {
            // Check if exists
            try {
                await auth.getUser(u.uid);
                console.log(`User ${u.email} exists.`);
            } catch (e) {
                await auth.createUser({
                    uid: u.uid,
                    email: u.email,
                    password: u.password,
                    displayName: u.displayName
                });
                console.log(`Created Auth: ${u.email}`);
            }

            // Set Firestore Profile
            await db.collection('users').doc(u.uid).set({
                displayName: u.displayName,
                email: u.email,
                role: u.role,
                locationId: u.locationId,
                unitId: u.unitId,
                phone: u.phone,
                createdAt: new Date().toISOString()
            }, { merge: true });
            console.log(`Synced Firestore: ${u.email}`);

        } catch (e) {
            console.error(`Error Seeding ${u.email}:`, e);
        }
    }

    // 2. Inventory (Stock)
    const stockRef = db.doc('locations/jakarta/units/unit_a/stock/tuna_yellowfin_whole');
    await stockRef.set({
        name: 'Yellowfin Tuna Round',
        quantityKg: 540.5,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log("📦 Seeded Stock: 540.5kg Tuna");

    // 3. Transactions (Recent)
    const recentTxns = [
        {
            type: 'PURCHASE_RECEIVE',
            amount: 4500000,
            quantityKg: 100,
            itemId: 'tuna_yellowfin',
            supplierId: 'sup_budi',
            timestamp: new Date().toISOString(),
            status: 'finalized',
            description: 'Mock Purchase A'
        },
        {
            type: 'PRODUCTION_OUT',
            amount: 0,
            quantityKg: 50,
            itemId: 'tuna_yellowfin',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            status: 'finalized',
            description: 'Processing Batch A'
        }
    ];

    for (const t of recentTxns) {
        await db.collection('transactions').add(t);
    }
    console.log("💳 Seeded Transactions.");

    console.log("✅ Seeding Complete. You can now login as these users.");
    process.exit(0);
}

seed();
