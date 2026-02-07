/**
 * Ocean Pearl OPS V2 - Receiving Handler (Refactored for Testability)
 * Phase 2: Test T1 - Boat delivers catch
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import { z } from 'zod';
import { LedgerEntrySchema, InventoryLotSchema, TraceLinkSchema, FirestoreTimestampSchema } from '../types.js';
import { assertPeriodWritable } from '../periods.js';

// Input validation schema
const ReceivingInputSchema = z.object({
    operationId: z.string().min(1), // Idempotency key
    locationId: z.string(),
    unitId: z.string(), // Boat ID
    boatId: z.string(), // Same as unitId for boats
    itemId: z.string(), // Species caught
    quantityKg: z.number().positive(),
    grade: z.string().optional(),
    pricePerKgIdr: z.number().nonnegative(), // Price agreed with fisher
    fisherId: z.string(), // Partner ID of fisher
    actorUserId: z.string(), // Who recorded this
    notes: z.string().optional(),
    timestamp: FirestoreTimestampSchema.optional(),
});

type ReceivingInput = z.infer<typeof ReceivingInputSchema>;

interface ReceivingResult {
    success: boolean;
    ledgerEntryId: string;
    lotId: string;
    traceLinkId: string;
    totalAmountIdr: number;
}

// Export logic for testing
export const receivingLogic = async (request: any) => {
    // Validate authentication
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    // Validate input
    const input = ReceivingInputSchema.parse(request.data);

    const db = admin.firestore();

    // Check idempotency: if operationId exists, return existing result
    const existingLedger = await db
        .collection('ledger_entries')
        .where('operationId', '==', input.operationId)
        .limit(1)
        .get();

    if (!existingLedger.empty) {
        const existingDoc = existingLedger.docs[0];
        const existingData = existingDoc.data();

        // Return existing result (idempotent)
        return {
            success: true,
            ledgerEntryId: existingDoc.id,
            lotId: existingData.links.outputLotIds[0] || '',
            traceLinkId: '', // Would need to query trace_links to get this
            totalAmountIdr: existingData.lines
                .filter((l: any) => l.direction === 'DEBIT')
                .reduce((sum: number, l: any) => sum + l.amountIdr, 0),
        };
    }

    // Start Transaction (Guard Check inside or outside? Outside for perf, Inside for consistency? Outside is fine for static master data)
    // Validate Master Data
    const locationDoc = await db.collection('locations').doc(input.locationId).get();
    if (!locationDoc.exists) throw new HttpsError('not-found', `Location not found: ${input.locationId}`);

    const unitDoc = await db.collection('units').doc(input.unitId).get();
    if (!unitDoc.exists) throw new HttpsError('not-found', `Unit not found: ${input.unitId}`);
    if (unitDoc.data()?.locationId !== input.locationId) throw new HttpsError('invalid-argument', `Unit ${input.unitId} not in ${input.locationId}`);

    // Period Guard
    const tsInput: any = input.timestamp;
    const opDate = tsInput ? (typeof tsInput.toDate === 'function' ? tsInput.toDate() : (tsInput instanceof Date ? tsInput : new Date(tsInput))) : new Date();
    await assertPeriodWritable(db, opDate);

    // Execute transaction
    const result = await db.runTransaction(async (transaction) => {
        // Generate IDs
        const ledgerEntryId = db.collection('ledger_entries').doc().id;
        const lotId = db.collection('inventory_lots').doc().id;
        const traceLinkId = db.collection('trace_links').doc().id;

        const totalAmountIdr = input.quantityKg * input.pricePerKgIdr;
        const timestamp = opDate;

        // 1. Create Ledger Entry (Double-Entry)
        const ledgerEntry = {
            id: ledgerEntryId,
            timestamp,
            locationId: input.locationId,
            unitId: input.unitId,
            actorUserId: input.actorUserId,
            operationType: 'RECEIVE' as const,
            operationId: input.operationId,
            lines: [
                {
                    account: 'INVENTORY_RAW',
                    direction: 'DEBIT' as const,
                    amountIdr: totalAmountIdr,
                    quantityKg: input.quantityKg,
                    lotId,
                },
                {
                    account: 'FISHER_LIABILITY',
                    direction: 'CREDIT' as const,
                    amountIdr: totalAmountIdr,
                    partnerId: input.fisherId,
                    beneficiaryUnitId: input.unitId,
                },
            ],
            links: {
                inputLotIds: [],
                outputLotIds: [lotId],
                attachmentIds: [],
            },
            notes: input.notes,
            createdAt: timestamp,
        };

        // Validate ledger entry
        LedgerEntrySchema.parse(ledgerEntry);

        // 2. Create Inventory Lot
        const inventoryLot = {
            id: lotId,
            locationId: input.locationId,
            unitId: input.unitId,
            itemId: input.itemId,
            grade: input.grade,
            status: 'RAW' as const,
            quantityKgRemaining: input.quantityKg,
            costPerKgIdr: input.pricePerKgIdr,
            costTotalIdr: totalAmountIdr,
            uom: 'KG' as const,
            origin: {
                sourceType: 'CATCH' as const,
                sourceRefId: ledgerEntryId,
                boatId: input.boatId,
            },
            createdAt: timestamp,
        };

        // Validate inventory lot
        InventoryLotSchema.parse(inventoryLot);

        // 3. Create Trace Link (for genealogy queries)
        const traceLink = {
            id: traceLinkId,
            fromLotId: '', // No input lot for catch
            toLotId: lotId,
            eventId: ledgerEntryId,
            type: 'TRANSFORM' as const,
            createdAt: timestamp,
        };

        // Validate trace link
        TraceLinkSchema.parse(traceLink);

        // Write all documents in transaction
        transaction.set(db.collection('ledger_entries').doc(ledgerEntryId), ledgerEntry);
        transaction.set(db.collection('inventory_lots').doc(lotId), inventoryLot);
        transaction.set(db.collection('trace_links').doc(traceLinkId), traceLink);

        return {
            success: true,
            ledgerEntryId,
            lotId,
            traceLinkId,
            totalAmountIdr,
        };
    });

    return result;
};

export const receivingHandler = onCall({ region: 'us-central1' }, receivingLogic);
