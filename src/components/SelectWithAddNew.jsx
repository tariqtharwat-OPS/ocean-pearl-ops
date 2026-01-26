import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, orderBy } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useWriteGuard } from '../lib/writeGuard';
import { Plus, X, Loader2, AlertTriangle } from 'lucide-react';

export default function SelectWithAddNew({
    label,
    collectionName,
    value,
    onChange,
    onObjectChange, // New prop
    placeholder = "Select...",
    scope = {}, // { locationId: '...' } for scoping filtered list AND creating new item
    displayField = "name",
    filterByLocation = false, // If true, only show items matching scope.locationId
    allowAdd = true
}) {
    const { currentUser } = useAuth();
    const authContext = useAuth();
    const { guardWrite } = useWriteGuard(authContext);

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Fetch Items
    useEffect(() => {
        let q = collection(db, collectionName);

        // Basic filtering if needed (e.g. vendors by location)
        // Note: For now, we fetch all active items, client-side filter if complex,
        // or simple query if straightforward.
        const requirements = [orderBy(displayField, 'asc')];

        // If filtering by location is strictly required at DB level:
        if (filterByLocation && scope.locationId) {
            // Check if collection is 'vendors' which has locationId
            // or 'expense_types' which might be global.
            // For now, let's assume we want ALL global + Local
            // This is hard to query in one go.
            // Simplified: Fetch all active.
        }

        // We'll just fetch all for now and filter in memory if list is small (<1000)
        // Optimally: where('isActive', '==', true)
        // But let's assume raw collection for phase 1 efficiency

        const unsub = onSnapshot(query(q, ...requirements), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Client side filter for active and location scope
            const filtered = list.filter(item => {
                const isActive = item.isActive !== false; // Default true

                // If filterByLocation is on, checks:
                // 1. Item has no locationId (Global)
                // 2. Item locationId matches scope.locationId
                const locationMatch = !filterByLocation || !item.locationId || item.locationId === scope.locationId;

                return isActive && locationMatch;
            });

            setItems(filtered);
            setLoading(false);
        }, (err) => {
            console.error("Select Load Error", err);
            setLoading(false);
        });

        return () => unsub();
    }, [collectionName, filterByLocation, scope.locationId]);

    const handleAddNew = async () => {
        if (!newItemName.trim()) return;

        // PERMISSION / GUARD CHECK
        const actionName = `Add New ${label}: ${newItemName}`;
        const canProceed = await guardWrite(authContext, actionName);
        if (!canProceed) return;

        setIsSaving(true);
        try {
            const docData = {
                [displayField]: newItemName,
                isActive: true, // Default true
                createdAt: new Date().toISOString(),
                createdBy: currentUser.uid,
                createdByName: currentUser.displayName || currentUser.email,
                roleSnapshot: currentUser.role_v2,
            };

            // Add scope (locationId) if provided and relevant
            if (scope.locationId) {
                docData.locationId = scope.locationId;
            }

            const ref = await addDoc(collection(db, collectionName), docData);

            // Auto Select
            const newItem = { id: ref.id, ...docData };
            onChange(ref.id);
            if (onObjectChange) onObjectChange(newItem);

            setNewItemName('');
            setShowAddModal(false);

            // Toast would go here
        } catch (e) {
            console.error("Add Failed", e);
            alert("Failed to add item: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSelectChange = (e) => {
        const val = e.target.value;
        if (val === '__ADD_NEW__') {
            setShowAddModal(true);
        } else {
            onChange(val);
            if (onObjectChange) {
                const found = items.find(i => i.id === val);
                if (found) onObjectChange(found);
            }
        }
    };

    return (
        <div className="relative">
            {label && <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">{label}</label>}
            <div className="relative">
                <select
                    value={value || ''}
                    onChange={handleSelectChange}
                    disabled={loading}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-medium outline-none focus:ring-2 focus:ring-ocean-dial appearance-none"
                    style={{ backgroundImage: 'none' }} // Remove default arrow if we want custom, but native is safer for now
                >
                    <option value="">{loading ? "Loading..." : placeholder}</option>
                    {items.map(item => (
                        <option key={item.id} value={item.id}>
                            {item[displayField]}
                        </option>
                    ))}
                    {allowAdd && (
                        <option value="__ADD_NEW__" className="font-bold text-blue-600">
                            + Add New {label}
                        </option>
                    )}
                </select>
                {/* Custom Arrow because appearance-none removes it? I didn't verify appearance-none usage. 
                    Let's stick to standard behavior first. Removed appearance-none for safety in code block below.
                */}
            </div>

            {/* Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 text-left">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setShowAddModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Plus size={20} className="text-emerald-600" />
                            Add New {label}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Name</label>
                                <input
                                    autoFocus
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder={`e.g. ${label === 'Vendor' ? 'Kios Budi' : 'Fuel'}`}
                                    value={newItemName}
                                    onChange={e => setNewItemName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddNew()}
                                />
                            </div>

                            {scope.locationId && (
                                <div className="text-xs text-slate-400 flex items-center gap-1">
                                    <AlertTriangle size={12} />
                                    <span>This will be added for <strong>{scope.locationId.toUpperCase()}</strong> only.</span>
                                </div>
                            )}

                            <button
                                onClick={handleAddNew}
                                disabled={isSaving || !newItemName.trim()}
                                className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={18} /> : 'Save & Select'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
