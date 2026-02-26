import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
} from '@tanstack/react-router';
import { AuthProvider, useAuth } from './hooks/useAuth';

import { PosPage } from './pages/PosPage';
import { ProductsPage } from './pages/ProductsPage';
import { HistoryPage } from './pages/HistoryPage';
import LoginPage from './pages/LoginPage';
import { TopNav } from './components/pos/TopNav';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Root layout with TopNav — must be inside AuthProvider context
function RootLayout() {
  const { logout, currentUser } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <TopNav onLogout={logout} currentUser={currentUser?.name ?? ''} />
      <Outlet />
    </div>
  );
}

// Routes
const rootRoute = createRootRoute({ component: RootLayout });
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

const routeTree = rootRoute.addChildren([posRoute, productsRoute, historyRoute]);
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

  return <RouterProvider router={router} />;
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
