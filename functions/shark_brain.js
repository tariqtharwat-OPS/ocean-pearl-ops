const { GoogleGenAI } = require('@google/genai');
const admin = require('firebase-admin');

// Initialize Vertex AI (GenAI SDK)
// CRITICAL: Must be GLOBAL for Gemini 3 Pro Preview
const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT,
    location: 'global',
    apiVersion: 'v1',
});

// MODEL AUTHORITY: GEMINI 3 PRO PREVIEW
const MODEL_NAME = 'gemini-3-pro-preview';

/**
 * Shark Brain: The Central Intelligence
 * Handles both "Audit" (Risk) and "Partner" (Chat) roles.
 */
// Debug Identity
// Debug Identity - COMMENTED OUT TO PREVENT DEPLOY TIMEOUTS
// admin.credential.applicationDefault().getAccessToken().then(token => {
//     console.log("🦈 Auth Check: Service Account Access Token Acquired. Scope:", token.scope);
// }).catch(err => {
//     console.warn("🦈 Auth Check: Failed to get local credentials.", err.message);
// });

// --- DATA TOOLS ---

// CACHE: Simple in-memory cache for high-frequency low-volatility data
const CACHE = {
    dashboard: { data: null, expiry: 0 },
    partners: { data: null, expiry: 0 }
};

/**
 * gatherContext
 * Intelligently fetching data based on the user's specifics.
 * OPTIMIZED: Parallel Execution & Caching
 */
async function gatherContext(message, userContext) {
    const db = admin.firestore();
    let contextParts = [];
    const lowerMsg = message.toLowerCase();
    const now = Date.now();

    // Parallel Promises Array
    const tasks = [];

    // 1. GLOBAL DASHBOARD (Cached 60s)
    // Always useful for "status" or "overview"
    if (lowerMsg.includes('status') || lowerMsg.includes('how') || lowerMsg.includes('summary') || lowerMsg.includes('dashboard')) {
        if (CACHE.dashboard.data && CACHE.dashboard.expiry > now) {
            contextParts.push(CACHE.dashboard.data);
        } else {
            tasks.push((async () => {
                try {
                    const dateStr = new Date().toISOString().split('T')[0];
                    const statsSnap = await db.doc(`dashboard_stats/${dateStr}`).get();
                    if (statsSnap.exists) {
                        const dataStr = `TODAY_STATS(${dateStr}): ${JSON.stringify(statsSnap.data())} `;
                        CACHE.dashboard = { data: dataStr, expiry: now + 60000 }; // 60s cache
                        contextParts.push(dataStr);
                    }
                } catch (e) { console.warn("Dashboard fetch failed", e); }
            })());
        }
    }

    // 2. INTELLIGENT STOCK SEARCH
    if (lowerMsg.includes('stock') || lowerMsg.includes('have') || lowerMsg.includes('inventory') || lowerMsg.includes('much')) {
        tasks.push((async () => {
            try {
                let targetLocation = userContext.locationId;
                if (targetLocation) {
                    const unitsSnap = await db.collection(`locations/${targetLocation}/units`).get();
                    let stockInfo = [];

                    // Identify keywords to filter DB reads if possible, 
                    // but Firestore structure requires reading collections. 
                    // We run parallel reads for units.
                    const unitTasks = unitsSnap.docs.map(async (unit) => {
                        const stockSnap = await unit.ref.collection('stock').limit(30).get();
                        stockSnap.forEach(d => {
                            const data = d.data();
                            if (data.quantityKg > 0) stockInfo.push(`[${unit.id}] ${d.id}: ${data.quantityKg}kg`);
                        });
                    });

                    await Promise.all(unitTasks);

                    if (stockInfo.length > 0) {
                        // Filter in memory for relevance to save token count
                        const commonFish = ['tuna', 'skipjack', 'yellowfin', 'snapper', 'octopus', 'shrimp', 'squid'];
                        const keywords = commonFish.filter(f => lowerMsg.includes(f));

                        const relevantStock = keywords.length > 0
                            ? stockInfo.filter(s => keywords.some(k => s.toLowerCase().includes(k)))
                            : stockInfo.slice(0, 15); // limit if no specific request

                        contextParts.push(`STOCK_AT_${targetLocation.toUpperCase()}:\n- ${relevantStock.join('\n- ')}`);
                    } else {
                        contextParts.push(`STOCK_AT_${targetLocation.toUpperCase()}: No active stock found.`);
                    }
                }
            } catch (e) { console.warn("Stock fetch failed", e); }
        })());
    }

    // 3. RECENT TRANSACTIONS (High Value Focus)
    if (lowerMsg.includes('sell') || lowerMsg.includes('audit') || lowerMsg.includes('transaction') || lowerMsg.includes('price')) {
        tasks.push((async () => {
            try {
                const txnSnap = await db.collection('transactions')
                    .orderBy('timestamp', 'desc')
                    .limit(5)
                    .get();

                const txns = txnSnap.docs.map(d => {
                    const val = d.data();
                    return `${val.type} | ${val.amount || val.totalAmount} | By: ${val.userId}`;
                });
                contextParts.push(`LAST_5_GLOBAL_TXNS:\n${txns.join('\n')}`);
            } catch (e) { console.warn("Txn fetch failed", e); }
        })());
    }

    // Execute all data fetches in parallel
    await Promise.all(tasks);

    if (contextParts.length === 0) return "No specific internal data found for this query.";
    return "\n--- LIVE DATA CONTEXT ---\n" + contextParts.join('\n\n') + "\n-------------------------\n";
}


