/**
 * Ocean Pearl OPS V2 - Fisher Payment Handler
 * Phase 5: Settlement Flows
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import { z } from 'zod';
import { LedgerEntrySchema, FirestoreTimestampSchema } from '../types.js';
import { assertPeriodWritable } from '../periods.js';

const FisherPaymentInputSchema = z.object({
    operationId: z.string().min(1),
    locationId: z.string(),
    unitId: z.string(),
    fisherId: z.string(),
    amountIdr: z.number().positive(),
    bankAccountId: z.string(), // e.g. 'CASH' or 'BANK_BCA'
    actorUserId: z.string(),
    notes: z.string().optional(),
    timestamp: FirestoreTimestampSchema.optional(),
});

type FisherPaymentInput = z.infer<typeof FisherPaymentInputSchema>;

export const fisherPaymentLogic = async (request: any) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');

    const input = FisherPaymentInputSchema.parse(request.data);
    const db = admin.firestore();

    const opDate = input.timestamp ? (input.timestamp instanceof admin.firestore.Timestamp ? input.timestamp.toDate() : input.timestamp) : new Date();
    await assertPeriodWritable(db, opDate);

    return db.runTransaction(async (t) => {
        const ledgerId = `payment-fisher-${input.operationId}`;
        const existing = await t.get(db.collection('ledger_entries').doc(ledgerId));
        if (existing.exists) return { success: true, ledgerEntryId: ledgerId };

        const ledgerEntry = {
            id: ledgerId,
            timestamp: opDate,
            locationId: input.locationId,
            unitId: input.unitId,
            actorUserId: input.actorUserId,
            operationType: 'FISHER_PAYMENT' as const,
            operationId: input.operationId,
            lines: [
                {
                    account: 'FISHER_LIABILITY',
                    direction: 'DEBIT' as const,
                    amountIdr: input.amountIdr,
                    partnerId: input.fisherId,
                    beneficiaryUnitId: input.unitId
                },
                {
                    account: input.bankAccountId,
                    direction: 'CREDIT' as const,
                    amountIdr: input.amountIdr
                }
            ],
            links: {
                paymentId: input.operationId
            },
            notes: input.notes,
            createdAt: new Date()
        };
        LedgerEntrySchema.parse(ledgerEntry);
        t.set(db.collection('ledger_entries').doc(ledgerId), ledgerEntry);

        return { success: true, ledgerEntryId: ledgerId };
    });
};

export const fisherPaymentHandler = onCall({ region: 'us-central1' }, fisherPaymentLogic);
