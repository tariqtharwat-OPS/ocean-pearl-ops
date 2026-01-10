// DEPRECATED: This file is part of the legacy V1 system available for reference only.
// See SYSTEM_CANONICAL_STATE.md for details.
// DO NOT USE FOR NEW FEATURES.

import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, onSnapshot, orderBy, limit, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { LOCATIONS } from '../../lib/constants';

// ROOT ADMIN DASHBOARD
export default function DashboardV1() {
    const [stats, setStats] = useState({
        totalCash: 0,
        estRevenue: 0, // Mock for now or derived from stock
        activeWallets: 0
    });
    const [feed, setFeed] = useState([]);
    const [locationsStatus, setLocationsStatus] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]); // New V2 Approvals
    const [processingId, setProcessingId] = useState(null); // ID being approved/rejected
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Live Financials (Wallets)
        const unsubWallets = onSnapshot(collection(db, 'site_wallets'), (snap) => {
            let total = 0;
            let count = 0;
            snap.forEach(doc => {
                const data = doc.data();
                // Sum balances. Even negative balances (if any) are part of liquidity state.
                if (typeof data.balance === 'number') total += data.balance;
                count++;
            });
            setStats(prev => ({ ...prev, totalCash: total, activeWallets: count }));
        });

        // 2. System Feed (Live Notifications)
        const qFeed = query(collection(db, 'admin_notifications'), orderBy('timestamp', 'desc'), limit(20));
        const unsubFeed = onSnapshot(qFeed, (snap) => {
            setFeed(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // 3. Map Status (Locations)
        const locs = Object.values(LOCATIONS).map(l => ({
            id: l.id,
            label: l.label,
            status: 'online', // Mock 'online' or fetch logic
            units: l.units.length
        }));
        setLocationsStatus(locs);

        // 4. Pending Requests (V2 Finance)
        const qReq = query(collection(db, 'financial_requests'), where('status', '==', 'PENDING'), orderBy('createdAt', 'desc'));
        const unsubReq = onSnapshot(qReq, (snap) => {
            setPendingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        setLoading(false);

        return () => {
            unsubWallets();
            unsubFeed();
            unsubReq();
        };
    }, []);

    const handleAction = async (reqId, action) => {
        if (!confirm(`Are you sure you want to ${action} this request?`)) return;
        setProcessingId(reqId);
        try {
            const functions = getFunctions(getApp(), 'asia-southeast2');
            const fnName = action === 'APPROVE' ? 'approveFinancialRequest' : 'rejectFinancialRequest';
            const fn = httpsCallable(functions, fnName);

            await fn({ requestId: reqId, reason: action === 'REJECT' ? 'Admin rejection via Dashboard' : undefined });
        } catch (error) {
            console.error(error);
            alert("Action failed: " + error.message);
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Initializing Command Center...</div>;

    const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">

            {/* WIDGET ROW 1.5: PENDING APPROVALS */}
            {pendingRequests.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm animate-in slide-in-from-top-4">
                    <h2 className="text-amber-800 font-bold uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        Action Required ({pendingRequests.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingRequests.map(req => (
                            <div key={req.id} className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm relative">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="text-xs font-bold text-slate-500 uppercase">{req.type} • {req.locationId}</div>
                                    <div className="text-xs text-slate-400">{new Date(req.createdAt?.seconds * 1000).toLocaleDateString()}</div>
                                </div>
                                <div className="font-bold text-slate-800 text-lg mb-1">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(req.amount)}
                                </div>
                                <div className="text-sm text-slate-600 mb-4 line-clamp-2" title={req.description}>
                                    {req.description} ({req.requesterName})
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        disabled={!!processingId}
                                        onClick={() => handleAction(req.id, 'APPROVE')}
                                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                                    >
                                        {processingId === req.id ? '...' : 'APPROVE'}
                                    </button>
                                    <button
                                        disabled={!!processingId}
                                        onClick={() => handleAction(req.id, 'REJECT')}
                                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                                    >
                                        REJECT
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>⚡</span> OPS COMMAND CENTER
            </h1>

            {/* WIDGET ROW 1 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* FINANCIALS WIDGET */}
                <div className="md:col-span-2 bg-gradient-to-br from-emerald-900 to-emerald-700 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-emerald-100 font-bold uppercase tracking-widest text-xs mb-1">Global Cash Liquidity</h2>
                        <div className="text-4xl font-bold">{formatCurrency(stats.totalCash)}</div>
                        <div className="mt-4 flex gap-4 text-xs font-mono opacity-80">
                            <div>WALLETS: {stats.activeWallets}</div>
                            <div>•</div>
                            <div>EST. REVENUE: {formatCurrency(stats.totalCash * 1.5)} (Proj)</div>
                        </div>
                    </div>
                    {/* Decorative Background */}
                    <div className="absolute -right-10 -bottom-10 opacity-10 text-9xl">💰</div>
                </div>

                {/* MAP STATUS WIDGET */}
                <div className="md:col-span-1 bg-white border rounded-2xl p-6 shadow-sm">
                    <h2 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-4">Location Status</h2>
                    <div className="space-y-3">
                        {locationsStatus.map(loc => (
                            <div key={loc.id} className="flex justify-between items-center">
                                <span className="font-bold text-slate-700">{loc.label}</span>
                                <span className="flex items-center gap-1.5 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                    Online
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* QUICK ACTIONS */}
                <div className="md:col-span-1 bg-slate-50 border rounded-2xl p-6 shadow-inner">
                    <h2 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-4">System Control</h2>
                    <div className="space-y-2">
                        <button onClick={() => window.location.href = '/admin'} className="w-full py-2 bg-white border shadow-sm rounded text-sm font-bold hover:bg-slate-50 text-slate-700">
                            Manage Users
                        </button>
                        <button className="w-full py-2 bg-white border shadow-sm rounded text-sm font-bold hover:bg-slate-50 text-slate-700 opacity-50 cursor-not-allowed">
                            Deploy Updates (Coming Soon)
                        </button>
                    </div>
                </div>
            </div>

            {/* WIDGET ROW 2: SHARK FEED */}
            <div className="bg-slate-900 text-slate-200 rounded-2xl shadow-xl overflow-hidden border border-slate-700">
                <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-teal-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                        SHARK AI FEED (LIVE)
                    </h3>               <span className="text-xs font-mono text-slate-500">Watching {locationsStatus.length} Nodes</span>
                </div>
                <div className="h-96 overflow-y-auto p-4 space-y-2 font-mono text-sm scrollbar-thin scrollbar-thumb-slate-700">
                    {feed.length === 0 && <div className="text-slate-600 italic">No recent activity detected. Structure silent.</div>}
                    {feed.map(item => (
                        <div key={item.id} className={`p-3 rounded border-l-2 flex gap-3 ${item.type === 'alert' || item.severity === 'high' ? 'bg-red-900/20 border-red-500 text-red-200' : 'bg-slate-800/50 border-cyan-500 text-emerald-100'}`}>
                            <div className="text-xs opacity-50 whitespace-nowrap pt-0.5">
                                {item.timestamp?.seconds ? new Date(item.timestamp.seconds * 1000).toLocaleTimeString() : 'Just now'}
                            </div>
                            <div>
                                <div className="font-bold mb-0.5">{item.title || 'System Event'}</div>
                                <div className="opacity-80">{item.message}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
