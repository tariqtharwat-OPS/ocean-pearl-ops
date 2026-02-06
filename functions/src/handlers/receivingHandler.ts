/**
 * Ocean Pearl OPS V2 - Receiving Handler
 * Phase 2: Test T1 - Boat delivers catch
 * 
 * Creates:
 * - Ledger entry (double-entry: DEBIT inventory, CREDIT fisher liability)
 * - Inventory lot (with origin data)
 * - Trace link (for genealogy)
 * 
 * Enforces:
 * - Idempotency via operationId
 * - Firestore transaction
 * - Zod validation
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import { z } from 'zod';
import { LedgerEntrySchema, InventoryLotSchema, TraceLinkSchema } from '../types.js';

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
});

type ReceivingInput = z.infer<typeof ReceivingInputSchema>;

interface ReceivingResult {
    success: boolean;
    ledgerEntryId: string;
    lotId: string;
    traceLinkId: string;
    totalAmountIdr: number;
}

export const receivingHandler = onCall<ReceivingInput, Promise<ReceivingResult>>(
    { region: 'us-central1' },
    async (request) => {
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

        // Execute transaction
        const result = await db.runTransaction(async (transaction) => {
            // Generate IDs
            const ledgerEntryId = db.collection('ledger_entries').doc().id;
            const lotId = db.collection('inventory_lots').doc().id;
            const traceLinkId = db.collection('trace_links').doc().id;

            const totalAmountIdr = input.quantityKg * input.pricePerKgIdr;
            const timestamp = admin.firestore.FieldValue.serverTimestamp();

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
    }
);
