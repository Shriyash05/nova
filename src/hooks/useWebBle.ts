import { useState } from 'react';

// Standard ESP32 BLE Wi-Fi Provisioning / Improv Wi-Fi UUIDs
export const NOVA_BLE_SERVICE_UUID = '00000001-6e6f-7661-7769-6669-70726f760000';
export const NOVA_BLE_CHAR_WIFI_PROV = '00000002-6e6f-7661-7769-6669-70726f760000';
export const NOVA_BLE_CHAR_STATUS = '00000003-6e6f-7661-7769-6669-70726f760000';

export interface UseWebBleResult {
  isSupported: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  deviceName: string | null;
  error: string | null;
  connectBle: () => Promise<boolean>;
  disconnectBle: () => void;
}

export function useWebBle(mockMode = true): UseWebBleResult {
  const [isSupported] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectBle = async (): Promise<boolean> => {
    setIsConnecting(true);
    setError(null);

    // If mock mode is enabled or Web Bluetooth is simulated
    if (mockMode || !isSupported) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setIsConnecting(false);
      setIsConnected(true);
      setDeviceName('NOVA Keychain [S3-84F3]');
      return true;
    }

    try {
      // Real Web Bluetooth API request
      interface BleDevice {
        name?: string;
      }
      const nav = navigator as unknown as { bluetooth?: { requestDevice: (opt: unknown) => Promise<BleDevice> } };
      if (!nav.bluetooth) {
        throw new Error('Web Bluetooth is not supported in this browser.');
      }

      const device = await nav.bluetooth.requestDevice({
        filters: [{ namePrefix: 'NOVA' }],
        optionalServices: [NOVA_BLE_SERVICE_UUID],
      });

      setDeviceName(device.name || 'NOVA Device');
      setIsConnected(true);
      setIsConnecting(false);
      return true;
    } catch (err: unknown) {
      setIsConnecting(false);
      const msg = err instanceof Error ? err.message : 'Failed to pair via Web Bluetooth';
      setError(msg);
      return false;
    }
  };

  const disconnectBle = () => {
    setIsConnected(false);
    setDeviceName(null);
  };

  return {
    isSupported,
    isConnecting,
    isConnected,
    deviceName,
    error,
    connectBle,
    disconnectBle,
  };
}
