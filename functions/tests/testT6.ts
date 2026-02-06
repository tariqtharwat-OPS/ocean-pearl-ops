/**
 * Test T6: Transfer Handler
 * Flow: Receive -> Produce (Frozen) -> Transfer Frozen to Cold Storage
 */

import admin from 'firebase-admin';
import { receivingLogic } from '../src/handlers/receivingHandler.js';
import { productionLogic } from '../src/handlers/productionHandler.js';
import { transferLogic } from '../src/handlers/transferHandler.js';

// Initialize Firebase Admin
if (admin.apps.length === 0) { admin.initializeApp(); }
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// Data Matches T3 Scenario
const TEST_UNIT_ID = 'kaimana-factory-1';
const TEST_BOAT_ID = 'kaimana-fishing-1';
const RAW_ITEM_ID = 'shark-sardine';
const FROZEN_ITEM_ID = 'sardine-frozen';
const WASTE_ITEM_ID = 'waste-mix';
const TARGET_UNIT_ID = 'kaimana-cold-storage-1';

// Setup Frozen Lot
async function setupFrozenLot() {
    console.log('🔧 Setup: Creating Frozen Lot via Receive -> Produce...');
    // Receive 500kg
    const receiveOpId = `setup-recv-t6-${Date.now()}`;
    const recvRes = await receivingLogic({
        auth: { uid: 'SETUP_BOT' },
        data: {
            operationId: receiveOpId,
            locationId: 'kaimana',
            unitId: TEST_UNIT_ID,
            boatId: TEST_BOAT_ID,
            itemId: RAW_ITEM_ID,
            quantityKg: 500,
            pricePerKgIdr: 15000,
            fisherId: 'partner-123',
            actorUserId: 'SETUP_BOT'
        }
    } as any);

    // Produce (480kg Frozen)
    const prodOpId = `setup-prod-t6-${Date.now()}`;
    const prodRes = await productionLogic({
        auth: { uid: 'SETUP_BOT' },
        data: {
            operationId: prodOpId,
            locationId: 'kaimana',
            unitId: TEST_UNIT_ID,
            inputLots: [{ lotId: recvRes.lotId, quantityKg: 500 }],
            outputLots: [
                { itemId: FROZEN_ITEM_ID, quantityKg: 480, grade: 'A', status: 'FROZEN' },
                { itemId: WASTE_ITEM_ID, quantityKg: 20, status: 'REJECT_SELLABLE' }
            ],
            costPerKgIdr: 15000,
            actorUserId: 'SETUP_BOT'
        }
    } as any);

    const frozenLotId = prodRes.outputLotIds[0];
    console.log(`   Produced Frozen Lot: ${frozenLotId} (480 kg)`);
    return frozenLotId;
}

// Main Test
async function runTest() {
    console.log('\n🧪 TEST T6: Transfer Handler');
    console.log('=====================================');

    try {
        const frozenLotId = await setupFrozenLot();

        console.log('\n▶️  Executing Transfer...');
        const operationId = `test-transfer-${Date.now()}`;
        const transferQty = 100;

        const transferPayload = {
            operationId,
            sourceLocationId: 'kaimana',
            sourceUnitId: TEST_UNIT_ID,
            targetLocationId: 'kaimana',
            targetUnitId: TARGET_UNIT_ID,
            items: [
                {
                    lotId: frozenLotId,
                    quantityKg: transferQty
                }
            ],
            actorUserId: 'LOC_MANAGER',
            notes: 'Test T6: Move to Cold Storage'
        };

        // CALL HANDLER LOGIC
        const result = await transferLogic({
            auth: { uid: 'LOC_MANAGER' },
            data: transferPayload
        } as any);

        console.log('\n✅ Transfer Success!');
        console.log(`   Ledger Entry ID: ${result.ledgerEntryId}`);
        console.log(`   New Lot IDs: ${result.outputLotIds.join(', ')}`);

        // Step 3: Verify Ledger
        console.log('\n🔍 Verifying Ledger...');
        const ledgerDoc = await db.collection('ledger_entries').doc(result.ledgerEntryId).get();
        const ledgerData = ledgerDoc.data();
        if (!ledgerData) throw new Error('Ledger missing');

        const amount = ledgerData.lines[0].amountIdr;
        if (amount !== 0) throw new Error('Transfer ledger amount should be 0');
        console.log('✅ Ledger Created (Zero Value)');

        // Step 4: Verify Source Lot
        console.log('\n🔍 Verifying Source Lot...');
        const srcLot = await db.collection('inventory_lots').doc(frozenLotId).get();
        const srcData = srcLot.data();
        const expectedSrc = 480 - transferQty;
        console.log(`   Source Remaining: ${srcData?.quantityKgRemaining} (Expected: ${expectedSrc})`);
        if (srcData?.quantityKgRemaining !== expectedSrc) throw new Error('Source qty mismatch');
        console.log('✅ Source Lot Decremented');

        // Step 5: Verify Target Lot
        console.log('\n🔍 Verifying Target Lot...');
        const targetLotId = result.outputLotIds[0];
        const targetLot = await db.collection('inventory_lots').doc(targetLotId).get();
        const targetData = targetLot.data();
        console.log(`   Target Qty: ${targetData?.quantityKgRemaining} (Expected: ${transferQty})`);

        if (targetData?.quantityKgRemaining !== transferQty) throw new Error('Target qty mismatch');
        if (targetData?.unitId !== TARGET_UNIT_ID) throw new Error('Target unit mismatch');
        if (targetData?.origin.sourceType !== 'TRANSFER') throw new Error('Target origin type mismatch');
        console.log('✅ Target Lot Created');

        // Step 6: Verify Trace Link
        console.log('\n🔍 Verifying Trace Link...');
        const traces = await db.collection('trace_links')
            .where('eventId', '==', result.ledgerEntryId)
            .get();
        if (traces.size !== 1) throw new Error('Trace link missing');

        const trace = traces.docs[0].data();
        if (trace.fromLotId !== frozenLotId) throw new Error('Trace fromLotId mismatch');
        if (trace.toLotId !== targetLotId) throw new Error('Trace toLotId mismatch');
        if (trace.type !== 'TRANSFER') throw new Error('Trace type mismatch');
        console.log('✅ Trace Link Correct');

        // Idempotency
        console.log('\n🔄 Checking Idempotency...');
        const retry = await transferLogic({
            auth: { uid: 'LOC_MANAGER' },
            data: transferPayload
        } as any);
        if (retry.ledgerEntryId === result.ledgerEntryId) console.log('✅ IDEMPOTENCY: Pass');
        else throw new Error('Idempotency Fail');

        console.log('\n🎉 TEST T6: PASS');

    } catch (error) {
        console.error('\n❌ FAIL:', error);
        process.exit(1);
    }
}

runTest();
