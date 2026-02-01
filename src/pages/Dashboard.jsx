import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, DollarSign, Snowflake, Activity, BarChart3, Globe, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import DashboardV1 from './Admin/DashboardV1';

import { LOCATIONS, UNITS } from '../lib/constants';

// LEVEL 3: GLOBAL VIEW (Root Admin)
function AdminGlobalView() {
    return <DashboardV1 />;
}

function RecentTransactions({ locationId, unitId }) {
    const [txns, setTxns] = useState([]);
    // ... (rest of simple function body up to return)

    useEffect(() => {
        const load = async () => {
            try {
                let q;
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
        };
        load();
    }, [locationId, unitId]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden mt-6">
            <div className="p-4 border-b bg-neutral-50 font-bold text-gray-700">Recent Activity</div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-white text-gray-500 border-b">
                        <tr>
                            <th className="p-3">Type</th>
                            <th className="p-3">Ref</th>
                            <th className="p-3 text-right">Amount</th>
                            <th className="p-3 text-right">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {txns.map(t => (
                            <tr key={t.id} className="hover:bg-neutral-50">
                                <td className="p-3 font-medium">
                                    <span className={`px-2 py-1 rounded text-xs ${t.type.includes('EXPENSE') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                        {t.type.split('_')[0]}
                                    </span>
                                </td>
                                <td className="p-3 text-gray-600 truncate max-w-[150px]">
                                    {t.serialNumber || t.id.substr(0, 8)}
                                    <div className="text-xs text-gray-400">{t.description}</div>
                                </td>
                                <td className="p-3 text-right font-mono">
                                    {(t.totalAmount || t.amount || 0).toLocaleString()}
                                </td>
                                <td className="p-3 text-right text-gray-500 text-xs">
                                    {(() => {
                                        try {
                                            const ts = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
                                            return ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                        } catch {
                                            return '--:--';
                                        }
                                    })()}
                                </td>
                            </tr>
                        ))}
                        {txns.length === 0 && (
                            <tr><td colSpan="4" className="p-6 text-center text-gray-400">No recent activity</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// LEVEL 2: MANAGER VIEW (KPIs + Summary)
function LocationManagerView({ currentUser }) {
    const locConfig = Object.values(LOCATIONS).find(l => l.id === currentUser.locationId);

    return (
        <div className="space-y-6">
            <div className="bg-purple-900 text-white p-6 rounded-2xl shadow-xl">
                <h2 className="text-2xl font-bold mb-1">Manager Dashboard</h2>
                <div className="opacity-80 font-mono text-sm uppercase tracking-wide">
                    {currentUser.locationId?.toUpperCase() || 'UNKNOWN'} CONTROL
                </div>
                {/* Stats Stub */}
                <div className="mt-4 flex gap-4">
                    <div className="bg-white/20 px-4 py-2 rounded">
                        <div className="text-xs opacity-75">Status</div>
                        <div className="font-bold text-lg">ONLINE</div>
                    </div>
                </div>
            </div>

            {/* SITES OVERVIEW */}
            {locConfig && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {locConfig.units.map(unit => (
                        <div key={unit.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center group hover:border-purple-300 transition-all">
                            <div>
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Site Unit</div>
                                {/* Use unit.label directly from the object */}
                                <div className="font-bold text-slate-800 text-lg">{unit.label}</div>
                                <div className="text-xs text-slate-500 font-mono">{unit.id}</div>
                            </div>
                            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold group-hover:bg-purple-100 group-hover:text-purple-600">
                                ⚡
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* QUICK ACTIONS (Fix C6) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button onClick={() => window.location.href = '/expenses'} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-purple-500 hover:shadow-md transition-all text-left">
                    <div className="p-3 bg-purple-100 text-purple-600 rounded-full w-fit mb-3"><DollarSign size={24} /></div>
                    <h3 className="font-bold text-slate-700">Approvals</h3>
                    <p className="text-xs text-slate-500">Review Expenses</p>
                </button>
                <button onClick={() => window.location.href = '/wallet'} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all text-left">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full w-fit mb-3"><Activity size={24} /></div>
                    <h3 className="font-bold text-slate-700">Wallet</h3>
                    <p className="text-xs text-slate-500">Manage Funds</p>
                </button>
            </div>

            <RecentTransactions locationId={currentUser.locationId} />
        </div>
    );
}

// ...

// LEVEL 1: WORKER VIEW (Big Buttons)
function UnitWorkerView({ navigate, currentUser }) {
    const [walletRef, setWalletRef] = useState(0);
    const [rawStock, setRawStock] = useState(0);

    useEffect(() => {
        const loadKPIs = async () => {
            if (!currentUser.locationId) return;
            try {
                // Wallet - V2 uses centralized site_wallets
                const { doc, getDoc } = await import('firebase/firestore');
                const wDoc = await getDoc(doc(db, 'site_wallets', currentUser.unitId));
                if (wDoc.exists()) setWalletRef(wDoc.data().balance || 0);

                // Stock (Sum of RAW items)
                const sSnap = await getDocs(collection(db, `locations/${currentUser.locationId}/units/${currentUser.unitId}/stock`));
                const total = sSnap.docs
                    .filter(d => d.id.startsWith('RAW_'))
                    .reduce((acc, d) => acc + (d.data().quantityKg || 0), 0);
                setRawStock(total);

            } catch (e) {
                console.error("KPI Load Error", e);
            }
        };
        loadKPIs();
    }, [currentUser.locationId, currentUser.unitId]);

    const actions = [
        { label: 'Receive Stock', icon: Truck, path: '/receiving', color: 'bg-blue-600 text-white', desc: 'Inbound from Fishermen' },
        { label: 'Record Expense', icon: DollarSign, path: '/expenses', color: 'bg-emerald-600 text-white', desc: 'Daily Operational Costs' },
        { label: 'Production Run', icon: Snowflake, path: '/cold-storage', color: 'bg-cyan-600 text-white', desc: 'Processing & Freezing' },
    ];

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100">
                <h2 className="text-xl font-bold text-primary mb-1">Operational Taskpad</h2>
                <p className="text-gray-500 text-sm">
                    Unit: <span className="font-semibold text-secondary uppercase">{currentUser?.unitId || 'Unassigned'}</span>
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 text-white p-4 rounded-xl shadow-md">
                    <div className="text-xs text-slate-400 font-bold uppercase">Site Wallet</div>
                    <div className="text-2xl font-bold mt-1">IDR {walletRef.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-500">Live Balance</div>
                </div>
                <div className="bg-blue-900 text-white p-4 rounded-xl shadow-md">
                    <div className="text-xs text-blue-300 font-bold uppercase">Raw Stock</div>
                    <div className="text-2xl font-bold mt-1">{rawStock.toLocaleString()} kg</div>
                    <div className="text-[10px] text-blue-400">Ready for Production</div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {actions.map((action) => (
                    <button
                        key={action.path}
                        onClick={() => navigate(action.path)}
                        className={`flex items-center p-6 rounded-xl shadow-md active:scale-95 transition-all text-left ${action.color}`}
                    >
                        <div className="p-4 bg-white/20 rounded-full mr-6">
                            <action.icon size={32} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{action.label}</h3>
                            <p className="text-sm opacity-90">{action.desc}</p>
                        </div>
                    </button>
                ))}
            </div>

            <RecentTransactions unitId={currentUser.unitId} />
        </div>
    );
}

export default function Dashboard() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    // ROUTING LOGIC
    if (!currentUser) return <div>Loading...</div>;

    // Level 3 (HQ Admin)
    if (currentUser.role === 'admin' || currentUser.role_v2 === 'HQ_ADMIN') {
        // If they have a location context selected, show the Location View (Manager)
        if (currentUser.locationId) {
            return <LocationManagerView currentUser={currentUser} />;
        }
        return <AdminGlobalView />;
    }

    // Level 2 (Manager)
    const roleV2 = (currentUser.role_v2 || '').toUpperCase();
    if (currentUser.role === 'manager' || currentUser.role === 'location_admin' || roleV2 === 'LOC_MANAGER' || roleV2 === 'LOCATION_MANAGER') {
        return <LocationManagerView currentUser={currentUser} />;
    }

    // Level 1 (Default: Unit Op)
    return <UnitWorkerView navigate={navigate} currentUser={currentUser} />;
}
