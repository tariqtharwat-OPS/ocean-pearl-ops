/**
 * Test T3: Production Handler (FIXED)
 * Tests production/transformation workflow
 * 
 * Scenario: Raw sardine (500 kg) → Frozen sardine (480 kg) + Waste (20 kg)
 * 
 * FIXED: Input lot created at FACTORY unit (not boat) to match production unit
 */

import admin from 'firebase-admin';
import { productionHandler } from '../src/handlers/productionHandler.js';
import { receivingHandler } from '../src/handlers/receivingHandler.js';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

async function setupInputLot() {
    console.log('🔧 Setup: Creating input lot at factory via receiving...\n');

    // FIXED: Create lot at FACTORY (not boat) to match production unit
    const receivePayload = {
        operationId: 'test-receive-for-production-' + Date.now(),
        locationId: 'kaimana',
        unitId: 'kaimana-factory-1', // FACTORY receives raw material (not boat)
        boatId: 'kaimana-fishing-1', // Track source boat
        itemId: 'sardine-raw',
        quantityKg: 500,
        grade: 'A',
        pricePerKgIdr: 15000,
        fisherId: 'partner-fisher1',
        actorUserId: 'UNIT_OP_FACTORY1',
        notes: 'Setup for T3: Factory receives raw material for production',
    };

    const mockRequest = {
        auth: { uid: 'UNIT_OP_FACTORY1' },
        data: receivePayload,
    };

    const receiveResult = await receivingHandler(mockRequest as any);
    console.log(`✅ Input lot created at FACTORY: ${receiveResult.lotId} (${receivePayload.quantityKg} kg)\n`);

    return receiveResult.lotId;
}

