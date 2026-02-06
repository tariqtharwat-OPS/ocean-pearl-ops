/**
 * Test T8: COGS Logic on Waste Sales
 * Flow: Receive -> Produce (Waste) -> Sell Waste -> Verify COGS
 */

import admin from 'firebase-admin';
import { receivingLogic } from '../src/handlers/receivingHandler.js';
import { productionLogic } from '../src/handlers/productionHandler.js';
import { wasteSaleLogic } from '../src/handlers/wasteSaleHandler.js';

const mockAuth = (uid: string) => ({ auth: { uid } });

async function runTestT8() {
    console.log('\n🧪 TEST T8: COGS Logic on Waste Sales');
    console.log('=====================================');

    if (admin.apps.length === 0) admin.initializeApp();
    admin.firestore().settings({ ignoreUndefinedProperties: true });
    const db = admin.firestore();

    const timestamp = Date.now();
    const ID_SUFFIX = timestamp.toString();

    try {
        // 1. Receive
        console.log('🔧 Setup: Receiving 1000kg @ 15,000 IDR...');
        const recvRes = await receivingLogic({
            ...mockAuth('user-1'),
            data: {
                operationId: `t8-recv-${ID_SUFFIX}`,
                locationId: 'kaimana',
                unitId: 'kaimana-factory-1',
                boatId: 'boat-1',
                itemId: 'sardine-raw',
                quantityKg: 1000,
                pricePerKgIdr: 15000,
                fisherId: 'fisher-1',
                actorUserId: 'user-1'
            }
        });
        const rawLotId = recvRes.lotId;

        // 2. Produce (Frozen + Waste)
        // In: 1000kg (15M). Out: 800kg Frozen + 100kg Waste. Loss: 100kg.
        // Shrink (100kg): 1.5M Expense. Allocatable: 13.5M.
        // Waste (100kg): (100/900) * 13.5M = 1.5M.
        console.log('🔧 Setup: Producing Frozen + Waste...');
        const prodRes = await productionLogic({
            ...mockAuth('user-1'),
            data: {
                operationId: `t8-prod-${ID_SUFFIX}`,
                locationId: 'kaimana',
                unitId: 'kaimana-factory-1',
                inputLots: [{ lotId: rawLotId, quantityKg: 1000 }],
                outputLots: [
                    { itemId: 'sardine-frozen', quantityKg: 800, status: 'FROZEN' },
                    { itemId: 'waste-mix', quantityKg: 100, status: 'REJECT_SELLABLE' }
                ],
                actorUserId: 'user-1'
            }
        });

        // Find Waste Lot
        let wasteLotId = '';
        const frozenLotId = prodRes.outputLotIds[0]; // Assuming order preserved?
        // prodRes outputLotIds order matches input.outputLots.
        wasteLotId = prodRes.outputLotIds[1];

        console.log(`   Waste Lot: ${wasteLotId}`);
        const wasteDoc = await db.collection('inventory_lots').doc(wasteLotId).get();
        console.log(`   Waste Cost: ${wasteDoc.data().costTotalIdr} IDR`);

        if (Math.abs(wasteDoc.data().costTotalIdr - 1500000) > 100) throw new Error('Waste Cost Alloc Incorrect');

        // 3. Sell Waste (All 100kg)
        console.log('▶️  Executing Waste Sale...');
        const saleRes = await wasteSaleLogic({
            ...mockAuth('op-1'),
            data: {
                operationId: `t8-sale-${ID_SUFFIX}`,
                locationId: 'kaimana',
                unitId: 'kaimana-factory-1',
                buyerId: 'partner-customer1',
                items: [{ lotId: wasteLotId, quantityKg: 100, pricePerKgIdr: 5000 }],
                actorUserId: 'op-1'
            }
        });

        // 4. Verify Ledger
        console.log('\n🔍 Verifying Ledger (COGS)...');
        const ledgerDoc = await db.collection('ledger_entries').doc(saleRes.ledgerEntryId).get();
        const lines = ledgerDoc.data().lines;

        const cogsLine = lines.find((l: any) => l.account === 'EXPENSE_COGS');
        // Expected: 1.5M
        if (!cogsLine) throw new Error('Missing EXPENSE_COGS');
        if (Math.abs(cogsLine.amountIdr - 1500000) > 100) throw new Error(`COGS Amount Wrong: ${cogsLine.amountIdr}`);

        console.log(`   COGS: ${cogsLine.amountIdr} (Correct)`);

        // 5. Verify Lot Consumption
        const lotAfter = await db.collection('inventory_lots').doc(wasteLotId).get();
        if (lotAfter.data().costTotalIdr > 100) throw new Error('Waste Lot Cost not consumed');

        console.log('\n🎉 TEST T8: PASS');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ TEST T8 FAILED:', error);
        process.exit(1);
    }
}

runTestT8();
