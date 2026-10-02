/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Notifications Center & Living World Log (Phase C)
 * Renders notifications across the 5 canonical categories:
 * Critical, Important, Information, Suggestion, Story (throttling managed by domain).
 */

import React, { useState } from 'react';
import { useGameStore } from '../../state/useGameStore';
import type { GameNotification, NotificationCategory } from '../../domain/livingWorld/types';
import {
  Bell,
  X,
  AlertTriangle,
  Info,
  Lightbulb,
  BookOpen,
  CheckCheck,
  ShieldAlert,
  Clock,
} from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_TABS: { id: 'All' | NotificationCategory; labelAr: string; labelEn: string }[] = [
  { id: 'All', labelAr: 'الكل', labelEn: 'All' },
  { id: 'Critical', labelAr: 'حرجة', labelEn: 'Critical' },
  { id: 'Important', labelAr: 'هامة', labelEn: 'Important' },
  { id: 'Information', labelAr: 'معلومات', labelEn: 'Info' },
  { id: 'Suggestion', labelAr: 'مقترحات', labelEn: 'Suggestions' },
  { id: 'Story', labelAr: 'قصص ومسار', labelEn: 'Story' },
];

const categoryIcon = (category: NotificationCategory) => {
  switch (category) {
    case 'Critical':
      return <ShieldAlert className="w-4 h-4 text-rose-400" />;
    case 'Important':
      return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    case 'Information':
      return <Info className="w-4 h-4 text-sky-400" />;
    case 'Suggestion':
      return <Lightbulb className="w-4 h-4 text-emerald-400" />;
    case 'Story':
      return <BookOpen className="w-4 h-4 text-purple-400" />;
  }
};

const categoryBadgeClass = (category: NotificationCategory) => {
  switch (category) {
    case 'Critical':
      return 'bg-rose-950/70 border-rose-800 text-rose-300';
    case 'Important':
      return 'bg-amber-950/70 border-amber-800 text-amber-300';
    case 'Information':
      return 'bg-sky-950/70 border-sky-800 text-sky-300';
    case 'Suggestion':
      return 'bg-emerald-950/70 border-emerald-800 text-emerald-300';
    case 'Story':
      return 'bg-purple-950/70 border-purple-800 text-purple-300';
  }
};

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
  const { livingWorld, language, markNotificationRead, markAllNotificationsRead } = useGameStore();
  const isAr = language === 'ar';
  const notifications = livingWorld.notifications ?? [];

  const [filter, setFilter] = useState<'All' | NotificationCategory>('All');

  if (!isOpen) return null;

  const filtered = filter === 'All' ? notifications : notifications.filter((n) => n.category === filter);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col shadow-2xl space-y-4"
        role="dialog"
        aria-modal="true"
        aria-label={isAr ? 'مركز الإشعارات وتحديثات النادي' : 'Club Notification Center'}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-sky-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {isAr ? 'مركز الإشعارات والتنبيهات' : 'Club Notification Center'}
              </h3>
              <p className="text-xs text-slate-400">
                {unreadCount > 0
                  ? isAr
                    ? `لديك ${unreadCount} إشعار غير مقروء`
                    : `${unreadCount} unread notification(s)`
                  : isAr
                  ? 'جميع الإشعارات مقروءة'
                  : 'All notifications caught up'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 hover:text-white transition flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isAr ? 'قراءة الكل' : 'Mark all read'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label={isAr ? 'إغلاق' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 shrink-0">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                filter === tab.id
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {isAr ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[260px]">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-slate-500 space-y-2">
              <Bell className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-xs">
                {isAr ? 'لا توجد إشعارات ضمن هذه الفئة حالياً.' : 'No notifications in this category.'}
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => !item.read && markNotificationRead(item.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                  !item.read
                    ? 'bg-slate-950/80 border-sky-500/50 shadow-md'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {categoryIcon(item.category)}
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${categoryBadgeClass(
                        item.category,
                      )}`}
                    >
                      {item.category}
                    </span>
                    <h4 className="text-xs font-black text-white">{item.title}</h4>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    {!item.read && <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse ml-1" />}
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed pl-6">{item.message}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
