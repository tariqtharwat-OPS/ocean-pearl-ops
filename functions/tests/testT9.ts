/**
 * Test T9: Period Control
 * Flow: Close 2026-02 -> Verify Write Block -> Verify Write Allow (Next Period)
 */

import admin from 'firebase-admin';
import { receivingLogic } from '../src/handlers/receivingHandler.js';
import { closePeriod } from '../src/periods.js';
import { HttpsError } from 'firebase-functions/v2/https';

const mockAuth = (uid: string) => ({ auth: { uid } });

async function runTestT9() {
    console.log('\n🧪 TEST T9: Period Control');
    console.log('=====================================');

    if (admin.apps.length === 0) admin.initializeApp();
    admin.firestore().settings({ ignoreUndefinedProperties: true });
    const db = admin.firestore();

    try {
        // 1. Setup Data for Receive
        const baseData = {
            operationId: `t9-recv-fail`,
            locationId: 'kaimana',
            unitId: 'kaimana-fishing-1',
            boatId: 'boat-1',
            itemId: 'sardine-raw',
            quantityKg: 100,
            pricePerKgIdr: 10000,
            fisherId: 'fisher-1',
            actorUserId: 'user-1'
        };

        // Create Period 2026-02 (OPEN)
        await db.collection('ledger_periods').doc('2026-02').set({
            id: '2026-02',
            startDate: admin.firestore.Timestamp.fromDate(new Date('2026-02-01T00:00:00Z')),
            endDate: admin.firestore.Timestamp.fromDate(new Date('2026-03-01T00:00:00Z')), // Exclusive cap logic in reports, but stored here as next month start is fine or current month end
            // I'll stick to 2026-03-01 as cap or 2026-02-28?
            // Prompt says: "Close locks all ledger writes with timestamp <= endDate".
            // If endDate is 2026-03-01 00:00:00. < 2026-03-01 is Feb.
            status: 'OPEN',
            closedAt: null,
            closedByUid: null
        });

        // 2. Close Period Feb 2026
        // Date: 2026-02-15
        const febDate = new Date('2026-02-15T12:00:00Z');
        // Close period "2026-02".
        await closePeriod(db, '2026-02', 'admin-1');

        // 3. Attempt Write in Feb
        console.log('▶️  Attempting Write in CLOSED Period (Feb 2026)...');
        try {
            await receivingLogic({
                ...mockAuth('user-1'),
                data: {
                    ...baseData,
                    operationId: `t9-recv-fail-${Date.now()}`,
                    timestamp: admin.firestore.Timestamp.fromDate(febDate) // Backdated
                }
            });
            throw new Error('Write succeeded but should have FAILED');
        } catch (error: any) {
            // Check error code
            if (error.code === 'failed-precondition' && error.message.includes('CLOSED')) {
                console.log('   ✅ Write Blocked (Expected)');
            } else {
                throw error; // Unexpected error
            }
        }

        // 4. Attempt Write in Mar 2026 (OPEN)
        console.log('▶️  Attempting Write in OPEN Period (Mar 2026)...');
        const marDate = new Date('2026-03-15T12:00:00Z');
        await receivingLogic({
            ...mockAuth('user-1'),
            data: {
                ...baseData,
                operationId: `t9-recv-success-${Date.now()}`,
                timestamp: admin.firestore.Timestamp.fromDate(marDate)
            }
        });
        console.log('   ✅ Write Succeeded (Expected)');

        console.log('\n🎉 TEST T9: PASS');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ TEST T9 FAILED:', error);
        process.exit(1);
    }
}

runTestT9();
