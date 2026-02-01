const admin = require('firebase-admin');

async function resetSystemFirestoreOnly() {
    console.log("⚠️ STARTING DAY-0 SYSTEM RESET (FIRESTORE ONLY) ⚠️");

    if (!admin.apps.length) {
        admin.initializeApp({ projectId: 'oceanpearl-ops' });
    }
    const db = admin.firestore();

    // 1. WIPE DATA COLLECTIONS
    const collectionsToWipe = [
        'transactions',
        'expenses',
        'financial_requests',
        'messages', // Shark logs
        'notifications',
        'partners',
        'raw_materials',
        'products',
        'categories',
        // 'site_wallets', // We need to RESET wallets, not delete? Or delete and let app recreate?
        // App expects 'site_wallets/kaimana' etc. 
        // Let's delete them, and the "Seed Capital" UI step will recreate, 
        // OR we reset them to 0 if UI doesn't have a "Create Wallet" flow.
        // The user said "Seed capital through UI". This implies we verify funds arrive.
        // Safest is to reset balances to 0.
    ];

    // Wipe Collections
    for (const col of collectionsToWipe) {
        console.log(`Cleaning: ${col}`);
        await deleteCollection(db, col, 100);
    }

    // 2. RESET WALLETS TO 0 (Don't delete, just reset)
    console.log("Resetting Wallets to 0...");
    const wallets = await db.collection('site_wallets').get();
    const batch = db.batch();
    wallets.forEach(doc => {
        batch.update(doc.ref, { balance: 0, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    });
    await batch.commit();

    // 3. WIPE STOCK
    console.log("Wiping 'stock' inventory...");
    await deleteCollectionGroup(db, 'stock', 100);

    // 4. CLEAN UP USERS (Firestore Only)
    // We keep CEO (tariq). We delete others from Firestore so we can "Create" them in UI.
    // (Note: Auth accounts will remain, so UI "Create" might fail if it tries to create Auth. 
    //  But we can't delete Auth. So we just reset their metadata in Firestore?)
    // Actually, "Create users... Assign roles" implies we act as Admin. 
    // If I cannot delete Auth, I will just delete the Firestore doc. 
    // When I "Create", if Auth exists, maybe I just "Edit" in UI.
    // Let's delete non-CEO firestore docs.
    const users = await db.collection('users').get();
    const userBatch = db.batch();
    let deletedCount = 0;
    users.forEach(doc => {
        const d = doc.data();
        if (d.email !== 'tariq@oceanpearlseafood.com') {
            userBatch.delete(doc.ref);
            deletedCount++;
        }
    });
    if (deletedCount > 0) await userBatch.commit();
    console.log(`Deleted ${deletedCount} user profiles (Firestore)`);

    console.log("✅ DAY-0 RESET COMPLETE (Data Wiped).");
    process.exit(0);
}

// HELPER: Delete query batch (Recursive)
async function deleteCollection(db, collectionPath, batchSize) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject);
    });
}
async function deleteCollectionGroup(db, collectionId, batchSize) {
    const query = db.collectionGroup(collectionId).orderBy('__name__').limit(batchSize);
    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject);
    });
}
async function deleteQueryBatch(db, query, resolve) {
    const snapshot = await query.get();
    const batchSize = snapshot.size;
    if (batchSize === 0) {
        resolve();
        return;
    }
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
    });
}

resetSystemFirestoreOnly().catch(console.error);
