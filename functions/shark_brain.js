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

// CACHE: Simple in-memory cache
const CACHE = {
    dashboard: { data: null, expiry: 0 },
    locations: { data: null, expiry: 0 }
};

/**
 * gatherContext
 * Intelligently fetching data based on the user's specifics.
 * OPTIMIZED: Parallel Execution & RBAC SCOPE ENFORCEMENT
 */
async function gatherContext(message, userContext) {
    const db = admin.firestore();
    let contextParts = [];
    const lowerMsg = message.toLowerCase();
    const now = Date.now();
    const tasks = [];

    // 1. DETERMINE SCOPE
    // Hierarchy: CEO > HQ_ADMIN > LOC_MANAGER > UNIT_OP
    const role = userContext.role_v2 || userContext.role || 'viewer';
    const isGlobal = (role === 'HQ_ADMIN' || role === 'CEO' || role === 'admin');

    let scopeDesc = '';
    let targetLocations = [];

    if (isGlobal) {
        scopeDesc = 'GLOBAL (All Locations)';
    } else {
        scopeDesc = `LOCAL (${userContext.locationId || 'Unassigned'})`;
        if (userContext.locationId) targetLocations.push(userContext.locationId);
    }
    contextParts.push(`SCOPE_MODE: ${scopeDesc}`);
    
    // V2 ANOMALY CHECKS
    if (lowerMsg.includes('anomaly') || lowerMsg.includes('check') || lowerMsg.includes('alert')) {
        tasks.push((async () => {
            try {
                const anomalies = [];
                
                // Check for low yield in processing runs
                const processingSnap = await db.collection('transactions')
                    .where('type', '==', 'COLD_STORAGE_IN')
                    .orderBy('timestamp', 'desc')
                    .limit(10)
                    .get();
                
                processingSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.rawUsedKg && data.quantityKg) {
                        const yield = (data.quantityKg / data.rawUsedKg) * 100;
                        if (yield < 30) {
                            anomalies.push(`CRITICAL LOW YIELD: ${yield.toFixed(1)}% in ${doc.id}`);
                        }
                    }
                });
                
                if (anomalies.length > 0) {
                    contextParts.push(`ANOMALIES_DETECTED: ${anomalies.join(', ')}`);
                }
            } catch (e) { console.warn('Anomaly check failed', e); }
        })());
    }

    // 2. GLOBAL DASHBOARD (Cached)
    if (lowerMsg.includes('dashboard') || lowerMsg.includes('summary') || lowerMsg.includes('status')) {
        if (CACHE.dashboard.data && CACHE.dashboard.expiry > now) {
            contextParts.push(CACHE.dashboard.data);
        } else {
            tasks.push((async () => {
                try {
                    const dateStr = new Date().toISOString().split('T')[0];
                    const statsSnap = await db.doc(`dashboard_stats/${dateStr}`).get();
                    if (statsSnap.exists) {
                        const dataStr = `TODAY_STATS(${dateStr}): ${JSON.stringify(statsSnap.data())} `;
                        CACHE.dashboard = { data: dataStr, expiry: now + 60000 };
                        contextParts.push(dataStr);
                    }
                } catch (e) { console.warn("Dashboard fetch failed", e); }
            })());
        }
    }

    // 3. WALLETS (Financials)
    if (lowerMsg.includes('wallet') || lowerMsg.includes('balance') || lowerMsg.includes('money') || lowerMsg.includes('cash')) {
        tasks.push((async () => {
            try {
                let walletInfo = [];
                if (isGlobal) {
                    // Fetch ALL wallets
                    const walletsSnap = await db.collection('site_wallets').get();
                    walletsSnap.forEach(doc => {
                        const d = doc.data();
                        walletInfo.push(`Wallet [${doc.id}]: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(d.balance || 0)}`);
                    });
                } else if (userContext.locationId) {
                    // Fetch Location Wallet AND Unit Wallets in that location
                    // Note: Schema ambiguity (Unit vs Location wallets). We check specific docs.
                    const locWallet = await db.doc(`site_wallets/${userContext.locationId}`).get();
                    if (locWallet.exists) walletInfo.push(`Location Wallet: ${locWallet.data().balance}`);

                    if (userContext.unitId) {
                        const unitWallet = await db.doc(`site_wallets/${userContext.unitId}`).get();
                        if (unitWallet.exists) walletInfo.push(`Unit Wallet: ${unitWallet.data().balance}`);
                    }
                }
                contextParts.push(`FINANCIAL_POSITION:\n${walletInfo.join('\n')}`);
            } catch (e) { contextParts.push(`WALLET_ERROR: ${e.message}`); }
        })());
    }

    // 4. INVENTORY / STOCK
    if (lowerMsg.includes('stock') || lowerMsg.includes('have') || lowerMsg.includes('inventory') || lowerMsg.includes('much')) {
        tasks.push((async () => {
            try {
                // If Global, use Collection Group Query for maximum reach
                // If Local, iterate units in location.
                // Detect explicit location mention
                const knownLocations = ['jakarta', 'kaimana', 'saumlaki', 'hq'];
                const mentionedLocation = knownLocations.find(loc => lowerMsg.includes(loc));
                const targetLocId = isGlobal ? (mentionedLocation || null) : userContext.locationId;

                let stocks = [];

                if (isGlobal && !mentionedLocation) {
                    // Global Search (Generic)
                    // collectionGroup('stock') is powerful.
                    const stockSnap = await db.collectionGroup('stock').orderBy('quantityKg', 'desc').limit(100).get();
                    stockSnap.forEach(doc => {
                        const d = doc.data();
                        const pathSegments = doc.ref.path.split('/');
                        const loc = pathSegments[1] || 'Unknown';
                        const unit = pathSegments[3] || 'Unknown';

                        if (d.quantityKg > 0) {
                            stocks.push(`- ${d.label || d.itemId} (${d.type}): ${d.quantityKg}kg @ ${loc}/${unit}`);
                        }
                    });
                } else if (targetLocId) {
                    // Local Search (or Targeted Global Search)
                    const unitsSnap = await db.collection(`locations/${targetLocId}/units`).get();
                    for (const unit of unitsSnap.docs) {
                        const sSnap = await unit.ref.collection('stock').get();
                        sSnap.forEach(d => {
                            const val = d.data();
                            if (val.quantityKg > 0) stocks.push(`- ${val.label || val.itemId}: ${val.quantityKg}kg @ ${unit.id}`);
                        });
                    }
                }

                if (stocks.length > 0) {
                    // Keyword filter if message is specific
                    const commonFish = ['tuna', 'skipjack', 'yellowfin', 'snapper', 'kakap', 'madidihang', 'teri', 'anchovy'];
                    const keywords = commonFish.filter(f => lowerMsg.includes(f));

                    if (keywords.length > 0) {
                        const filtered = stocks.filter(s => keywords.some(k => s.toLowerCase().includes(k)));
                        contextParts.push(`INVENTORY_MATCHING_QUERY:\n${filtered.join('\n')}`);
                    } else {
                        // Return top 20
                        contextParts.push(`FULL_INVENTORY_REPORT:\n${stocks.slice(0, 20).join('\n')}`);
                    }
                } else {
                    contextParts.push("INVENTORY: Zero stock found in scope.");
                }

            } catch (e) { console.error(e); contextParts.push("INVENTORY_ERROR: " + e.message); }
        })());
    }

    // 5. TRANSACTIONS (Recent)
    if (lowerMsg.includes('sell') || lowerMsg.includes('audit') || lowerMsg.includes('transaction') || lowerMsg.includes('sales')) {
        tasks.push((async () => {
            // Admin sees all, Manager sees location
            let q = db.collection('transactions').orderBy('timestamp', 'desc').limit(5);
            if (!isGlobal && userContext.locationId) {
                q = q.where('locationId', '==', userContext.locationId);
            }

            const snap = await q.get();
            const txns = snap.docs.map(d => {
                const v = d.data();
                return `[${v.timestamp?.toDate ? v.timestamp.toDate().toISOString().split('T')[0] : '?'}] ${v.type} | ${v.totalAmount} | ${v.locationId}`;
            });
            contextParts.push(`RECENT_TRANSACTIONS:\n${txns.join('\n')}`);
        })());
    }

    await Promise.all(tasks);

    if (contextParts.length === 0) return "No specific live data found. Answer from general knowledge.";
    return "\n--- LIVE SYSTEM DATA ---\n" + contextParts.join('\n\n') + "\n------------------------\n";
}


