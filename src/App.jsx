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
import DashboardV1 from './pages/Admin/DashboardV1';
import NotFound from './pages/NotFound';

function PrivateRoute({ children, allowedRoles = [] }) {
    const { currentUser } = useAuth();
    if (!currentUser) return <Navigate to="/login" />;

    // Check if roles are defined
    if (allowedRoles.length === 0) return children;

    // Check against Legacy Role OR V2 Role
    const hasPermission = allowedRoles.includes(currentUser.role) || allowedRoles.includes(currentUser.role_v2);

    if (!hasPermission) {
        console.warn("Access Denied", {
            path: window.location.pathname,
            role: currentUser.role,
            role_v2: currentUser.role_v2,
            allowed: allowedRoles
        });
        // Redirect to 404 to make it obvious
        return <NotFound />;
    }

    return children;
}

function AppRoutes() {
    const { currentUser } = useAuth();

    // Common sets
    const ALL_OPS = ['staff', 'manager', 'site_user', 'operator', 'admin', 'hq', 'HQ_ADMIN', 'LOC_MANAGER', 'UNIT_OP'];
    const ADMIN_ONLY = ['admin', 'hq', 'HQ_ADMIN'];
    const SALES_ONLY = ['sales', 'hq', 'admin', 'HQ_ADMIN'];
    const REPORTS_VIEW = ['admin', 'report_viewer', 'hq', 'manager', 'HQ_ADMIN', 'LOC_MANAGER', 'READ_ONLY'];

    return (
        <Routes>
            <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/" />} />

            <Route element={<Layout />}>
                <Route path="/" element={
                    <PrivateRoute>
                        <Dashboard />
                    </PrivateRoute>
                } />
                <Route path="/receiving" element={
                    <PrivateRoute allowedRoles={ALL_OPS}>
                        <Receiving />
                    </PrivateRoute>
                } />
                <Route path="/expenses" element={
                    <PrivateRoute allowedRoles={ALL_OPS}>
                        <Expenses />
                    </PrivateRoute>
                } />
                <Route path="/cold-storage" element={
                    <PrivateRoute allowedRoles={ALL_OPS}>
                        <ProductionRun />
                    </PrivateRoute>
                } />
                <Route path="/wallet" element={
                    <PrivateRoute allowedRoles={ALL_OPS}>
                        <WalletManager />
                    </PrivateRoute>
                } />

                {/* HQ / Sales Only */}
                <Route path="/sales" element={
                    <PrivateRoute allowedRoles={SALES_ONLY}>
                        <SalesInvoice />
                    </PrivateRoute>
                } />

                <Route path="/dashboard-v1" element={
                    <PrivateRoute allowedRoles={ADMIN_ONLY}>
                        <DashboardV1 />
                    </PrivateRoute>
                } />

                {/* Admin Only */}
                <Route path="/admin" element={
                    <PrivateRoute allowedRoles={ADMIN_ONLY}>
                        <AdminPanel />
                    </PrivateRoute>
                } />

                {/* Reports (Admin & Viewers) */}
                <Route path="/reports" element={
                    <PrivateRoute allowedRoles={REPORTS_VIEW}>
                        <ReportsViewer />
                    </PrivateRoute>
                } />

                {/* Catch All - Show 404 */}
                <Route path="*" element={<NotFound />} />

            </Route>
        </Routes>
    );
}

import { TransactionQueueProvider } from './contexts/TransactionQueueContext';

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <TransactionQueueProvider>
                    <AppRoutes />
                </TransactionQueueProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
