# PROJECT MASTER STATUS & DOCUMENTATION
**Authority Level**: ROOT
**Last Updated**: 2026-01-03
**Status**: V1 PRODUCTION READY (FEATURE COMPLETE)

## 1. PROJECT OVERVIEW
**Ocean Pearl Ops V2** is a comprehensive Supply Chain Management System designed for fishery operations in remote Indonesian locations (e.g., Kaimana, Saumlaki). It manages the entire lifecycle of seafood from receiving (dockside purchase) to processing, cold storage, and final sale, alongside financial tracking (Site Wallets).

## 2. SYSTEM MODULES & FEATURES

### A. DASHBOARD (Visual Intelligence)
- **Top-Level Metrics**: Displays 'Total Purchase (Kg)', 'Total Production (Kg)', 'Sales Revenue', and 'Total Expenses' for a selected date range.
- **Visual Charts**:
    - *Purchase vs Production*: Line chart comparing raw inflow vs finished outflow.
    - *Expense Breakdown*: Pie chart of cost categories.
    - *Recent Activity*: Live feed of system transactions.
- **Filters**: Date Range (7 Days, 30 Days, Custom) and Location context.

### B. RECEIVING (Purchase & Sourcing)
- **Function**: Capture raw material purchases from Suppliers or Fishermen.
- **Workflow**: 
    1. Select Supplier (or Generic Cash).
    2. Input Transaction Date & Payment Terms (Cash / Pending).
    3. Enter Catch Details: Species (linked to Catalog), Size, Grade, Weight (Kg), Price/Kg.
- **Financial Integration**:
    - **Cash**: Deduction from Site Wallet immediately.
    - **Pending**: Creates a "Liability" (Account Payable) to be cleared later via Wallet Manager.
- **Output**: Generates a printed Purchase Invoice (Batch ID: `RCV-xxxxxx`).

### C. PROCESSING (Factory Operations)
- **Production Run**: Converts `Raw Material` -> `Finished Product`.
- **Logic**:
    - Select source Raw Material Batch (FIFO or manual).
    - Record Input Weight.
    - Record Output: Finished Product, Grade (A/B/C), Size, Packing.
- **Yield Analysis**: System auto-calculates Yield % (Output / Input) to track efficiency and shrinkage.

### D. COLD STORAGE (Inventory)
- **Stock Management**: Real-time view of inventory by Location and Unit.
- **Movements**:
    - **IN**: From Production or Transfer.
    - **OUT**: Sales or Spoilage.
- **Audit**: Stock counts are automatically updated by `transactions`.

### E. SALES (Revenue Generation)
- **Invoice Creation**: Sell stock to Buyers.
- **Features**:
    - Select Source Stock (Location/Unit).
    - Select Product, Grade, Quantity, Price.
    - Auto-calculates Total Revenue.
- **Stock Effect**: Decrements inventory immediately upon confirmation.

### F. WALLET MANAGER (Financial Control)
- **Purpose**: Manage "Site Cash" (Petty Cash & Operational Funds).
- **Modes**:
    1. **Cash Transfer**: Record funds received from HQ (Cash In) or sent to HQ (Cash Out).
    2. **Local Cash Sale**: Record small local sales (Cash In).
    3. **Supplier Payment**: 
        - **Pay Pending**: Viewing unpaid `Receiving` invoices and paying them (clearing liability).
        - **Deposit**: Sending funds to suppliers "On Account".

### G. ADMIN PANEL (Configuration)
- **User Management**: Create/Edit users, assign Roles (Admin/Manager/Worker) and Locations.
- **Items Database**:
    - **Raw Materials**: Manage Species, Default Grades, Custom Size lists.
    - **Finished Products**: Link valid Species to Products.
- **Partner Config**: Manage Suppliers, Buyers, Logistics Partners (Soft Delete support).
- **Location Config**: Dynamic creation of Locations (Sites) and Units (e.g., Warehouse, Factory).

## 3. TECHNICAL ARCHITECTURE
- **Frontend**: Vite + React 18 (TailwindCSS for styling). Mobile-responsive design.
- **Backend Service**: Firebase (Serverless).
- **Database**: Cloud Firestore (NoSQL).
    - Collections: `transactions`, `users`, `partners`, `raw_materials`, `finished_products`, `locations`.
- **Authentication**: Firebase Auth (Email/Password).
- **Deployment**: Firebase Hosting + Cloud Functions (Node.js 20).

## 4. DEPLOYMENT INFO
- **Live Environment**: [https://oceanpearl-ops.web.app/](https://oceanpearl-ops.web.app/)
- **Region**: asia-southeast1 (Singapore)
- **Codebase**: `D:\OPS` (Local)
- **Version**: V1.1.0

## 5. RECENT UPDATES (CHANGELOG)
- **[NEW] Supplier Payment Module**: Added ability to pay pending invoices and manage supplier deposits in Wallet Manager.
- **[NEW] Receiving Payment Terms**: Added 'Credit/Pending' option to Receiving screen.
- **[NEW] Dynamic Admin**: Added flexible Location/Unit creation and Partner types.
- **[UX]**: Improved dashboard visuals and form layouts.

---
**SYSTEM IS READY FOR DEPLOYMENT AND LIVE OPERATION.**
