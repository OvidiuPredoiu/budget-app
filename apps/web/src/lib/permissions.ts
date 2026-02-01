import api from './api';

interface UserPermissions {
  dashboard: boolean;
  transactions: boolean;
  categories: boolean;
  budgets: boolean;
  recurring: boolean;
  goals: boolean;
  investments: boolean;
  subscriptions: boolean;
  receipts: boolean;
  reports: boolean;
  insights: boolean;
  predictions: boolean;
  banking: boolean;
  sharedBudgets: boolean;
  analytics: boolean;
  tax: boolean;
  currency: boolean;
  developer: boolean;
  whiteLabel: boolean;
}

let cachedPermissions: UserPermissions | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getUserPermissions(): Promise<UserPermissions> {
  const now = Date.now();
  
  // Return cached permissions if still valid
  if (cachedPermissions && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedPermissions;
  }
  
  try {
    // Get current user from localStorage to access userId
    const userData = localStorage.getItem('user');
    if (!userData) {
      console.warn('User not found in localStorage');
      return getDefaultPermissions();
    }
    
    const user = JSON.parse(userData);
    
    // Try to fetch permissions, but don't fail if endpoint doesn't exist yet
    try {
      const response = await api.get('/permissions/me');
      cachedPermissions = response.data;
      cacheTimestamp = now;
      return response.data;
    } catch (error) {
      // If API call fails, return default permissions
      console.warn('Could not fetch permissions, using defaults');
      return getDefaultPermissions();
    }
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return getDefaultPermissions();
  }
}

export async function hasPermission(feature: keyof UserPermissions): Promise<boolean> {
  const permissions = await getUserPermissions();
  return permissions[feature] === true;
}

export function getDefaultPermissions(): UserPermissions {
  return {
    dashboard: true,
    transactions: true,
    categories: true,
    budgets: true,
    recurring: true,
    goals: true,
    investments: true,
    subscriptions: true,
    receipts: true,
    reports: true,
    insights: true,
    predictions: true,
    banking: true,
    sharedBudgets: true,
    analytics: true,
    tax: true,
    currency: true,
    developer: false,
    whiteLabel: true,
  };
}

export function invalidatePermissionCache() {
  cachedPermissions = null;
  cacheTimestamp = 0;
}

export const FEATURES = [
  { key: 'dashboard', label: 'Tabloul de Bord', essential: true },
  { key: 'transactions', label: 'Tranzacții', essential: true },
  { key: 'categories', label: 'Categorii', essential: true },
  { key: 'budgets', label: 'Bugete' },
  { key: 'recurring', label: 'Tranzacții Recurente' },
  { key: 'goals', label: 'Obiective de Economii' },
  { key: 'investments', label: 'Investiții' },
  { key: 'subscriptions', label: 'Abonamente' },
  { key: 'receipts', label: 'Chitanțe' },
  { key: 'reports', label: 'Rapoarte' },
  { key: 'insights', label: 'Analize' },
  { key: 'predictions', label: 'Predicții' },
  { key: 'banking', label: 'Servicii Bancare' },
  { key: 'sharedBudgets', label: 'Bugete Partajate' },
  { key: 'analytics', label: 'Analitică' },
  { key: 'tax', label: 'Impozite' },
  { key: 'currency', label: 'Valute' },
  { key: 'developer', label: 'Developer' },
  { key: 'whiteLabel', label: 'White Label' },
];
