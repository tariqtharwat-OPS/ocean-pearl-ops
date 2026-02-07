/**
 * Ocean Pearl OPS V2 - Period Management
 * Phase 5: Period Control
 */

import admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

export async function assertPeriodWritable(db: admin.firestore.Firestore, timestamp: Date | admin.firestore.Timestamp) {
    const date = timestamp instanceof admin.firestore.Timestamp ? timestamp.toDate() : timestamp;

    // Check if period for date exists and is CLOSED.
    // Format YYYY-MM
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const periodId = `${year}-${month}`;

    // 1. Check Specific Period
    const periodDoc = await db.collection('ledger_periods').doc(periodId).get();
    if (periodDoc.exists && periodDoc.data()?.status === 'CLOSED') {
        throw new HttpsError('failed-precondition', `Period ${periodId} is CLOSED. Writes denied.`);
    }

    // 2. Check Global Closure (Any Future Period Closed implies Past is Closed?)
    // Usually locking is chronological. If Feb is closed, Jan must be closed.
    // If Feb is closed, writes to Jan are denied?
    // Rules: "Close locks all ledger writes with timestamp <= endDate."
    // So if ANY period with endDate >= date is CLOSED, we deny.

    // 2. Check Global Closure (Any Period with endDate >= date is CLOSED)
    // Avoid composite index by fetching all CLOSED periods (low volume)
    const closedSnapshot = await db.collection('ledger_periods')
        .where('status', '==', 'CLOSED')
        .get();

    for (const doc of closedSnapshot.docs) {
        const data = doc.data();
        // Check if date <= endDate
        // Timestamp handling
        const endDate = data.endDate instanceof admin.firestore.Timestamp ? data.endDate.toDate() : data.endDate.toDate(); // .toDate() if Timestamp
        // Wait, if data.endDate is Date? Firestore returns Timestamp. 
        // Using toDate() is safe if formatted correctly.

        if (date <= endDate) {
            throw new HttpsError('failed-precondition', `Date ${date.toISOString()} is locked by CLOSED period ${doc.id}`);
        }
    }
}

export async function closePeriod(db: admin.firestore.Firestore, periodId: string, uid: string) {
    const periodRef = db.collection('ledger_periods').doc(periodId);
    const doc = await periodRef.get();

    if (!doc.exists) throw new HttpsError('not-found', `Period ${periodId} not found`);
    if (doc.data()?.status === 'CLOSED') return; // Idempotent

    // Ensure previous periods are closed? (Optional strictness)
    // For now, just close.

    await periodRef.update({
        status: 'CLOSED',
        closedAt: admin.firestore.FieldValue.serverTimestamp(),
        closedByUid: uid
    });
    console.log(`🔒 Period ${periodId} CLOSED by ${uid}`);
}

export async function getActivePeriod(db: admin.firestore.Firestore) {
    // Return the ONE OPEN period? Or undefined?
    const snapshot = await db.collection('ledger_periods').where('status', '==', 'OPEN').limit(1).get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].data();
}
