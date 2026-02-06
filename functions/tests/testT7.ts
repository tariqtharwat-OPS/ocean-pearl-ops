/**
 * Test T7: COGS Logic on Sales
 * Flow: Receive -> Produce -> Transfer -> Sell Partial -> Verify COGS & Inventory Valuation
 */

import admin from 'firebase-admin';
import { receivingLogic } from '../src/handlers/receivingHandler.js';
import { productionLogic } from '../src/handlers/productionHandler.js';
import { transferLogic } from '../src/handlers/transferHandler.js';
import { salesLogic } from '../src/handlers/salesHandler.js';

// Setup Mock Context
const mockAuth = (uid: string) => ({ auth: { uid } });

// Main Test
async function runTestT7() {
    console.log('\n🧪 TEST T7: COGS Logic on Sales');
    console.log('=====================================');

    if (admin.apps.length === 0) admin.initializeApp();
    admin.firestore().settings({ ignoreUndefinedProperties: true });
    const db = admin.firestore();

    const timestamp = Date.now();
    const ID_SUFFIX = timestamp.toString();

    try {
        // 1. Receive - Input Cost Basis
        console.log('🔧 Setup: Receiving 1000kg @ 15,000 IDR...');
        const recvRes = await receivingLogic({
            ...mockAuth('user-1'),
            data: {
                operationId: `t7-recv-${ID_SUFFIX}`,
                locationId: 'kaimana',
                unitId: 'kaimana-factory-1',
                boatId: 'boat-1',
                itemId: 'sardine-raw',
                quantityKg: 1000,
                grade: 'A',
                pricePerKgIdr: 15000,
                fisherId: 'fisher-1',
                actorUserId: 'user-1'
            }
        });
        const rawLotId = recvRes.lotId;
        console.log(`   Raw Lot: ${rawLotId} | Cost: 15,000,000 IDR`);

        // 2. Production - Allocation to Frozen
        // Input: 1000kg (15M). Output: 900kg Frozen. 100kg Loss.
        // Shrink Cost = 100 * 15000 = 1.5M.
        // Allocatable = 13.5M.
        // Frozen = 900kg. Cost = 13.5M. CostPerKg = 15,000.
        console.log('🔧 Setup: Producing 900kg Frozen...');
        const prodRes = await productionLogic({
            ...mockAuth('user-1'),
            data: {
                operationId: `t7-prod-${ID_SUFFIX}`,
                locationId: 'kaimana',
                unitId: 'kaimana-factory-1',
                inputLots: [{ lotId: rawLotId, quantityKg: 1000 }],
                outputLots: [{ itemId: 'sardine-frozen', quantityKg: 900, status: 'FROZEN' }],
                // costPerKgIdr: Not sent, let it derive
                actorUserId: 'user-1'
            }
        });
        const frozenLotId = prodRes.outputLotIds[0];
        console.log(`   Frozen Lot: ${frozenLotId}`);

        // Verify Frozen Lot Cost
        const frozenDoc = await db.collection('inventory_lots').doc(frozenLotId).get();
        const frozenData = frozenDoc.data();
        console.log(`   Frozen CostTotal: ${frozenData.costTotalIdr}`);
        if (Math.abs(frozenData.costTotalIdr - 13500000) > 100) throw new Error('Frozen Cost Incorrect');

        // 3. Transfer to Cold Storage (Jakarta)
        console.log('🔧 Setup: Transferring 900kg...');
        const transRes = await transferLogic({
            ...mockAuth('user-1'),
            data: {
                operationId: `t7-trans-${ID_SUFFIX}`,
                sourceLocationId: 'kaimana',
                sourceUnitId: 'kaimana-factory-1',
                targetLocationId: 'jakarta',
                targetUnitId: 'jakarta-cold',
                items: [{ lotId: frozenLotId, quantityKg: 900 }],
                actorUserId: 'mgr-1'
            }
        });
        const targetLotId = transRes.outputLotIds[0];
        console.log(`   Target Lot: ${targetLotId}`);

        // Verify Target Lot Cost propagated
        const targetDoc = await db.collection('inventory_lots').doc(targetLotId).get();
        if (Math.abs(targetDoc.data().costTotalIdr - 13500000) > 100) throw new Error('Target Cost Incorrect');

        // 4. Sell Partial (100kg)
        // Cost should be 1.5M. Sale Price 80000/kg = 8M.
        console.log('▶️  Executing Sale (100kg)...');
        const saleRes = await salesLogic({
            ...mockAuth('admin-1'),
            data: {
                operationId: `t7-sale-${ID_SUFFIX}`,
                locationId: 'jakarta',
                unitId: 'jakarta-cold',
                buyerId: 'partner-customer1',
                items: [{ lotId: targetLotId, quantityKg: 100, pricePerKgIdr: 80000 }],
                actorUserId: 'admin-1'
            }
        });

        // 5. Verify Logic
        console.log('\n🔍 Verifying Ledger (COGS)...');
        const ledgerDoc = await db.collection('ledger_entries').doc(saleRes.ledgerEntryId).get();
        const lines = ledgerDoc.data().lines;

        const cogsLine = lines.find((l: any) => l.account === 'EXPENSE_COGS');
        const invCreditLine = lines.find((l: any) => l.account === 'INVENTORY_FINISHED' && l.direction === 'CREDIT');

        if (!cogsLine) throw new Error('Missing EXPENSE_COGS line');
        if (cogsLine.amountIdr !== 1500000) throw new Error(`COGS Amount Wrong: ${cogsLine.amountIdr} (Expected 1.5M)`);

        console.log(`   COGS: ${cogsLine.amountIdr} (Correct)`);

        console.log('🔍 Verifying Inventory Logic...');
        const lotAfter = await db.collection('inventory_lots').doc(targetLotId).get();
        const remainingCost = lotAfter.data().costTotalIdr;
        console.log(`   Remaining Pysical: ${lotAfter.data().quantityKgRemaining} kg`);
        console.log(`   Remaining Cost:    ${remainingCost} IDR`);

        // Expected: 13.5M - 1.5M = 12M.
        if (Math.abs(remainingCost - 12000000) > 100) throw new Error(`Remaining Cost Wrong: ${remainingCost}`);

        console.log('\n🎉 TEST T7: PASS');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ TEST T7 FAILED:', error);
        process.exit(1);
    }
}

runTestT7();
