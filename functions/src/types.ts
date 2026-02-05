/**
 * Ocean Pearl OPS V2 - Type Definitions
 * Phase 1: Core Data Model canonical types
 */

import { z } from 'zod';

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const UNIT_TYPES = [
    'OFFICE',
    'COLD_STORAGE',
    'WAREHOUSE',
    'FACTORY',
    'DRYING_FACTORY',
    'FISHING_BOAT',
    'COLLECTOR_BOAT',
    'TRANSPORT_BOAT',
    'FISH_MEAL_PLANT',
] as const;

export const USER_ROLES = [
    'UNIT_OP',
    'LOC_MANAGER',
    'HQ_FINANCE',
    'HQ_ADMIN',
    'CEO',
    'INVESTOR',
] as const;

export const LOT_STATUSES = [
    'RAW',
    'FROZEN',
    'FINISHED',
    'REJECT_SELLABLE',
    'WASTE',
] as const;

export const SOURCE_TYPES = [
    'CATCH',
    'PURCHASE',
    'TRANSFER',
    'PRODUCTION',
] as const;

export const OPERATION_TYPES = [
    'RECEIVE',
    'PRODUCE',
    'TRANSFER',
    'SALE',
    'EXPENSE',
    'FUNDING',
    'PAYMENT',
    'FISHER_PAYMENT',
] as const;

export const ACCOUNT_DIRECTIONS = ['DEBIT', 'CREDIT'] as const;

export const INVOICE_TYPES = ['AR', 'AP'] as const;
export const INVOICE_STATUSES = ['OPEN', 'PAID', 'VOID'] as const;

export const TRACE_LINK_TYPES = [
    'TRANSFORM',
    'TRANSFER',
    'SHIP',
    'SELL',
] as const;

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

// Firestore Timestamp Schema (supports both Firestore Timestamp and Date)
export const FirestoreTimestampSchema = z.union([
    z.date(),
    z.custom<FirebaseFirestore.Timestamp>((val) => {
        return val && typeof val === 'object' && 'toDate' in val;
    }, {
        message: 'Must be a Firestore Timestamp or Date',
    }),
]);

// Location Schema
export const LocationSchema = z.object({
    id: z.string(),
    name: z.string().min(1),
    isActive: z.boolean(),
    createdAt: FirestoreTimestampSchema,
});

// Unit Schema
export const UnitSchema = z.object({
    id: z.string(),
    locationId: z.string(),
    unitType: z.enum(UNIT_TYPES),
    name: z.string().min(1),
    isActive: z.boolean(),
    createdAt: FirestoreTimestampSchema,
});

// User Schema
export const UserSchema = z.object({
    uid: z.string(),
    role: z.enum(USER_ROLES),
    allowedLocationIds: z.array(z.string()),
    allowedUnitIds: z.array(z.string()),
    isActive: z.boolean(),
    displayName: z.string().optional(),
    email: z.string().optional(),
    createdAt: FirestoreTimestampSchema,
});

// Inventory Lot Schema
export const InventoryLotSchema = z.object({
    id: z.string(),
    locationId: z.string(),
    unitId: z.string(),
    itemId: z.string(),
    grade: z.string().optional(),
    status: z.enum(LOT_STATUSES),
    quantityKgRemaining: z.number().nonnegative(),
    uom: z.literal('KG'),
    origin: z.object({
        sourceType: z.enum(SOURCE_TYPES),
        sourceRefId: z.string(),
        boatId: z.string().optional(),
        supplierId: z.string().optional(),
    }),
    createdAt: FirestoreTimestampSchema,
    updatedAt: FirestoreTimestampSchema.optional(),
});

// Ledger Entry Line Schema
export const LedgerLineSchema = z.object({
    account: z.string(),
    direction: z.enum(ACCOUNT_DIRECTIONS),
    amountIdr: z.number().nonnegative(),
    quantityKg: z.number().optional(),
    lotId: z.string().optional(),
    partnerId: z.string().optional(),
    beneficiaryUnitId: z.string().optional(),
});

