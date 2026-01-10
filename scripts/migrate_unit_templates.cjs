const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, writeBatch } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { UNIT_TEMPLATES, UNIT_MAPPING } = require('../functions/unit_templates');

const firebaseConfig = {
    apiKey: "AIzaSyBmHSr7huWpMZa9RnKNBgV6fnXltmvsxcc",
    authDomain: "oceanpearl-ops.firebaseapp.com",
    projectId: "oceanpearl-ops",
    storageBucket: "oceanpearl-ops.firebasestorage.app",
    messagingSenderId: "784571080866",
    appId: "1:784571080866:web:61bacaf38ea90f81d1f7fb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function migrateUnits() {
    console.log("=== UNIT TEMPLATE MIGRATION (CLIENT SDK) ===");

    // Login
    await signInWithEmailAndPassword(auth, 'tariq@oceanpearlseafood.com', 'OceanPearl2026!');
    console.log("Logged in as Tariq (HQ Admin)");

    // 1. Get all locations
    const locSnap = await getDocs(collection(db, 'locations'));

    const batch = writeBatch(db);
    let updateCount = 0;

    for (const locDoc of locSnap.docs) {
        const locId = locDoc.id;
        console.log(`Scanning Location: ${locId}`);

        const unitsSnap = await getDocs(collection(db, `locations/${locId}/units`));

        for (const unitDoc of unitsSnap.docs) {
            const unitId = unitDoc.id;
            // Skip if already migrated ? (optional, but good practice). 
            // The user said "non-destructive", so overwriting capabilities is fine as long as we don't delete other fields.

            let type = UNIT_MAPPING[unitId];

            if (locId === 'saumlaki' && unitId === 'frozen_fish') {
                type = 'FROZEN_FACTORY';
            }

            if (!type) {
                console.warn(`WARNING: No mapping found for unit '${unitId}' in '${locId}'. Skipping.`);
                continue;
            }

            const template = UNIT_TEMPLATES[type];
            if (!template) {
                console.error(`ERROR: Type '${type}' not found in templates.`);
                continue;
            }

            console.log(`-> Updating Unit '${unitId}' (${locId}) to Type: ${type}`);

            batch.update(unitDoc.ref, {
                type: type,
                capabilities: template.capabilities,
                templateLabel: template.label,
                updatedAt: new Date()
            });
            updateCount++;
        }
    }

    if (updateCount > 0) {
        await batch.commit();
        console.log(`Successfully updated ${updateCount} units.`);
    } else {
        console.log("No updates needed.");
    }
    console.log("=== MIGRATION COMPLETE ===");
    process.exit();
}

migrateUnits().catch(console.error);
