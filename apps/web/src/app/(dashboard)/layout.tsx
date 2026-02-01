'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Receipt, Wallet, Tag, LogOut, Shield, FileText, TrendingUp, Users, Target, DollarSign, BarChart3, Share2, Zap, LineChart, Code, Palette } from 'lucide-react';
import api from '@/lib/api';
import { useLastUpdate } from '@/lib/useLastUpdate';
import { getUserPermissions } from '@/lib/permissions';
import { ThemeToggle } from '@/components/theme-toggle';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [permissions, setPermissions] = useState<any>(null);
  const { getRelativeTime } = useLastUpdate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
      return;
    }

    router.push('/login');
  }, [router]);

  useEffect(() => {
    if (!user || user.role === 'admin') {
      return;
    }

    let isMounted = true;

    const loadPermissions = async () => {
      try {
        const data = await getUserPermissions();
        if (isMounted) {
          setPermissions(data);
        }
      } catch (error) {
        console.warn('Failed to load permissions:', error);
      }
    };

    loadPermissions();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      router.push('/login');
    }
  };

  const navigation = [
    { name: 'Tablou de bord', href: '/dashboard', icon: LayoutDashboard, feature: 'dashboard' },
    { name: 'Tranzacții', href: '/transactions', icon: Receipt, feature: 'transactions' },
    { name: 'Bugete', href: '/budgets', icon: Wallet, feature: 'budgets' },
    { name: 'Categorii', href: '/categories', icon: Tag, feature: 'categories' },
    { name: 'Rapoarte', href: '/reports', icon: FileText, feature: 'reports' },
    { name: 'Insights', href: '/insights', icon: TrendingUp, feature: 'insights' },
    { name: 'Obiective', href: '/goals', icon: Target, feature: 'goals' },
    { name: 'Recurente', href: '/recurring', icon: Receipt, feature: 'recurring' },
    { name: 'Valute', href: '/currency', icon: DollarSign, feature: 'currency' },
    { name: 'Partajate', href: '/shared', icon: Users, feature: 'sharedBudgets' },
    { name: 'Chitanțe', href: '/receipts', icon: BarChart3, feature: 'receipts' },
    { name: 'Analize', href: '/analytics', icon: LineChart, feature: 'analytics' },
    { name: 'Bănci', href: '/banking', icon: Share2, feature: 'banking' },
    { name: 'Abonamente', href: '/subscriptions', icon: Zap, feature: 'subscriptions' },
    { name: 'Investiții', href: '/investments', icon: TrendingUp, feature: 'investments' },
    { name: 'Taxe', href: '/tax', icon: FileText, feature: 'tax' },
    { name: 'Developer', href: '/developer', icon: Code, feature: 'developer' },
    { name: 'Branding', href: '/white-label', icon: Palette, feature: 'whiteLabel' },
  ];

  const essentialFeatures = new Set(['dashboard', 'transactions', 'categories']);

  const filteredNavigation = navigation.filter((item) => {
    if (!item.feature) {
      return true;
    }

    if (user?.role === 'admin') {
      return true;
    }

    if (!permissions) {
      return essentialFeatures.has(item.feature);
    }

    return permissions[item.feature] === true;
  });

  if (user?.role === 'admin') {
    filteredNavigation.push({ name: 'Admin', href: '/admin', icon: Shield, feature: 'admin' });
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden lg:flex w-64 flex-col gap-8 border-r border-white/10 bg-black/20 backdrop-blur px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
              <span className="text-slate-950 text-sm font-bold">B</span>
            </div>
            <div>
              <div className="text-lg font-semibold">Buget</div>
              <div className="text-xs text-muted-foreground">Personal Finance</div>
            </div>
          </div>

          <nav className="space-y-2">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white/10 text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ultimul Update</div>
            <div className="mt-2 text-sm font-medium">{getRelativeTime()}</div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div 
                className="h-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 animate-pulse" 
                style={{
                  width: '100%',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}
              />
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4">
              <div>
                <div className="text-xs sm:text-sm text-muted-foreground">Bine ai venit</div>
                <div className="text-base sm:text-lg font-semibold truncate max-w-[150px] sm:max-w-none">{user.name || user.email}</div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <ThemeToggle />
                <div className="hidden md:flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-xs font-medium">{user.email?.[0].toUpperCase()}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm">{user.email}</span>
                    {user.role === 'admin' && (
                      <span className="text-xs text-purple-600 font-medium">Administrator</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 sm:px-3 py-2 text-xs sm:text-sm text-foreground hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Deconectare</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto px-4 sm:px-6 pb-3 sm:pb-4 lg:hidden scrollbar-hide">
              {filteredNavigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-colors min-h-[44px] ${
                      isActive
                        ? 'bg-white/10 text-foreground'
                        : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </header>

          <main className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
