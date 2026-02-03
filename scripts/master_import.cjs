const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'oceanpearl-ops'
    });
}

const db = admin.firestore();

async function importMasterData() {
    console.log("🚀 STARTING MASTER DATA IMPORT 🚀");

    // 1. LOCATIONS
    const locations = [
        { id: 'HQ_JAKARTA', name_en: 'HQ Jakarta', name_id: 'HQ Jakarta', type: 'headquarters' },
        { id: 'KAIMANA', name_en: 'Kaimana', name_id: 'Kaimana', type: 'operations' },
        { id: 'SAUMLAKI', name_en: 'Saumlaki', name_id: 'Saumlaki', type: 'factory' },
        { id: 'JAKARTA_CS', name_en: 'Jakarta Cold Storage', name_id: 'Cold Storage Jakarta', type: 'storage' }
    ];

    console.log("Importing Locations...");
    for (const loc of locations) {
        await db.collection('locations').doc(loc.id).set({
            ...loc,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    // 2. UNITS
    const units = [
        { id: 'KAIMANA_GUDANG_TERI_01', locationId: 'KAIMANA', name_en: 'Gudang Ikan Teri 01', name_id: 'Gudang Ikan Teri 01', type: 'GUDANG_IKAN_TERI' },
        { id: 'KAIMANA_CS_01', locationId: 'KAIMANA', name_en: 'Cold Storage 01', name_id: 'Cold Storage 01', type: 'COLD_STORAGE' },
        { id: 'SAUMLAKI_FACTORY_01', locationId: 'SAUMLAKI', name_en: 'Factory 01', name_id: 'Pabrik 01', type: 'FACTORY' },
        { id: 'SAUMLAKI_CS_01', locationId: 'SAUMLAKI', name_en: 'Cold Storage 01', name_id: 'Cold Storage 01', type: 'COLD_STORAGE' },
        { id: 'TRANSPORT_BOAT_01', locationId: 'KAIMANA', name_en: 'Transport Boat 01', name_id: 'Kapal Transport 01', type: 'TRANSPORT_BOAT' },
        { id: 'JAKARTA_CS_01', locationId: 'JAKARTA_CS', name_en: 'Cold Storage 01', name_id: 'Cold Storage 01', type: 'COLD_STORAGE' }
    ];

    console.log("Importing Units...");
    for (const unit of units) {
        await db.collection('units').doc(unit.id).set({
            ...unit,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    // 3. RAW MATERIALS (CSV)
    console.log("Importing Raw Materials from CSV...");
    const rawMaterialsPath = path.join(__dirname, 'raw_materials.csv');
    if (fs.existsSync(rawMaterialsPath)) {
        const input = fs.readFileSync(rawMaterialsPath);
        const records = parse(input, { columns: true, skip_empty_lines: true });

        for (const record of records) {
            await db.collection('raw_materials').doc(record.item_id).set({
                ...record,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        console.log(`Imported ${records.length} raw materials.`);
    }

    // 4. FINISHED PRODUCTS (CSV)
    console.log("Importing Finished Products from CSV...");
    const finishedProductsPath = path.join(__dirname, 'finished_products.csv');
    if (fs.existsSync(finishedProductsPath)) {
        const input = fs.readFileSync(finishedProductsPath);
        const records = parse(input, { columns: true, skip_empty_lines: true });

        for (const record of records) {
            await db.collection('products').doc(record.product_id).set({
                ...record,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        console.log(`Imported ${records.length} finished products.`);
    }

    // 5. PARTNERS
    const partners = [
        { id: 'SUP_KAIMANA_01', name: 'Supplier Kaimana 01', type: 'supplier', location: 'KAIMANA' },
        { id: 'SUP_SAUMLAKI_01', name: 'Supplier Saumlaki 01', type: 'supplier', location: 'SAUMLAKI' },
        { id: 'CUST_JAKARTA_01', name: 'Customer Jakarta 01', type: 'customer', location: 'JAKARTA' },
        { id: 'CUST_EXPORT_01', name: 'Export Customer 01', type: 'customer', location: 'EXPORT' }
    ];

    console.log("Importing Partners...");
    for (const partner of partners) {
        await db.collection('partners').doc(partner.id).set({
            ...partner,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    // 6. WALLETS (Initialize for Kaimana)
    console.log("Initializing Wallets...");
    const kaimanaWallet = {
        id: 'KAIMANA',
        name: 'Kaimana Site Wallet',
        balance: 0,
        currency: 'IDR',
        locationId: 'KAIMANA'
    };
    await db.collection('site_wallets').doc('KAIMANA').set({
        ...kaimanaWallet,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log("✅ MASTER DATA IMPORT COMPLETE ✅");
    process.exit(0);
}

importMasterData().catch(err => {
    console.error("❌ IMPORT FAILED:", err);
    process.exit(1);
});
