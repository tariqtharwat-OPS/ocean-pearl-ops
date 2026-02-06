/**
 * Test T5: Sales Handler
 * Flow: Receive -> Produce (Frozen) -> Sell Frozen
 */

import admin from 'firebase-admin';
import { receivingLogic } from '../src/handlers/receivingHandler.js';
import { productionLogic } from '../src/handlers/productionHandler.js';
import { salesLogic } from '../src/handlers/salesHandler.js';

// Initialize Firebase Admin
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// Test Data Matches T3 Scenario
const TEST_UNIT_ID = 'kaimana-factory-1';
const TEST_BOAT_ID = 'kaimana-fishing-1';
const RAW_ITEM_ID = 'shark-sardine';
const FROZEN_ITEM_ID = 'sardine-frozen';
const WASTE_ITEM_ID = 'waste-mix';
const BUYER_ID = 'export-buyer-1';

// Helper: Setup Frozen Lot
async function setupFrozenLot() {
    console.log('🔧 Setup: Creating Frozen Lot via Receive -> Produce...');

    // 1. Receive 500kg Raw
    const receiveOpId = `setup-recv-t5-${Date.now()}`;
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

    // 2. Produce
    const prodOpId = `setup-prod-t5-${Date.now()}`;
    const prodRes = await productionLogic({
        auth: { uid: 'SETUP_BOT' },
        data: {
            operationId: prodOpId,
            locationId: 'kaimana',
            unitId: TEST_UNIT_ID,
            inputLots: [{ lotId: recvRes.lotId, quantityKg: 500 }],
            outputLots: [
                { itemId: FROZEN_ITEM_ID, quantityKg: 480, grade: 'A', status: 'FROZEN' }, // Index 0
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
    console.log('\n🧪 TEST T5: Sales Handler (Finished Goods)');
    console.log('=============================================');

    try {
        const frozenLotId = await setupFrozenLot();

        console.log('\n▶️  Executing Sale...');
        const operationId = `test-sale-goods-${Date.now()}`;
        const salePrice = 80000; // 80,000 IDR/kg
        const sellQty = 100;

        const salePayload = {
            operationId,
            locationId: 'kaimana',
            unitId: TEST_UNIT_ID,
            buyerId: BUYER_ID,
            items: [
                {
                    lotId: frozenLotId,
                    quantityKg: sellQty,
                    pricePerKgIdr: salePrice
                }
            ],
            actorUserId: 'HQ_SALES',
            notes: 'Test T5: Export Sales'
        };

        // CALL HANDLER LOGIC
        const result = await salesLogic({
            auth: { uid: 'HQ_SALES' },
            data: salePayload
        } as any);

        console.log('\n✅ Sale Success!');
        console.log(`   Ledger Entry ID: ${result.ledgerEntryId}`);
        console.log(`   Invoice ID: ${result.invoiceId}`);

        // Step 3: Verify Ledger
        console.log('\n🔍 Verifying Ledger...');
        const ledgerDoc = await db.collection('ledger_entries').doc(result.ledgerEntryId).get();
        const ledgerData = ledgerDoc.data();
        if (!ledgerData) throw new Error('Ledger entry not found');

        const debits = ledgerData.lines.filter((l: any) => l.direction === 'DEBIT');
        const credits = ledgerData.lines.filter((l: any) => l.direction === 'CREDIT');

        const totalDebit = debits.reduce((sum: number, l: any) => sum + l.amountIdr, 0);
        const totalCredit = credits.reduce((sum: number, l: any) => sum + l.amountIdr, 0);

        const expectedAmount = sellQty * salePrice; // 8,000,000
        console.log(`   Amount: ${totalDebit} (Expected: ${expectedAmount})`);

        if (totalDebit !== expectedAmount) throw new Error(`Debit mismatch: expected ${expectedAmount}, got ${totalDebit}`);
        if (Math.abs(totalDebit - totalCredit) > 1) throw new Error('Unbalanced Ledger');

        if (debits[0].account !== 'INVOICE_AR') throw new Error('First debit must be INVOICE_AR');
        if (credits[0].account !== 'REVENUE_SALES') throw new Error('First credit must be REVENUE_SALES');

        console.log('✅ Ledger Correct and Balanced');

        // Step 4: Verify Invoice
        console.log('\n🔍 Verifying Invoice...');
        const invoiceDoc = await db.collection('invoices').doc(result.invoiceId).get();
        const invoiceData = invoiceDoc.data();
        if (!invoiceData) throw new Error('Invoice missing');
        if (invoiceData.type !== 'AR') throw new Error('Invoice type mismatch');
        console.log('✅ Invoice Correct');

        // Step 5: Verify Lot Consumption (Partial)
        console.log('\n🔍 Verifying Lot Consumption...');
        const lotDoc = await db.collection('inventory_lots').doc(frozenLotId).get();
        const lotData = lotDoc.data();
        const expectedRemaining = 480 - sellQty;
        console.log(`   Remaining Qty: ${lotData?.quantityKgRemaining} (Expected: ${expectedRemaining})`);
        if (lotData?.quantityKgRemaining !== expectedRemaining) throw new Error('Lot qty mismatch');
        console.log('✅ Lot Updated');

        // Step 6: Verify Trace Links
        console.log('\n🔍 Verifying Trace Links...');
        const traces = await db.collection('trace_links')
            .where('eventId', '==', result.ledgerEntryId)
            .get();
        if (traces.size !== 1) throw new Error(`Expected 1 trace link, got ${traces.size}`);
        console.log('✅ Trace Link Correct');

        console.log('\n🎉 TEST T5: PASS');

    } catch (error) {
        console.error('\n❌ FAIL:', error);
        process.exit(1);
    }
}

runTest();
