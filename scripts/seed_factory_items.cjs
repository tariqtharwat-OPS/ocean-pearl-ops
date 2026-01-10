const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin (assuming it's already configured from previous scripts)
// Note: In a real environment, you'd need the service account key.
// Here we'll try to reuse the existing credentials method or fail gracefully if not available locally without the key.
// But for this "Agentic" context, let's assume standard initialization.

if (admin.apps.length === 0) {
    // Attempt standard init
    try {
        const serviceAccount = require("./serviceAccountKey.json");
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.log("Using default credentials...");
        admin.initializeApp();
    }
}

const db = admin.firestore();

// -- SIMPLE CSV PARSER --
const parseCSV = (filePath) => {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    return lines.slice(1).map(line => {
        // Handle simple commas, assuming no commas INSIDE quotes for this simple use case
        // If complex, we'd need a regex. The provided CSVs look simple.
        const values = line.split(',');
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] ? values[index].trim() : '';
        });
        return row;
    }).filter(row => row[headers[0]]); // Filter empty lines
};

// 1. RAW MATERIALS
// Columns: item_id,category_en,category_id,item_name_en,item_name_id,local_trade_names,scientific_optional,typical_size_grades,export_relevance,notes
const seedRawMaterials = async () => {
    const results = parseCSV(path.join(__dirname, '..', 'raw_materials.csv'));
    console.log(`Processing ${results.length} Raw Materials...`);
    const batch = db.batch();

    // Optional: Delete existing collection? For now, we overwrite by ID.

    results.forEach((item) => {
        // Skip empty id lines if any
        if (!item.item_id) return;

        const docId = item.item_id;
        const ref = db.collection('raw_materials').doc(docId);

        batch.set(ref, {
            id: docId,
            name: item.item_name_en,
            name_id: item.item_name_id,
            category: item.category_id || 'general',
            scientific_name: item.scientific_optional,
            default_grades: item.typical_size_grades ? item.typical_size_grades.split('/') : ['Mix'],
            active: true,
            // Search fields
            search_keywords: [
                item.item_id,
                item.item_name_en.toLowerCase(),
                item.item_name_id.toLowerCase(),
                ...(item.local_trade_names ? item.local_trade_names.toLowerCase().split(';') : [])
            ]
        });
    });

    await batch.commit();
    console.log("✅ Raw Materials Seeded.");
};

// 2. FINISHED PRODUCTS
// Columns: product_id,product_name_en,product_name_id,applies_to,user_extendable,notes
const seedFinishedProducts = async () => {
    const results = parseCSV(path.join(__dirname, '..', 'finished_products.csv'));
    console.log(`Processing ${results.length} Finished Products...`);
    const batch = db.batch();

    results.forEach((item) => {
        if (!item.product_id) return;

        const docId = item.product_id;
        const ref = db.collection('finished_products').doc(docId);

        batch.set(ref, {
            id: docId,
            name: item.product_name_en,
            name_id: item.product_name_id,
            applies_to: item.applies_to || 'ALL', // e.g. TUNA, FISH, ALL
            active: true
        });
    });

    await batch.commit();
    console.log("✅ Finished Products Seeded.");
};

// -- ORCHESTRATOR --

const run = async () => {
    try {
        await seedRawMaterials();
        await seedFinishedProducts();
        console.log("🎉 Factory Logic Seeding Complete!");
        process.exit(0);
    } catch (e) {
        console.error("❌ Seeding Failed:", e);
        process.exit(1);
    }
};

run();
