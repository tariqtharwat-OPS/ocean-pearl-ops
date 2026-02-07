/**
 * Ocean Pearl OPS V2 - Transfer Handler
 * Phase 2: Test T6 - Internal Inventory Movement
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import { z } from 'zod';
import { LedgerEntrySchema, InventoryLotSchema, TraceLinkSchema, FirestoreTimestampSchema } from '../types.js';
import { assertPeriodWritable } from '../periods.js';

// Input Schema
const TransferItemSchema = z.object({
    lotId: z.string(),
    quantityKg: z.number().positive(),
});

const TransferInputSchema = z.object({
    operationId: z.string().min(1),
    sourceLocationId: z.string(),
    sourceUnitId: z.string(),
    targetLocationId: z.string(),
    targetUnitId: z.string(),
    items: z.array(TransferItemSchema).min(1),
    actorUserId: z.string(),
    notes: z.string().optional(),
    timestamp: FirestoreTimestampSchema.optional(),
});

type TransferInput = z.infer<typeof TransferInputSchema>;

export const transferLogic = async (request: any) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');

    const input = TransferInputSchema.parse(request.data);
    const db = admin.firestore();

    // Period Guard
    const opDate = input.timestamp ? (input.timestamp instanceof admin.firestore.Timestamp ? input.timestamp.toDate() : input.timestamp) : new Date();
    await assertPeriodWritable(db, opDate);

    return db.runTransaction(async (t) => {
        // Guard: Validate Master Data
        const srcUnitDoc = await t.get(db.collection('units').doc(input.sourceUnitId));
        const tgtUnitDoc = await t.get(db.collection('units').doc(input.targetUnitId));
        if (!srcUnitDoc.exists) throw new HttpsError('not-found', `Source Unit ${input.sourceUnitId} missing`);
        if (!tgtUnitDoc.exists) throw new HttpsError('not-found', `Target Unit ${input.targetUnitId} missing`);
        if (srcUnitDoc.data()?.locationId !== input.sourceLocationId) throw new HttpsError('invalid-argument', `Source Unit mismatch`);
        if (tgtUnitDoc.data()?.locationId !== input.targetLocationId) throw new HttpsError('invalid-argument', `Target Unit mismatch`);

        // Idempotency
        const ledgerId = `transfer-${input.sourceUnitId}-${input.targetUnitId}-${input.operationId}`;
        const existing = await t.get(db.collection('ledger_entries').doc(ledgerId));
        if (existing.exists) {
            const data = existing.data();
            return {
                success: true,
                ledgerEntryId: ledgerId,
                outputLotIds: data?.links?.outputLotIds || []
            };
        }

        // Validate Source Lots
        const srcRefs = input.items.map(i => db.collection('inventory_lots').doc(i.lotId));
        const srcDocs = await Promise.all(srcRefs.map(ref => t.get(ref)));

        const targetLotIds: string[] = [];
        const traceLinkIds: string[] = [];
        const timestamp = opDate;

        // Process Items
        for (let i = 0; i < input.items.length; i++) {
            const item = input.items[i];
            const doc = srcDocs[i];

            if (!doc.exists) throw new HttpsError('not-found', `Source Lot ${item.lotId} not found`);
            const srcData = doc.data()!;

            if (srcData.quantityKgRemaining < item.quantityKg) {
                throw new HttpsError('failed-precondition', `Insufficient qty in ${item.lotId}`);
            }
            if (srcData.unitId !== input.sourceUnitId) {
                throw new HttpsError('failed-precondition', `Lot unit mismatch`);
            }

            // Calculate Cost Logic
            const costPerKg = srcData.costPerKgIdr || 0;
            const transferCost = item.quantityKg * costPerKg;

            // 1. Update Source Lot
            t.update(srcRefs[i], {
                quantityKgRemaining: srcData.quantityKgRemaining - item.quantityKg,
                costTotalIdr: (srcData.costTotalIdr || 0) - transferCost,
                updatedAt: timestamp
            });

            // 2. Create Target Lot
            const targetLotId = db.collection('inventory_lots').doc().id;
            targetLotIds.push(targetLotId);

            const targetLot = {
                id: targetLotId,
                locationId: input.targetLocationId,
                unitId: input.targetUnitId,
                itemId: srcData.itemId,
                grade: srcData.grade,
                status: srcData.status,
                quantityKgRemaining: item.quantityKg,
                costPerKgIdr: costPerKg,
                costTotalIdr: transferCost,
                uom: 'KG' as const,
                origin: {
                    sourceType: 'TRANSFER' as const,
                    sourceRefId: ledgerId,
                },
                createdAt: timestamp
            };
            InventoryLotSchema.parse(targetLot);
            t.set(db.collection('inventory_lots').doc(targetLotId), targetLot);

            // 3. Create Trace Link
            const traceId = db.collection('trace_links').doc().id;
            const link = {
                id: traceId,
                fromLotId: item.lotId,
                toLotId: targetLotId,
                eventId: ledgerId,
                type: 'TRANSFER' as const,
                createdAt: timestamp
            };
            TraceLinkSchema.parse(link);
            t.set(db.collection('trace_links').doc(traceId), link);
        }

        // 4. Ledger Entry
        const ledgerEntry = {
            id: ledgerId,
            timestamp,
            locationId: input.sourceLocationId,
            unitId: input.sourceUnitId,
            actorUserId: input.actorUserId,
            operationType: 'TRANSFER' as const,
            operationId: input.operationId,
            lines: [
                {
                    account: 'INVENTORY_TRANSIT',
                    direction: 'DEBIT' as const,
                    amountIdr: 0,
                    beneficiaryUnitId: input.targetUnitId
                },
                {
                    account: 'INVENTORY_TRANSIT',
                    direction: 'CREDIT' as const,
                    amountIdr: 0
                }
            ],
            links: {
                inputLotIds: input.items.map(i => i.lotId),
                outputLotIds: targetLotIds,
                attachmentIds: []
            },
            notes: input.notes,
            createdAt: timestamp
        };
        LedgerEntrySchema.parse(ledgerEntry);
        t.set(db.collection('ledger_entries').doc(ledgerId), ledgerEntry);

        return {
            success: true,
            ledgerEntryId: ledgerId,
            outputLotIds: targetLotIds
        };
    });
};

export const transferHandler = onCall({ region: 'us-central1' }, transferLogic);
