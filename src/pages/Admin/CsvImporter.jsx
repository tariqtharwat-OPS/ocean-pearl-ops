import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTransactionQueue } from '../../contexts/TransactionQueueContext';
import { useAuth } from '../../contexts/AuthContext';
import { Download, Upload, AlertTriangle, FileText } from 'lucide-react';

// Phase 3: Simple CSV Importer for Historical Data
export default function CsvImporter({ onClose }) {
    const { addTransaction } = useTransactionQueue();
    const { currentUser } = useAuth();
    const [csvText, setCsvText] = useState('');
    const [preview, setPreview] = useState([]);
    const [importing, setImporting] = useState(false);
    const [logs, setLogs] = useState([]);

    // Catalogs for Mapping
    const [itemsMap, setItemsMap] = useState({});
    const [partnersMap, setPartnersMap] = useState({});
    const [targetUnit, setTargetUnit] = useState(currentUser.unitId || '');

    // Load Catalogs
    React.useEffect(() => {
        const load = async () => {
            try {
                // Load Items
                const iSnap = await getDocs(collection(db, 'raw_materials'));
                const iMap = {};
                iSnap.docs.forEach(d => {
                    const data = d.data();
                    iMap[d.id.toLowerCase()] = d.id;
                    iMap[data.name.toLowerCase()] = d.id; // Map "Yellowfin Tuna" -> "tuna_yellowfin"
                    if (data.name_id) iMap[data.name_id.toLowerCase()] = d.id;
                });
                setItemsMap(iMap);

                // Load Partners
                const pSnap = await getDocs(collection(db, 'partners'));
                const pMap = {};
                pSnap.docs.forEach(d => {
                    const data = d.data();
                    pMap[d.id.toLowerCase()] = d.id;
                    pMap[data.name.toLowerCase()] = d.id;
                });
                setPartnersMap(pMap);
            } catch (e) {
                console.error("Catalog Load Error", e);
            }
        };
        load();
    }, []);

    const parseCSV = () => {
        if (!csvText) return;
        const lines = csvText.split('\n').filter(l => l.trim());
        const parsed = lines.map((line, idx) => {
            const cols = line.split(',').map(c => c.trim());
            if (cols.length < 4) return null;

            // Smart Mapping
            const rawItem = cols[1];
            const rawSupplier = cols[4];

            const matchedItem = itemsMap[rawItem.toLowerCase()] || rawItem; // Try map, else keep raw (user might know ID)
            const matchedSupplier = rawSupplier ? (partnersMap[rawSupplier.toLowerCase()] || rawSupplier) : 'cash_general';

            return {
                id: idx,
                date: cols[0],
                itemId: matchedItem,
                originalItem: rawItem,
                qty: parseFloat(cols[2]),
                price: parseFloat(cols[3]),
                supplier: matchedSupplier,
                valid: !!itemsMap[rawItem.toLowerCase()] // visual flag
            };
        }).filter(r => r && !isNaN(r.qty));
        setPreview(parsed);
    };

    const runImport = async () => {
        if (!currentUser.locationId) return alert("You must be logged in to a location.");
        setImporting(true);
        setLogs([]);

        // Loop and Insert
        // IMPORTANT: Set skipAudit = true to avoid flooding WhatsApp
        let successCount = 0;

        for (const row of preview) {
            try {
                await addTransaction({
                    type: 'PURCHASE_RECEIVE',
                    locationId: currentUser.locationId,
                    unitId: currentUser.unitId || targetUnit || 'unknown', // Priority to selection if global
                    supplierId: row.supplier,
                    itemId: row.itemId,
                    quantityKg: row.qty,
                    pricePerKg: row.price,
                    gradeId: 'NA',
                    paymentMethod: 'cash', // Default historical to Cash
                    amount: row.qty * row.price,
                    description: 'Historical Data Import (CSV)',
                    customDate: new Date(row.date).toISOString(), // Backdate
                    skipAudit: true, // SILENT MODE
                    finalized: true
                });
                setLogs(prev => [...prev, `✅ Imported ${row.date}: ${row.itemId}`]);
                successCount++;
            } catch (e) {
                setLogs(prev => [...prev, `❌ Failed ${row.date}: ${e.message}`]);
            }
        }

        setImporting(false);
        alert(`Import Complete. ${successCount} records added.`);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] backdrop-blur-sm">
            <div className="bg-white w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
                <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                    <h2 className="font-bold flex items-center gap-2">
                        <Upload size={20} /> Historical Data Time Machine
                    </h2>
                    <button onClick={onClose} className="hover:text-red-400">Close</button>
                </div>

                <div className="flex-1 overflow-auto p-6 grid grid-cols-2 gap-6">
                    {/* Left: Input */}
                    <div className="space-y-4">
                        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded text-sm text-yellow-800">
                            <h3 className="font-bold flex items-center gap-2 mb-2"><AlertTriangle size={16} /> WARNING</h3>
                            <p>This tool injects data directly into the ledger.</p>
                            <p className="mt-1">Format: <code>YYYY-MM-DD, item_id, qty, price, supplier_id</code></p>
                            <p className="mt-1 font-mono text-xs">Example: 2025-12-01, tuna_yellowfin, 50.5, 35000, sup_budi</p>
                        </div>

                        <textarea
                            className="w-full h-64 p-4 font-mono text-xs border rounded bg-slate-50"
                            placeholder="Paste CSV content here..."
                            value={csvText}
                            onChange={e => setCsvText(e.target.value)}
                        />

                        {!currentUser.unitId && (
                            <div className="bg-red-50 p-2 border border-red-200 rounded">
                                <label className="text-xs font-bold text-red-800">Target Unit (Required for Global Admin)</label>
                                <select
                                    className="w-full p-2 border rounded mt-1 bg-white"
                                    value={targetUnit}
                                    onChange={e => setTargetUnit(e.target.value)}
                                >
                                    <option value="">-- Select Target Unit --</option>
                                    <option value="unit_a">Jakarta - Unit A (Production)</option>
                                    <option value="unit_b">Jakarta - Unit B</option>
                                    <option value="office">Jakarta - HO Asset Store</option>
                                    <option value="gudang_teri">Kaimana - Anchovy Generic Warehouse</option>
                                    <option value="frozen_factory">Kaimana - Frozen Factory</option>
                                </select>
                            </div>
                        )}

                        <button onClick={parseCSV} className="btn-secondary w-full">Probe Data (Map & Parse)</button>
                    </div>

                    {/* Right: Preview & Logs */}
                    <div className="flex flex-col h-full">
                        {preview.length > 0 && !importing && (
                            <div className="flex-1 overflow-auto border rounded mb-4">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-100 font-bold sticky top-0">
                                        <tr>
                                            <th className="p-2">Date</th>
                                            <th className="p-2">Item</th>
                                            <th className="p-2 text-right">Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.map(r => (
                                            <tr key={r.id} className="border-b">
                                                <td className="p-2 font-mono">{r.date}</td>
                                                <td className="p-2">
                                                    <div className="font-bold">{r.itemId}</div>
                                                    {r.itemId !== r.originalItem && <div className="text-[10px] text-gray-400">Mapped from "{r.originalItem}"</div>}
                                                </td>
                                                <td className="p-2 text-right">{r.qty}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Logs Console */}
                        {importing || logs.length > 0 ? (
                            <div className="flex-1 bg-black text-green-400 font-mono text-xs p-4 overflow-auto rounded">
                                {logs.map((l, i) => <div key={i}>{l}</div>)}
                                {importing && <div className="animate-pulse">_ Injecting Records...</div>}
                            </div>
                        ) : null}

                        {preview.length > 0 && !importing && (
                            <button
                                onClick={runImport}
                                disabled={importing}
                                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow-lg flex items-center justify-center gap-2"
                            >
                                <Download size={20} /> EXECUTE INJECTION ({preview.length} Records)
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
