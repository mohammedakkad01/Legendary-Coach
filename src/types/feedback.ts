/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Feedback & Notification System Types
 * Unified modal, toast, and confirmation state definitions.
 */

export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: FeedbackType;
  title?: string;
  message: string;
  durationMs?: number;
}

export interface ModalAlertOptions {
  type?: FeedbackType;
  title: string;
  message: string;
  details?: string;
  confirmLabel?: string;
}

export interface ModalConfirmOptions {
  type?: FeedbackType;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}
