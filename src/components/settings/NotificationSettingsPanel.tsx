/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useGameStore } from '../../state/useGameStore';
import type { NotificationCategory } from '../../domain/livingWorld/types';
import {
  filterNotificationsForDisplay,
  isNotificationCategoryMutedForDisplay,
  loadNotificationMutes,
  setNotificationCategoryMuted,
  type NotificationMutePreferences,
} from '../../services/localUiSettings';
import { MuteCategoryToggle } from '../ui/MuteCategoryToggle';
import { Bell, CheckCheck } from 'lucide-react';

const MUTE_CATEGORIES: NotificationCategory[] = [
  'Critical',
  'Important',
  'Information',
  'Suggestion',
  'Story',
];

export const NotificationSettingsPanel: React.FC<{ isAr: boolean }> = ({ isAr }) => {
  const { livingWorld, markAllNotificationsRead } = useGameStore();
  const [mutes, setMutes] = useState<NotificationMutePreferences>(() => loadNotificationMutes());

  const notifications = livingWorld?.notifications ?? [];

  const visible = useMemo(
    () => filterNotificationsForDisplay(notifications, mutes),
    [notifications, mutes],
  );

  const unreadCount = visible.filter((n) => !n.read).length;

  const toggleMute = (category: NotificationCategory) => {
    const nextMuted = !isNotificationCategoryMutedForDisplay(mutes, category);
    setMutes(setNotificationCategoryMuted(category, nextMuted));
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-black text-white">
          {isAr ? 'إعدادات الإشعارات' : 'Notification settings'}
        </h2>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          {isAr
            ? 'تُحفظ تفضيلات الكتم على هذا الجهاز فقط (لا تدخل في ملف الحفظ). الإشعارات الحرجة لا يمكن كتمها.'
            : 'Mute preferences are stored on this device only (not in your save). Critical alerts cannot be muted.'}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Bell className="w-4 h-4 text-sky-400" aria-hidden />
            <span>
              {unreadCount > 0
                ? isAr
                  ? `${unreadCount} غير مقروء`
                  : `${unreadCount} unread`
                : isAr
                  ? 'لا إشعارات غير مقروءة'
                  : 'All caught up'}
            </span>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="touch-target-row px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-2 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" aria-hidden />
              {isAr ? 'تعليم الكل كمقروء' : 'Mark all read'}
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-500">
          {isAr
            ? 'افتح زر الجرس في الشريط العلوي لتصفية الفئات وقراءة الإشعارات واحداً واحداً.'
            : 'Use the bell icon in the header to filter categories and mark individual notifications read.'}
        </p>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-400 mb-2">
          {isAr ? 'كتم حسب الفئة' : 'Mute by category'}
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label={isAr ? 'كتم الفئات' : 'Category mutes'}>
          {MUTE_CATEGORIES.map((cat) => (
            <MuteCategoryToggle
              key={cat}
              isAr={isAr}
              category={cat}
              muted={isNotificationCategoryMutedForDisplay(mutes, cat)}
              locked={cat === 'Critical'}
              onToggle={() => toggleMute(cat)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
