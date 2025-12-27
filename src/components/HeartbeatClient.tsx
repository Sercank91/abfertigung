'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Heartbeat Client Component
 * Sendet alle 60 Sekunden einen Heartbeat an den Server
 * um User Presence zu tracken
 */
export default function HeartbeatClient() {
  const pathname = usePathname();

  useEffect(() => {
    // Sende initialen Heartbeat
    sendHeartbeat();

    // Sende Heartbeat alle 60 Sekunden
    const interval = setInterval(() => {
      sendHeartbeat();
    }, 60000); // 60 Sekunden

    return () => clearInterval(interval);
  }, [pathname]);

  const sendHeartbeat = async () => {
    try {
      await fetch('/api/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPath: pathname })
      });
    } catch (error) {
      // Fehler ignorieren (z.B. wenn offline)
      console.debug('Heartbeat failed:', error);
    }
  };

  return null; // Keine UI
}

