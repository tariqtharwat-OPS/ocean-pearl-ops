const admin = require('firebase-admin');

async function checkAudit() {
    console.log("🦈 CHECKING SHARK AI AUDIT STATUS 🦈");

    if (!admin.apps.length) {
        admin.initializeApp({ projectId: 'oceanpearl-ops' });
    }
    const db = admin.firestore();

    const txns = await db.collection('transactions').orderBy('timestamp', 'desc').limit(1).get();
    if (txns.empty) {
        console.log("No transactions.");
        process.exit(0);
    }

    const doc = txns.docs[0];
    const data = doc.data();

    console.log(`Transaction ID: ${doc.id}`);
    console.log(`Type: ${data.type}`);
    console.log(`Audit Status: ${data.auditStatus || 'PENDING/NONE'}`);
    console.log(`Risk Score: ${data.ai_risk_score !== undefined ? data.ai_risk_score : 'N/A'}`);
    console.log(`Analysis: ${data.ai_analysis ? data.ai_analysis.substring(0, 100) + '...' : 'N/A'}`);

    process.exit(0);
}

checkAudit().catch(console.error);
