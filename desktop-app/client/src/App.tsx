import type { ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, canAccess } from './AuthContext';
import Shell from './Shell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import ItemDetail from './pages/ItemDetail';
import StockIn from './pages/StockIn';
import StockOut from './pages/StockOut';
import PhysicalCount from './pages/PhysicalCount';
import Movements from './pages/Movements';
import Alerts from './pages/Alerts';
import Suppliers from './pages/Suppliers';
import SupplierDetail from './pages/SupplierDetail';
import Reports from './pages/Reports';
import AdminMenu from './pages/admin/AdminMenu';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAuditLog from './pages/admin/AdminAuditLog';
import AdminReferenceData from './pages/admin/AdminReferenceData';
import AdminInventoryCheck from './pages/admin/AdminInventoryCheck';

function Guard({ area, children }: { area: string; children: ReactNode }) {
    const { user } = useAuth();
    if (!canAccess(user, area)) {
        return (
            <div className="card">
                <p>You do not have access to this area.</p>
            </div>
        );
    }
    return <>{children}</>;
}

function AppRoutes() {
    const { user, loading } = useAuth();

    if (loading) return null;
    if (!user) return <Login />;

    return (
        <Routes>
            <Route element={<Shell />}>
                <Route index element={user.isAdmin ? <Dashboard /> : <Navigate to="/stock-out" replace />} />
                <Route path="inventory" element={<Guard area="Inventory"><Inventory /></Guard>} />
                <Route path="inventory/:id" element={<Guard area="Inventory"><ItemDetail /></Guard>} />
                <Route
                    path="stock-in"
                    element={
                        <Guard area="StockIn">
                            <StockIn />
                        </Guard>
                    }
                />
                <Route
                    path="stock-out"
                    element={
                        <Guard area="StockOut">
                            <StockOut />
                        </Guard>
                    }
                />
                <Route
                    path="physical-count"
                    element={
                        <Guard area="StockIn">
                            <PhysicalCount />
                        </Guard>
                    }
                />
                <Route path="movements" element={<Guard area="Movements"><Movements /></Guard>} />
                <Route path="alerts" element={<Guard area="Alerts"><Alerts /></Guard>} />
                <Route
                    path="suppliers"
                    element={
                        <Guard area="Suppliers">
                            <Suppliers />
                        </Guard>
                    }
                />
                <Route
                    path="suppliers/:id"
                    element={
                        <Guard area="Suppliers">
                            <SupplierDetail />
                        </Guard>
                    }
                />
                <Route path="reports" element={<Guard area="Reports"><Reports /></Guard>} />
                <Route
                    path="admin"
                    element={
                        <Guard area="Administration">
                            <AdminMenu />
                        </Guard>
                    }
                />
                <Route
                    path="admin/users"
                    element={
                        <Guard area="Administration">
                            <AdminUsers />
                        </Guard>
                    }
                />
                <Route
                    path="admin/audit-log"
                    element={
                        <Guard area="Administration">
                            <AdminAuditLog />
                        </Guard>
                    }
                />
                <Route
                    path="admin/reference/:resource"
                    element={
                        <Guard area="Administration">
                            <AdminReferenceData />
                        </Guard>
                    }
                />
                <Route
                    path="admin/inventory-check"
                    element={
                        <Guard area="Administration">
                            <AdminInventoryCheck />
                        </Guard>
                    }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
}

function App() {
    return (
        <HashRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </HashRouter>
    );
}

export default App;