// --- MAIN AI FUNCTIONS ---

/**
 * auditTransaction
 * Analyzes a transaction for risks/anomalies.
 */
async function auditTransaction(txn, txnId) {
    const prompt = `
You are Shark, COO AI of Ocean Pearl Seafood.
Analyze this transaction:
${JSON.stringify(txn, null, 2)}

Context Rules:
- Yields < 40% in Production are CRITICAL.
- Prices must be market reasonable.
- Expenses > 5M IDR need approval.
- Cash payments > 10M IDR are suspicious.

Return JSON:
{
  "risk_score": number (1-10),
  "analysis": "string",
  "message_to_staff": "string (optional)",
  "report_to_ceo": "string (optional, only if risk > 7)"
}
`;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [
                {
                    role: 'user',
                    parts: [{ text: prompt }]
                }
            ],
        });

        const text = response.text;
        const json = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(json);
    } catch (e) {
        console.error("AI Audit Error", e);
        return { risk_score: 0, analysis: "AI Error: " + e.message };
    }
}

// --- FILE PROCESSING TOOLS ---
// const pdf = require('pdf-parse'); // DISABLED due to Node version incompatibility during deploy
const XLSX = require('xlsx');

async function processAttachment(attachment) {
    if (!attachment || !attachment.data) return null;

    console.log("📂 Processing Attachment:", attachment.name, attachment.type);
    let contentText = "";

    try {
        const buffer = Buffer.from(attachment.data, 'base64');

        if (attachment.type.includes('pdf')) {
            // const data = await pdf(buffer);
            // contentText = `[PDF CONTENT - ${attachment.name}]\n${data.text.substring(0, 5000)}`; // Limit context
            contentText = `[PDF PARSING DISABLED TEMPORARILY]`;
        } else if (attachment.type.includes('spreadsheet') || attachment.type.includes('excel') || attachment.name.endsWith('.xlsx') || attachment.name.endsWith('.csv')) {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(sheet);
            contentText = `[EXCEL CONTENT - ${attachment.name}]\n${csv.substring(0, 5000)}`;
        } else if (attachment.type.includes('image')) {
            // Images handled natively by Gemini Vision
            return { inlineData: { mimeType: attachment.type, data: attachment.data } };
        } else {
            contentText = `[FILE "${attachment.name}" UPLOADED. Analyze based on filename/context.]`;
        }

        return { text: contentText };

    } catch (e) {
        console.error("File Processing Error:", e);
        return { text: `[ERROR READING FILE ${attachment.name}: ${e.message}]` };
    }
}

