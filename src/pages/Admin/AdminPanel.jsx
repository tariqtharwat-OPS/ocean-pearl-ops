import React, { useState, useEffect } from 'react';
import CsvImporter from './CsvImporter';
import { useAuth } from '../../contexts/AuthContext';
import { db, functions } from '../../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, doc, updateDoc, setDoc, onSnapshot, query, orderBy, limit, addDoc, serverTimestamp, writeBatch, arrayUnion } from 'firebase/firestore';
import { LOCATIONS, UNITS } from '../../lib/constants';
import { safeCompare } from '../../lib/safety';
import { useWriteGuard } from '../../lib/writeGuard';
import { Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Simple Admin Component for managing Users, Items, Partners, Locations
export default function AdminPanel() {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('users');
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const { role_v2 } = currentUser || {};
    const hasAdminAccess = role_v2 === 'HQ_ADMIN' || role_v2 === 'LOC_MANAGER' || currentUser?.role === 'admin' || currentUser?.role === 'ceo';

    if (!currentUser || !hasAdminAccess) {
        return <div className="p-4 text-red-500">Access Denied: Admin or Manager Access Required</div>;
    }

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto pb-24">
            {toast && (
                <div className={`fixed top-4 right-4 p-4 rounded shadow-lg text-white font-bold z-50 animate-bounce ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
                    {toast.msg}
                </div>
            )}

            <header className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800">Admin Panel</h1>
                <p className="text-slate-500">Manage system resources, users, and configurations.</p>
            </header>

            {/* Main Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200 mb-8 sticky top-0 bg-slate-50 z-10 pt-2">
                {[
                    { id: 'users', label: 'Users' },
                    { id: 'items', label: 'Items' },
                    { id: 'partners', label: 'Partners' },
                    { id: 'locations', label: 'Locations' },
                    { id: 'import', label: 'Data Import ⚡' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3 rounded-lg font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-white text-slate-800 shadow-md ring-2 ring-slate-800'
                            : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="animate-fade-in min-h-[500px]">
                {activeTab === 'users' && <UsersManager showToast={showToast} />}
                {activeTab === 'items' && <ItemsManager showToast={showToast} />}
                {activeTab === 'partners' && <PartnersManager showToast={showToast} />}
                {activeTab === 'locations' && <LocationsManager showToast={showToast} />}
                {activeTab === 'import' && <CsvImporter onClose={() => setActiveTab('users')} />}
            </div>
        </div>
    );
}

// Root Admin User Manager
function UsersManager({ showToast }) {
    // Phase 8: Full CRUD Implementation
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState(null); // active user for edit modal

    // Form State (Creation)
    const [newUser, setNewUser] = useState({
        email: '', password: 'Password123!', name: '', role_v2: 'UNIT_OP', locationId: '', unitId: '', phone: ''
    });
    const [creating, setCreating] = useState(false);

    // Toast State REMOVED (using prop)
    const [alerts, setAlerts] = useState([]); // Alerts from admin_notifications


    // Listener for Alerts
    useEffect(() => {
        const q = query(
            collection(db, 'admin_notifications'),
            orderBy('timestamp', 'desc'),
            limit(20) // Limit to recent 20 to prevent crash
        );
        const unsubscribe = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Filter only unread or recent HIGH severity? 
            // Let's show all for "God Mode" visibility, maybe highly visible if unread.
            setAlerts(list);
        });
        return () => unsubscribe();
    }, []);

    // 1. Realtime Listener - SHOW ALL USERS (Removed orderBy to ensure no one is hidden due to missing fields)
    useEffect(() => {
        const q = query(collection(db, 'users'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Client-side sort to be safe
            list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setUsers(list);
            setLoading(false);
        }, (err) => {
            console.error("Fetch Users Error:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            const createUserFunc = httpsCallable(functions, 'createSystemUser');
            await createUserFunc({
                email: newUser.email,
                password: newUser.password,
                displayName: newUser.name,
                role_v2: newUser.role_v2,
                locationId: newUser.locationId || '',
                unitId: newUser.unitId || ''
            });
            showToast(`User ${newUser.email} created successfully!`);
            setNewUser({ email: '', password: 'Password123!', name: '', role_v2: 'UNIT_OP', locationId: '', unitId: '', phone: '' });
        } catch (error) {
            console.error("Creation Failed", error);
            showToast(error.message, 'error');
        } finally {
            setCreating(false);
        }
    };

    const filteredUsers = users.filter(u =>
        (u.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-8">
            {/* Alerts Panel */}
            {alerts.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in shadow-sm">
                    <h3 className="text-red-800 font-bold flex items-center gap-2 mb-2">
                        <span>⚠️</span> SHARK AI INSIGHTS ({alerts.length})
                    </h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {alerts.map(alert => (
                            <div key={alert.id} className="bg-white p-2 rounded shadow-sm border-l-4 border-red-500 flex justify-between items-center text-sm">
                                <span className="font-medium text-red-900">{alert.message}</span>
                                <span className="text-xs text-gray-500">{alert.timestamp?.toDate().toLocaleTimeString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Creator Panel (1/3 width -> Centered Box) */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-fit max-w-2xl mx-auto shadow-sm w-full">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span>👑</span> Provision Worker
                </h3>
                <form onSubmit={handleCreateUser} className="space-y-4">
                    <input required type="email" placeholder="Email" className="w-full p-2 border rounded" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                    <input required type="text" placeholder="Password" className="w-full p-2 border rounded" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />

                    <div className="grid grid-cols-2 gap-2">
                        <input required placeholder="Full Name" className="w-full p-2 border rounded" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                        <input placeholder="Phone (WhatsApp)" className="w-full p-2 border rounded" value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <select className="p-2 border rounded" value={newUser.role_v2} onChange={e => setNewUser({ ...newUser, role_v2: e.target.value })}>
                            <option value="UNIT_OP">Unit Operator</option>
                            <option value="LOC_MANAGER">Location Manager</option>
                            <option value="HQ_ADMIN">HQ Admin</option>
                            <option value="INVESTOR">Investor (Read-Only)</option>
                        </select>
                        <select
                            className="p-2 border rounded"
                            value={newUser.locationId}
                            onChange={e => setNewUser({ ...newUser, locationId: e.target.value, unitId: '' })}
                            disabled={newUser.role_v2 === 'HQ_ADMIN'}
                        >
                            <option value="">Global Location</option>
                            {Object.values(LOCATIONS).map(loc => <option key={loc.id} value={loc.id}>{loc.label}</option>)}
                        </select>
                    </div>

                    {/* Unit Selector (Dynamic) */}
                    {newUser.locationId && LOCATIONS[newUser.locationId] && (
                        <div className="animate-fade-in">
                            <label className="text-xs font-bold text-gray-400 mb-1 block">Assign Unit (Optional)</label>
                            <select
                                className="w-full p-2 border rounded bg-white"
                                value={newUser.unitId || ''}
                                onChange={e => setNewUser({ ...newUser, unitId: e.target.value })}
                            >
                                <option value="">All Units / None</option>
                                {LOCATIONS[newUser.locationId].units.map(u => (
                                    <option key={u.id} value={u.id}>{u.label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button type="submit" disabled={creating} className="w-full py-2 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700 disabled:opacity-50">
                        {creating ? 'Creating...' : 'Create User'}
                    </button>
                </form>


            </div>

            {/* Rich Table Panel (Full Width) */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">Active Personnel ({users.length})</h3>
                    <input
                        placeholder="🔍 Search users..."
                        className="p-2 border rounded w-64"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {loading ? <div className="text-center p-8 animate-pulse text-ocean-dial">Fetching Personnel Data... (Live)</div> : (
                    <div className="bg-white border rounded-lg shadow-sm overflow-hidden overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-600 font-bold border-b">
                                <tr>
                                    <th className="p-3">Identity</th>
                                    <th className="p-3">Role</th>
                                    <th className="p-3">Location / Unit</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredUsers.map(u => (
                                    <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${u.role === 'admin' ? 'bg-yellow-50' : ''}`}>
                                        <td className="p-3">
                                            <div className="font-bold text-slate-800 flex items-center gap-1">
                                                {u.displayName || 'Unknown'}
                                                {u.role === 'admin' && <span title="Root Admin">👑</span>}
                                            </div>
                                            <div className="text-xs text-slate-500">{u.email}</div>
                                            {u.phone && <div className="text-[10px] text-emerald-600 font-mono flex items-center gap-1">📱 {u.phone}</div>}
                                        </td>
                                        <td className="p-3">
                                            <BadgeRole role={u.role} />
                                        </td>
                                        <td className="p-3">
                                            {u.locationId ? (
                                                <div className="flex flex-col">
                                                    <span className="bg-white text-blue-700 px-2 py-0.5 rounded text-xs border border-blue-100 font-mono shadow-sm w-fit mb-1">
                                                        {(typeof u.locationId === 'string' && LOCATIONS[u.locationId.toUpperCase()]?.label) || LOCATIONS[u.locationId]?.label || u.locationId}
                                                    </span>
                                                    {u.unitId && (
                                                        <span className="text-[10px] text-gray-500 pl-1 border-l-2 border-gray-300">
                                                            ↳ {UNITS[u.unitId] || u.unitId}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : <span className="text-gray-400 text-xs italic">Global</span>}
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${u.disabled ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                {u.disabled ? 'DISABLED' : 'ACTIVE'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <button
                                                onClick={() => setEditingUser(u)}
                                                className="p-1 px-3 bg-slate-100 text-slate-600 rounded hover:bg-ocean-dial hover:text-white transition-colors"
                                                title="Edit User"
                                            >
                                                Manage
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredUsers.length === 0 && <div className="p-8 text-center text-gray-400">No users found.</div>}
                    </div>
                )}
            </div>


            {/* Edit Modal */}
            {
                editingUser && (
                    <UserEditModal
                        user={editingUser}
                        onClose={() => setEditingUser(null)}
                        onSuccess={(msg) => { showToast(msg); setEditingUser(null); }}
                    />
                )
            }
        </div >
    );
}

// Helper Components
const BadgeRole = ({ role }) => {
    // Safety check
    const safeRole = role || 'viewer';

    const styles = {
        admin: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        location_admin: 'bg-purple-100 text-purple-800 border-purple-200',
        unit_admin: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        site_user: 'bg-blue-100 text-blue-800 border-blue-200',
        viewer: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    const labels = {
        admin: 'SYSTEM ADMIN',
        location_admin: 'LOC MANAGER',
        unit_admin: 'UNIT ADMIN',
        site_user: 'OPERATOR',
        viewer: 'VIEWER'
    };
    return (
        <span className={`px-2 py-1 rounded text-[10px] font-bold border ${styles[safeRole] || styles.viewer}`}>
            {labels[safeRole] || (typeof safeRole === 'string' ? safeRole.toUpperCase() : 'UNKNOWN')}
        </span>
    );
};

function UserEditModal({ user, onClose, onSuccess }) {
    // const { httpsCallable } = require('firebase/functions'); // Safe import -- REMOVED
    const [updating, setUpdating] = useState(false);
    const [form, setForm] = useState({
        role: user.role,
        locationId: user.locationId || '',
        unitId: user.unitId || '',
        displayName: user.displayName || '',
        phone: user.phone || ''
    });

    const handleUpdate = async () => {
        setUpdating(true);
        try {
            const manageUser = httpsCallable(functions, 'manageUser');
            await manageUser({
                targetUid: user.id,
                action: 'update_profile',
                payload: { ...form }
            });
            onSuccess(`Updated ${user.email}`);
        } catch (e) {
            alert(e.message);
            setUpdating(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!confirm(`Are you sure you want to ${user.disabled ? 'ENABLE' : 'DISABLE'} this user?`)) return;
        setUpdating(true);
        try {
            const manageUser = httpsCallable(functions, 'manageUser');
            await manageUser({
                targetUid: user.id,
                action: 'toggle_status',
                payload: { disabled: !user.disabled }
            });
            onSuccess(`User status changed.`);
        } catch (e) {
            alert(e.message);
            setUpdating(false);
        }
    };

    const [resetResult, setResetResult] = useState(null); // { tempPassword: '' }

    const handleResetPassword = async () => {
        if (!confirm(`Generate temporary password for ${user.email}?`)) return;
        setUpdating(true);
        try {
            const manageUser = httpsCallable(functions, 'manageUser');
            const res = await manageUser({
                targetUid: user.id,
                action: 'reset_password',
                payload: {}
            });
            setResetResult({ tempPassword: res.data.tempPassword });
            onSuccess("Password reset complete. Please copy the password below.");
        } catch (e) {
            alert(e.message);
        } finally {
            setUpdating(false);
        }
    };

    if (resetResult) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-fade-in text-center">
                    <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                        <span className="text-2xl">🔑</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Password Reset Successful</h3>
                    <p className="text-sm text-slate-500 mb-6">
                        Share this temporary password with <strong>{user.email}</strong>.
                    </p>

                    <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 mb-6 relative group">
                        <code className="text-xl font-mono font-bold text-slate-800 block break-all">
                            {resetResult.tempPassword}
                        </code>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(resetResult.tempPassword);
                                alert("Copied to clipboard!");
                            }}
                            className="absolute right-2 top-2 p-1 text-slate-400 hover:text-blue-600 bg-white rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copy"
                        >
                            📋
                        </button>
                    </div>

                    <button
                        onClick={() => { setResetResult(null); onClose(); }} // Close formatting
                        className="w-full btn btn-primary py-2"
                    >
                        Done
                    </button>
                </div>
            </div>
        );
    }

    const handleDeleteUser = async () => {
        if (!confirm(`⚠️ WARNING: This will PERMANENTLY DELETE ${user.email} from both Authentication and Firestore.\n\nThis action CANNOT be undone!\n\nType the user's email to confirm deletion.`)) return;

        const confirmation = prompt(`Type "${user.email}" to confirm permanent deletion:`);
        if (confirmation !== user.email) {
            alert('Email does not match. Deletion cancelled.');
            return;
        }

        setUpdating(true);
        try {
            const manageUser = httpsCallable(functions, 'manageUser');
            await manageUser({
                targetUid: user.id,
                action: 'delete_user',
                payload: {}
            });
            alert(`User ${user.email} has been permanently deleted.`);
            onSuccess('User deleted successfully.');
        } catch (e) {
            alert(`Failed to delete user: ${e.message}`);
            setUpdating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-fade-in">
                <div className="flex justify-between items-center mb-6 border-b pb-2">
                    <h3 className="text-xl font-bold text-slate-800">Edit {user.displayName}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-500">✕</button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                        <select className="w-full p-2 border rounded" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                            <option value="site_user">Site User</option>
                            <option value="unit_admin">Unit Admin</option>
                            <option value="location_admin">Location Admin</option>
                            <option value="viewer">Viewer</option>
                            <option value="admin">System Admin</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Location</label>
                        <select
                            className="w-full p-2 border rounded"
                            value={form.locationId}
                            onChange={e => setForm({ ...form, locationId: e.target.value, unitId: '' })}
                        >
                            <option value="">Global / None</option>
                            {Object.values(LOCATIONS).map(loc => <option key={loc.id} value={loc.id}>{loc.label}</option>)}
                        </select>
                    </div>

                    {form.locationId && LOCATIONS[form.locationId] && (
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Unit</label>
                            <select
                                className="w-full p-2 border rounded"
                                value={form.unitId}
                                onChange={e => setForm({ ...form, unitId: e.target.value })}
                            >
                                <option value="">Global / All Units</option>
                                {LOCATIONS[form.locationId].units.map(u => (
                                    <option key={u.id} value={u.id}>{u.label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                        <input className="w-full p-2 border rounded" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">WhatsApp Phone (For Alerts)</label>
                        <input placeholder="+62..." className="w-full p-2 border rounded font-mono text-emerald-700" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                    </div>

                    <button onClick={handleUpdate} disabled={updating} className="w-full btn btn-primary py-2 mt-4">
                        {updating ? 'Saving...' : 'Save Changes'}
                    </button>

                    <div className="border-t pt-4 mt-4 space-y-2">
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={handleResetPassword} className="py-2 text-sm text-blue-600 hover:bg-blue-50 rounded border border-blue-200">
                                🔑 Reset Password
                            </button>
                            <button onClick={handleToggleStatus} className={`py-2 text-sm rounded border ${user.disabled ? 'text-green-600 border-green-200 hover:bg-green-50' : 'text-red-600 border-red-200 hover:bg-red-50'}`}>
                                {user.disabled ? '✅ Enable User' : '⛔ Disable User'}
                            </button>
                        </div>
                        <button onClick={handleDeleteUser} className="w-full py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded border border-red-700">
                            🗑️ Delete User Permanently
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const inputClass = "w-full p-2 border rounded mb-2";


function ItemsManager({ showToast }) {
    const [subTab, setSubTab] = useState('raw'); // 'raw' or 'finished'

    return (
        <div>
            <div className="flex gap-4 border-b mb-6">
                <button
                    onClick={() => setSubTab('raw')}
                    className={`pb-2 px-4 font-bold ${subTab === 'raw' ? 'border-b-2 border-ocean-dial text-ocean-dial' : 'text-slate-400'}`}
                >
                    Raw Materials
                </button>
                <button
                    onClick={() => setSubTab('finished')}
                    className={`pb-2 px-4 font-bold ${subTab === 'finished' ? 'border-b-2 border-ocean-dial text-ocean-dial' : 'text-slate-400'}`}
                >
                    Finished Products
                </button>
            </div>

            {subTab === 'raw' ? <RawMaterialsPanel showToast={showToast} /> : <FinishedProductsPanel showToast={showToast} />}
        </div>
    );
}
const generateId = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

// Helpers from constants
import { SIZE_CONFIG } from '../../lib/constants';

function RawMaterialsPanel({ showToast }) {
    const [items, setItems] = useState([]);
    // Added 'category' to state
    const [newItem, setNewItem] = useState({ id: generateId('RM'), name: '', name_id: '', category: 'general', active: true, custom_sizes: [] });
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, 'raw_materials'));
            setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSave = async () => {
        if (!newItem.name) return;

        try {
            await setDoc(doc(db, 'raw_materials', newItem.id), {
                id: newItem.id,
                name: newItem.name,
                name_id: newItem.name_id || '',
                category: newItem.category || 'general', // Links to SIZE_CONFIG
                custom_sizes: newItem.custom_sizes || [], // Optional override
                active: newItem.active
            }, { merge: true });

            if (showToast) showToast(isEditing ? "Updated Raw Material" : "Created Raw Material");
            resetForm();
            fetchData();
        } catch (e) {
            console.error(e);
            alert("Error: " + e.message);
        }
    };

    const handleEdit = (item) => {
        // Ensure legacy items have defaults
        setNewItem({
            ...item,
            category: item.category || 'general',
            custom_sizes: item.custom_sizes || []
        });
        setIsEditing(true);
    };

    const handleToggle = async (item) => {
        await updateDoc(doc(db, 'raw_materials', item.id), { active: !item.active });
        fetchData();
    };

    const resetForm = () => {
        setIsEditing(false);
        setNewItem({ id: generateId('RM'), name: '', name_id: '', category: 'general', active: true, custom_sizes: [] });
    };

    // Helper for Custom Sizes
    const addSize = (size) => {
        if (size && !newItem.custom_sizes.includes(size)) {
            setNewItem({ ...newItem, custom_sizes: [...newItem.custom_sizes, size] });
        }
    };
    const removeSize = (size) => {
        setNewItem({ ...newItem, custom_sizes: newItem.custom_sizes.filter(s => s !== size) });
    };

    return (
        <div className="animate-fade-in">
            <div className={`mb-8 p-6 rounded-lg border shadow-sm transition-colors ${isEditing ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-slate-200'}`}>
                {/* Header */}
                <h4 className={`text-lg font-bold mb-4 flex justify-between items-center ${isEditing ? 'text-yellow-700' : 'text-slate-700'}`}>
                    <span>{isEditing ? `Edit Raw Material` : 'Add New Raw Material'}</span>
                    {isEditing && <button onClick={resetForm} className="text-sm px-3 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200">Cancel</button>}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-1 md:col-span-2 bg-slate-100 p-2 rounded flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-500">System Code (ID):</span>
                        <span className="font-mono text-lg font-bold text-blue-700 tracking-wider">{newItem.id}</span>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Material Name (English)</label>
                        <input placeholder="e.g. Yellowfin Tuna" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Material Name (Indonesian)</label>
                        <input placeholder="e.g. Tuna Sirip Kuning" value={newItem.name_id} onChange={e => setNewItem({ ...newItem, name_id: e.target.value })} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>

                    {/* CATEGORY SELECTOR (The "Missing Link") */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Biological Category (Determines Sizes)</label>
                        <select
                            className="w-full p-3 border border-slate-300 rounded-lg outline-none bg-white"
                            value={newItem.category}
                            onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                        >
                            {Object.keys(SIZE_CONFIG).map(key => (
                                <option key={key} value={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1">
                            Current Default Sizes: {SIZE_CONFIG[newItem.category]?.join(', ')}
                        </p>
                    </div>

                    {/* CUSTOM SIZES OVERRIDE */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Custom Sizes (Optional Override)</label>
                        <div className="flex gap-1 mb-2">
                            <input
                                id="custom_size_input"
                                placeholder="Add custom size..."
                                className="flex-1 p-2 border rounded text-sm"
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        addSize(e.target.value);
                                        e.target.value = '';
                                    }
                                }}
                            />
                            <button
                                onClick={() => {
                                    const el = document.getElementById('custom_size_input');
                                    addSize(el.value);
                                    el.value = '';
                                }}
                                className="bg-slate-200 px-3 rounded text-xl font-bold"
                            >
                                +
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {newItem.custom_sizes?.map(size => (
                                <span key={size} className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs border border-purple-200 flex items-center gap-1">
                                    {size}
                                    <button onClick={() => removeSize(size)} className="hover:text-red-600 font-bold">×</button>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 mt-2">
                        <button onClick={handleSave} className={`w-full py-3 rounded-lg font-bold text-white shadow-md transition-transform active:scale-[0.98] ${isEditing ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                            {isEditing ? 'Update Material' : 'Create Material'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 font-bold text-slate-600 uppercase text-xs">
                        <tr>
                            <th className="p-4">ID</th>
                            <th className="p-4">Material Name</th>
                            <th className="p-4">Category</th>
                            <th className="p-4 text-center">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-400">No raw materials found.</td></tr>}
                        {items.sort((a, b) => safeCompare(a.name, b.name)).map(i => (
                            <tr key={i.id} className={`hover:bg-slate-50 transition-colors ${!i.active ? 'opacity-50 bg-gray-50' : ''}`}>
                                <td className="p-4 font-mono text-xs font-bold text-slate-400">{i.id}</td>
                                <td className="p-4">
                                    <div className="font-bold text-slate-800">{i.name}</div>
                                    <div className="text-xs text-slate-500">{i.name_id}</div>
                                </td>
                                <td className="p-4">
                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs uppercase font-bold border border-slate-200">
                                        {i.category || 'General'}
                                    </span>
                                    {i.custom_sizes?.length > 0 && <div className="text-[10px] text-purple-600 mt-1">{i.custom_sizes.length} Custom Sizes</div>}
                                </td>
                                <td className="p-4 text-center">
                                    <button onClick={() => handleToggle(i)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors mx-auto ${i.active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        <div className={`w-3 h-3 rounded-full ${i.active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    </button>
                                </td>
                                <td className="p-4 text-right">
                                    <button onClick={() => handleEdit(i)} className="text-blue-600 font-bold hover:underline">Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Helper from constants
import { PROCESSING_CONFIG } from '../../lib/constants';

function FinishedProductsPanel({ showToast }) {
    const [items, setItems] = useState([]);
    const [rawMaterials, setRawMaterials] = useState([]);

    // Enhanced State with Processing Configs
    const [newItem, setNewItem] = useState({
        id: generateId('FP'),
        name: '',
        name_id: '',
        linked_species_ids: [],
        process_category: 'default', // Links to PROCESSING_CONFIG
        process_type: '',
        packaging_type: '',
        default_size_packing: '', // Now serves as "Weight/Count Spec"
        active: true
    });

    const [isEditing, setIsEditing] = useState(false);
    const [speciesSearch, setSpeciesSearch] = useState('');

    const fetchData = async () => {
        const [prodSnap, rawSnap] = await Promise.all([
            getDocs(collection(db, 'finished_products')),
            getDocs(collection(db, 'raw_materials'))
        ]);
        setItems(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setRawMaterials(rawSnap.docs.filter(d => d.data().active).map(d => ({ id: d.id, name: d.data().name, name_id: d.data().name_id })));
    };
    useEffect(() => { fetchData(); }, []);

    const handleSave = async () => {
        if (!newItem.name) return;

        const docId = newItem.id;

        await setDoc(doc(db, 'finished_products', docId), {
            id: docId,
            name: newItem.name,
            name_id: newItem.name_id || '',
            linked_species_ids: newItem.linked_species_ids || [],

            // New Structural Fields
            process_category: newItem.process_category || 'default',
            process_type: newItem.process_type || '',
            packaging_type: newItem.packaging_type || '',

            default_size_packing: newItem.default_size_packing || '',
            active: newItem.active
        }, { merge: true });

        if (showToast) showToast(isEditing ? "Updated Finished Product" : "Created Finished Product");

        resetForm();
        fetchData();
    };

    const handleEdit = (item) => {
        // Ensure legacy data works
        setNewItem({
            ...item,
            linked_species_ids: item.linked_species_ids || [],
            process_category: item.process_category || 'default',
            process_type: item.process_type || '',
            packaging_type: item.packaging_type || ''
        });
        setIsEditing(true);
    };

    const handleToggle = async (item) => {
        await updateDoc(doc(db, 'finished_products', item.id), { active: !item.active });
        fetchData();
    };

    const resetForm = () => {
        setIsEditing(false);
        setNewItem({
            id: generateId('FP'),
            name: '',
            name_id: '',
            linked_species_ids: [],
            process_category: 'default',
            process_type: '',
            packaging_type: '',
            default_size_packing: '',
            active: true
        });
        setSpeciesSearch('');
    };

    const toggleSpeciesLink = (rawId) => {
        const current = newItem.linked_species_ids || [];
        if (current.includes(rawId)) {
            setNewItem({ ...newItem, linked_species_ids: current.filter(id => id !== rawId) });
        } else {
            setNewItem({ ...newItem, linked_species_ids: [...current, rawId] });
        }
    };

    const filteredRawMaterials = rawMaterials.filter(rm =>
        (rm.name || '').toLowerCase().includes(speciesSearch.toLowerCase()) ||
        (rm.name_id || '').toLowerCase().includes(speciesSearch.toLowerCase())
    );

    // Get current config rules
    const currentRules = PROCESSING_CONFIG[newItem.process_category] || PROCESSING_CONFIG.default;

    return (
        <div>
            <div className={`mb-8 p-6 rounded-lg border shadow-sm transition-colors ${isEditing ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-slate-200'}`}>
                <h4 className={`text-lg font-bold mb-4 flex justify-between items-center ${isEditing ? 'text-yellow-700' : 'text-slate-700'}`}>
                    <span>{isEditing ? `Edit Finished Product` : 'Add New Finished Product'}</span>
                    {isEditing && <button onClick={resetForm} className="text-sm px-3 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200">Cancel</button>}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-1 md:col-span-2 bg-slate-100 p-2 rounded flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-500">System Code (ID):</span>
                        <span className="font-mono text-lg font-bold text-blue-700 tracking-wider">{newItem.id}</span>
                    </div>

                    {/* NAMES */}
                    <div className="col-span-1">
                        <label className="block text-xs font-bold text-gray-400 mb-1">Product Name (English)</label>
                        <input placeholder="e.g. Frozen Tuna Loin" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="col-span-1">
                        <label className="block text-xs font-bold text-gray-400 mb-1">Product Name (Indonesian)</label>
                        <input placeholder="e.g. Loin Tuna Beku" value={newItem.name_id} onChange={e => setNewItem({ ...newItem, name_id: e.target.value })} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>

                    {/* PROCESSING CATEGORY SELECTOR */}
                    <div className="col-span-1 md:col-span-2 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                        <label className="block text-xs font-bold text-blue-800 mb-2 uppercase">Core Configuration</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 mb-1">Process Family</label>
                                <select
                                    className="w-full p-2 border rounded bg-white text-sm"
                                    value={newItem.process_category}
                                    onChange={e => setNewItem({ ...newItem, process_category: e.target.value, process_type: '', packaging_type: '' })}
                                >
                                    {Object.keys(PROCESSING_CONFIG).map(k => (
                                        <option key={k} value={k}>{PROCESSING_CONFIG[k].label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 mb-1">Process Type</label>
                                <select
                                    className="w-full p-2 border rounded bg-white text-sm"
                                    value={newItem.process_type}
                                    onChange={e => setNewItem({ ...newItem, process_type: e.target.value })}
                                >
                                    <option value="">-- Start Process --</option>
                                    {currentRules.processes.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 mb-1">Packaging Type</label>
                                <select
                                    className="w-full p-2 border rounded bg-white text-sm"
                                    value={newItem.packaging_type}
                                    onChange={e => setNewItem({ ...newItem, packaging_type: e.target.value })}
                                >
                                    <option value="">-- Select Pack --</option>
                                    {currentRules.packaging.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Weight Spec */}
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-gray-400 mb-1">Weight Specification / Count (Detailed)</label>
                        <input
                            placeholder="e.g. 2-4kg, 10-20 pieces/kg"
                            value={newItem.default_size_packing || ''}
                            onChange={e => setNewItem({ ...newItem, default_size_packing: e.target.value })}
                            className="w-full p-3 border border-slate-300 rounded-lg outline-none"
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-gray-400 mb-2">Linked to Raw Materials (Source Mapping)</label>

                        {/* SEARCH FILTER */}
                        <div className="mb-2 relative">
                            <input
                                placeholder="Search species to link..."
                                value={speciesSearch}
                                onChange={e => setSpeciesSearch(e.target.value)}
                                className="w-full p-2 pl-8 border rounded text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                            />
                            <span className="absolute left-2 top-2.5 text-gray-400 text-sm">🔍</span>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 max-h-60 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-2">
                            {/* Global / Generic Option */}
                            <label className={`col-span-full flex items-center gap-2 p-2 rounded cursor-pointer border ${newItem.linked_species_ids.length === 0 ? 'bg-blue-100 border-blue-300 ring-1 ring-blue-300' : 'bg-white hover:bg-slate-100'}`}>
                                <input
                                    type="checkbox"
                                    checked={newItem.linked_species_ids.length === 0}
                                    onChange={() => setNewItem({ ...newItem, linked_species_ids: [] })} // Clear all to set Global
                                    className="hidden"
                                />
                                <span className={`text-sm font-bold ${newItem.linked_species_ids.length === 0 ? 'text-blue-700' : 'text-slate-600'}`}>Global / All Species</span>
                            </label>

                            {filteredRawMaterials.map(rm => (
                                <label key={rm.id} className={`flex items-start gap-2 p-2 rounded cursor-pointer border min-h-[50px] ${newItem.linked_species_ids.includes(rm.id) ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-white hover:bg-slate-100'}`}>
                                    <input
                                        type="checkbox"
                                        checked={newItem.linked_species_ids.includes(rm.id)}
                                        onChange={() => toggleSpeciesLink(rm.id)}
                                        className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <div className="flex flex-col overflow-hidden">
                                        <span className={`text-sm truncate w-full ${newItem.linked_species_ids.includes(rm.id) ? 'text-blue-700 font-bold' : 'text-slate-700'}`}>{rm.name}</span>
                                        <span className="text-xs text-slate-500 truncate w-full italic">{rm.name_id && `(${rm.name_id})`}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="col-span-2 mt-2">
                        <button onClick={handleSave} className={`w-full py-3 rounded-lg font-bold text-white shadow-md transition-transform active:scale-[0.98] ${isEditing ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                            {isEditing ? 'Update Finished Product' : 'Create Finished Product'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 font-bold text-slate-600 uppercase text-xs">
                        <tr>
                            <th className="p-4">ID</th>
                            <th className="p-4">Product Name</th>
                            <th className="p-4">Config</th>
                            <th className="p-4">Linked Species</th>
                            <th className="p-4 text-center">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.sort((a, b) => safeCompare(a.name, b.name)).map(i => (
                            <tr key={i.id} className={`hover:bg-slate-50 transition-colors ${!i.active ? 'opacity-50 bg-gray-50' : ''}`}>
                                <td className="p-4 font-mono text-xs font-bold text-slate-400">{i.id}</td>
                                <td className="p-4">
                                    <div className="font-bold text-slate-800">{i.name}</div>
                                    <div className="text-xs text-slate-500">{i.name_id}</div>
                                </td>
                                <td className="p-4 text-xs">
                                    <div className="font-bold text-blue-800">{i.process_type || 'Generic'}</div>
                                    <div className="text-slate-500">{i.packaging_type}</div>
                                    <div className="text-slate-400 italic text-[10px]">{i.default_size_packing}</div>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                        {(!i.linked_species_ids || i.linked_species_ids.length === 0) && (
                                            <span className="text-[10px] uppercase font-bold text-white bg-slate-400 px-2 py-1 rounded">Global</span>
                                        )}
                                        {i.linked_species_ids?.map(lid => {
                                            const rm = rawMaterials.find(r => r.id === lid);
                                            return <span key={lid} className="text-[10px] bg-sky-50 text-sky-700 border border-sky-100 px-1 rounded truncate max-w-[100px]">{rm ? rm.name : lid}</span>
                                        })}
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <button onClick={() => handleToggle(i)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${i.active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        <div className={`w-3 h-3 rounded-full ${i.active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    </button>
                                </td>
                                <td className="p-4 text-right">
                                    <button onClick={() => handleEdit(i)} className="text-blue-600 font-bold hover:underline">Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ... (I'll do `PartnersManager` first as it's a discrete block)
function PartnersManager({ showToast }) {
    const [partners, setPartners] = useState([]);
    const [locations, setLocations] = useState([]); // For unit selection
    const [loading, setLoading] = useState(true);

    // Form State
    const [newP, setNewP] = useState({
        id: `P-${Date.now().toString().slice(-6)}`,
        name: '',
        type: 'supplier',
        relatedUnits: [],
        phone: '',
        email: ''
    });
    const [isEditing, setIsEditing] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [pSnap, lSnap] = await Promise.all([
                getDocs(collection(db, 'partners')),
                getDocs(collection(db, 'locations'))
            ]);
            setPartners(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLocations(lSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error("Error fetching admin data:", error);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { fetchData(); }, []);

    const handleSave = async () => {
        if (!newP.name) return alert("Partner Name is required");

        try {
            await setDoc(doc(db, 'partners', newP.id), {
                id: newP.id,
                name: newP.name,
                type: newP.type,
                relatedUnits: newP.relatedUnits,
                phone: newP.phone || '',
                email: newP.email || '',
                active: true
            }, { merge: true });

            showToast(isEditing ? "Partner updated." : "Partner created.");

            // Reset
            setNewP({
                id: `P-${Date.now().toString().slice(-6)}`,
                name: '',
                type: 'supplier',
                relatedUnits: [],
                phone: '',
                email: ''
            });
            setIsEditing(false);
            fetchData();
        } catch (e) {
            alert(e.message);
        }
    };

    const handleEdit = (p) => {
        setNewP({ ...p, relatedUnits: p.relatedUnits || [] });
        setIsEditing(true);
    };

    const handleCancelXY = () => {
        setNewP({
            id: `P-${Date.now().toString().slice(-6)}`,
            name: '',
            type: 'supplier',
            relatedUnits: [],
            phone: '',
            email: ''
        });
        setIsEditing(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure?")) return;
        await updateDoc(doc(db, 'partners', id), { active: false });
        fetchData();
    };

    const toggleUnit = (locId, unitId) => {
        const exists = newP.relatedUnits.find(u => u.locationId === locId && u.unitId === unitId);
        if (exists) {
            setNewP(prev => ({
                ...prev,
                relatedUnits: prev.relatedUnits.filter(u => !(u.locationId === locId && u.unitId === unitId))
            }));
        } else {
            setNewP(prev => ({
                ...prev,
                relatedUnits: [...prev.relatedUnits, { locationId: locId, unitId }]
            }));
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Create Form */}
            <div className="md:col-span-1">
                <div className={`p-6 rounded-xl shadow-sm border sticky top-24 transition-colors ${isEditing ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-slate-200'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className={`text-lg font-bold ${isEditing ? 'text-yellow-800' : 'text-slate-800'}`}>
                            {isEditing ? 'Edit Partner' : 'Add New Partner'}
                        </h3>
                        {isEditing && <button onClick={handleCancelXY} className="text-xs font-bold text-red-500 hover:text-red-700">CANCEL</button>}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">System Generated ID</label>
                            <div className="p-3 bg-slate-100/50 rounded text-slate-500 font-mono font-bold text-sm">{newP.id}</div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">Partner Name</label>
                            <input
                                placeholder="e.g. PT. Ocean Fresh"
                                value={newP.name}
                                onChange={e => setNewP({ ...newP, name: e.target.value })}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">Type</label>
                            <select
                                value={newP.type}
                                onChange={e => setNewP({ ...newP, type: e.target.value })}
                                className="w-full p-3 border border-slate-300 rounded-lg bg-white outline-none"
                            >
                                <option value="supplier">Supplier (Vendor)</option>
                                <option value="buyer">Buyer (Customer)</option>
                                <option value="buy_agent">Buying Agent</option>
                                <option value="sell_agent">Selling Agent</option>
                                <option value="logistics">Logistics Provider</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Phone</label>
                                <input value={newP.phone || ''} onChange={e => setNewP({ ...newP, phone: e.target.value })} className="w-full p-2 border rounded text-sm" placeholder="+62..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Email</label>
                                <input value={newP.email || ''} onChange={e => setNewP({ ...newP, email: e.target.value })} className="w-full p-2 border rounded text-sm" placeholder="@..." />
                            </div>
                        </div>

                        {/* Unit Checklist */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2">Related Units (Check all that apply)</label>
                            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-2 bg-slate-50">
                                {locations.map(loc => (
                                    <div key={loc.id}>
                                        <div className="text-xs font-bold text-slate-500 uppercase mb-1">{loc.label}</div>
                                        {loc.units && loc.units.map(u => (
                                            <label key={`${loc.id}-${u.id}`} className="flex items-center gap-2 text-sm p-1 hover:bg-white rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={!!newP.relatedUnits.find(item => item.locationId === loc.id && item.unitId === u.id)}
                                                    onChange={() => toggleUnit(loc.id, u.id)}
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-0"
                                                />
                                                <span className="text-slate-700">{u.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                ))}
                                {locations.length === 0 && <div className="text-xs text-gray-400 italic">No locations found.</div>}
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            className={`w-full py-3 text-white font-bold rounded-lg shadow-md transition-all active:scale-[0.98] ${isEditing ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {isEditing ? 'Update Partner' : 'Create Partner'}
                        </button>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="md:col-span-2">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b bg-slate-50 font-bold text-slate-700 flex justify-between items-center">
                        <span>Partner Directory</span>
                        <span className="text-xs font-normal text-slate-500">{partners.length} Records</span>
                    </div>
                    {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : (
                        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                            {partners.length === 0 && <div className="p-8 text-center text-gray-400">No partners found.</div>}
                            {partners.sort((a, b) => safeCompare(b.id, a.id)).map(p => (
                                <div key={p.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                                    <div>
                                        <div className="font-bold text-slate-800">{p.name}</div>
                                        <div className="text-xs text-slate-400 font-mono mb-1 flex items-center gap-2">
                                            {p.id} •
                                            <span className={`uppercase font-bold text-[10px] px-1.5 py-0.5 rounded ${p.type === 'supplier' ? 'bg-amber-100 text-amber-700' :
                                                p.type === 'buyer' ? 'bg-emerald-100 text-emerald-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}>{p.type.replace('_', ' ')}</span>
                                        </div>
                                        <div className="flex gap-1 flex-wrap">
                                            {p.relatedUnits && p.relatedUnits.map((u, idx) => (
                                                <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-500">
                                                    {u.locationId.toUpperCase()}/{u.unitId}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className="text-xs text-blue-600 hover:text-blue-800 font-bold px-2 py-1 bg-blue-50 rounded" onClick={() => handleEdit(p)}>Edit</button>
                                        <button className="text-xs text-red-400 hover:text-red-600 font-bold px-2 py-1 bg-red-50 rounded" onClick={() => handleDelete(p.id)}>Archive</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// -- LOCATIONS MANAGER (DYNAMIC) --
function LocationsManager() {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);

    // Forms
    const [newLoc, setNewLoc] = useState({ id: '', label: '' });
    const [newUnit, setNewUnit] = useState({ locId: '', id: '', label: '', type: 'processing' });

    const fetchLocations = async () => {
        try {
            const snap = await getDocs(collection(db, 'locations'));
            setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error("Fetch Loc Error", e);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { fetchLocations(); }, []);

    const handleCreateLocation = async () => {
        if (!newLoc.id || !newLoc.label) return alert("ID and Label required");
        // Check ID collision probably good idea but setDoc will overwrite if not careful.
        // Assuming user knows what they are doing for Admin.
        await setDoc(doc(db, 'locations', newLoc.id), {
            id: newLoc.id,
            label: newLoc.label,
            units: []
        });
        setNewLoc({ id: '', label: '' });
        fetchLocations();
    };

    const handleCreateUnit = async (locId) => {
        if (!newUnit.id || !newUnit.label) return alert("Unit ID and Label required");

        const locRef = doc(db, 'locations', locId);
        // We use array limit, assuming checking existing IDs is done via UI visual check or basic validation
        // Using arrayUnion
        const unitObj = {
            id: newUnit.id,
            label: newUnit.label,
            type: newUnit.type || 'processing',
            active: true
        };

        await updateDoc(locRef, {
            units: arrayUnion(unitObj)
        });

        setNewUnit({ locId: '', id: '', label: '' }); // Reset
        fetchLocations();
    };

    // Toggle active state is tricky with array. 
    // Easier to just replace the whole array.
    const toggleUnitActive = async (loc, unitId) => {
        const updatedUnits = loc.units.map(u =>
            u.id === unitId ? { ...u, active: !u.active } : u
        );
        await updateDoc(doc(db, 'locations', loc.id), { units: updatedUnits });
        fetchLocations();
    };

    const initializeDefaults = async () => {
        if (!confirm("This will synchronize the database with the Standard Locations defined in constants.js. Missing units will be added. Continue?")) return;
        setLoading(true);
        try {
            const batch = writeBatch(db);
            Object.values(LOCATIONS).forEach(locData => {
                const ref = doc(db, 'locations', locData.id);
                // Ensure units have active: true
                const dbUnits = locData.units.map(u => ({ ...u, active: true }));
                batch.set(ref, { id: locData.id, label: locData.label, units: dbUnits }, { merge: true });
            });
            await batch.commit();
            showToast("Locations synchronized with Standard Architecture.");
            fetchLocations();
        } catch (e) {
            console.error(e);
            alert("Sync Failed: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* 1. Add Location Form */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Create New Site / Location</h3>
                    <button
                        onClick={initializeDefaults}
                        className="text-xs text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded border border-blue-200 font-bold transition-colors"
                    >
                        ⚡ Sync Standard Units
                    </button>
                </div>
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-400 mb-1">Location ID (Slug)</label>
                        <input
                            placeholder="e.g. kaimana_2"
                            value={newLoc.id}
                            onChange={e => setNewLoc({ ...newLoc, id: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                            className="w-full input-field font-mono"
                        />
                    </div>
                    <div className="flex-[2]">
                        <label className="block text-xs font-bold text-gray-400 mb-1">Display Name</label>
                        <input
                            placeholder="e.g. Kaimana Site 2"
                            value={newLoc.label}
                            onChange={e => setNewLoc({ ...newLoc, label: e.target.value })}
                            className="w-full input-field"
                        />
                    </div>
                    <button onClick={handleCreateLocation} className="btn btn-primary py-3">Add Location</button>
                </div>
            </div>

            {/* 2. Locations List & Unit Management */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {locations.map(loc => (
                    <div key={loc.id} className="border border-slate-200 p-5 rounded-xl bg-slate-50 hover:bg-white hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4 border-b pb-2">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">{loc.label}</h3>
                                <div className="text-xs text-ocean-dial font-mono">{loc.id}</div>
                            </div>
                            <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-bold">
                                {loc.units?.length || 0} Units
                            </div>
                        </div>

                        {/* Unit List */}
                        <ul className="space-y-2 mb-4">
                            {loc.units && loc.units.map((u, idx) => {
                                // Normalize: DB might have strings (old) or objects (new)
                                const isObj = typeof u === 'object' && u !== null;
                                const unitId = isObj ? u.id : u;
                                const unitLabel = isObj ? u.label : (UNITS[unitId] || unitId); // UNITS from constants
                                const unitType = isObj ? (u.type || 'processing') : 'processing';
                                const active = isObj ? u.active : true;
                                const key = unitId || idx;

                                return (
                                    <li key={key} className={`flex justify-between items-center p-2 rounded border ${active ? 'bg-white border-slate-200' : 'bg-slate-100 border-transparent opacity-60'}`}>
                                        <div>
                                            <div className="font-bold text-sm text-slate-700 flex items-center gap-2">
                                                {unitLabel}
                                                <span className="text-[9px] uppercase px-1 py-0.5 bg-gray-100 border rounded text-gray-500">{unitType}</span>
                                            </div>
                                            <div className="text-[10px] text-gray-400 font-mono">ID: {unitId}</div>
                                        </div>
                                        <button
                                            onClick={() => toggleUnitActive(loc, unitId)}
                                            className={`text-[10px] px-2 py-1 rounded font-bold ${active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                        >
                                            {active ? 'ACTIVE' : 'INACTIVE'}
                                        </button>
                                    </li>
                                );
                            })}
                            {(!loc.units || loc.units.length === 0) && <li className="text-xs text-gray-400 italic">No units configured.</li>}
                        </ul>

                        {/* Add Unit Small Form */}
                        <div className="bg-slate-200/50 p-3 rounded-lg">
                            <div className="text-xs font-bold text-slate-500 mb-2 uppercase">Add Unit to {loc.label}</div>
                            <div className="grid grid-cols-6 gap-2">
                                <input
                                    placeholder="ID"
                                    className="col-span-2 text-xs p-2 rounded border-none font-mono"
                                    value={newUnit.locId === loc.id ? newUnit.id : ''}
                                    onChange={e => setNewUnit({ ...newUnit, locId: loc.id, id: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                                />
                                <input
                                    placeholder="Name"
                                    className="col-span-2 text-xs p-2 rounded border-none"
                                    value={newUnit.locId === loc.id ? newUnit.label : ''}
                                    onChange={e => setNewUnit({ ...newUnit, locId: loc.id, label: e.target.value })}
                                />
                                <select
                                    className="col-span-2 text-xs p-1 rounded border-none bg-white"
                                    value={newUnit.locId === loc.id ? newUnit.type : 'processing'}
                                    onChange={e => setNewUnit({ ...newUnit, locId: loc.id, type: e.target.value })}
                                >
                                    <option value="processing">Processing</option>
                                    <option value="cold_storage">Cold Storage</option>
                                    <option value="warehouse">Warehouse</option>
                                    <option value="office">Office</option>
                                </select>
                                <button
                                    onClick={() => handleCreateUnit(loc.id)}
                                    className="col-span-6 bg-slate-800 text-white text-xs rounded font-bold hover:bg-black py-2 mt-1"
                                >
                                    ADD UNIT
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MasterDataManager() {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedConfig, setSelectedConfig] = useState(null); // For editing
    const [newCat, setNewCat] = useState('');

    // Fetch master config
    useEffect(() => {
        const q = query(collection(db, 'processing_rules'));
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setConfigs(list);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleAddCategory = async () => {
        if (!newCat) return;
        const id = newCat.toLowerCase().replace(/\s+/g, '_');
        await setDoc(doc(db, 'processing_rules', id), {
            id,
            label: newCat,
            processes: ['Whole'],
            grades: ['A', 'B'],
            packaging: ['Bulk']
        });
        setNewCat('');
    };

    const handleUpdateArray = async (docId, field, arrayValue) => {
        await updateDoc(doc(db, 'processing_rules', docId), {
            [field]: arrayValue
        });
    };

    return (
        <div>
            <h2 className="text-xl font-bold mb-4">Master Data Configuration (Phase 10)</h2>
            <div className="flex gap-4 mb-6">
                <input
                    placeholder="New Species Category (e.g. Lobster)"
                    className="p-2 border rounded"
                    value={newCat}
                    onChange={e => setNewCat(e.target.value)}
                />
                <button onClick={handleAddCategory} className="bg-ocean-dial text-white px-4 py-2 rounded">Create Category</button>
            </div>

            {loading ? <div>Loading Config...</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {configs.map(conf => (
                        <div key={conf.id} className="border p-4 rounded-lg bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800 uppercase mb-4 border-b pb-2">{conf.label || conf.id}</h3>

                            {/* Processes */}
                            <ArrayEditor
                                label="Allowed Processes"
                                items={conf.processes || []}
                                onSave={(newItems) => handleUpdateArray(conf.id, 'processes', newItems)}
                            />

                            {/* Grades */}
                            <ArrayEditor
                                label="Allowed Grades"
                                items={conf.grades || []}
                                onSave={(newItems) => handleUpdateArray(conf.id, 'grades', newItems)}
                            />

                            {/* Packaging */}
                            <ArrayEditor
                                label="Allowed Packaging"
                                items={conf.packaging || []}
                                onSave={(newItems) => handleUpdateArray(conf.id, 'packaging', newItems)}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ArrayEditor({ label, items, onSave }) {
    const [vals, setVals] = useState(items || []);
    const [newItem, setNewItem] = useState('');

    // Sync props
    useEffect(() => { setVals(items || []); }, [items]);

    const add = () => {
        if (!newItem) return;
        const next = [...vals, newItem];
        setVals(next);
        onSave(next);
        setNewItem('');
    };

    const remove = (idx) => {
        const next = vals.filter((_, i) => i !== idx);
        setVals(next);
        onSave(next);
    };

    return (
        <div className="mb-4">
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">{label}</label>
            <div className="flex flex-wrap gap-2 mb-2">
                {vals.map((v, i) => (
                    <span key={i} className="bg-white px-2 py-1 rounded border text-xs flex items-center gap-1">
                        {v}
                        <button onClick={() => remove(i)} className="text-red-500 font-bold hover:bg-red-50 rounded-full w-4 h-4 flex items-center justify-center">×</button>
                    </span>
                ))}
            </div>
            <div className="flex gap-1">
                <input
                    className="p-1 border rounded text-sm flex-1"
                    placeholder="Add..."
                    value={newItem}
                    onChange={e => setNewItem(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && add()}
                />
                <button onClick={add} className="bg-slate-200 px-3 rounded text-sm font-bold">+</button>
            </div>
        </div>
    );
}
