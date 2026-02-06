/**
 * Ocean Pearl OPS V2 - Production Handler (FIXED)
 * Phase 2: Test T3 - Production/Transformation
 * 
 * Creates:
 * - Ledger entry (double-entry: DEBIT finished goods, CREDIT raw materials)
 * - Output inventory lots (with genealogy)
 * - Trace links (ALL inputs → ALL outputs for full genealogy)
 * - Updates input lots (reduces quantity)
 * 
 * Example: Raw sardine → Frozen sardine
 * 
 * Enforces:
 * - Idempotency via operationId (inside transaction with deterministic doc ID)
 * - Unit validation (input lots must belong to same unit as production)
 * - Firestore transaction
 * - Zod validation
 * - Full lot genealogy tracking
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import { z } from 'zod';
import { LedgerEntrySchema, InventoryLotSchema, TraceLinkSchema } from '../types.js';

// Input/Output lot schema for production
const ProductionLotInputSchema = z.object({
    lotId: z.string(),
    quantityKg: z.number().positive(),
});

const ProductionLotOutputSchema = z.object({
    itemId: z.string(),
    quantityKg: z.number().positive(),
    grade: z.string().optional(),
    status: z.enum(['RAW', 'FROZEN', 'FINISHED', 'REJECT_SELLABLE', 'WASTE']),
});

// Main input validation schema
const ProductionInputSchema = z.object({
    operationId: z.string().min(1), // Idempotency key
    locationId: z.string(),
    unitId: z.string(), // Factory ID
    inputLots: z.array(ProductionLotInputSchema).min(1),
    outputLots: z.array(ProductionLotOutputSchema).min(1),

    // Cost accounting (optional, for now use quantity-based)
    costPerKgIdr: z.number().nonnegative().optional(),

    actorUserId: z.string(),
    notes: z.string().optional(),
});

type ProductionInput = z.infer<typeof ProductionInputSchema>;

interface ProductionResult {
    success: boolean;
    ledgerEntryId: string;
    outputLotIds: string[];
    traceLinkIds: string[];
}

export const productionHandler = onCall<ProductionInput, Promise<ProductionResult>>(
    { region: 'us-central1' },
    async (request) => {
        // Validate authentication
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be authenticated');
        }

        // Validate input
        const input = ProductionInputSchema.parse(request.data);

        const db = admin.firestore();

        // Execute transaction with idempotency inside
        const result = await db.runTransaction(async (transaction) => {
            // 1. Check idempotency INSIDE transaction using deterministic doc ID
            const ledgerEntryId = `produce-${input.unitId}-${input.operationId}`;
            const ledgerRef = db.collection('ledger_entries').doc(ledgerEntryId);
            const existingLedger = await transaction.get(ledgerRef);

            if (existingLedger.exists) {
                // Return existing result (idempotent)
                const existingData = existingLedger.data();
                return {
                    success: true,
                    ledgerEntryId,
                    outputLotIds: existingData?.links.outputLotIds || [],
                    traceLinkIds: [], // Would need to query to get these
                };
            }

            // 2. Verify input lots exist, have sufficient quantity, AND belong to same unit
            const inputLotRefs = input.inputLots.map(lot =>
                db.collection('inventory_lots').doc(lot.lotId)
            );
            const inputLotDocs = await Promise.all(
                inputLotRefs.map(ref => transaction.get(ref))
            );

            // Validate input lots
            for (let i = 0; i < inputLotDocs.length; i++) {
                const doc = inputLotDocs[i];
                const requestedQty = input.inputLots[i].quantityKg;
                const lotId = input.inputLots[i].lotId;

                if (!doc.exists) {
                    throw new HttpsError(
                        'not-found',
                        `Input lot ${lotId} not found`
                    );
                }

                const lotData = doc.data();

                // NEW: Validate lot belongs to same unit (prevent cross-unit consumption)
                if (lotData!.unitId !== input.unitId) {
                    throw new HttpsError(
                        'failed-precondition',
                        `Input lot ${lotId} belongs to unit ${lotData!.unitId}, ` +
                        `but production is at unit ${input.unitId}. ` +
                        `Transfer lot to production unit first.`
                    );
                }

                if (lotData!.quantityKgRemaining < requestedQty) {
                    throw new HttpsError(
                        'failed-precondition',
                        `Insufficient quantity in lot ${lotId}: ` +
                        `available ${lotData!.quantityKgRemaining} kg, requested ${requestedQty} kg`
                    );
                }
            }

            // Generate IDs (deterministic ledger ID, random for others)
            const outputLotIds = input.outputLots.map(() =>
                db.collection('inventory_lots').doc().id
            );

            // Create trace links for ALL inputs → ALL outputs (full genealogy)
            const traceLinkIds: string[] = [];
            for (const inputLot of input.inputLots) {
                for (const outputLotId of outputLotIds) {
                    traceLinkIds.push(db.collection('trace_links').doc().id);
                }
            }

            const timestamp = admin.firestore.FieldValue.serverTimestamp();

            // Calculate totals
            const totalInputKg = input.inputLots.reduce((sum, lot) => sum + lot.quantityKg, 0);
            const totalOutputKg = input.outputLots.reduce((sum, lot) => sum + lot.quantityKg, 0);

            // Simple cost calculation (can be enhanced)
            const costPerKg = input.costPerKgIdr || 0;
            const totalInputValue = totalInputKg * costPerKg;
            const totalOutputValue = totalOutputKg * costPerKg;

            // 3. Update input lots (reduce quantity)
            for (let i = 0; i < inputLotRefs.length; i++) {
                const doc = inputLotDocs[i];
                const lotData = doc.data();
                const consumedQty = input.inputLots[i].quantityKg;

                transaction.update(inputLotRefs[i], {
                    quantityKgRemaining: lotData!.quantityKgRemaining - consumedQty,
                    updatedAt: timestamp,
                });
            }

            // 4. Create ledger entry (double-entry)
            const ledgerEntry = {
                id: ledgerEntryId,
                timestamp,
                locationId: input.locationId,
                unitId: input.unitId,
                actorUserId: input.actorUserId,
                operationType: 'PRODUCE' as const,
                operationId: input.operationId,
                lines: [
                    {
                        account: 'INVENTORY_FINISHED', // Output account
                        direction: 'DEBIT' as const,
                        amountIdr: totalOutputValue,
                        quantityKg: totalOutputKg,
                    },
                    {
                        account: 'INVENTORY_RAW', // Input account
                        direction: 'CREDIT' as const,
                        amountIdr: totalInputValue,
                        quantityKg: totalInputKg,
                    },
                ],
                links: {
                    inputLotIds: input.inputLots.map(lot => lot.lotId),
                    outputLotIds,
                    attachmentIds: [],
                },
                notes: input.notes,
                createdAt: timestamp,
            };

            // Validate ledger entry
            LedgerEntrySchema.parse(ledgerEntry);

            // 5. Create output lots
            for (let i = 0; i < input.outputLots.length; i++) {
                const outputSpec = input.outputLots[i];
                const outputLotId = outputLotIds[i];

                const inventoryLot = {
                    id: outputLotId,
                    locationId: input.locationId,
                    unitId: input.unitId,
                    itemId: outputSpec.itemId,
                    grade: outputSpec.grade,
                    status: outputSpec.status,
                    quantityKgRemaining: outputSpec.quantityKg,
                    uom: 'KG' as const,
                    origin: {
                        sourceType: 'PRODUCTION' as const,
                        sourceRefId: ledgerEntryId,
                    },
                    createdAt: timestamp,
                };

                // Validate inventory lot
                InventoryLotSchema.parse(inventoryLot);

                transaction.set(
                    db.collection('inventory_lots').doc(outputLotId),
                    inventoryLot
                );
            }

            // 6. Create trace links (ALL inputs → ALL outputs for full genealogy)
            let traceLinkIndex = 0;
            for (const inputLot of input.inputLots) {
                for (const outputLotId of outputLotIds) {
                    const traceLinkId = traceLinkIds[traceLinkIndex++];

                    const traceLink = {
                        id: traceLinkId,
                        fromLotId: inputLot.lotId,
                        toLotId: outputLotId,
                        eventId: ledgerEntryId,
                        type: 'TRANSFORM' as const,
                        createdAt: timestamp,
                    };

                    // Validate trace link
                    TraceLinkSchema.parse(traceLink);

                    transaction.set(
                        db.collection('trace_links').doc(traceLinkId),
                        traceLink
                    );
                }
            }

            // Write ledger entry
            transaction.set(ledgerRef, ledgerEntry);

            return {
                success: true,
                ledgerEntryId,
                outputLotIds,
                traceLinkIds,
            };
        });

        return result;
    }
);