/**
 * chatWithShark
 * Handles conversational queries AND Document Extraction.
 */
async function chatWithShark(messageOrMsgObject, userContext) {
    // 0. Extract Input
    let messageText = '';
    let attachment = null;

    if (typeof messageOrMsgObject === 'object' && messageOrMsgObject.text) {
        messageText = messageOrMsgObject.text;
        attachment = messageOrMsgObject.attachment || null;
    } else {
        messageText = String(messageOrMsgObject);
    }

    // 1. debug Auth
    try {
        await admin.credential.applicationDefault().getAccessToken();
    } catch (err) {
        console.warn("Auth Check Warning:", err.message);
    }

    // 2. Gather Context
    const contextData = await gatherContext(messageText, userContext);

    // 3. Process File (if any)
    let filePart = null;
    let fileContext = "";
    if (attachment) {
        const processed = await processAttachment(attachment);
        if (processed.text) fileContext = processed.text;
        if (processed.inlineData) filePart = processed.inlineData;
    }

    // 4. Construct System Prompt (Phase 7 - Strict Mode)
    const systemPrompt = `
You are SHARK, the COO AI of Ocean Pearl Seafood.
Your goal is to assist staff with operations, data entry, and auditing.

USER CONTEXT:
- Name: ${userContext.name}
- Role: ${userContext.role}
- Scope: ${userContext.locationId || 'Global'} / ${userContext.unitId || 'All'}
- Language Preference: ${userContext.language || 'English (Default to ID if message is ID)'}

LIVE DATA:
${contextData}

FILE CONTEXT:
${fileContext}

CORE INSTRUCTIONS (PHASE 7 - STRICT ASSISTANT):
1. **Language Adaptive**: Reply in the same language as the USER's message (Indonesian or English). If unsure, use Indonesian for local staff context.
2. **Draft-First**: You CANNOT execute actions directly. You create DRAFTS.
3. **Analyze Attachments**: 
   - If Image/PDF: Extract Date, Vendor, Items, Total Amount.
   - If Excel: Map columns to Transaction Fields.
4. **Enforce Role Limits**:
   - UNIT_OP: Can ONLY draft 'EXPENSE_REQUEST' or 'RECEIVING'.
   - LOC_MANAGER: Can draft 'EXPENSE', 'FUNDING_REQUEST', 'CASH_TRANSFER'.
   - HQ: Full access.
5. **No Hallucinations**: If data is unclear in the image, mark field as "NEEDS_VERIFICATION".

OUTPUT FORMAT:
Return a JSON object.
{
  "text": "Your conversational reply here (localized to ID or EN)...",
  "draft": {
     // ... valid draft object ...
  }
}
`;

    // 5. Generate
    try {
        console.log(`Sending to ${MODEL_NAME}...`);

        const contents = [
            { role: 'user', parts: [{ text: systemPrompt }] }
        ];

        // Add Image part if it exists
        if (filePart) {
            contents[0].parts.push(filePart);
            contents[0].parts[0].text += "\n[Analyze the attached image]";
        }

        // Add User Message
        contents[0].parts[0].text += `\nUSER MESSAGE: "${messageText}"`;

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            systemInstruction: "You are a JSON-speaking Operations AI. Always return valid structured JSON.",
            generationConfig: { responseMimeType: "application/json" }, // Force JSON
            contents: contents
        });

        let jsonRaw = response.text;
        // Cleanup if model adds Markdown wrapper despite instructions
        jsonRaw = jsonRaw.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(jsonRaw); // Return Object, not string

    } catch (error) {
        console.error("Shark Brain Error:", error);
        return {
            text: `I encountered a neural processing error: ${error.message}. Please try again.`,
            draft: null
        };
    }
}

module.exports = {
    auditTransaction,
    chatWithShark
};
