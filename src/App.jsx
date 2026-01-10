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

function PrivateRoute({ children, allowedRoles = [] }) {
    const { currentUser } = useAuth();
    if (!currentUser) return <Navigate to="/login" />;
    if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
        return <Navigate to="/" />;
    }
    return children;
}

function AppRoutes() {
    const { currentUser } = useAuth();

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
                    <PrivateRoute allowedRoles={['staff', 'manager', 'site_user', 'operator']}>
                        <Receiving />
                    </PrivateRoute>
                } />
                <Route path="/expenses" element={
                    <PrivateRoute allowedRoles={['staff', 'manager', 'site_user', 'operator']}>
                        <Expenses />
                    </PrivateRoute>
                } />
                <Route path="/cold-storage" element={
                    <PrivateRoute allowedRoles={['staff', 'manager', 'site_user', 'operator']}>
                        <ProductionRun />
                    </PrivateRoute>
                } />
                <Route path="/wallet" element={
                    <PrivateRoute allowedRoles={['staff', 'manager', 'site_user', 'operator']}>
                        <WalletManager />
                    </PrivateRoute>
                } />

                {/* HQ / Sales Only */}
                <Route path="/sales" element={
                    <PrivateRoute allowedRoles={['sales', 'hq', 'admin']}>
                        <SalesInvoice />
                    </PrivateRoute>
                } />

                <Route path="/dashboard-v1" element={
                    <PrivateRoute allowedRoles={['admin']}>
                        <DashboardV1 />
                    </PrivateRoute>
                } />

                {/* Admin Only */}
                <Route path="/admin" element={
                    <PrivateRoute allowedRoles={['admin']}>
                        <AdminPanel />
                    </PrivateRoute>
                } />

                {/* Reports (Admin & Viewers) */}
                <Route path="/reports" element={
                    <PrivateRoute allowedRoles={['admin', 'report_viewer', 'hq']}>
                        <ReportsViewer />
                    </PrivateRoute>
                } />
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
