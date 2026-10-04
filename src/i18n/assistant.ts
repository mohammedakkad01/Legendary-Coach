/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function assistantLabel(key: string, isAr: boolean): string {
  const en: Record<string, string> = {
    why: 'Why?',
    preview: 'Preview',
    apply: 'Apply',
    ignore: 'Ignore',
    confidence: 'Confidence',
    assistantTitle: 'Coach Assistant',
    preMatchTitle: 'Pre-match analysis',
    liveTitle: 'Live analyst',
    postMatchTitle: 'Metric summary',
    refGeneric: 'Referee assigned at kickoff (league-average profile shown until then).',
    limitedIntel: 'Limited scouting intel — confidence capped.',
    aiWhyHint: 'Optional AI explanation (deterministic analysis stays authoritative).',
    close: 'Close',
  };
  const ar: Record<string, string> = {
    why: 'لماذا؟',
    preview: 'معاينة',
    apply: 'تطبيق',
    ignore: 'تجاهل',
    confidence: 'الثقة',
    assistantTitle: 'مساعد المدرب',
    preMatchTitle: 'تحليل ما قبل المباراة',
    liveTitle: 'محلل مباشر',
    postMatchTitle: 'ملخص الأرقام',
    refGeneric: 'يُحدد الحكم عند البداية (معلومات متوسطة حتى ذلك الحين).',
    limitedIntel: 'معلومات كشف محدودة — الثقة محدودة.',
    aiWhyHint: 'شرح اختياري بالذكاء الاصطناعي (التحليل الحتمي يبقى المرجع).',
    close: 'إغلاق',
  };
  return (isAr ? ar : en)[key] ?? key;
}