// --- RETRY LOGIC WITH EXPONENTIAL BACKOFF ---

/**
 * callGeminiWithRetry
 * Wraps Gemini API calls with exponential backoff retry logic.
 * Handles 429 rate limit errors gracefully.
 */
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000; // 1 second
const MAX_DELAY_MS = 30000; // 30 seconds

async function callGeminiWithRetry(apiCall, retryCount = 0) {
    try {
        return await apiCall();
    } catch (error) {
        // Check if it's a rate limit error (429)
        const isRateLimitError = error.code === 429 ||
            (error.message && error.message.includes('Resource exhausted'));

        if (isRateLimitError && retryCount < MAX_RETRIES) {
            // Calculate exponential backoff delay
            const delay = Math.min(
                INITIAL_DELAY_MS * Math.pow(2, retryCount),
                MAX_DELAY_MS
            );

            // Add jitter to prevent thundering herd
            const jitter = Math.random() * delay * 0.1;
            const totalDelay = delay + jitter;

            console.warn(
                `⚠️ Rate limit hit (attempt ${retryCount + 1}/${MAX_RETRIES}). ` +
                `Retrying in ${Math.round(totalDelay)}ms...`
            );

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, totalDelay));

            // Recursive retry
            return callGeminiWithRetry(apiCall, retryCount + 1);
        }

        // If not a rate limit error or max retries exceeded, throw
        throw error;
    }
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
        const response = await callGeminiWithRetry(async () => {
            return await ai.models.generateContent({
                model: MODEL_NAME,
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: prompt }]
                    }
                ],
            });
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
            // Images handled natively by Gemini Vision (Standard camelCase for v1 API)
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

    if (typeof messageOrMsgObject === 'object') {
        messageText = messageOrMsgObject.text || ''; // Allow empty text (e.g. image only)
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
        if (processed.inlineData) filePart = processed; // Fix: Do not unwrap inlineData
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

        // DEBUG: Log payload structure to debug serialization issues
        console.log("DEBUG: GenAI Payload Parts:", JSON.stringify(contents[0].parts).substring(0, 500) + "...");


        // Add User Message
        contents[0].parts[0].text += `\nUSER MESSAGE: "${messageText}"`;

        const response = await callGeminiWithRetry(async () => {
            return await ai.models.generateContent({
                model: MODEL_NAME,
                systemInstruction: "You are a JSON-speaking Operations AI. Always return valid structured JSON.",
                generationConfig: { responseMimeType: "application/json" }, // Force JSON
                contents: contents
            });
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
