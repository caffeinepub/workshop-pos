import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  Outlet,
} from '@tanstack/react-router';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Toaster } from '@/components/ui/sonner';

import LoginPage from './pages/LoginPage';
import { PosPage } from './pages/PosPage';
import ProductsPage from './pages/ProductsPage';
import { HistoryPage } from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import UserDataPage from './pages/UserDataPage';
import { ServicePage } from './pages/ServicePage';
import { ReportsPage } from './pages/ReportsPage';
import { MainNav } from './components/layout/MainNav';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

// Root layout component with MainNav
function RootLayout() {
  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <main className="p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

const posRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: PosPage,
});

const productsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/products',
  component: ProductsPage,
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/history',
  component: HistoryPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
});

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users',
  component: UserDataPage,
});

const serviceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/service',
  component: ServicePage,
});

const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports',
  component: ReportsPage,
});

const routeTree = rootRoute.addChildren([
  posRoute,
  productsRoute,
  historyRoute,
  settingsRoute,
  usersRoute,
  serviceRoute,
  reportsRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function AppContent() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}
