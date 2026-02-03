const { onRequest } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

const db = getFirestore();

exports.seedRealisticData = onRequest({ region: "asia-southeast1", timeoutSeconds: 300 }, async (req, res) => {
    const batch = db.batch();
    const log = [];

    // ============================================
    // 1. CANONICAL USERS (From OPS_USERS_ROSTER.md)
    // ============================================
    const USERS = [
        { email: 'tariq@oceanpearlseafood.com', name: 'Tariq (CEO)', role_v2: 'HQ_ADMIN', loc: 'jakarta', unit: 'office' },
        { email: 'sarah@oceanpearlseafood.com', name: 'Sarah (HQ Admin)', role_v2: 'HQ_ADMIN', loc: 'jakarta', unit: 'office' },
        { email: 'budi@oceanpearlseafood.com', name: 'Pak Budi (Manager)', role_v2: 'LOC_MANAGER', loc: 'kaimana', unit: 'frozen_fish' },
        { email: 'usi@oceanpearlseafood.com', name: 'Ibu Usi (Operator)', role_v2: 'UNIT_OP', loc: 'kaimana', unit: 'gudang_ikan_teri' },
        { email: 'investor@oceanpearlseafood.com', name: 'Lukas (Investor)', role_v2: 'READ_ONLY', loc: null, unit: null }
    ];

    for (const u of USERS) {
        let uid;
        try {
            const userRecord = await admin.auth().getUserByEmail(u.email);
            uid = userRecord.uid;
            await admin.auth().updateUser(uid, {
                displayName: u.name,
                password: 'OceanPearl2026!', // Standard Password
                emailVerified: true
            });
            log.push(`Updated Auth: ${u.email}`);
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                const newUser = await admin.auth().createUser({
                    email: u.email,
                    password: 'OceanPearl2026!',
                    displayName: u.name,
                    emailVerified: true
                });
                uid = newUser.uid;
                log.push(`Created Auth: ${u.email}`);
            } else {
                log.push(`Error Auth ${u.email}: ${e.message}`);
                continue;
            }
        }

        const userRef = db.collection('users').doc(uid);
        batch.set(userRef, {
            email: u.email,
            displayName: u.name,
            role_v2: u.role_v2,
            locationId: u.loc,
            unitId: u.unit,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            setupVersion: 'brag_worthy_1.0'
        }, { merge: true });
    }

    // ============================================
    // 2. LOCATIONS & ITEMS
    // ============================================
    // Ensure Kaimana & Jakarta exist
    const locs = [
        { id: 'kaimana', label: 'Kaimana', units: ['frozen_fish', 'gudang_ikan_teri'] },
        { id: 'jakarta', label: 'HQ Jakarta', units: ['office', 'cold_storage'] }
    ];

    for (const loc of locs) {
        batch.set(db.collection('locations').doc(loc.id), { label: loc.label, active: true }, { merge: true });
        for (const unitId of loc.units) {
            const walletId = `${loc.id}_${unitId}`;
            // Seed wallet with ample cash
            batch.set(db.doc(`site_wallets/${walletId}`), {
                balance: 100000000, // 100 Juta start
                locationId: loc.id,
                unitId: unitId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }
    }

    // HQ Wallet
    batch.set(db.doc('site_wallets/HQ'), {
        balance: 1000000000, // 1 Milyar start
        locationId: 'jakarta',
        type: 'HQ',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Items
    const items = [
        { id: 'kakap_merah', name: 'Red Snapper (Whole)', uom: 'kg' },
        { id: 'tuna_whole', name: 'Yellowfin Tuna (Whole)', uom: 'kg' },
        { id: 'tuna_loin', name: 'YF Tuna Loin', uom: 'kg' },
        { id: 'kakap_fillet', name: 'Red Snapper Fillet', uom: 'kg' },
        { id: 'teri_raw', name: 'Anchovy (Raw)', uom: 'kg' },
        { id: 'teri_dry', name: 'Anchovy (Dried)', uom: 'kg' }
    ];
    for (const item of items) {
        batch.set(db.collection('items').doc(item.id), { ...item, active: true }, { merge: true });
    }

    // ============================================
    // 3. TRANSACTION HISTORY (7 Days)
    // ============================================
    // Helper to generic transaction
    const createTx = (id, type, dateOffset, data) => {
        const date = new Date();
        date.setDate(date.getDate() - (7 - dateOffset)); // 1 = 6 days ago
        const ref = db.collection('transactions').doc(id);
        batch.set(ref, {
            ...data,
            type,
            status: 'COMPLETED',
            timestamp: admin.firestore.Timestamp.fromDate(date),
            createdAt: admin.firestore.Timestamp.fromDate(date),
            user: 'system_seed'
        });
        return ref;
    };

    // Day 1: Purchase Receiving
    createTx('tx_seed_01', 'PURCHASE_RECEIVE', 1, {
        locationId: 'kaimana',
        unitId: 'frozen_fish',
        supplierId: 'Nelayan A',
        items: [{ itemId: 'kakap_merah', qty: 200, price: 40000, total: 8000000 }],
        totalAmount: 8000000
    });

    createTx('tx_seed_02', 'PURCHASE_RECEIVE', 1, {
        locationId: 'kaimana',
        unitId: 'frozen_fish',
        supplierId: 'Nelayan B',
        items: [{ itemId: 'tuna_whole', qty: 500, price: 35000, total: 17500000 }],
        totalAmount: 17500000
    });

    // Day 2: Production (Cutting)
    createTx('tx_seed_03', 'PRODUCTION_RUN', 2, {
        locationId: 'kaimana',
        unitId: 'frozen_fish',
        inputs: [{ itemId: 'kakap_merah', qty: 100 }],
        outputs: [{ itemId: 'kakap_fillet', qty: 50 }], // 50% yield
        batchId: 'BATCH-KD-001'
    });

    createTx('tx_seed_04', 'PRODUCTION_RUN', 2, {
        locationId: 'kaimana',
        unitId: 'frozen_fish',
        inputs: [{ itemId: 'tuna_whole', qty: 200 }],
        outputs: [{ itemId: 'tuna_loin', qty: 100 }], // 50% yield
        batchId: 'BATCH-TN-001'
    });

    // Day 3: Expenses
    createTx('tx_seed_05', 'EXPENSE', 3, {
        locationId: 'kaimana',
        unitId: 'frozen_fish',
        category: 'Supplies',
        description: 'Ice Purchase',
        amount: 500000
    });

    // Day 5: Sales (Ex-Jakarta)
    createTx('tx_seed_06', 'SALE_INVOICE', 5, {
        locationId: 'jakarta',
        unitId: 'cold_storage',
        customerId: 'GlobalSeafoods',
        items: [{ itemId: 'kakap_fillet', qty: 50, price: 120000, total: 6000000 }],
        totalAmount: 6000000
    });

    // Day 6: Anchovy
    createTx('tx_seed_07', 'PURCHASE_RECEIVE', 6, {
        locationId: 'kaimana',
        unitId: 'gudang_ikan_teri',
        supplierId: 'Nelayan C',
        items: [{ itemId: 'teri_raw', qty: 100, price: 5000, total: 500000 }],
        totalAmount: 500000
    });

    // Day 7: Anchovy Production
    createTx('tx_seed_08', 'PRODUCTION_RUN', 7, {
        locationId: 'kaimana',
        unitId: 'gudang_ikan_teri',
        inputs: [{ itemId: 'teri_raw', qty: 100 }],
        outputs: [{ itemId: 'teri_dry', qty: 40 }], // 40% yield
        batchId: 'BATCH-TR-001'
    });

    // ============================================
    // 4. AGGREGATES / STOCK (Simplified SNAPSHOT)
    // ============================================
    // Ideally postTransaction updates this, but for seeding we cheat a bit or trust the aggregator picks it up.
    // We will just set the current stock specifically to match the history manually to ensure consistency

    // Kaimana Frozen Fish
    batch.set(db.doc('inventory/kaimana_frozen_fish'), {
        'kakap_merah': 100, // 200 in - 100 processed
        'tuna_whole': 300, // 500 in - 200 processed
        'tuna_loin': 100, // Produced
        'kakap_fillet': 0 // Produced 50, transferred/sold (simulated logic)
    }, { merge: true });

    // Kaimana Teri
    batch.set(db.doc('inventory/kaimana_gudang_ikan_teri'), {
        'teri_raw': 0, // 100 in - 100 proc
        'teri_dry': 40
    }, { merge: true });

    // Jakarta (Sale consumed the 50kg fillet)
    batch.set(db.doc('inventory/jakarta_cold_storage'), {
        'kakap_fillet': 0
    }, { merge: true });


    await batch.commit();

    // Trigger post-processing aggregations if needed, but the data is there.

    log.push('Data Seeded Successfully');
    res.status(200).json({ success: true, log });
});