// Ledger Entry Schema (DOUBLE-ENTRY)
export const LedgerEntrySchema = z
    .object({
        id: z.string(),
        timestamp: FirestoreTimestampSchema,
        locationId: z.string(),
        unitId: z.string(),
        actorUserId: z.string(),
        operationType: z.enum(OPERATION_TYPES),
        operationId: z.string(), // IDEMPOTENCY KEY
        lines: z.array(LedgerLineSchema).min(2), // Must have at least 2 lines for double-entry
        links: z.object({
            inputLotIds: z.array(z.string()).default([]),
            outputLotIds: z.array(z.string()).default([]),
            invoiceId: z.string().optional(),
            attachmentIds: z.array(z.string()).default([]),
        }),
        notes: z.string().optional(),
        createdAt: FirestoreTimestampSchema,
    })
    .refine(
        (entry) => {
            // Validate double-entry balancing
            const debits = entry.lines
                .filter((l) => l.direction === 'DEBIT')
                .reduce((sum, l) => sum + l.amountIdr, 0);
            const credits = entry.lines
                .filter((l) => l.direction === 'CREDIT')
                .reduce((sum, l) => sum + l.amountIdr, 0);
            return Math.abs(debits - credits) < 0.01; // Allow for floating point errors
        },
        {
            message: 'Ledger entry must balance: sum(debits) must equal sum(credits)',
        }
    );

// Invoice Schema
export const InvoiceSchema = z.object({
    id: z.string(),
    type: z.enum(INVOICE_TYPES),
    status: z.enum(INVOICE_STATUSES),
    locationId: z.string(),
    unitId: z.string(),
    partnerId: z.string(),
    currency: z.string().default('IDR'),
    totalAmountIdr: z.number().nonnegative(),
    linkedDeliveryRefId: z.string().optional(),
    createdAt: FirestoreTimestampSchema,
    updatedAt: FirestoreTimestampSchema.optional(),
});

// Payment Schema
export const PaymentSchema = z.object({
    id: z.string(),
    invoiceId: z.string().optional(),
    amountIdr: z.number().nonnegative(),
    method: z.string(),
    attachmentIds: z.array(z.string()).default([]),
    createdAt: FirestoreTimestampSchema,
});

// Trace Link Schema (for fast genealogy queries)
export const TraceLinkSchema = z.object({
    id: z.string(),
    fromLotId: z.string(),
    toLotId: z.string(),
    eventId: z.string(), // References ledger entry
    type: z.enum(TRACE_LINK_TYPES),
    createdAt: FirestoreTimestampSchema,
});

// Attachment Schema
export const AttachmentSchema = z.object({
    id: z.string(),
    fileName: z.string(),
    fileType: z.string(),
    storagePath: z.string(),
    uploadedBy: z.string(),
    uploadedAt: FirestoreTimestampSchema,
});

// ============================================================================
// TYPESCRIPT TYPES (inferred from Zod schemas)
// ============================================================================

export type Location = z.infer<typeof LocationSchema>;
export type Unit = z.infer<typeof UnitSchema>;
export type User = z.infer<typeof UserSchema>;
export type InventoryLot = z.infer<typeof InventoryLotSchema>;
export type LedgerLine = z.infer<typeof LedgerLineSchema>;
export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type TraceLink = z.infer<typeof TraceLinkSchema>;
export type Attachment = z.infer<typeof AttachmentSchema>;

export type UnitType = (typeof UNIT_TYPES)[number];
export type UserRole = (typeof USER_ROLES)[number];
export type LotStatus = (typeof LOT_STATUSES)[number];
export type SourceType = (typeof SOURCE_TYPES)[number];
export type OperationType = (typeof OPERATION_TYPES)[number];
export type InvoiceType = (typeof INVOICE_TYPES)[number];
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export type TraceLinkType = (typeof TRACE_LINK_TYPES)[number];

