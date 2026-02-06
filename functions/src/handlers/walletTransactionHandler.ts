/**
 * Ocean Pearl OPS V2 - Wallet Transaction Handler
 * Phase 2: Test T2 - Wallet transactions (Funding, Expenses)
 * 
 * Creates:
 * - Ledger entry (double-entry for financial transactions)
 * - Payment record (optional, for tracking)
 * 
 * Transaction Types:
 * - FUNDING: Capital injection (DEBIT Cash, CREDIT Equity)
 * - EXPENSE: Operational cost (DEBIT Expense, CREDIT Cash)
 * 
 * Enforces:
 * - Idempotency via operationId
 * - Firestore transaction
 * - Zod validation
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import { z } from 'zod';
import { LedgerEntrySchema, PaymentSchema } from '../types.js';

// Input validation schema
const WalletTransactionInputSchema = z.object({
    operationId: z.string().min(1), // Idempotency key
    transactionType: z.enum(['FUNDING', 'EXPENSE']),
    locationId: z.string(),
    unitId: z.string(),
    amountIdr: z.number().positive(),

    // For FUNDING
    sourceAccount: z.string().optional(), // e.g., 'BANK_BCA', 'CASH'
    equityAccount: z.string().optional(), // e.g., 'OWNER_EQUITY', 'INVESTOR_CAPITAL'

    // For EXPENSE
    expenseAccount: z.string().optional(), // e.g., 'EXPENSE_DIESEL', 'EXPENSE_ICE'
    paymentMethod: z.string().optional(), // e.g., 'CASH', 'BANK_TRANSFER'
    beneficiaryPartnerId: z.string().optional(), // Vendor/supplier

    actorUserId: z.string(),
    notes: z.string().optional(),
    attachmentIds: z.array(z.string()).optional(),
});

type WalletTransactionInput = z.infer<typeof WalletTransactionInputSchema>;

interface WalletTransactionResult {
    success: boolean;
    ledgerEntryId: string;
    paymentId?: string;
    amountIdr: number;
}

export const walletTransactionHandler = onCall<WalletTransactionInput, Promise<WalletTransactionResult>>(
    { region: 'us-central1' },
    async (request) => {
        // Validate authentication
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Must be authenticated');
        }

        // Validate input
        const input = WalletTransactionInputSchema.parse(request.data);

        // Validate type-specific required fields
        if (input.transactionType === 'FUNDING') {
            if (!input.sourceAccount || !input.equityAccount) {
                throw new HttpsError(
                    'invalid-argument',
                    'FUNDING requires sourceAccount and equityAccount'
                );
            }
        } else if (input.transactionType === 'EXPENSE') {
            if (!input.expenseAccount || !input.paymentMethod) {
                throw new HttpsError(
                    'invalid-argument',
                    'EXPENSE requires expenseAccount and paymentMethod'
                );
            }
        }

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
                paymentId: existingData.links.paymentId,
                amountIdr: input.amountIdr,
            };
        }

        // Execute transaction
        const result = await db.runTransaction(async (transaction) => {
            // Generate IDs
            const ledgerEntryId = db.collection('ledger_entries').doc().id;
            const paymentId = input.transactionType === 'EXPENSE'
                ? db.collection('payments').doc().id
                : undefined;

            const timestamp = admin.firestore.FieldValue.serverTimestamp();

            // Build ledger lines based on transaction type
            let ledgerLines: any[];
            let operationType: 'FUNDING' | 'EXPENSE';

            if (input.transactionType === 'FUNDING') {
                // FUNDING: DEBIT Cash/Bank, CREDIT Equity
                operationType = 'FUNDING';
                ledgerLines = [
                    {
                        account: input.sourceAccount!, // Cash or Bank account
                        direction: 'DEBIT' as const,
                        amountIdr: input.amountIdr,
                    },
                    {
                        account: input.equityAccount!, // Equity account
                        direction: 'CREDIT' as const,
                        amountIdr: input.amountIdr,
                    },
                ];
            } else {
                // EXPENSE: DEBIT Expense, CREDIT Cash
                operationType = 'EXPENSE';
                ledgerLines = [
                    {
                        account: input.expenseAccount!, // Expense account
                        direction: 'DEBIT' as const,
                        amountIdr: input.amountIdr,
                        beneficiaryUnitId: input.unitId,
                        partnerId: input.beneficiaryPartnerId,
                    },
                    {
                        account: input.paymentMethod!, // Cash or Bank
                        direction: 'CREDIT' as const,
                        amountIdr: input.amountIdr,
                    },
                ];
            }

            // 1. Create Ledger Entry (Double-Entry)
            const ledgerEntry = {
                id: ledgerEntryId,
                timestamp,
                locationId: input.locationId,
                unitId: input.unitId,
                actorUserId: input.actorUserId,
                operationType,
                operationId: input.operationId,
                lines: ledgerLines,
                links: {
                    inputLotIds: [],
                    outputLotIds: [],
                    attachmentIds: input.attachmentIds || [],
                },
                notes: input.notes,
                createdAt: timestamp,
            };

            // Validate ledger entry
            LedgerEntrySchema.parse(ledgerEntry);

            // 2. Create Payment record (for expenses only)
            if (paymentId && input.transactionType === 'EXPENSE') {
                const payment = {
                    id: paymentId,
                    amountIdr: input.amountIdr,
                    method: input.paymentMethod!,
                    attachmentIds: input.attachmentIds || [],
                    createdAt: timestamp,
                };

                // Validate payment
                PaymentSchema.parse(payment);

                transaction.set(db.collection('payments').doc(paymentId), payment);
            }

            // Write ledger entry
            transaction.set(db.collection('ledger_entries').doc(ledgerEntryId), ledgerEntry);

            return {
                success: true,
                ledgerEntryId,
                paymentId,
                amountIdr: input.amountIdr,
            };
        });

        return result;
    }
);
