const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'oceanpearl-ops'
    });
}

const db = admin.firestore();

(async () => {
    const requestId = 'nRcQQcmnex6SoyOTxkoZ';
    const managerEmail = 'budi.sim5.official@oceanpearl.com';

    console.log(`🚀 DEBUG APPROVAL for Request: ${requestId} as ${managerEmail}`);

    try {
        const reqRef = db.collection('financial_requests').doc(requestId);
        const managerSnap = await db.collection('users').where('email', '==', managerEmail).get();
        const managerUid = managerSnap.docs[0].id;
        const u = managerSnap.docs[0].data();

        await db.runTransaction(async (t) => {
            const doc = await t.get(reqRef);
            if (!doc.exists) throw new Error('Request not found');
            const req = doc.data();

            if (req.status !== 'PENDING') throw new Error('Already processed');

            // Logic from financial_v2.js
            let canApprove = false;
            if (u.role_v2 === 'HQ_ADMIN') {
                canApprove = true;
            } else if (u.role_v2 === 'LOC_MANAGER') {
                if (req.type === 'EXPENSE' && req.locationId === u.target_id) {
                    canApprove = true;
                }
            }

            if (!canApprove) throw new Error('Permission denied');

            const timestamp = admin.firestore.FieldValue.serverTimestamp();

            if (req.type === 'EXPENSE') {
                const walletId = req.locationId;
                const walletRef = db.doc(`site_wallets/${walletId}`);
                const walletDoc = await t.get(walletRef);

                if (!walletDoc.exists) throw new Error('Wallet missing');
                const bal = walletDoc.data().balance || 0;

                if (bal < req.amount) throw new Error(`Insufficient Funds: ${bal}`);

                t.update(walletRef, {
                    balance: admin.firestore.FieldValue.increment(-req.amount),
                    updatedAt: timestamp
                });

                const txnRef = db.collection('transactions').doc();
                t.set(txnRef, {
                    type: 'EXPENSE',
                    amount: req.amount,
                    locationId: req.locationId,
                    unitId: req.unitId,
                    description: `${req.category}: ${req.description} (Req #${requestId})`,
                    requestId: requestId,
                    approverId: managerUid,
                    timestamp: timestamp,
                    walletImpact: -req.amount
                });
            }

            t.update(reqRef, {
                status: 'APPROVED',
                approverId: managerUid,
                approvedAt: timestamp,
                history: admin.firestore.FieldValue.arrayUnion({
                    action: 'APPROVED',
                    by: managerUid,
                    at: new Date()
                })
            });
        });

        console.log("✅ APPROVAL SUCCESSFUL VIA SCRIPT!");

    } catch (e) {
        console.error("❌ APPROVAL FAILED:", e.message);
    }

    process.exit(0);
})();
