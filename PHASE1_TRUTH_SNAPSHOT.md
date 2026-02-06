# PHASE 1 TRUTH SNAPSHOT

**Purpose**: Resolve GitHub RAW cache discrepancy by capturing exact Git HEAD state before Phase 2.

**Date**: 2026-02-06  
**Commit**: `4d7293c`  
**Branch**: `v2-final-rebuild`

---

## Source: `git show HEAD:functions/src/seed.ts` (Last 10 lines)

```typescript
    } finally {
        // Cleanup
        await app.delete();
        process.exit(0);
    }
}

// Run the seed
main();
```

---

## Source: `git show HEAD:functions/src/types.ts` (Last 20 lines)

```typescript
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
```

---

## Source: `git show HEAD:firestore.rules` (Last 20 lines)

```javascript
        request.auth.uid == userId || hasAnyRole(['CEO', 'HQ_ADMIN'])
      );
      allow write: if hasAnyRole(['CEO', 'HQ_ADMIN']);
    }
    
    // MASTER DATA - All users can read, admins can write
    match /master_data/{docId} {
      allow read: if isAuthenticated();
      allow write: if hasAnyRole(['CEO', 'HQ_ADMIN']);
    }
    
    // ========================================================================
    // DEFAULT DENY ALL
    // ========================================================================
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Verification Status

✅ **seed.ts**: Line 275 calls `main();` (executable, not commented)  
✅ **types.ts**: Lines 231-240 use correct `z.infer<typeof XSchema>` syntax  
✅ **firestore.rules**: LOC_MANAGER can read units via `canAccessLocation()`

**This snapshot represents the true committed state of Phase 1 as of commit `4d7293c`.**

---

**Next**: Phase 2 implementation (Cloud Functions for T1-T7)
