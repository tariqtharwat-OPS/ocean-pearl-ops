/**
 * Test T10: AR Settlement
 * Flow: Receive -> Sell (Create AR) -> Settle Partial -> Settle Full
 */

import admin from 'firebase-admin';
import { receivingLogic } from '../src/handlers/receivingHandler.js';
import { productionLogic } from '../src/handlers/productionHandler.js';
import { salesLogic } from '../src/handlers/salesHandler.js';
import { arSettlementLogic } from '../src/handlers/arSettlementHandler.js';
import { HttpsError } from 'firebase-functions/v2/https';

const mockAuth = (uid: string) => ({ auth: { uid } });

async function runTestT10() {
    console.log('\n🧪 TEST T10: AR Settlement');
    console.log('=====================================');

    if (admin.apps.length === 0) admin.initializeApp();
    admin.firestore().settings({ ignoreUndefinedProperties: true });
    const db = admin.firestore();

    try {
        const timestamp = admin.firestore.Timestamp.now();

        // 1. Receive Stock (Direct to Factory for Simplicity)
        console.log('🔧 Receiving Stock...');
        const recvRes = await receivingLogic({
            auth: { uid: 'user-1' },
            data: {
                operationId: `t10-recv-${Date.now()}`,
                locationId: 'kaimana',
                unitId: 'kaimana-factory-1', // Receive at Factory
                boatId: 'boat-1',
                itemId: 'sardine-raw',
                quantityKg: 100,
                pricePerKgIdr: 10000,
                fisherId: 'fisher-1',
                actorUserId: 'user-1',
                notes: 'Reception',
                timestamp
            }
        });
        const rawLotId = (recvRes as any).lotId;
        console.log(`   Raw Lot ID: ${rawLotId}`);

        // 2. Produce (Raw -> Frozen)
        console.log('🔧 Producing Frozen Stock...');
        const prodRes = await productionLogic({
            auth: { uid: 'user-1' },
            data: {
                operationId: `t10-prod-${Date.now()}`,
                locationId: 'kaimana',
                unitId: 'kaimana-factory-1',
                inputLots: [{ lotId: rawLotId, quantityKg: 100 }],
                outputLots: [{
                    itemId: 'sardine-frozen',
                    quantityKg: 100, // No loss
                    grade: 'A',
                    status: 'FROZEN'
                }],
                actorUserId: 'user-1',
                timestamp
            }
        });
        const frozenLotId = (prodRes as any).outputLotIds[0];
        console.log(`   Frozen Lot ID: ${frozenLotId}`);

        // 3. Sell Stock (Create Invoice)
        console.log('🔧 Selling Stock (Generating Invoice)...');
        const saleRes = await salesLogic({
            auth: { uid: 'user-1' },
            data: {
                operationId: `t10-sale-${Date.now()}`,
                locationId: 'kaimana',
                unitId: 'kaimana-factory-1',
                buyerId: 'cust-1',
                items: [{
                    lotId: frozenLotId,
                    quantityKg: 50,
                    pricePerKgIdr: 20000
                }],
                actorUserId: 'user-1',
                timestamp
            }
        });
        // Wait, unitId for Sales Handler is usually the SELLER unit.
        // It checks if unit exists.
        // I'll use 'kaimana-factory-1'.

        const invoiceId = (saleRes as any).invoiceId;
        console.log(`   Invoice ID: ${invoiceId}`);

        // 3. Settle Partial (500k out of 1M)
        console.log('▶️  Settling Partial (500k)...');
        const settle1 = await arSettlementLogic({
            auth: { uid: 'user-1' },
            data: {
                operationId: `t10-settle-1-${Date.now()}`,
                locationId: 'kaimana',
                unitId: 'kaimana-factory-1',
                invoiceId: invoiceId,
                amountIdr: 500000,
                bankAccountId: 'BANK_BCA',
                actorUserId: 'user-1',
                timestamp
            }
        });
        console.log('   Settlement 1 Success');

        // Verify Invoice Status
        const invDoc1 = await db.collection('invoices').doc(invoiceId).get();
        const invData1 = invDoc1.data();
        console.log(`   Invoice Paid: ${invData1?.paidAmountIdr} Status: ${invData1?.status}`);
        if (invData1?.status !== 'OPEN') throw new Error('Invoice should be OPEN');

        // 4. Settle Full (Remaining 500k)
        console.log('▶️  Settling Remainder (500k)...');
        await arSettlementLogic({
            auth: { uid: 'user-1' },
            data: {
                operationId: `t10-settle-2-${Date.now()}`,
                locationId: 'kaimana',
                unitId: 'kaimana-factory-1',
                invoiceId: invoiceId,
                amountIdr: 500000,
                bankAccountId: 'BANK_BCA',
                actorUserId: 'user-1',
                timestamp
            }
        });

        // Verify Status PAID
        const invDoc2 = await db.collection('invoices').doc(invoiceId).get();
        const invData2 = invDoc2.data();
        console.log(`   Invoice Paid: ${invData2?.paidAmountIdr} Status: ${invData2?.status}`);
        if (invData2?.status !== 'PAID') throw new Error('Invoice should be PAID');

        console.log('\n🎉 TEST T10: PASS');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ TEST T10 FAILED:', error);
        process.exit(1);
    }
}

runTestT10();
