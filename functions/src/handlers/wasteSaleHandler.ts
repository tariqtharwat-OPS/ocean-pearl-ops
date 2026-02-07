/**
 * Ocean Pearl OPS V2 - Waste Sale Handler
 * Phase 2: Test T4 - Selling Waste/Reject Lots
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import { z } from 'zod';
import { LedgerEntrySchema, InvoiceSchema, TraceLinkSchema, FirestoreTimestampSchema } from '../types.js';
import { assertPeriodWritable } from '../periods.js';

// Input Schema
const WasteSaleItemSchema = z.object({
    lotId: z.string(),
    quantityKg: z.number().positive(),
    pricePerKgIdr: z.number().nonnegative(),
});

const WasteSaleInputSchema = z.object({
    operationId: z.string().min(1),
    locationId: z.string(),
    unitId: z.string(),
    buyerId: z.string(),
    items: z.array(WasteSaleItemSchema).min(1),
    actorUserId: z.string(),
    notes: z.string().optional(),
    timestamp: FirestoreTimestampSchema.optional(),
});

export type WasteSaleInput = z.infer<typeof WasteSaleInputSchema>;

export const wasteSaleLogic = async (request: any) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');

    const input = WasteSaleInputSchema.parse(request.data);
    const db = admin.firestore();

    // Period Guard
    const opDate = input.timestamp ? (input.timestamp instanceof admin.firestore.Timestamp ? input.timestamp.toDate() : input.timestamp) : new Date();

    return db.runTransaction(async (t) => {
        await assertPeriodWritable(t, opDate);

        // Guard: Validate Master Data
        const locationDoc = await t.get(db.collection('locations').doc(input.locationId));
        if (!locationDoc.exists) throw new HttpsError('not-found', `Location not found`);

        const unitDoc = await t.get(db.collection('units').doc(input.unitId));
        if (!unitDoc.exists) throw new HttpsError('not-found', `Unit not found`);
        if (unitDoc.data()?.locationId !== input.locationId) throw new HttpsError('invalid-argument', `Unit mismatch`);

        // Idempotency
        const ledgerId = `sale-waste-${input.unitId}-${input.operationId}`;
        const existing = await t.get(db.collection('ledger_entries').doc(ledgerId));
        if (existing.exists) {
            const data = existing.data();
            return {
                success: true,
                ledgerEntryId: ledgerId,
                invoiceId: data?.links?.invoiceId || '',
            };
        }

        // Validate Lots
        const lotRefs = input.items.map(i => db.collection('inventory_lots').doc(i.lotId));
        const lotDocs = await Promise.all(lotRefs.map(ref => t.get(ref)));

        let totalAmount = 0;
        let totalCOGS = 0;
        const soldLotIds: string[] = [];

        for (let i = 0; i < lotDocs.length; i++) {
            const doc = lotDocs[i];
            const item = input.items[i];

            if (!doc.exists) throw new HttpsError('not-found', `Lot ${item.lotId} not found`);
            const data = doc.data()!;

            // Unit Guard
            if (data.unitId !== input.unitId) {
                throw new HttpsError('failed-precondition', `Lot ${item.lotId} is in unit ${data.unitId}, mismatch ${input.unitId}`);
            }

            // Status Guard
            if (!['WASTE', 'REJECT_SELLABLE'].includes(data.status)) {
                throw new HttpsError('failed-precondition', `Lot ${item.lotId} status ${data.status} is not sellable as waste`);
            }

            // Quantity Guard
            if (data.quantityKgRemaining < item.quantityKg) {
                throw new HttpsError('failed-precondition', `Insufficient qty in ${item.lotId}`);
            }

            totalAmount += item.quantityKg * item.pricePerKgIdr;

            // Calculate COGS
            const costPerKg = data.costPerKgIdr || 0;
            const cogs = item.quantityKg * costPerKg;
            totalCOGS += cogs;

            soldLotIds.push(item.lotId);

            // Update Lot
            t.update(lotRefs[i], {
                quantityKgRemaining: data.quantityKgRemaining - item.quantityKg,
                costTotalIdr: (data.costTotalIdr || 0) - cogs,
                updatedAt: new Date()
            });
        }

        // Generate IDs
        const invoiceId = db.collection('invoices').doc().id;
        const timestamp = opDate;

        // 1. Create Invoice (AR)
        const invoice = {
            id: invoiceId,
            type: 'AR' as const,
            status: 'OPEN' as const,
            locationId: input.locationId,
            unitId: input.unitId,
            partnerId: input.buyerId,
            currency: 'IDR',
            totalAmountIdr: totalAmount,
            createdAt: timestamp,
        };
        InvoiceSchema.parse(invoice);
        t.set(db.collection('invoices').doc(invoiceId), invoice);

        // 2. Ledger Entry
        const ledgerEntry = {
            id: ledgerId,
            timestamp,
            locationId: input.locationId,
            unitId: input.unitId,
            actorUserId: input.actorUserId,
            operationType: 'SALE' as const,
            operationId: input.operationId,
            lines: [
                {
                    account: 'INVOICE_AR',
                    direction: 'DEBIT' as const,
                    amountIdr: totalAmount,
                    partnerId: input.buyerId
                },
                {
                    account: 'REVENUE_WASTE',
                    direction: 'CREDIT' as const,
                    amountIdr: totalAmount
                },
                // COGS Posting
                {
                    account: 'EXPENSE_COGS',
                    direction: 'DEBIT' as const,
                    amountIdr: totalCOGS
                },
                {
                    account: 'INVENTORY_FINISHED',
                    direction: 'CREDIT' as const,
                    amountIdr: totalCOGS
                }
            ],
            links: {
                inputLotIds: soldLotIds,
                outputLotIds: [],
                invoiceId: invoiceId,
                attachmentIds: []
            },
            notes: input.notes,
            createdAt: timestamp
        };
        LedgerEntrySchema.parse(ledgerEntry);
        t.set(db.collection('ledger_entries').doc(ledgerId), ledgerEntry);

        // 3. Trace Links
        for (const item of input.items) {
            const traceId = db.collection('trace_links').doc().id;
            const link = {
                id: traceId,
                fromLotId: item.lotId,
                toLotId: input.buyerId, // End of chain (Buyer)
                eventId: ledgerId,
                type: 'SELL' as const,
                createdAt: timestamp
            };
            TraceLinkSchema.parse(link);
            t.set(db.collection('trace_links').doc(traceId), link);
        }

        return {
            success: true,
            ledgerEntryId: ledgerId,
            invoiceId
        };
    });
};

export const wasteSaleHandler = onCall({ region: 'us-central1' }, wasteSaleLogic);
