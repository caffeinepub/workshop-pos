import React from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';

interface TopNavProps {
  onLogout: () => void;
  currentUser: string;
}

export function TopNav({ onLogout, currentUser }: TopNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'POS', path: '/' as const },
    { label: 'Produk', path: '/products' as const },
    { label: 'Riwayat', path: '/history' as const },
  ];

  return (
    <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img
          src="/assets/generated/shop-logo-placeholder.dim_256x256.png"
          alt="Logo"
          className="w-8 h-8 rounded-lg object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <span className="font-bold text-foreground hidden sm:block">Bengkel Workshop</span>
      </div>

      <nav className="flex gap-1">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate({ to: item.path })}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === item.path
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground hidden sm:block">{currentUser}</span>
        <button
          onClick={onLogout}
          className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-accent text-foreground transition-colors"
        >
          Keluar
        </button>
      </div>
    </header>
  );
}

export default TopNav;
