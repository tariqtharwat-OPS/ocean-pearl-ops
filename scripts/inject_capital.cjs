const admin = require('firebase-admin');

async function injectCapital() {
    console.log("💰 INJECTING CAPITAL FOR DAY 1 SIMULATION (UPDATED) 💰");

    if (!admin.apps.length) {
        admin.initializeApp({ projectId: 'oceanpearl-ops' });
    }
    const db = admin.firestore();

    const wallets = [
        { id: 'kaimana', name: 'Kaimana Location', amount: 1100000000 }, // 1.1 Billion (1B + 100M from CEO)
        { id: 'hq-jakarta', name: 'HQ Jakarta', amount: 10000000000 },  // 10 Billion
        { id: 'proc-kaimana', name: 'Processing Unit Kaimana', amount: 50000000 } // 50 Million for Susi
    ];

    const batch = db.batch();

    for (const w of wallets) {
        const ref = db.collection('site_wallets').doc(w.id);

        batch.set(ref, {
            balance: w.amount,
            currency: 'IDR',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            name: w.name
        }, { merge: true });

        console.log(`Prepared injection: ${w.amount.toLocaleString()} IDR -> ${w.name} (${w.id})`);
    }

    await batch.commit();
    console.log("✅ Capital Injection Complete.");
    process.exit(0);
}

injectCapital().catch(error => {
    console.error("❌ Error injecting capital:", error);
    process.exit(1);
});
