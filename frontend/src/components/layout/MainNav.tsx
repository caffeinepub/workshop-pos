// Main navigation component with links to all pages and active state highlighting
import { useAuth } from '../../hooks/useAuth';
import { useShopSettings } from '../../hooks/useShopSettings';
import { Link, useRouterState } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Settings, Users, Package, Wrench, ShoppingCart, UserCheck, BarChart3,
  LogOut, Menu, X, Wrench as WrenchIcon,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/settings', label: 'Pengaturan', icon: Settings },
  { path: '/users', label: 'Data User', icon: Users },
  { path: '/inventory', label: 'Inventori', icon: Package },
  { path: '/service', label: 'Service', icon: Wrench },
  { path: '/transaction', label: 'Transaksi', icon: ShoppingCart },
  { path: '/customers', label: 'Pelanggan', icon: UserCheck },
  { path: '/reports', label: 'Laporan', icon: BarChart3 },
];

export function MainNav() {
  const { currentUser, logout } = useAuth();
  const { settings } = useShopSettings();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-b border-border bg-card sticky top-0 z-40 no-print">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-primary flex items-center justify-center">
              {settings.logo && settings.logo !== '/assets/generated/shop-logo-placeholder.dim_256x256.png' ? (
                <img src={settings.logo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <WrenchIcon className="w-4 h-4 text-primary-foreground" />
              )}
            </div>
            <span className="font-bold text-foreground hidden sm:block truncate max-w-[160px]">
              {settings.name}
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = currentPath === path || currentPath.startsWith(path + '/');
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                      {currentUser?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm">{currentUser}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                  Login sebagai: {currentUser}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <nav className="lg:hidden border-t border-border py-2 grid grid-cols-2 gap-1">
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = currentPath === path;
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
