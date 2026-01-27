# DEPRECATED — Do not use. Refer to SYSTEM_CANONICAL_STATE.md

# PHASE 6.1: Unit Templates & Capabilities

## 1. Unit Template Definitions

To enforce "Operations Spine" (Reality, not ERP Theory), we define strict Unit Templates. A unit's type dictates what it CAN do in the UI and Backend.

### **Template Types**

| Type | Description | Capabilities |
| :--- | :--- | :--- |
| **OFFICE** | Administrative HQ. No physical stock handling. | `[]` (Financials Only) |
| **PROCESSING_WET** | Fresh fish handling (washing, gutting, chilling). | `['receiving', 'processing', 'storage']` |
| **PROCESSING_DRY** | Drying operations (Anchovies/Teri). Input Raw -> Output Dried. | `['receiving', 'processing', 'storage', 'sales']` |
| **FROZEN_FACTORY** | Freezing & Cutting (Loin/Steak/Fillet). High value. | `['receiving', 'processing', 'storage', 'sales']` |
| **COLD_STORAGE** | Pure storage of frozen/dried goods. No processing. | `['receiving', 'storage', 'sales']` |

### **Capabilities Key**

*   `receiving`: access to "Receiving" page (Inbound Material).
*   `processing`: access to "Processing" page (Input -> Output transformation).
*   `storage`: access to "Inventory/Cold Storage" page (Stock counts).
*   `sales`: access to simple "Sale/Shipment" actions (Outbound).

---

## 2. Default Mappings (Migration Plan)

We will apply these templates to the existing units in Firestore without deleting data.

**Jakarta**
*   `office`: **OFFICE** (Capabilities: none)
*   `cold_storage`: **COLD_STORAGE** (Capabilities: receiving, storage, sales)

**Kaimana**
*   `gudang_ikan_teri`: **PROCESSING_DRY** (Capabilities: receiving, processing, storage, sales)
*   `frozen_fish`: **FROZEN_FACTORY** (Capabilities: receiving, processing, storage, sales)

**Saumlaki**
*   `frozen_fish`: **FROZEN_FACTORY** (Capabilities: receiving, processing, storage, sales)

---

## 3. Implementation Strategy

### **A. Shared Constants**
Create `src/lib/constants/units.js` (shared/copied to functions) defining `UNIT_TEMPLATES` with schema:
```javascript
export const UNIT_TEMPLATES = {
    OFFICE: { label: "Office / HQ", capabilities: [] },
    PROCESSING_WET: { label: "Wet Processing", capabilities: ['receiving', 'processing', 'storage', 'sales'] },
    PROCESSING_DRY: { label: "Dry Processing (Teri)", capabilities: ['receiving', 'processing', 'storage', 'sales'] },
    FROZEN_FACTORY: { label: "Frozen Factory", capabilities: ['receiving', 'processing', 'storage', 'sales'] },
    COLD_STORAGE: { label: "Cold Storage", capabilities: ['receiving', 'storage', 'sales'] }
};
```

### **B. Data Migration**
Script `scripts/migrate_unit_templates.cjs` will:
1.  Iterate through all Locations and Units in Firestore.
2.  Match Unit ID to the mapped Type (hardcoded mapping for safety).
3.  Update the Unit document with `type` and `capabilities` fields.

### **C. UI Enforcement**
Update `App.jsx` or `Layout` to check `currentUnit.capabilities` (derived from Type or stored on Unit profile) before showing navigation links.

*   If `!capabilities.includes('receiving')` -> Hide Receiving Link.
*   If `!capabilities.includes('processing')` -> Hide Processing Link.

### **D. Shark AI Awareness**
Update `shark_brain.js` system prompt to understand that OFFICE cannot receive fish, minimizing hallucinations.
