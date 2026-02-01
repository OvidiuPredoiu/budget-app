'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';

interface PermissionGuardProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ feature, children, fallback }: PermissionGuardProps) {
  const [isAllowed, setIsAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPermission() {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          if (user?.role === 'admin') {
            setIsAllowed(true);
            return;
          }
        }

        const allowed = await hasPermission(feature as any);
        setIsAllowed(allowed);
      } catch (error) {
        console.error('Permission check failed:', error);
        setIsAllowed(false);
      } finally {
        setLoading(false);
      }
    }

    checkPermission();
  }, [feature]);

  if (loading) {
    return <div className="text-center py-12">Se verifică permisiuni...</div>;
  }

  if (!isAllowed) {
    return fallback || (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nu aveți acces la această funcționalitate.</p>
        <p className="text-sm mt-2">Contactați administratorul pentru a activa această feature.</p>
      </div>
    );
  }

  return children;
}
