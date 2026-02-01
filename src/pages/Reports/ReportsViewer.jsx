import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collectionGroup, getDocs as getDocsGroup, collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

export default function ReportsViewer() {
    const [activeTab, setActiveTab] = useState('stock');

    return (
        <div className="p-4 max-w-6xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Reports (Phase 2)</h1>

            <div className="flex space-x-4 border-b overflow-x-auto">
                {['stock', 'transactions', 'yield', 'cash'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-2 px-4 capitalize ${activeTab === tab ? 'border-b-2 border-ocean-dial text-ocean-dial' : 'text-slate-500'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="bg-white p-6 rounded-lg shadow min-h-[400px]">
                {activeTab === 'stock' && <StockReport />}
                {activeTab === 'transactions' && <TransactionsReport />}
                {activeTab === 'yield' && <YieldReport />}
                {activeTab === 'cash' && <CashReport />}
            </div>
        </div>
    );
}

function StockReport() {
    const { currentUser } = useAuth();
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStock = async () => {
            setLoading(true);
            try {
                let q;
                if (currentUser.unitId && currentUser.locationId) {
                    q = query(collection(db, `locations/${currentUser.locationId}/units/${currentUser.unitId}/stock`));
                } else {
                    q = query(collectionGroup(db, 'stock'));
                }
                const snap = await getDocs(q);
                setStats(snap.docs.map(d => ({ ...d.data(), id: d.id, path: d.ref.path })));
            } catch (err) {
                console.error("Stock Report Error:", err);
            }
            setLoading(false);
        };
        fetchStock();
    }, [currentUser.locationId, currentUser.unitId]);

    if (loading) return <div className="p-8 text-center text-slate-400">Loading Stock...</div>;

    return (
        <div className="overflow-x-auto">
            <h2 className="font-bold mb-4">{currentUser.unitId ? `${currentUser.unitId.toUpperCase()} Stock` : 'Global Stock Assets'}</h2>
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b">
                    <tr>
                        <th className="p-3">Item/Grade</th>
                        <th className="p-3 text-right">Qty (Kg)</th>
                        <th className="p-3">Location Context</th>
                        <th className="p-3">Last Update</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {stats.map(s => (
                        <tr key={s.path} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold">{s.id}</td>
                            <td className="p-3 text-right font-mono text-ocean-dial font-bold">{s.quantityKg?.toFixed(2)}</td>
                            <td className="p-3 text-[10px] text-slate-400 truncate max-w-[200px]">{s.path.split('/')[1] || 'Global'}</td>
                            <td className="p-3 text-[10px] text-slate-400">
                                {s.updatedAt?.toDate ? s.updatedAt.toDate().toLocaleString() : (s.updatedAt ? new Date(s.updatedAt).toLocaleString() : '---')}
                            </td>
                        </tr>
                    ))}
                    {stats.length === 0 && (
                        <tr><td colSpan="4" className="p-8 text-center text-slate-400 italic">No stock records found for this context.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

function TransactionsReport() {
    const { currentUser } = useAuth();
    const [txns, setTxns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                let q;
                const unitId = currentUser.unitId;
                const locationId = currentUser.locationId;

                if (unitId) {
                    q = query(collection(db, 'transactions'), where('unitId', '==', unitId), orderBy('timestamp', 'desc'), limit(15));
                } else if (locationId && locationId !== 'jakarta') {
                    q = query(collection(db, 'transactions'), where('locationId', '==', locationId), orderBy('timestamp', 'desc'), limit(15));
                } else {
                    q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(15));
                }

                const snap = await getDocs(q);
                setTxns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.error("Txn Load Error", e);
            }
            setLoading(false);
        };
        load(); // Load immediately, useEffect handles the deps
    }, [currentUser.locationId, currentUser.unitId]);

    if (loading) return <div className="p-8 text-center text-slate-400">Loading Transactions...</div>;

    return (
        <div className="overflow-x-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold">Transaction History</h2>
                <div className="text-[10px] font-mono text-slate-400 uppercase">Context: {currentUser.unitId || currentUser.locationId}</div>
            </div>
            <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b">
                    <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Loc/Unit</th>
                        <th className="p-3">Details</th>
                        <th className="p-3 text-right">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {txns.map(t => {
                        const date = t.timestamp?.toDate ? t.timestamp.toDate() : (t.timestamp ? new Date(t.timestamp) : null);
                        const displayQty = (t.quantityKg || t.amount_kg) ? `(${(t.quantityKg || t.amount_kg).toFixed(1)}kg)` : '';
                        return (
                            <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 whitespace-nowrap text-slate-600 font-mono">
                                    {date ? date.toLocaleDateString() : '---'}
                                </td>
                                <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.type?.includes('EXPENSE') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                        {t.type}
                                    </span>
                                </td>
                                <td className="p-3 text-slate-400 text-xs">
                                    {t.locationId?.substr(0, 3).toUpperCase()}/{t.unitId?.substr(0, 10)}
                                </td>
                                <td className="p-3 text-slate-700">
                                    <div className="font-medium">{t.description || t.itemId}</div>
                                    <div className="text-[10px] text-slate-400">{displayQty} {t.pricePerKg ? `@ ${t.pricePerKg.toLocaleString()}` : ''}</div>
                                </td>
                                <td className="p-3 text-right font-mono font-bold">
                                    {(t.totalAmount || t.amount || 0).toLocaleString()}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function YieldReport() {
    const [entries, setEntries] = useState([]);

    useEffect(() => {
        const fetchYields = async () => {
            // Processing events are COLD_STORAGE_IN
            // Only those are relevant for yield (Traceability)
            const q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(50));
            const snap = await getDocs(q);
            // Filter client side for simplicity in V1
            const filtered = snap.docs
                .map(d => ({ ...d.data(), id: d.id }))
                .filter(d => d.type === 'COLD_STORAGE_IN');
            setEntries(filtered);
        };
        fetchYields();
    }, []);

    return (
        <div className="overflow-x-auto">
            <h2 className="font-bold mb-4">Processing Yield Traceability</h2>
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">Item</th>
                        <th className="p-2 text-right">Raw Input (Kg)</th>
                        <th className="p-2 text-right">Cold Output (Kg)</th>
                        <th className="p-2 text-right">Yield %</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map(e => {
                        const input = e.rawUsedKg || e.quantityKg; // Default to 1:1 if not specified
                        const output = e.quantityKg;
                        const yieldPct = ((output / input) * 100).toFixed(1);
                        return (
                            <tr key={e.id} className="border-b">
                                <td className="p-2">{e.serverTimestamp?.toDate().toLocaleDateString()}</td>
                                <td className="p-2">{e.itemId}</td>
                                <td className="p-2 text-right text-red-600 font-medium">-{input}</td>
                                <td className="p-2 text-right text-green-600 font-medium">+{output}</td>
                                <td className="p-2 text-right font-bold">{yieldPct}%</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function CashReport() {
    const [wallets, setWallets] = useState([]);

    useEffect(() => {
        const fetchWallets = async () => {
            const q = query(collection(db, 'site_wallets'));
            // Note: 'site_wallets' is root collection in my index.js logic "db.doc('site_wallets/${unitId}')"
            // Wait, index.js used db.doc(`site_wallets/${unitId}`);
            // This creates a root collection "site_wallets".
            const snap = await getDocs(q);
            setWallets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        };
        fetchWallets();
    }, []);

    return (
        <div className="overflow-x-auto">
            <h2 className="font-bold mb-4">Site Wallet Cash Positions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {wallets.map(w => (
                    <div key={w.id} className="p-4 border rounded-lg bg-slate-50">
                        <h3 className="text-gray-500 text-xs uppercase font-bold">{w.locationId} / {w.id}</h3>
                        <div className={`text-2xl font-bold mt-2 ${w.balance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(w.balance || 0)}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Last Update: {w.updatedAt?.toDate().toLocaleString()}</p>
                    </div>
                ))}
                {wallets.length === 0 && <p className="text-gray-400 italic">No wallet activity recorded yet.</p>}
            </div>
        </div>
    );
}
