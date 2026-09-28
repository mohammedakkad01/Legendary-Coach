/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Route Protection & Role Guard
 * Enforces strict authorization barriers between Player Experience and Admin/Developer operations.
 */

import React from 'react';
import { useFirebase } from '../firebase/FirebaseContext';
import { useGameStore } from '../state/useGameStore';
import { ShieldAlert, Lock, ArrowRight, LogIn, KeyRound } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactNode;
  requiredPermission?: 'canAccessAdminHub' | 'canTriggerApiSync' | 'canViewDataDiagnostics' | 'canManageSystemCache' | 'canEditDataPacks';
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ 
  children, 
  requiredPermission = 'canAccessAdminHub' 
}) => {
  const { user, roleProfile, isAdmin, isDeveloper, setAuthModalOpen } = useFirebase();
  const { language, setActiveTab } = useGameStore();
  const isAr = language === 'ar';

  const hasAccess = isAdmin && (requiredPermission ? roleProfile.permissions[requiredPermission] : true);

  if (hasAccess) {
    return <>{children}</>;
  }

  // Developer Bypass toggle for testing in local environment
  const handleToggleDevRole = () => {
    if (localStorage.getItem('legendary_dev_role_override') === 'admin') {
      localStorage.removeItem('legendary_dev_role_override');
    } else {
      localStorage.setItem('legendary_dev_role_override', 'admin');
    }
    window.location.reload();
  };

  return (
    <div 
      role="region" 
      aria-label={isAr ? 'منطقة محظورة: أدوات الإدارة والمطور' : 'Restricted Area: Developer and Admin Tools'}
      className="min-h-[70vh] flex items-center justify-center p-4"
    >
      <div className="max-w-lg w-full bg-slate-900 border border-rose-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-rose-950/40 text-center space-y-6">
        
        {/* Shield & Lock Header */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <ShieldAlert className="w-10 h-10 animate-pulse" />
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md">
            <Lock className="w-4 h-4" />
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h2 className="font-heading font-black text-xl sm:text-2xl text-white">
            {isAr ? 'منطقة أدوات النظام والمطورين' : 'Restricted System & Developer Zone'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            {isAr
              ? 'هذه الصفحة مخصصة لمهندسي النظام وإدارة مزامنة بيانات كرة القدم الحية. حسابك الحالي لا يمتلك صلاحيات الإشراف البرمجية (Admin/Developer Privileges).'
              : 'This area is restricted to system administrators and developers managing live football data sync and system diagnostics.'}
          </p>
        </div>

        {/* User Identity Diagnostic Card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs space-y-2 text-slate-300">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
            <span className="text-slate-500 font-bold">{isAr ? 'الحساب الحالي:' : 'Current Account:'}</span>
            <span className="font-mono text-white font-bold">{user?.email || (isAr ? 'زائر غير مسجل' : 'Unauthenticated Guest')}</span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
            <span className="text-slate-500 font-bold">{isAr ? 'الدور الممنوح:' : 'Assigned Role:'}</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 font-black uppercase text-[10px]">
              {roleProfile.role}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-bold">{isAr ? 'الصلاحية المطلوبة:' : 'Required Permission:'}</span>
            <span className="font-mono text-rose-400 font-bold">{requiredPermission}</span>
          </div>
        </div>

        {/* Actions: Return to Player Hub or Login with Admin */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex-1 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <span>{isAr ? 'العودة لمركز اللاعب' : 'Return to Player Hub'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {!user && (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-700"
            >
              <LogIn className="w-4 h-4" />
              <span>{isAr ? 'تسجيل دخول المشرف' : 'Admin Sign In'}</span>
            </button>
          )}
        </div>

        {/* Developer Sandbox Test Switch */}
        <div className="pt-4 border-t border-slate-800/80">
          <button
            onClick={handleToggleDevRole}
            className="text-[11px] text-slate-500 hover:text-amber-400 flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>
              {isAr 
                ? 'تبديل دور المطور للاختبار المحلي (Dev Role Switch)' 
                : 'Toggle Developer Override for Testing'}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