async function testT3() {
    console.log('🧪 TEST T3: Production Handler');
    console.log('=====================================\n');

    try {
        // Setup: Create input lot at factory
        const inputLotId = await setupInputLot();

        // Wait a moment to ensure Firestore consistency
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Production payload
        const productionPayload = {
            operationId: 'test-production-001-' + Date.now(),
            locationId: 'kaimana',
            unitId: 'kaimana-factory-1',
            inputLots: [
                {
                    lotId: inputLotId,
                    quantityKg: 500, // Consume all 500 kg
                },
            ],
            outputLots: [
                {
                    itemId: 'sardine-frozen',
                    quantityKg: 480, // 96% yield
                    grade: 'A',
                    status: 'FROZEN' as const,
                },
                {
                    itemId: 'waste-mix',
                    quantityKg: 20, // 4% waste
                    status: 'REJECT_SELLABLE' as const,
                },
            ],
            costPerKgIdr: 15000, // Input cost
            actorUserId: 'UNIT_OP_FACTORY1',
            notes: 'Test T3: Raw → Frozen + Waste',
        };

        console.log('📦 Production Payload:');
        console.log(JSON.stringify(productionPayload, null, 2));
        console.log('\n');

        const mockRequest = {
            auth: { uid: 'UNIT_OP_FACTORY1' },
            data: productionPayload,
        };

        const result = await productionHandler(mockRequest as any);

        console.log('✅ SUCCESS!');
        console.log('\n📋 Result:');
        console.log(JSON.stringify(result, null, 2));
        console.log('\n');

        // Verify ledger entry
        const ledgerDoc = await db.collection('ledger_entries').doc(result.ledgerEntryId).get();
        if (!ledgerDoc.exists) {
            throw new Error('Ledger entry not found!');
        }
        const ledgerData = ledgerDoc.data();
        console.log(`✅ Ledger Entry ID: ${result.ledgerEntryId}`);
        console.log(`   Operation Type: ${ledgerData?.operationType}`);
        console.log(`   Input Lots: ${JSON.stringify(ledgerData?.links.inputLotIds)}`);
        console.log(`   Output Lots: ${JSON.stringify(ledgerData?.links.outputLotIds)}`);
        console.log(`   Debits: ${JSON.stringify(ledgerData?.lines.filter((l: any) => l.direction === 'DEBIT').map((l: any) => ({ account: l.account, kg: l.quantityKg, amount: l.amountIdr })))}`);
        console.log(`   Credits: ${JSON.stringify(ledgerData?.lines.filter((l: any) => l.direction === 'CREDIT').map((l: any) => ({ account: l.account, kg: l.quantityKg, amount: l.amountIdr })))}`);

        // Verify balancing
        const debits = ledgerData?.lines.filter((l: any) => l.direction === 'DEBIT').reduce((sum: number, l: any) => sum + l.amountIdr, 0);
        const credits = ledgerData?.lines.filter((l: any) => l.direction === 'CREDIT').reduce((sum: number, l: any) => sum + l.amountIdr, 0);
        if (Math.abs(debits - credits) < 0.01) {
            console.log(`✅ BALANCED: Debits (${debits}) == Credits (${credits})`);
        } else {
            throw new Error(`UNBALANCED: Debits (${debits}) != Credits (${credits})`);
        }

        // Verify input lot updated (quantity reduced)
        const inputLotDoc = await db.collection('inventory_lots').doc(inputLotId).get();
        if (!inputLotDoc.exists) {
            throw new Error('Input lot not found!');
        }
        const inputLotData = inputLotDoc.data();
        console.log(`✅ Input Lot Updated: ${inputLotId}`);
        console.log(`   Quantity Remaining: ${inputLotData?.quantityKgRemaining} kg (was 500 kg)`);
        if (inputLotData?.quantityKgRemaining !== 0) {
            throw new Error(`Input lot not fully consumed: ${inputLotData?.quantityKgRemaining} kg remaining`);
        }

        // Verify output lots created
        console.log(`✅ Output Lots Created: ${result.outputLotIds.length}`);
        for (const outputLotId of result.outputLotIds) {
            const outputLotDoc = await db.collection('inventory_lots').doc(outputLotId).get();
            if (!outputLotDoc.exists) {
                throw new Error(`Output lot ${outputLotId} not found!`);
            }
            const outputLotData = outputLotDoc.data();
            console.log(`   - Lot ${outputLotId}: ${outputLotData?.itemId}, ${outputLotData?.quantityKgRemaining} kg, status: ${outputLotData?.status}`);
        }

        // Verify trace links created (should be inputCount × outputCount)
        const expectedTraceLinks = 1 * 2; // 1 input × 2 outputs = 2 links
        console.log(`✅ Trace Links Created: ${result.traceLinkIds.length} (expected ${expectedTraceLinks})`);
        if (result.traceLinkIds.length !== expectedTraceLinks) {
            throw new Error(`Expected ${expectedTraceLinks} trace links, got ${result.traceLinkIds.length}`);
        }
        for (const traceLinkId of result.traceLinkIds) {
            const traceLinkDoc = await db.collection('trace_links').doc(traceLinkId).get();
            if (!traceLinkDoc.exists) {
                throw new Error(`Trace link ${traceLinkId} not found!`);
            }
            const traceLinkData = traceLinkDoc.data();
            console.log(`   - ${traceLinkData?.fromLotId} → ${traceLinkData?.toLotId} (${traceLinkData?.type})`);
        }

        console.log('\n🎉 TEST T3: PASS\n');

        // Test idempotency
        console.log('🔄 Testing Idempotency (same operationId)...');
        const result2 = await productionHandler(mockRequest as any);

        if (result2.ledgerEntryId === result.ledgerEntryId &&
            JSON.stringify(result2.outputLotIds) === JSON.stringify(result.outputLotIds)) {
            console.log('✅ IDEMPOTENCY: Same result returned (no duplicate writes)');
        } else {
            throw new Error('IDEMPOTENCY FAILED: Different result returned!');
        }

    } catch (error: any) {
        console.error('❌ FAIL:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await admin.app().delete();
        process.exit(0);
    }
}

// Run test
testT3();
