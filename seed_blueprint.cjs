const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'oceanpearl-ops'
    });
}
const db = getFirestore();

const LOCATIONS = {
    jakarta: {
        id: 'jakarta',
        label: 'HQ Jakarta',
        units: [
            { id: 'hq_office', label: 'HQ Office', type: 'ADMIN', active: true },
            { id: 'jk_cold_storage', label: 'Jakarta Cold Storage', type: 'COLD_STORAGE', active: true },
            { id: 'jk_transport', label: 'Jakarta Transport', type: 'LOGISTICS', active: true }
        ]
    },
    kaimana: {
        id: 'kaimana',
        label: 'Kaimana',
        units: [
            { id: 'kn_warehouse', label: 'Kaimana Warehouse', type: 'STATIONARY_UNIT', active: true },
            { id: 'kn_factory', label: 'Kaimana Factory', type: 'FACTORY', active: true },
            { id: 'kn_boats', label: 'Kaimana Boats', type: 'MOBILE_UNIT', active: true },
            { id: 'kn_transport', label: 'Kaimana Transport', type: 'LOGISTICS', active: true }
        ]
    },
    saumlaki: {
        id: 'saumlaki',
        label: 'Saumlaki',
        units: [
            { id: 'sl_warehouse', label: 'Saumlaki Warehouse', type: 'STATIONARY_UNIT', active: true },
            { id: 'sl_factory', label: 'Saumlaki Factory', type: 'FACTORY', active: true },
            { id: 'sl_boats', label: 'Saumlaki Boats', type: 'MOBILE_UNIT', active: true }
        ]
    }
};

async function seed() {
    console.log("🚀 Seeding V2 Target Blueprint State...");
    const batch = db.batch();

    // 1. Sync Locations
    for (const locId in LOCATIONS) {
        const loc = LOCATIONS[locId];
        batch.set(db.collection('locations').doc(locId), loc);
    }

    // 2. Create Partners (T3)
    const partners = [
        { id: 'P-SUP-001', name: 'Local Fisherman Group A', type: 'supplier', active: true, relatedUnits: [{ locationId: 'kaimana', unitId: 'kn_warehouse' }] },
        { id: 'P-BUY-001', name: 'Global Seafood Corp', type: 'buyer', active: true, relatedUnits: [{ locationId: 'jakarta', unitId: 'jk_cold_storage' }] },
        { id: 'P-BAG-001', name: 'Budi (Kaimana Agent)', type: 'buy_agent', active: true, relatedUnits: [{ locationId: 'kaimana', unitId: 'kn_warehouse' }] },
        { id: 'P-SAG-001', name: 'Susi (Sales Agent)', type: 'sell_agent', active: true, relatedUnits: [{ locationId: 'jakarta', unitId: 'jk_cold_storage' }] },
        { id: 'P-INV-001', name: 'Strategic Investor Alpha', type: 'investor', active: true, relatedUnits: [] }
    ];
    partners.forEach(p => batch.set(db.collection('partners').doc(p.id), p));

    // 3. Create Items (T4)
    const rawMaterials = [
        { id: 'RM-TUNA-YF', name: 'Yellowfin Tuna', name_id: 'Tuna Sirip Kuning', category: 'tuna', active: true },
        { id: 'RM-TUNA-SJ', name: 'Skipjack Tuna', name_id: 'Cakalang', category: 'tuna', active: true }
    ];
    rawMaterials.forEach(rm => batch.set(db.collection('raw_materials').doc(rm.id), rm));

    const finishedProducts = [
        { id: 'FP-TUNA-LOIN', name: 'Frozen Tuna Loin', name_id: 'Loin Tuna Beku', process_category: 'tuna', process_type: 'Loin', packaging_type: 'IVP', linked_species_ids: ['RM-TUNA-YF'], active: true },
        { id: 'FP-TUNA-STEAK', name: 'Tuna Steak', name_id: 'Steak Tuna', process_category: 'tuna', process_type: 'Steak', packaging_type: 'IVP', linked_species_ids: ['RM-TUNA-YF', 'RM-TUNA-SJ'], active: true }
    ];
    finishedProducts.forEach(fp => batch.set(db.collection('finished_products').doc(fp.id), fp));

    // 4. Create Wallets (Implicitly needed)
    // Jakarta HQ Wallet
    batch.set(db.collection('site_wallets').doc('HQ'), { id: 'HQ', label: 'HQ Master Wallet', balance: 0, type: 'HQ' });
    // Kaimana Warehouse Wallet
    batch.set(db.collection('site_wallets').doc('kaimana_kn_warehouse'), { id: 'kaimana_kn_warehouse', label: 'Kaimana Warehouse Wallet', balance: 0, type: 'LOCATION' });

    await batch.commit();
    console.log("✅ Seed complete.");
}

seed();
