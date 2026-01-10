import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, LogOut, Truck, DollarSign, Snowflake, FileText, Settings, BarChart3, Globe, Shield } from 'lucide-react';
import { LOCATIONS } from '../lib/constants';
import { useTransactionQueue } from '../contexts/TransactionQueueContext';
import { useTranslation } from 'react-i18next';

// Lazy load SharkChat
const SharkChat = React.lazy(() => import('./SharkChat'));

export default function Layout() {
    const { currentUser, logout, updateViewContext } = useAuth();
    const location = useLocation();
    const { queue, isOnline } = useTransactionQueue();
    const { t, i18n } = useTranslation();

    const changeLanguage = () => {
        const nextLang = i18n.language === 'en' ? 'id' : 'en';
        i18n.changeLanguage(nextLang);
    };

    // --- ROLE & NAVIGATION LOGIC (V2) ---
    const role = currentUser?.role_v2 || 'READ_ONLY'; // Default fallback
    const isHQ = role === 'HQ_ADMIN';
    const isManager = role === 'LOC_MANAGER';
    const isUnit = role === 'UNIT_OP';
    const isLegacyAdmin = currentUser?.role === 'admin'; // Fallback for root bootstrap

    const navItems = [];

    // Context Labels
    const locKey = currentUser?.locationId?.toLowerCase();
    const locationData = LOCATIONS[locKey];
    const locationLabel = locationData?.label || currentUser?.locationId || 'GLOBAL';
    const unitObj = locationData?.units?.find(u => u.id === currentUser?.unitId);
    const unitLabel = unitObj?.label || currentUser?.unitId || '-';

    // Capabilities (Fallbacks for safety, but DB is migrated)
    // If unitObj not found (e.g. HQ Global), default to empty for Unit Ops, or all for Manager?
    // Actually Manager View is separate.
    const capabilities = unitObj?.capabilities || [];

    // 1. UNIT OP SUITE
    if (isUnit) {
        if (capabilities.includes('receiving')) {
            navItems.push({ to: '/receiving', icon: Truck, label: t('receiving') });
        }
        if (capabilities.includes('storage')) {
            navItems.push({ to: '/cold-storage', icon: Snowflake, label: t('storage') });
        }
        // Base Feature: Requests/Wallet
        navItems.push({ to: '/wallet', icon: FileText, label: t('requests') || 'Requests' });
    }

    // 2. LOCATION MANAGER SUITE
    else if (isManager) {
        // Manager usually oversees ALL operations in their location.
        // We generally show Everything. Or do we limit manager if their location causes it?
        // User said: "HQ (Office) does NOT see Receiving".
        // A Manager is assigned to a Location, not a Unit usually (target_id = locationId).
        // But if the Location itself has no Receiving units, maybe hide?
        // For now, let's keep Manager seeing all OPS, as they manage the site.
        navItems.push({ to: '/receiving', icon: Truck, label: t('receiving') });
        navItems.push({ to: '/cold-storage', icon: Snowflake, label: t('storage') });
        navItems.push({ to: '/wallet', icon: DollarSign, label: t('wallet') });
        navItems.push({ to: '/reports', icon: BarChart3, label: 'Reports' });
    }

    // 3. HQ ADMIN SUITE (and Legacy Root)
    else if (isHQ || isLegacyAdmin) {
        navItems.push({ to: '/dashboard-v1', icon: Globe, label: 'Command' });
        navItems.push({ to: '/wallet', icon: DollarSign, label: 'Treasury' });
        navItems.push({ to: '/reports', icon: BarChart3, label: 'Reports' });
        navItems.push({ to: '/admin', icon: Settings, label: 'Admin' });
    }

    return (
        <div className="min-h-screen bg-neutral-50 flex flex-col">
            {/* Top Header */}
            <header className="bg-primary text-white p-3 shadow-md sticky top-0 z-50 border-b-4 border-secondary">
                <div className="flex items-center justify-between max-w-5xl mx-auto w-full">

                    {/* LEFT: Context Identity */}
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-lg">
                            <span className="text-xl">
                                {isHQ ? '👑' : isManager ? '👔' : '👷'}
                            </span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm leading-tight">{currentUser?.displayName || currentUser?.email?.split('@')[0]}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${isHQ || isLegacyAdmin ? 'bg-yellow-500 text-black' : 'bg-white/20 text-white'}`}>
                                    {role.replace('_', ' ')}
                                </span>
                            </div>

                            {/* Context Switcher - Only for HQ/Admins to peek at other locations */}
                            {isHQ || isLegacyAdmin ? (
                                <div className="flex flex-col gap-1 mt-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-white/60 w-10">LOC:</span>
                                        <select
                                            className="bg-black/20 text-xs border border-white/10 rounded px-1 py-0.5 focus:outline-none focus:border-secondary w-32"
                                            value={currentUser?.locationId || ''}
                                            onChange={(e) => {
                                                const newLocId = e.target.value;
                                                const newLoc = LOCATIONS[newLocId?.toLowerCase()];
                                                const defaultUnit = newLoc && newLoc.units.length > 0 ? newLoc.units[0].id : '';
                                                updateViewContext(newLocId, defaultUnit);
                                            }}
                                        >
                                            <option value="">🌍 Global</option>
                                            {Object.values(LOCATIONS).map(loc => (
                                                <option key={loc.id} value={loc.id}>{loc.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {/* Optional Unit Switcher for Admin */}
                                    {currentUser?.locationId && LOCATIONS[currentUser.locationId] && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-white/60 w-10">UNIT:</span>
                                            <select
                                                className="bg-black/20 text-xs border border-white/10 rounded px-1 py-0.5 focus:outline-none focus:border-secondary w-32"
                                                value={currentUser?.unitId || ''}
                                                onChange={(e) => updateViewContext(currentUser.locationId, e.target.value)}
                                            >
                                                {LOCATIONS[currentUser.locationId].units.map(u => (
                                                    <option key={u.id} value={u.id}>{u.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col mt-1">
                                    <div className="flex items-center gap-1 text-xs text-secondary-200">
                                        <span className="text-white/40 text-[10px]">LOC:</span>
                                        <span className="font-bold">{locationLabel}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-white">
                                        <span className="text-white/40 text-[10px]">UNIT:</span>
                                        <span className="font-mono">{unitLabel}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: System Status & Tools */}
                    <div className="flex items-center gap-3">
                        <button onClick={changeLanguage} className="p-2 hover:bg-white/10 rounded-full text-xs font-mono uppercase text-white/70">
                            {i18n.language}
                        </button>

                        {!isOnline && (
                            <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg animate-pulse">
                                OFFLINE
                            </div>
                        )}
                        {queue.length > 0 && (
                            <div className="bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg flex items-center gap-1">
                                <span>⚡</span> {queue.length} PENDING
                            </div>
                        )}
                        <button onClick={logout} className="p-2 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors" title="Logout">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 pb-24 max-w-5xl mx-auto w-full">
                <Outlet />
            </main>

            {/* Bottom Navigation (Mobile First) */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-40">
                <div className="flex justify-around items-center h-16 max-w-5xl mx-auto">
                    {/* Always Home */}
                    <NavLink
                        to="/"
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-secondary' : 'text-gray-500'}`
                        }
                    >
                        <Menu size={20} />
                        <span className="text-[10px] font-medium">Home</span>
                    </NavLink>

                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-secondary' : 'text-gray-500'}`
                            }
                        >
                            <item.icon size={20} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>
            {/* Shark AI Assistant */}
            <React.Suspense fallback={null}>
                <SharkChat />
            </React.Suspense>
        </div>
    );
}
