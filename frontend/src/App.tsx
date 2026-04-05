import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryClient } from './lib/queryClient';
import { useAuthStore } from './store/useAuthStore';
import { ToastContainer } from './components/ui/Toast';
import { PageLoader } from './components/ui/Spinner';

// Auth pages
import Login from './pages/auth/Login';
import SetPassword from './pages/auth/SetPassword';
import SelfOrder from './pages/public/SelfOrder';
import DummyPayment from './pages/public/DummyPayment';

// Layouts
import AdminLayout from './components/layout/AdminLayout';
import WaiterLayout from './components/layout/WaiterLayout';
import KitchenLayout from './components/layout/KitchenLayout';
import CashierLayout from './components/layout/CashierLayout';

// Admin pages
import Dashboard from './pages/admin/Dashboard';
import Staff from './pages/admin/Staff';
import Products from './pages/admin/Products';
import Floors from './pages/admin/Floors';
import PaymentConfig from './pages/admin/PaymentConfig';
import Session from './pages/admin/Session';
import Reports from './pages/admin/Reports';

// Waiter pages
import FloorView from './pages/waiter/FloorView';
import OrderPage from './pages/waiter/OrderPage';
import MyOrders from './pages/waiter/MyOrders';

// Kitchen pages
import KitchenQueue from './pages/kitchen/Queue';

// Cashier pages
import CashierPending from './pages/cashier/Pending';
import CashierHistory from './pages/cashier/History';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) {
    const roleRoutes: Record<string, string> = { ADMIN: '/admin', WAITER: '/waiter', KITCHEN: '/kitchen', CASHIER: '/cashier' };
    return <Navigate to={roleRoutes[user.role] || '/login'} replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { checkAuth, isLoading, isAuthenticated, user } = useAuthStore();

  useEffect(() => { checkAuth(); }, []);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-surface-1">
      <PageLoader />
    </div>
  );

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={isAuthenticated ? <Navigate to={user?.role === 'ADMIN' ? '/admin' : user?.role === 'WAITER' ? '/waiter' : user?.role === 'KITCHEN' ? '/kitchen' : '/cashier'} replace /> : <Login />} />
      <Route path="/set-password" element={<SetPassword />} />
      <Route path="/self-order" element={<SelfOrder />} />
      <Route path="/self-order/:tableId" element={<SelfOrder />} />
      <Route path="/self-order/payment/:orderId" element={<DummyPayment />} />
      <Route path="/self-order/track/:orderId" element={<SelfOrder />} />

      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="staff" element={<Staff />} />
        <Route path="products" element={<Products />} />
        <Route path="floors" element={<Floors />} />
        <Route path="payment-config" element={<PaymentConfig />} />
        <Route path="session" element={<Session />} />
        <Route path="reports" element={<Reports />} />
      </Route>

      {/* Waiter */}
      <Route path="/waiter" element={<ProtectedRoute roles={['WAITER', 'ADMIN']}><WaiterLayout /></ProtectedRoute>}>
        <Route index element={<FloorView />} />
        <Route path="order" element={<OrderPage />} />
        <Route path="orders" element={<MyOrders />} />
      </Route>

      {/* Kitchen */}
      <Route path="/kitchen" element={<ProtectedRoute roles={['KITCHEN', 'ADMIN']}><KitchenLayout /></ProtectedRoute>}>
        <Route index element={<KitchenQueue />} />
      </Route>

      {/* Cashier */}
      <Route path="/cashier" element={<ProtectedRoute roles={['CASHIER', 'ADMIN']}><CashierLayout /></ProtectedRoute>}>
        <Route index element={<CashierPending />} />
        <Route path="history" element={<CashierHistory />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
        <ToastContainer />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
