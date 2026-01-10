const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Admin SDK if not already
if (!admin.apps.length) {
    const serviceAccount = require('../serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = getFirestore();

async function seedPhase8() {
    console.log("=== SEEDING PHASE 8 (REALISTIC DATA) ===");

    const batch = db.batch();

    // 1. UPDATE WALLETS (Realistic Balances)
    // - Gudang Teri Kaimana (Active buying): 50.000.000
    // - Frozen Kaimana (Active buying): 75.000.000
    // - Saumlaki Frozen (Starting): 25.000.000
    // - HQ: 1.000.000.000
    const wallets = {
        'HQ': 1000000000,
        'gudang_ikan_teri': 50000000,
        'frozen_fish': 75000000,
        // Assuming unit IDs are globally unique or referenced by ID
    };

    console.log("Updating Wallets...");
    for (const [id, bal] of Object.entries(wallets)) {
        // Need to find location for unit... but wallet ID is usually unit ID
        const ref = db.doc(`site_wallets/${id}`);
        batch.set(ref, { balance: bal, updatedAt: new Date() }, { merge: true });
    }

    // 2. SUPPLIERS (REALISTIC)
    const suppliers = [
        { id: 'sup_cv_nelayan_makmur', name: 'CV. Nelayan Makmur', type: 'supplier', category: 'RAW_MATERIAL' },
        { id: 'sup_pt_shark_abadi', name: 'PT. Shark Abadi Logistics', type: 'supplier', category: 'SERVICE' },
        { id: 'sup_toko_berkah', name: 'Toko Berkah Jaya (Packaging)', type: 'supplier', category: 'SUPPLIES' },
        { id: 'sup_pertamina_local', name: 'SPBU Pertamina Local', type: 'supplier', category: 'FUEL' }
    ];

    console.log("Updating Suppliers...");
    for (const s of suppliers) {
        batch.set(db.collection('partners').doc(s.id), { ...s, active: true }, { merge: true });
    }

    // 3. USERS (SPECIFIC ROLES)
    // Defining users with required V2 roles
    const realisticUsers = [
        { email: 'investor_view@ops.com', name: 'Lukas (Investor)', role: 'viewer', role_v2: 'READ_ONLY', loc: null, unit: null },
        { email: 'admin_hq_sarah@ops.com', name: 'Sarah (HQ Admin)', role: 'admin', role_v2: 'HQ_ADMIN', loc: 'jakarta', unit: 'office' },
        { email: 'manager_kaimana_budi@ops.com', name: 'Pak Budi (Manager Kaimana)', role: 'manager', role_v2: 'LOC_MANAGER', loc: 'kaimana', unit: 'frozen_fish' },
        { email: 'op_teri_usi@ops.com', name: 'Usi (Adim Teri)', role: 'staff', role_v2: 'UNIT_OP', loc: 'kaimana', unit: 'gudang_ikan_teri' }
    ];

    console.log("Updating Users...");
    // We cannot use Auth SDK easily in this script unless we have privileges. 
    // We will update Firestore USER docs. Auth passwords must be set manually or via tool if not existing.
    // assuming these users might need creation.
    // For now, updating Firestore metadata is enough for logic tests if we use "run as" headers in tests, 
    // but for real login we need Auth. 
    // We will assume 'seed_production.js' handled the base auth, we just strictly set roles here.

    for (const u of realisticUsers) {
        // We need to look up UID by email or create dummy doc if not linked?
        // Better to use a lookup.
        try {
            const userRecord = await admin.auth().getUserByEmail(u.email);
            const ref = db.collection('users').doc(userRecord.uid);
            batch.set(ref, {
                displayName: u.name,
                role: u.role,
                role_v2: u.role_v2,
                locationId: u.loc,
                unitId: u.unit,
                email: u.email
            }, { merge: true });
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                console.log(`Creating user ${u.email}...`);
                const newUser = await admin.auth().createUser({
                    email: u.email,
                    password: 'OceanPearl2026!',
                    displayName: u.name,
                    emailVerified: true
                });
                const ref = db.collection('users').doc(newUser.uid);
                batch.set(ref, {
                    displayName: u.name,
                    role: u.role,
                    role_v2: u.role_v2,
                    locationId: u.loc,
                    unitId: u.unit,
                    email: u.email,
                    createdAt: new Date()
                });
            } else {
                console.error(`Error user ${u.email}:`, e);
            }
        }
    }

    await batch.commit();
    console.log("=== SEEDING COMPLETE ===");
}

seedPhase8().catch(console.error);
