// Hook to manage shop settings state and localStorage synchronization
import { useState, useCallback } from 'react';

export interface ShopSettings {
  logo: string;
  name: string;
  address: string;
  phone: string;
  greeting: string;
}

const SETTINGS_KEY = 'shopSettings';

const DEFAULT_SETTINGS: ShopSettings = {
  logo: '/assets/generated/shop-logo-placeholder.dim_256x256.png',
  name: 'Bengkel Maju Jaya',
  address: 'Jl. Raya No. 1, Jakarta',
  phone: '021-12345678',
  greeting: 'Terima kasih telah mempercayakan kendaraan Anda kepada kami!',
};

export function getShopSettings(): ShopSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useShopSettings() {
  const [settings, setSettings] = useState<ShopSettings>(getShopSettings);

  const saveSettings = useCallback((newSettings: ShopSettings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    setSettings(newSettings);
  }, []);

  return { settings, saveSettings };
}
