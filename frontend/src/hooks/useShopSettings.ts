import { useState, useEffect, useCallback } from 'react';

export interface ShopSettings {
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  shopGreeting: string;
  shopLogoBase64: string;
}

const STORAGE_KEY = 'shop_settings';

const defaultSettings: ShopSettings = {
  shopName: 'Toko Saya',
  shopAddress: 'Jl. Contoh No. 1, Kota',
  shopPhone: '08123456789',
  shopGreeting: 'Terima kasih telah berbelanja di toko kami!',
  shopLogoBase64: '',
};

function loadSettings(): ShopSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...defaultSettings, ...JSON.parse(raw) };
    }
  } catch {
    // ignore parse errors
  }
  return { ...defaultSettings };
}

// Global listener set so all hook instances stay in sync without context
const listeners = new Set<() => void>();

function notifyAll() {
  listeners.forEach((fn) => fn());
}

export function useShopSettings() {
  const [settings, setSettings] = useState<ShopSettings>(loadSettings);

  useEffect(() => {
    const refresh = () => setSettings(loadSettings());
    listeners.add(refresh);
    return () => {
      listeners.delete(refresh);
    };
  }, []);

  const saveSettings = useCallback((newSettings: ShopSettings) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    setSettings(newSettings);
    notifyAll();
  }, []);

  return { settings, saveSettings };
}
