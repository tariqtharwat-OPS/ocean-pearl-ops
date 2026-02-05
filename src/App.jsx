import './lib/i18n';
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Receiving from './pages/Receiving';
import Expenses from './pages/Expenses';
import ProductionRun from './pages/ProductionRun';
import SalesInvoice from './pages/SalesInvoice';
import AdminPanel from './pages/Admin/AdminPanel';
import ReportsViewer from './pages/Reports/ReportsViewer';
import WalletManager from './pages/WalletManager';
import BulkImport from './pages/BulkImport';
const SharkPage = React.lazy(() => import('./pages/SharkPage'));
import NotFound from './pages/NotFound';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';

function PrivateRoute({ children, allowedRoles = [] }) {
    const { currentUser } = useAuth();
    if (!currentUser) return <Navigate to="/login" />;

    // Check if roles are defined
    if (allowedRoles.length === 0) return children;

    // Check against Legacy Role OR V2 Role
    const hasPermission = allowedRoles.includes(currentUser.role) || allowedRoles.includes(currentUser.role_v2);

    if (!hasPermission) {
        console.warn("🔐 Access Denied:", {
            path: window.location.pathname,
            role: currentUser.role,
            role_v2: currentUser.role_v2,
            allowed: allowedRoles,
            email: currentUser.email
        });
        // Redirect to 404 to make it obvious
        return <NotFound />;
    }

    return children;
}

function AppRoutes() {
    const { currentUser, ceoMode } = useAuth();

    // Common sets
    const ALL_OPS = ['ceo', 'CEO', 'admin', 'hq', 'HQ_ADMIN', 'HQ_FINANCE', 'LOC_MANAGER', 'UNIT_OP', 'manager', 'site_user', 'operator', 'unit_admin', 'site_worker', 'location_manager', 'unit_operator'];
    const ADMIN_ONLY = ['ceo', 'CEO', 'admin', 'hq', 'HQ_ADMIN'];
    const SALES_ONLY = ['sales', 'hq', 'admin', 'HQ_ADMIN', 'CEO', 'HQ_FINANCE'];
    const REPORTS_VIEW = ['admin', 'hq', 'HQ_ADMIN', 'HQ_FINANCE', 'LOC_MANAGER', 'manager', 'location_admin', 'READ_ONLY', 'viewer', 'location_manager', 'INVESTOR'];
    const TREASURY_OPS = ['admin', 'hq', 'HQ_ADMIN', 'HQ_FINANCE', 'LOC_MANAGER', 'manager', 'location_manager'];

    // EXTENDED KEY for strict context safety
    const contextKey = `${currentUser?.locationId}_${currentUser?.unitId || 'nounit'}_${currentUser?.role_v2}_${ceoMode || 'normal'}`;

    return (
        <Routes>
            <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/" />} />

            <Route element={<Layout />}>
                <Route path="/" element={
                    <PrivateRoute>
                        <Dashboard key={contextKey} />
                    </PrivateRoute>
                } />
                <Route path="/receiving" element={
                    <PrivateRoute allowedRoles={ALL_OPS}>
                        <Receiving key={contextKey} />
                    </PrivateRoute>
                } />
                <Route path="/expenses" element={
                    <PrivateRoute allowedRoles={ALL_OPS}>
                        <Expenses key={contextKey} />
                    </PrivateRoute>
                } />
                <Route path="/production" element={
                    <PrivateRoute allowedRoles={ALL_OPS}>
                        <React.Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
                            <ProductionRun key={contextKey} />
                        </React.Suspense>
                    </PrivateRoute>
                } />
                <Route path="/cold-storage" element={<Navigate to="/production" replace />} />
                <Route path="/wallet" element={
                    <PrivateRoute allowedRoles={ALL_OPS}>
                        <WalletManager key={contextKey} />
                    </PrivateRoute>
                } />

                {/* HQ / Sales Only */}
                <Route path="/sales" element={
                    <PrivateRoute allowedRoles={[...SALES_ONLY, ...ALL_OPS]}>
                        <SalesInvoice key={contextKey} />
                    </PrivateRoute>
                } />

                {/* Shark AI Landing (New) */}
                <Route path="/shark" element={
                    <PrivateRoute allowedRoles={ALL_OPS}>
                        <React.Suspense fallback={<div>Loading...</div>}>
                            <SharkPage />
                        </React.Suspense>
                    </PrivateRoute>
                } />


                {/* Admin Only */}
                <Route path="/admin" element={
                    <PrivateRoute allowedRoles={ADMIN_ONLY}>
                        <AdminPanel key={contextKey} />
                    </PrivateRoute>
                } />

                {/* Reports (Admin & Viewers) */}
                <Route path="/reports" element={
                    <PrivateRoute allowedRoles={REPORTS_VIEW}>
                        <ReportsViewer key={contextKey} />
                    </PrivateRoute>
                } />

                {/* Bulk Import (CEO Only) */}
                <Route path="/bulk-import" element={
                    <PrivateRoute allowedRoles={['ceo']}>
                        <BulkImport />
                    </PrivateRoute>
                } />

                {/* Catch All - Show 404 */}
                <Route path="*" element={<NotFound />} />

            </Route>
        </Routes>
    );
}

import { TransactionQueueProvider } from './contexts/TransactionQueueContext';
import { DirtyFormProvider } from './contexts/DirtyFormContext';

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <TransactionQueueProvider>
                    <DirtyFormProvider>
                        <ErrorBoundary><AppRoutes /></ErrorBoundary>
                        <Toaster
                            position="top-right"
                            toastOptions={{
                                duration: 4000,
                                style: {
                                    background: '#363636',
                                    color: '#fff',
                                },
                                success: {
                                    duration: 3000,
                                    iconTheme: {
                                        primary: '#10b981',
                                        secondary: '#fff',
                                    },
                                },
                                error: {
                                    duration: 5000,
                                    iconTheme: {
                                        primary: '#ef4444',
                                        secondary: '#fff',
                                    },
                                },
                            }}
                        />
                    </DirtyFormProvider>
                </TransactionQueueProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
