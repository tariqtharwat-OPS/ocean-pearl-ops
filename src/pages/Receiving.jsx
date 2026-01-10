import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTransactionQueue } from '../contexts/TransactionQueueContext';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, where, onSnapshot } from 'firebase/firestore'; // Added onSnapshot
import { ArrowLeft, Plus, Trash2, Save, Calendar, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSizeList, GRADES, SIZE_CONFIG, LOCATIONS } from '../lib/constants';

const DEFAULT_ROW = { itemId: '', sizeId: '', gradeId: '', quantityKg: '', pricePerKg: '', total: 0 };

export default function Receiving() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { addTransaction } = useTransactionQueue();

    // -- HEADER STATE --
    // Generate Robust System ID
    const [batchId] = useState(() => {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const rand = Math.random().toString(36).toUpperCase().slice(2, 7);
        return `RCV-${date}-${rand}`;
    });
    const [header, setHeader] = useState({
        supplierId: '',
        date: new Date().toISOString().split('T')[0],
        terms: 'pending' // Default to pending
    });

    // -- GRID STATE --
    const [rows, setRows] = useState([
        { ...DEFAULT_ROW, id: Date.now() },
        { ...DEFAULT_ROW, id: Date.now() + 1 },
        { ...DEFAULT_ROW, id: Date.now() + 2 }
    ]);

    // -- DATA STATE --
    const [partners, setPartners] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // -- LOAD DATA --
    useEffect(() => {
        if (!currentUser.locationId) return;
        setLoading(true);
        let unsubPartners = () => { };

        const load = async () => {
            try {
                // 1. Partners (REAL-TIME REACTIVITY)
                const q = query(
                    collection(db, 'partners'),
                    where('type', 'in', ['supplier', 'buy_agent'])
                );
                unsubPartners = onSnapshot(q, (snap) => {
                    setPartners(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                });


                // 2. Dynamic Catalog
                const unit = currentUser.unitId || '';
                let items = [];

                if (unit === 'gudang_teri') {
                    items = [{ id: 'anchovy_teri', label: 'Anchovy (Ikan Teri)', active: true }];
                } else {
                    const iSnap = await getDocs(collection(db, 'raw_materials'));
                    items = iSnap.docs
                        .filter(d => d.data().active)
                        .map(d => ({
                            id: d.id,
                            label: `${d.data().name} (${d.data().name_id || '-'})`,
                            ...d.data()
                        }));
                }
                setCatalog(items);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();

        return () => unsubPartners();
    }, [currentUser.locationId, currentUser.unitId]);

    // -- CALCULATIONS --
    const updateRow = (idx, field, val) => {
        const newRows = [...rows];
        newRows[idx][field] = val;

        // Auto-calc Subtotal
        if (field === 'quantityKg' || field === 'pricePerKg') {
            const qty = parseFloat(newRows[idx].quantityKg) || 0;
            const price = parseFloat(newRows[idx].pricePerKg) || 0;
            // Float Math Safety: Round to 2 decimals
            newRows[idx].total = Math.round((qty * price) * 100) / 100;
        }
        setRows(newRows);
    };

    const addRow = () => setRows([...rows, { ...DEFAULT_ROW, id: Date.now() }]);
    const removeRow = (idx) => {
        if (rows.length > 1) setRows(rows.filter((_, i) => i !== idx));
    };

    const grandTotal = rows.reduce((acc, r) => acc + (r.total || 0), 0);
    const totalQty = rows.reduce((acc, r) => acc + (parseFloat(r.quantityKg) || 0), 0);

    // -- SUBMIT --
    const handleSubmit = async () => {
        if (!header.supplierId) return alert("Select Supplier");

        // Validation: No Negatives
        const hasNegatives = rows.some(r => {
            const q = parseFloat(r.quantityKg);
            const p = parseFloat(r.pricePerKg);
            return (r.quantityKg !== '' && q <= 0) || (r.pricePerKg !== '' && p < 0);
        });

        if (hasNegatives) {
            return alert("CRITICAL: Quantity must be > 0 and Price cannot be negative.");
        }

        const validRows = rows.filter(r => r.itemId && parseFloat(r.quantityKg) > 0);
        if (validRows.length === 0) return alert("No valid items to save.");

        setSubmitting(true);

        try {
            // Sequential Insert
            // Note: We use one Batch ID for all lines. 
            // Phase 3: We pass 'customDate' to allow backdating.
            for (const row of validRows) {
                await addTransaction({
                    type: 'PURCHASE_RECEIVE',
                    locationId: currentUser.locationId,
                    unitId: currentUser.unitId,
                    supplierId: header.supplierId,
                    paymentMethod: header.terms,
                    paymentStatus: header.terms === 'cash' ? 'paid' : 'pending',
                    timestamp: new Date(header.date).toISOString(), // Visual Only
                    customDate: new Date(header.date).toISOString(), // Phase 3: Backdating
                    batchId,
                    itemId: row.itemId,
                    quantityKg: parseFloat(row.quantityKg),
                    pricePerKg: parseFloat(row.pricePerKg) || 0,
                    gradeId: row.gradeId || 'NA',
                    sizeId: row.sizeId || 'NA',
                    amount: row.total,
                    description: `Invoice ${batchId}`
                });
            }
            alert(`Invoice Saved! Batch: ${batchId}`);

            // Fast Reset for next entry
            setRows([
                { ...DEFAULT_ROW, id: Date.now() },
                { ...DEFAULT_ROW, id: Date.now() + 1 },
                { ...DEFAULT_ROW, id: Date.now() + 2 }
            ]);
            // Generate new Batch ID
            const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const rand = Math.random().toString(36).toUpperCase().slice(2, 7);
            // Keep Date and Supplier same for rapid entry, just clear items
        } catch (e) {
            alert(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    // -- PRINT --
    const handlePrint = () => {
        const originalTitle = document.title;
        document.title = batchId;
        window.print();
        document.title = originalTitle;
    };

    // -- HELPERS --
    const getRowSizeList = (itemId) => {
        if (!itemId) return [];
        const item = catalog.find(c => c.id === itemId);
        if (item && item.custom_sizes && Array.isArray(item.custom_sizes) && item.custom_sizes.length > 0) {
            return item.custom_sizes;
        }
        return getSizeList(itemId);
    };

    const locLabel = LOCATIONS[currentUser?.locationId]?.label || currentUser?.locationId;
    const unitLabel = LOCATIONS[currentUser?.locationId]?.units.find(u => u.id === currentUser?.unitId)?.label || currentUser?.unitId;

    if (!currentUser.locationId) return <div className="p-10 text-center text-red-500 font-bold">⚠️ Select Location First</div>;

    return (
        <div className="space-y-6 pb-20 print:fixed print:inset-0 print:bg-white print:z-[9999] print:p-8 print:h-screen print:overflow-auto">
            {/* ACTION BAR TOP (Hidden on Print) */}
            <div className="flex items-center justify-between print:hidden">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <ArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Receiving</h1>
                        <p className="text-xs font-mono text-slate-400">Unit: {currentUser.unitId?.toUpperCase()}</p>
                    </div>
                </div>
                <button onClick={handlePrint} className="p-2 hover:bg-slate-100 rounded-full text-slate-600" title="Print Invoice">
                    <Printer size={20} />
                </button>
            </div>

            {/* LOCATION/UNIT INFO BAR */}
            <div className="bg-white border-b border-slate-200 sticky top-16 z-10 shadow-sm print:hidden">
                <div className="max-w-5xl mx-auto px-4 py-3">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <button onClick={() => navigate('/')} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-1 text-sm">
                                <ArrowLeft size={16} /> Cancel
                            </button>
                            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <span>📥</span> Receive Goods
                            </h1>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-bold text-slate-700">{unitLabel}</div>
                            <div className="text-xs text-slate-500 font-mono">{locLabel}</div>
                            <div className="text-[10px] font-mono text-slate-400 mt-1">REF: {batchId}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PRINT HEADER */}
            <div className="hidden print:block mb-8 text-center border-b pb-4">
                <h1 className="text-2xl font-bold uppercase tracking-wider">Purchase Invoice</h1>
                <div className="flex justify-between items-end mt-4">
                    <div className="text-left">
                        <div className="text-xs text-slate-500 uppercase">BATCH ID</div>
                        <div className="font-mono text-xl font-bold">{batchId}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-slate-500 uppercase">DATE</div>
                        <div className="font-mono text-lg">{new Date(header.date).toLocaleDateString()}</div>
                    </div>
                </div>
            </div>

            {/* HEADER FORM */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:hidden">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Supplier / Source</label>
                    <div className="relative">
                        <select
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 outline-none focus:ring-2 focus:ring-ocean-dial appearance-none"
                            value={header.supplierId}
                            onChange={(e) => setHeader({ ...header, supplierId: e.target.value })}
                        >
                            <option value="">-- Select Supplier / Fisher --</option>
                            <option value="cash_general">CASH (General / Walk-in)</option>
                            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        {/* Print Only Text */}
                        <div className="hidden print:block text-lg font-bold border-b border-black w-full pb-1">
                            {header.supplierId === 'cash_general' ? 'CASH (General / Walk-in)' : (partners.find(p => p.id === header.supplierId)?.name || '________________')}
                        </div>
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Transaction Date</label>
                    <div className="relative">
                        <input
                            type="date"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono outline-none focus:ring-2 focus:ring-ocean-dial pl-10 print:hidden"
                            value={header.date}
                            onChange={(e) => setHeader({ ...header, date: e.target.value })}
                        />
                        <Calendar className="absolute left-3 top-3 text-slate-400 print:hidden" size={18} />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Payment Terms</label>
                    <select
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 outline-none focus:ring-2 focus:ring-ocean-dial print:hidden"
                        value={header.terms}
                        onChange={(e) => setHeader({ ...header, terms: e.target.value })}
                    >
                        <option value="pending">Credit / Pending (Pay Later)</option>
                        <option value="cash">Cash (Paid Now)</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden print:shadow-none print:border-t-2 print:border-b-2 print:border-black print:rounded-none">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 print:bg-white print:text-black print:uppercase">
                        <tr>
                            <th className="p-4 print:p-2 w-auto">Item Details</th>
                            <th className="p-4 w-24 print:p-2">Size</th>
                            <th className="p-4 w-24 print:p-2">Grade</th>
                            <th className="p-4 w-32 text-right print:p-2">Qty (Kg)</th>
                            <th className="p-4 w-40 text-right print:p-2">Price/Kg</th>
                            <th className="p-4 w-40 text-right print:p-2">Subtotal</th>
                            <th className="p-4 w-12 print:hidden"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                        {rows.map((row, idx) => (
                            <tr key={row.id} className="group hover:bg-slate-50 transition-colors print:hover:bg-white">
                                <td className="p-4 align-top print:p-2">
                                    <select
                                        className="w-full p-2 border border-slate-300 rounded font-medium focus:border-ocean-dial outline-none print:hidden"
                                        value={row.itemId}
                                        onChange={e => updateRow(idx, 'itemId', e.target.value)}
                                    >
                                        <option value="">Select Species...</option>
                                        {catalog.map(item => (
                                            <option key={item.id} value={item.id}>{item.label}</option>
                                        ))}
                                    </select>
                                    <div className="hidden print:block font-bold">
                                        {catalog.find(c => c.id === row.itemId)?.label || '-'}
                                    </div>
                                </td>
                                <td className="p-4 align-top print:p-2">
                                    <select
                                        className="w-full p-1 text-xs border rounded print:hidden"
                                        value={row.sizeId}
                                        onChange={e => updateRow(idx, 'sizeId', e.target.value)}
                                    >
                                        <option value="">-</option>
                                        {getRowSizeList(row.itemId).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <div className="hidden print:block text-xs uppercase">{row.sizeId}</div>
                                </td>
                                <td className="p-4 align-top print:p-2">
                                    <select
                                        className="w-full p-1 text-xs border rounded print:hidden"
                                        value={row.gradeId}
                                        onChange={e => updateRow(idx, 'gradeId', e.target.value)}
                                    >
                                        <option value="">-</option>
                                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                    <div className="hidden print:block text-xs uppercase">{row.gradeId}</div>
                                </td>
                                <td className="p-4 align-top print:p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        className="w-full p-2 text-right font-mono border rounded focus:border-ocean-dial outline-none print:hidden"
                                        placeholder="0.00"
                                        value={row.quantityKg}
                                        onChange={e => updateRow(idx, 'quantityKg', e.target.value)}
                                    />
                                    <div className="hidden print:block text-right font-mono">{row.quantityKg || '-'}</div>
                                </td>
                                <td className="p-4 align-top print:p-2">
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        className="w-full p-2 text-right font-mono border rounded focus:border-ocean-dial outline-none print:hidden"
                                        placeholder="0"
                                        value={row.pricePerKg}
                                        onChange={e => updateRow(idx, 'pricePerKg', e.target.value)}
                                    />
                                    <div className="hidden print:block text-right font-mono">{row.pricePerKg ? parseInt(row.pricePerKg).toLocaleString() : '-'}</div>
                                </td>
                                <td className="p-4 align-top text-right font-mono font-bold text-slate-700 print:text-black print:p-2">
                                    {row.total.toLocaleString()}
                                </td>
                                <td className="p-4 align-top text-center print:hidden">
                                    <button
                                        onClick={() => removeRow(idx)}
                                        className="text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 print:bg-white print:border-t-2 print:border-black">
                        <tr>
                            <td colSpan="3" className="p-4 text-right font-bold text-slate-500 print:text-black">Grand Total</td>
                            <td className="p-4 text-right font-mono font-bold">{totalQty.toLocaleString()} kg</td>
                            <td></td>
                            <td className="p-4 text-right font-mono font-bold text-lg text-ocean-dial print:text-black">
                                {grandTotal.toLocaleString()}
                            </td>
                            <td className="print:hidden"></td>
                        </tr>
                    </tfoot>
                </table>
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center print:hidden">
                    <button
                        onClick={addRow}
                        className="flex items-center gap-2 text-sm font-bold text-ocean-dial hover:text-cyan-700 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <Plus size={16} /> Add Line Item
                    </button>
                    <button onClick={handlePrint} className="flex items-center gap-2 text-slate-500 hover:text-slate-800">
                        <Printer size={16} /> Print Preview
                    </button>
                </div>
            </div>

            {/* PRINT SIGNATURE BLOCK */}
            <div className="hidden print:flex justify-between mt-12 pt-8">
                <div className="text-center">
                    <div className="h-16 border-b border-black w-48 mb-2"></div>
                    <div className="text-sm font-bold">Supplier Signature</div>
                </div>
                <div className="text-center">
                    <div className="h-16 border-b border-black w-48 mb-2"></div>
                    <div className="text-sm font-bold">Receiver Signature</div>
                </div>
            </div>

            {/* SUBMIT FOOTER */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 shadow-2xl z-[100] flex justify-end print:hidden">
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="btn btn-primary px-8 py-3 flex items-center gap-3 shadow-lg"
                >
                    {submitting ? 'Saving Invoice...' : (
                        <>
                            <Save size={20} />
                            Save Invoice
                        </>
                    )}
                </button>
            </div>        </div>
    );
}
