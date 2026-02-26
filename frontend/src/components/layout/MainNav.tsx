import React, { useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { useAuth } from '../../hooks/useAuth';
import { useShopSettings } from '../../hooks/useShopSettings';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ShoppingCart,
  Package,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  Users,
  Wrench,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'POS', path: '/', icon: <ShoppingCart className="w-4 h-4" /> },
  { label: 'Produk', path: '/products', icon: <Package className="w-4 h-4" /> },
  { label: 'Riwayat', path: '/history', icon: <History className="w-4 h-4" /> },
  { label: 'Servis', path: '/service', icon: <Wrench className="w-4 h-4" /> },
  { label: 'Pengguna', path: '/users', icon: <Users className="w-4 h-4" /> },
  { label: 'Pengaturan', path: '/settings', icon: <Settings className="w-4 h-4" /> },
];

export function MainNav() {
  const { currentUser, logout } = useAuth();
  const { settings } = useShopSettings();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card shadow-sm">
      <div className="flex h-14 items-center px-4 gap-3">
        {/* Logo & Shop Name */}
        <Link to="/" className="flex items-center gap-2 mr-4 flex-shrink-0">
          {settings.shopLogoBase64 ? (
            <img
              src={settings.shopLogoBase64}
              alt={settings.shopName}
              className="w-8 h-8 rounded object-contain"
            />
          ) : (
            <img
              src="/assets/generated/shop-logo-placeholder.dim_256x256.png"
              alt="Logo"
              className="w-8 h-8 rounded object-contain"
            />
          )}
          <span className="font-bold text-foreground text-sm hidden sm:block truncate max-w-[140px]">
            {settings.shopName}
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path as any}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1 md:hidden" />

        {/* User Dropdown */}
        {currentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                    {currentUser.username?.charAt(0).toUpperCase() ?? 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{currentUser.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    @{currentUser.username}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  to={'/settings' as any}
                  className="flex items-center gap-2 cursor-pointer w-full"
                >
                  <Settings className="w-4 h-4" />
                  Pengaturan
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Mobile Menu Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-border bg-card px-4 py-3 flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path as any}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export default MainNav;
