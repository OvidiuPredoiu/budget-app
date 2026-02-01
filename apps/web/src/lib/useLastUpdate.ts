'use client';

import { useEffect, useState } from 'react';

export function useLastUpdate() {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // Ascultă pentru schimbări în localStorage
    const handleStorageChange = () => {
      const timestamp = localStorage.getItem('lastDataUpdate');
      if (timestamp) {
        setLastUpdate(new Date(timestamp));
      }
    };

    window.addEventListener('lastUpdateChange', handleStorageChange);
    
    // Verifică inițial
    const timestamp = localStorage.getItem('lastDataUpdate');
    if (timestamp) {
      setLastUpdate(new Date(timestamp));
    }

    return () => window.removeEventListener('lastUpdateChange', handleStorageChange);
  }, []);

  const updateNow = () => {
    const now = new Date();
    localStorage.setItem('lastDataUpdate', now.toISOString());
    setLastUpdate(now);
    
    // Trigger event pe alte tab-uri
    window.dispatchEvent(new Event('lastUpdateChange'));
  };

  const getRelativeTime = () => {
    if (!lastUpdate) return 'Niciodată';
    
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);
    
    if (diffSeconds < 60) {
      return 'Acum ' + diffSeconds + 's';
    } else if (diffSeconds < 3600) {
      const minutes = Math.floor(diffSeconds / 60);
      return 'Acum ' + minutes + (minutes === 1 ? 'm' : 'm');
    } else {
      return lastUpdate.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
    }
  };

  return { lastUpdate, updateNow, getRelativeTime };
}
