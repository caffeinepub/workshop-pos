// Main application with TanStack Router, authentication guard, and all page routes
import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { SettingsPage } from './pages/SettingsPage';
import { UserDataPage } from './pages/UserDataPage';
import { InventoryPage } from './pages/InventoryPage';
import { ServicePage } from './pages/ServicePage';
import { TransactionPage } from './pages/TransactionPage';
import { CustomerDataPage } from './pages/CustomerDataPage';
import { ReportsPage } from './pages/ReportsPage';
import { MainNav } from './components/layout/MainNav';
import { Toaster } from '@/components/ui/sonner';

// Layout component that wraps all authenticated pages
function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MainNav />
      <main className="flex-1 container mx-auto px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-border py-4 no-print">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Bengkel POS • Built with ❤️ using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
              window.location.hostname || 'bengkel-pos'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </div>
      </footer>
    </div>
  );
}

// Root route
const rootRoute = createRootRoute({
  component: AppLayout,
});

// Child routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/transaction', search: { customerName: '' } });
  },
  component: () => null,
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

const inventoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inventory',
  component: InventoryPage,
});

const serviceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/service',
  component: ServicePage,
});

const transactionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/transaction',
  component: TransactionPage,
  validateSearch: (search: Record<string, unknown>) => ({
    customerName: (search.customerName as string) || '',
  }),
});

const customersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/customers',
  component: CustomerDataPage,
});

const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports',
  component: ReportsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  settingsRoute,
  usersRoute,
  inventoryRoute,
  serviceRoute,
  transactionRoute,
  customersRoute,
  reportsRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function AuthenticatedApp() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" />
    </>
  );
}

function App() {
  let isAuthenticated = false;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const auth = useAuth();
    isAuthenticated = auth.isAuthenticated;
  } catch {
    isAuthenticated = false;
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        <Toaster richColors position="top-right" />
      </>
    );
  }

  return <AuthenticatedApp />;
}

export default App;
