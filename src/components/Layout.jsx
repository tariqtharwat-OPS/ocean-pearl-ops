import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, LogOut, Truck, DollarSign, Snowflake, FileText, Settings, BarChart3, Globe, Shield } from 'lucide-react';
import { LOCATIONS } from '../lib/constants';
import { useTransactionQueue } from '../contexts/TransactionQueueContext';
import { useTranslation } from 'react-i18next';
import CEOControlPanel from './CEOControlPanel';
import { useDirtyForm } from '../contexts/DirtyFormContext';

// Lazy load SharkChat
const SharkChat = React.lazy(() => import('./SharkChat'));

export default function Layout() {
    const { currentUser, logout, updateViewContext, ceoMode } = useAuth();
    const location = useLocation();
    const { queue, isOnline } = useTransactionQueue();
    const { t, i18n } = useTranslation();
    const [activeRoute, setActiveRoute] = React.useState(location.pathname);

    // Track location changes and update active route
    React.useEffect(() => {
        setActiveRoute(location.pathname);
        console.log('📍 Navigation updated to:', location.pathname);
    }, [location.pathname]);

    const changeLanguage = () => {
        const nextLang = i18n.language === 'en' ? 'id' : 'en';
        i18n.changeLanguage(nextLang);
    };

    // --- ROLE & NAVIGATION LOGIC (V2) ---
    const role = (currentUser?.role_v2 || 'READ_ONLY').toUpperCase();
    const isHQ = role === 'HQ_ADMIN';
    const isManager = role === 'LOC_MANAGER' || role === 'LOCATION_MANAGER';
    const isUnit = role === 'UNIT_OP' || role === 'UNIT_OPERATOR';
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
        if (capabilities.includes('storage') || capabilities.includes('processing')) {
            navItems.push({ to: '/production', icon: Snowflake, label: t('storage') });
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
        navItems.push({ to: '/production', icon: Snowflake, label: t('storage') });
        navItems.push({ to: '/wallet', icon: DollarSign, label: t('wallet') });
        navItems.push({ to: '/reports', icon: BarChart3, label: t('reports') });
    }

    // 3. HQ ADMIN SUITE (and Legacy Root)
    else if (isHQ || isLegacyAdmin) {
        navItems.push({ to: '/wallet', icon: DollarSign, label: t('treasury') });
        navItems.push({ to: '/reports', icon: BarChart3, label: t('reports') });
        navItems.push({ to: '/admin', icon: Settings, label: t('admin') });
    }

    // Calculate top padding for main content (adjust for CEO banner)
    const mainTopClass = ceoMode ? 'pt-12' : '';

    // -- DIRTY GUARD --
    const { isDirty } = useDirtyForm();

    // -- CONTEXT SWITCHING LOGIC (C4) --
    const [switching, setSwitching] = React.useState(false);
    const [pendingContext, setPendingContext] = React.useState(null); // { locId, unitId }

    const handleContextChange = (locId, unitId) => {
        // M3: Check Unsaved
        if (isDirty) {
            if (!window.confirm("You have unsaved changes. Switching context will discard them. Continue?")) {
                return;
            }
        }

        // C4: Confirmation Curtain
        // If changing Loop to Kaimana, risk is high.
        // We pause and ask.
        if (locId === currentUser.locationId && unitId === currentUser.unitId) return;

        const locLabel = LOCATIONS[locId?.toLowerCase()]?.label || locId;
        // const confirmMsg = `Switching context to\n\n${locLabel?.toUpperCase()}\n${unitId?.toUpperCase() || ''}\n\nAre you sure?`;

        // Use native check for speed, or custom modal?
        // User requested "Context Safety". A distinct confirmation is key.
        // Let's use window.confirm for now to be strictly blocking, 
        // OR better: use the "Pending" state to render a custom modal below.
        setPendingContext({ locId, unitId, label: locLabel });
    };

    const confirmSwitch = () => {
        if (!pendingContext) return;
        setSwitching(true);
        // Artificial delay for visual cues (C4 'Switching...' state)
        setTimeout(() => {
            updateViewContext(pendingContext.locId, pendingContext.unitId);
            setSwitching(false);
            setPendingContext(null);
            // Optional: visual flash or toast here
        }, 800);
    };

    const handleNavClick = (e, to) => {
        if (isDirty && activeRoute !== to) {
            if (!window.confirm("You have unsaved changes. Leaving this page will discard them. Continue?")) {
                e.preventDefault();
                return;
            }
        }
        setActiveRoute(to);
    };

    return (
        <div className="min-h-screen bg-neutral-50 flex flex-col">
            {/* CEO Control Panel & Banner */}
            <CEOControlPanel />

            {/* C4: SWITCHING CURTAIN */}
            {(switching || pendingContext) && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/90 flex flex-col items-center justify-center text-white animate-in fade-in duration-200">
                    {switching ? (
                        <>
                            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-ocean-dial mb-6"></div>
                            <h2 className="text-2xl font-bold tracking-widest uppercase">Switching Context...</h2>
                        </>
                    ) : (
                        <div className="bg-white text-slate-900 p-8 rounded-2xl max-w-sm w-full shadow-2xl text-center transform scale-100 transition-all">
                            <h3 className="text-xl font-bold mb-2">Switch Logic</h3>
                            <p className="text-slate-500 mb-6">You are entering the operational context for:</p>

                            <div className="bg-slate-100 p-4 rounded-xl mb-8 border border-slate-200">
                                <div className="text-2xl font-black text-ocean-dial uppercase tracking-wide">
                                    {pendingContext.label}
                                </div>
                                <div className="text-sm font-mono text-slate-500 mt-1 uppercase">
                                    {pendingContext.unitId || 'All Units'}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setPendingContext(null)}
                                    className="px-4 py-3 bg-slate-200 hover:bg-slate-300 rounded-lg font-bold text-slate-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmSwitch}
                                    className="px-4 py-3 bg-ocean-dial hover:bg-cyan-700 text-white rounded-lg font-bold transition-colors shadow-lg"
                                >
                                    Confirm Switch
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Top Header */}
            <header className={`bg-primary text-white p-3 shadow-md sticky z-50 border-b-4 border-secondary ${ceoMode ? 'top-12' : 'top-0'}`}>
                <div className="flex items-center justify-between max-w-5xl mx-auto w-full">

                    {/* LEFT: Context Identity */}
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-lg hidden sm:block">
                            <span className="text-xl">
                                {isHQ ? '👑' : isManager ? '👔' : '👷'}
                            </span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-sm leading-tight">{currentUser?.displayName || currentUser?.email?.split('@')[0]}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${isHQ || isLegacyAdmin ? 'bg-yellow-500 text-black' : 'bg-white/20 text-white'}`}>
                                    {role.replace('_', ' ')}
                                </span>
                            </div>

                            {/* Context Switcher - M7: Enhanced Visibility */}
                            {!ceoMode && (isHQ || isLegacyAdmin) ? (
                                <div className="flex flex-col gap-1 mt-1">
                                    <div className="flex items-center gap-2">
                                        <select
                                            className="bg-white text-slate-900 text-sm font-bold border-2 border-secondary rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-yellow-400 w-40 shadow-sm"
                                            value={currentUser?.locationId || ''}
                                            onChange={(e) => {
                                                const newLocId = e.target.value;
                                                const newLoc = LOCATIONS[newLocId?.toLowerCase()];
                                                const defaultUnit = newLoc && newLoc.units.length > 0 ? newLoc.units[0].id : '';
                                                handleContextChange(newLocId, defaultUnit);
                                            }}
                                        >
                                            <option value="">🌍 Global HQ</option>
                                            {Object.values(LOCATIONS).map(loc => (
                                                <option key={loc.id} value={loc.id} className="font-bold text-lg">{loc.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {/* Optional Unit Switcher for Admin */}
                                    {currentUser?.locationId && LOCATIONS[currentUser.locationId] && (
                                        <div className="flex items-center gap-2">
                                            <select
                                                className="bg-white/90 text-slate-900 text-xs font-mono border-2 border-secondary/50 rounded px-2 py-1 focus:outline-none w-40"
                                                value={currentUser?.unitId || ''}
                                                onChange={(e) => handleContextChange(currentUser.locationId, e.target.value)}
                                            >
                                                {LOCATIONS[currentUser.locationId].units.map(u => (
                                                    <option key={u.id} value={u.id}>{u.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            ) : !ceoMode && (
                                <div className="flex flex-col mt-1">
                                    <div className="flex items-center gap-1 text-xs text-secondary-200">
                                        <span className="text-white/40 text-[10px]">{t('loc')}:</span>
                                        <span className="font-bold">{locationLabel}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-white">
                                        <span className="text-white/40 text-[10px]">{t('unit')}:</span>
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
            <main className={`flex-1 p-4 pb-24 max-w-5xl mx-auto w-full ${mainTopClass}`}>
                <Outlet />
            </main>

            {/* Bottom Navigation (Mobile First) */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-40">
                <div className="flex justify-around items-center h-16 max-w-5xl mx-auto">
                    {/* Always Home */}
                    <NavLink
                        to="/"
                        className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeRoute === '/' ? 'text-secondary' : 'text-gray-500'}`}
                        onClick={(e) => handleNavClick(e, '/')}
                    >
                        <Menu size={20} />
                        <span className="text-[10px] font-medium">{t('home')}</span>
                    </NavLink>

                    {navItems.map((item) => {
                        const isActive = activeRoute === item.to;
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-secondary' : 'text-gray-500'}`}
                                onClick={(e) => handleNavClick(e, item.to)}
                            >
                                <item.icon size={20} />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </NavLink>
                        );
                    })}
                </div>
            </nav>
            {/* Shark AI Assistant */}
            <React.Suspense fallback={null}>
                <SharkChat />
            </React.Suspense>
        </div>
    );
}
