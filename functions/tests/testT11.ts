/**
 * Test T11: Fisher Payment (AP)
 * Flow: Receive Stock (Create Liability) -> Pay Fisher (Reduce Liability)
 */

import admin from 'firebase-admin';
import { receivingLogic } from '../src/handlers/receivingHandler.js';
import { fisherPaymentLogic } from '../src/handlers/fisherPaymentHandler.js';
import { HttpsError } from 'firebase-functions/v2/https';

const mockAuth = (uid: string) => ({ auth: { uid } });

async function runTestT11() {
    console.log('\n🧪 TEST T11: Fisher Payment (AP)');
    console.log('=====================================');

    if (admin.apps.length === 0) admin.initializeApp();
    admin.firestore().settings({ ignoreUndefinedProperties: true });
    const db = admin.firestore();

    try {
        const timestamp = admin.firestore.Timestamp.now();

        // 1. Receive Stock (Creates Fisher Liability)
        console.log('🔧 Receiving Stock (Generating Liability)...');
        // Liability Amount: 100kg * 10,000 = 1,000,000 IDR
        const recvRes = await receivingLogic({
            auth: { uid: 'user-1' },
            data: {
                operationId: `t11-recv-${Date.now()}`,
                locationId: 'kaimana',
                unitId: 'kaimana-fishing-1',
                boatId: 'boat-1',
                itemId: 'sardine-raw',
                quantityKg: 100,
                pricePerKgIdr: 10000,
                fisherId: 'fisher-1',
                actorUserId: 'user-1',
                timestamp
            }
        });
        const ledgerId = (recvRes as any).ledgerEntryId;
        console.log(`   Receipt Ledger ID: ${ledgerId}`);

        // 2. Pay Fisher (Partial: 500k)
        console.log('▶️  Paying Fisher (500k)...');
        await fisherPaymentLogic({
            auth: { uid: 'user-1' },
            data: {
                operationId: `t11-pay-1-${Date.now()}`,
                locationId: 'kaimana',
                unitId: 'kaimana-office', // Payment origin usually office
                fisherId: 'fisher-1',
                amountIdr: 500000,
                bankAccountId: 'CASH',
                actorUserId: 'user-1',
                timestamp
            }
        });

        // 3. Verify Ledger Balance
        // Sum FISHER_LIABILITY for 'fisher-1'
        // Receipt: Credit 1M. Payment: Debit 0.5M. Net Credit: 0.5M.

        const snapshot = await db.collection('ledger_entries').get();
        let liability = 0;

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            data.lines.forEach((line: any) => {
                if (line.account === 'FISHER_LIABILITY') {
                    // Check partnerId if stored on line?
                    // Recieve Handler stores partnerId in line.
                    // Payment Handler stores partnerId in line.
                    if (line.partnerId === 'fisher-1') {
                        if (line.direction === 'CREDIT') liability += line.amountIdr;
                        else liability -= line.amountIdr;
                    }
                }
            });
        });

        console.log(`   Fisher Liability Balance: ${liability}`);
        if (liability !== 500000) throw new Error(`Expected Liability 500,000. Got ${liability}`);

        console.log('\n🎉 TEST T11: PASS');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ TEST T11 FAILED:', error);
        process.exit(1);
    }
}

runTestT11();
