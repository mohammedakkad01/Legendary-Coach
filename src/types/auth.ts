/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * User Roles and Permission System
 * Defines clear boundaries between Player Experience and Admin/Developer operations.
 */

export type UserRole = 'player' | 'admin' | 'developer';

export interface UserRoleProfile {
  uid: string;
  email: string | null;
  role: UserRole;
  isDeveloper: boolean;
  isAdmin: boolean;
  permissions: {
    canAccessAdminHub: boolean;
    canTriggerApiSync: boolean;
    canViewDataDiagnostics: boolean;
    canManageSystemCache: boolean;
    canEditDataPacks: boolean;
  };
}

// Configured admin/developer emails (includes app environment admin)
export const KNOWN_ADMIN_EMAILS = [
  'asdasd362514@gmail.com',
  'admin@legendarycoach.app',
  'developer@legendarycoach.app'
];

export function resolveUserProfile(user: { uid: string; email?: string | null } | null): UserRoleProfile {
  if (!user) {
    return {
      uid: 'guest',
      email: null,
      role: 'player',
      isDeveloper: false,
      isAdmin: false,
      permissions: {
        canAccessAdminHub: false,
        canTriggerApiSync: false,
        canViewDataDiagnostics: false,
        canManageSystemCache: false,
        canEditDataPacks: false,
      }
    };
  }

  const email = (user.email || '').toLowerCase().trim();
  const isAdminEmail = KNOWN_ADMIN_EMAILS.some(e => e.toLowerCase() === email);
  
  // Developer toggle stored in localStorage for dev verification
  const devOverride = typeof window !== 'undefined' && localStorage.getItem('legendary_dev_role_override') === 'admin';
  const isAdmin = isAdminEmail || devOverride;

  if (isAdmin) {
    return {
      uid: user.uid,
      email: user.email || null,
      role: 'admin',
      isDeveloper: true,
      isAdmin: true,
      permissions: {
        canAccessAdminHub: true,
        canTriggerApiSync: true,
        canViewDataDiagnostics: true,
        canManageSystemCache: true,
        canEditDataPacks: true,
      }
    };
  }

  return {
    uid: user.uid,
    email: user.email || null,
    role: 'player',
    isDeveloper: false,
    isAdmin: false,
    permissions: {
      canAccessAdminHub: false,
      canTriggerApiSync: false,
      canViewDataDiagnostics: false,
      canManageSystemCache: false,
      canEditDataPacks: false,
    }
  };
}
