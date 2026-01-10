---
description: Implement Samudra 2.0 AI "COO" logic using Vertex AI
---

# Samudra 2.0 Implementation Plan

## Objective
Upgrade the existing rule-based `auditTransaction` function to use Google Cloud Vertex AI (Gemini Pro) for intelligent, proactive monitoring and communication.

## Steps

1.  **Dependencies**
    *   Add `@google-cloud/vertexai` to `functions/package.json`.

2.  **Backend Logic (Cloud Functions)**
    *   Refactor `auditTransaction` in `functions/index.js`.
    *   Initialize Vertex AI client (`asia-southeast1` or `us-central1`).
    *   Define `analyzeTransaction` helper that prompts Gemini Pro.
    *   **Prompt Strategy**: Provide transaction JSON + "COO Persona". Ask for:
        *   `status`: 'OK' | 'SUSPICIOUS' | 'ERROR'
        *   `message`: A direct message to the user asking for clarification if suspicious.
        *   `admin_note`: A summary for the CEO.
    *   **Action**:
        *   If `status` != 'OK', write to `messages` collection (New Collection) for the worker.
        *   Write to `admin_notifications` for the CEO.

3.  **Frontend Interface**
    *   Create `src/components/SamudraChat.jsx`.
    *   Add it to `src/layouts/Layout.tsx` (or `Layout.js` depending on file).
    *   It should subscribe to `messages` where `recipientId == currentUser.uid`.
    *   Allow simple reply (which updates the message doc, triggers another function? For V1, maybe just "Mark as Read" or "Reply" logic).

## Detailed Prompt Structure
```text
You are Samudra, the AI COO of Ocean Pearl Seafood.
Analyze this new transaction data:
{JSON}

Rules:
1. Low yield (<40%) is critical.
2. Prices > 10% deviation from market (100k/kg for Tuna) are suspect.
3. Be helpful but strict.

Output JSON:
{
  "risk_score": 1-10,
  "flag": true/false,
  "message_to_staff": "Draft a WhatsApp-style message to the staff member asking for info.",
  "report_to_ceo": "Technical summary."
}
```
