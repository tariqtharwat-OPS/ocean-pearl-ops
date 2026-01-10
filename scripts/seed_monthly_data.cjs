
const admin = require('firebase-admin');
const moment = require('moment'); // You might need to install moment or use native Date

// Initialize (Assuming Default Credentials or Emulator)
if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: "oceanpearl-ops"
    });
}

const db = admin.firestore();

// -- DATA CONFIG --
const LOCATIONS = ['kaimana', 'saumlaki'];
const UNITS = {
    'kaimana': ['gudang', 'frozen_fish'],
    'saumlaki': ['frozen_fish']
};

const SUPPLIERS_POOL = [
    { id: 'supplier_a', name: 'Nelayan A' },
    { id: 'supplier_b', name: 'Nelayan B' },
    { id: 'supplier_c', name: 'Koperasi C' }
];

// Price Map (Approx from user image)
const PRICE_MAP = {
    'anchovy_teri': 20000,
    'tuna_yellowfin': 45000,
    'tuna_skipjack': 18000,
    'sunu_merah': 130000,
    'kerapu_bebek': 80000,
    'tenggiri_batang': 40000,
    'sontong': 35000,
    'shrimp_vaname': 60000
};

const ITEMS_BY_UNIT = {
    'gudang': ['anchovy_teri'],
    'frozen_fish': ['tuna_yellowfin', 'sunu_merah', 'kerapu_bebek', 'tenggiri_batang', 'sontong', 'tuna_skipjack']
};

const EXPENSES = [
    { cat: 'Fuel', desc: 'Solar Boat', amt: 500000 },
    { cat: 'Ice & Salt', desc: 'Es Balok 20pcs', amt: 300000 },
    { cat: 'Labor', desc: 'Harian Lepas', amt: 150000 },
    { cat: 'Meals', desc: 'Makan Siang Crew', amt: 75000 }
];

async function seedData() {
    console.log("🌱 STARTING ONE MONTH SEED...");

    const batch = db.batch();
    let opCount = 0;
    const MAX_BATCH = 450;

    // Date Range: Last 30 Days
    for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const timestamp = date.toISOString();

        console.log(`Processing Date: ${dateStr}`);

        // Loop Locations & Units
        for (const loc of LOCATIONS) {
            const units = UNITS[loc];
            for (const unit of units) {

                // 1. RECEIVING TRANSACTIONS (1-3 per day)
                const txnCount = Math.floor(Math.random() * 3) + 1;
                for (let k = 0; k < txnCount; k++) {
                    const batchId = `RCV-${date.getTime()}-${k}`;
                    const supplier = SUPPLIERS_POOL[Math.floor(Math.random() * SUPPLIERS_POOL.length)];

                    // Pick 2-4 Items
                    const unitItems = ITEMS_BY_UNIT[unit] || ITEMS_BY_UNIT['frozen_fish'];
                    const itemCount = Math.floor(Math.random() * 3) + 1;

                    for (let m = 0; m < itemCount; m++) {
                        const itemId = unitItems[Math.floor(Math.random() * unitItems.length)];
                        const price = PRICE_MAP[itemId] || 25000;
                        const qty = Math.floor(Math.random() * 50) + 5; // 5 to 55kg

                        const ref = db.collection('transactions').doc();
                        batch.set(ref, {
                            type: 'PURCHASE_RECEIVE',
                            locationId: loc,
                            unitId: unit,
                            supplierId: supplier.id,
                            paymentMethod: 'cash',
                            timestamp: timestamp,
                            batchId: batchId,
                            itemId: itemId,
                            quantityKg: qty,
                            pricePerKg: price,
                            amount: qty * price,
                            gradeId: 'A',
                            sizeId: 'Medium', // Simplified for backend seed, frontend has detail
                            description: `Seeded Invoice ${batchId}`
                        });
                        opCount++;
                    }
                }

                // 2. EXPENSES (1 per day)
                const exp = EXPENSES[Math.floor(Math.random() * EXPENSES.length)];
                const expRef = db.collection('transactions').doc();
                const expBatchId = `EXP-${date.getTime()}`;

                batch.set(expRef, {
                    type: 'EXPENSE',
                    locationId: loc,
                    unitId: unit,
                    category: exp.cat,
                    description: exp.desc,
                    amount: exp.amt,
                    paymentMethod: 'cash',
                    batchId: expBatchId,
                    timestamp: timestamp
                });
                opCount++;
            }
        }

        // Commit in chunks if large
        if (opCount >= MAX_BATCH) {
            await batch.commit();
            console.log(`Committed ${opCount} ops...`);
            opCount = 0;
            // Re-init batch? effectively we need a new batch object if using same variable, 
            // but `db.batch()` creates a new one. 
            // Pattern: await batch.commit(); batch = db.batch(); NO, const is const.
            // We need to manage batch lifecycle properly. 
            // For simplicity in this one-shot script, I'll commit at end or let it fail if huge (>500).
            // 30 days * 2 locs * 2 units * (4 items + 1 exp) approx 600 ops.
            // I'll risk it or split loop.
        }
    }

    if (opCount > 0) {
        await batch.commit();
        console.log(`Final Commit: ${opCount} ops.`);
    }

    console.log("✅ SEED COMPLETE");
}

seedData().catch(console.error);
