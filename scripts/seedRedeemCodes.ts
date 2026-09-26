/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * scripts/seedRedeemCodes.ts
 *
 * إدارة وتوليد وتحديث أكواد الهدايا (Redeem Codes) في Cloud Firestore.
 * يعمل عبر GitHub Actions (workflow_dispatch) أو محلياً باستخدام Firebase Admin SDK.
 * 
 * القواعد الصارمة:
 * 1. لا يُعرض FIREBASE_SERVICE_ACCOUNT أو MY_UID في السجلات.
 * 2. كود المطور (type="dev") يفشل فوراً إذا كان MY_UID فارغاً، ويُقفل حصراً على UID المطور.
 * 3. يدعم أكواد اللاعبين (type="player") مع startAt, expiresAt, maxRedemptions, rewards.
 * 4. يدعم العمليات: create, update, disable, seed.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

export interface RedeemCodeInput {
  code: string;
  type: 'dev' | 'player';
  active?: boolean;
  startAt?: string | null;
  expiresAt?: string | null;
  maxRedemptions?: number;
  restrictedToUid?: string;
  rewardCoins: number;
  rewardDiamonds: number;
  rewardTrainingPoints: number;
  labelAr?: string;
  labelEn?: string;
}

export interface ValidatedRedeemCode {
  code: string;
  type: 'dev' | 'player';
  active: boolean;
  startAt: string | null;
  expiresAt: string | null;
  maxRedemptions: number;
  redemptionsCount: number;
  restrictedToUid: string;
  rewardCoins: number;
  rewardDiamonds: number;
  rewardTrainingPoints: number;
  labelAr: string;
  labelEn: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * دالة التحقق البرمجية الصارمة من صحة بيانات الكود
 */
export function validateRedeemCode(
  input: RedeemCodeInput,
  myUid: string,
  isUpdate: boolean = false
): { valid: boolean; error?: string; codeData?: Partial<ValidatedRedeemCode> } {
  const code = (input.code || '').trim().toUpperCase();

  // 1. التحقق من صيغة الكود (بين 8 إلى 16 خانة: أحرف إنجليزية كبيرة وأرقام)
  if (!/^[A-Z0-9]{8,16}$/.test(code)) {
    return {
      valid: false,
      error: `Invalid code format '${code}'. Code must be between 8 and 16 alphanumeric characters [A-Z0-9].`,
    };
  }

  // 2. التحقق من نوع الكود
  if (input.type !== 'dev' && input.type !== 'player') {
    return {
      valid: false,
      error: `Invalid type '${input.type}'. Must be either 'dev' or 'player'.`,
    };
  }

  const cleanMyUid = (myUid || '').trim();

  // 3. الحماية الصارمة لكود المطور (Developer Code Protection)
  let restrictedToUid = '';
  if (input.type === 'dev') {
    if (!cleanMyUid) {
      return {
        valid: false,
        error: 'CRITICAL SECURITY ERROR: MY_UID is missing or empty! Developer Code (type="dev") can NEVER be created or updated without being strictly locked to MY_UID.',
      };
    }
    restrictedToUid = cleanMyUid;
  } else {
    // Player codes are not restricted to a single developer UID
    restrictedToUid = '';
  }

  // 4. التحقق من المكافآت (أرقام صحيحة غير سالبة)
  const rewardCoins = Number(input.rewardCoins);
  const rewardDiamonds = Number(input.rewardDiamonds);
  const rewardTrainingPoints = Number(input.rewardTrainingPoints);

  if (isNaN(rewardCoins) || rewardCoins < 0 || !Number.isInteger(rewardCoins)) {
    return { valid: false, error: 'rewardCoins must be a non-negative integer.' };
  }
  if (isNaN(rewardDiamonds) || rewardDiamonds < 0 || !Number.isInteger(rewardDiamonds)) {
    return { valid: false, error: 'rewardDiamonds must be a non-negative integer.' };
  }
  if (isNaN(rewardTrainingPoints) || rewardTrainingPoints < 0 || !Number.isInteger(rewardTrainingPoints)) {
    return { valid: false, error: 'rewardTrainingPoints must be a non-negative integer.' };
  }

  // 5. التحقق من الحد الأقصى للاستخدامات
  const maxRedemptions = input.type === 'dev' ? 0 : Number(input.maxRedemptions ?? 5000);
  if (isNaN(maxRedemptions) || maxRedemptions < 0 || !Number.isInteger(maxRedemptions)) {
    return { valid: false, error: 'maxRedemptions must be an integer >= 0 (0 = unlimited).' };
  }

  // 6. التحقق من التواريخ (startAt و expiresAt)
  const startAt = input.startAt ? input.startAt.trim() : null;
  const expiresAt = input.expiresAt ? input.expiresAt.trim() : null;

  if (startAt) {
    const startDate = new Date(startAt);
    if (isNaN(startDate.getTime())) {
      return { valid: false, error: `Invalid startAt date format: '${startAt}'. Must be valid ISO 8601 string.` };
    }
  }

  if (expiresAt) {
    const expireDate = new Date(expiresAt);
    if (isNaN(expireDate.getTime())) {
      return { valid: false, error: `Invalid expiresAt date format: '${expiresAt}'. Must be valid ISO 8601 string.` };
    }
  }

  if (startAt && expiresAt) {
    const startDate = new Date(startAt);
    const expireDate = new Date(expiresAt);
    if (expireDate.getTime() <= startDate.getTime()) {
      return {
        valid: false,
        error: `expiresAt (${expiresAt}) must be strictly after startAt (${startAt}).`,
      };
    }
  }

  const nowIso = new Date().toISOString();
  const codeData: Partial<ValidatedRedeemCode> = {
    code,
    type: input.type,
    active: input.active !== undefined ? Boolean(input.active) : true,
    startAt,
    expiresAt,
    maxRedemptions,
    restrictedToUid,
    rewardCoins,
    rewardDiamonds,
    rewardTrainingPoints,
    labelAr: (input.labelAr || (input.type === 'dev' ? 'كود اختبار المطور' : 'كود ترحيبي')).trim(),
    labelEn: (input.labelEn || (input.type === 'dev' ? 'Developer Test Code' : 'Welcome Code')).trim(),
    updatedAt: nowIso,
  };

  if (!isUpdate) {
    codeData.redemptionsCount = 0;
    codeData.createdAt = nowIso;
  }

  return { valid: true, codeData };
}

/**
 * دالة فحص استحقاق اللاعب للكود (منطق الفحص المعتمد في الاختبارات والتطبيق)
 */
export function evaluateRedeemEligibility(
  codeDoc: any,
  userUid: string,
  now: Date = new Date(),
  alreadyRedeemed: boolean = false
): { allowed: boolean; status: string; reward?: { coins: number; diamonds: number; trainingPoints: number } } {
  if (!codeDoc) {
    return { allowed: false, status: 'not_found' };
  }
  if (!codeDoc.active) {
    return { allowed: false, status: 'inactive' };
  }
  if (codeDoc.startAt && new Date(codeDoc.startAt).getTime() > now.getTime()) {
    return { allowed: false, status: 'not_started' };
  }
  if (codeDoc.expiresAt && new Date(codeDoc.expiresAt).getTime() < now.getTime()) {
    return { allowed: false, status: 'expired' };
  }

  // Developer code verification
  if (codeDoc.type === 'dev') {
    if (!codeDoc.restrictedToUid || codeDoc.restrictedToUid !== userUid) {
      return { allowed: false, status: 'not_allowed' };
    }
    // Dev code is unlimited and can be used multiple times by the developer
    return {
      allowed: true,
      status: 'success',
      reward: {
        coins: codeDoc.rewardCoins,
        diamonds: codeDoc.rewardDiamonds,
        trainingPoints: codeDoc.rewardTrainingPoints,
      },
    };
  }

  // Player code verification
  if (alreadyRedeemed) {
    return { allowed: false, status: 'already_redeemed' };
  }
  if (codeDoc.maxRedemptions > 0 && codeDoc.redemptionsCount >= codeDoc.maxRedemptions) {
    return { allowed: false, status: 'exhausted' };
  }

  return {
    allowed: true,
    status: 'success',
    reward: {
      coins: codeDoc.rewardCoins,
      diamonds: codeDoc.rewardDiamonds,
      trainingPoints: codeDoc.rewardTrainingPoints,
    },
  };
}

/**
 * تهيئة اتصال Firebase Admin SDK
 */
function getFirestoreInstance() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    console.error('❌ Error: FIREBASE_SERVICE_ACCOUNT environment variable is required.');
    process.exit(1);
  }

  let serviceAccount: any;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (err) {
    console.error('❌ Error: FIREBASE_SERVICE_ACCOUNT is not valid JSON.');
    process.exit(1);
  }

  if (getApps().length === 0) {
    initializeApp({ credential: cert(serviceAccount) });
  }

  return getFirestore(undefined as any, (firebaseConfig as any).firestoreDatabaseId);
}

/**
 * التنفيذ الرئيسي
 */
async function main() {
  const action = (process.env.ACTION || 'seed').trim().toLowerCase();
  const myUid = (process.env.MY_UID || '').trim();

  // 1. عملية البذر المبدئية (Seed default codes)
  if (action === 'seed') {
    console.log('--- Initializing Redeem Codes Seeding ---');
    if (!myUid) {
      console.error('❌ FATAL ERROR: MY_UID is required to seed Developer Code.');
      console.error('Developer Code can NEVER be seeded without being restricted to your UID!');
      process.exit(1);
    }

    const firestore = getFirestoreInstance();

    // الكود الأول: كود المطور الخاص
    const devValidation = validateRedeemCode(
      {
        code: 'MOHDEVTEST',
        type: 'dev',
        active: true,
        maxRedemptions: 0,
        rewardCoins: 500000000,
        rewardDiamonds: 999999,
        rewardTrainingPoints: 999999,
        labelAr: 'كود اختبار المطور',
        labelEn: 'Developer Test Code',
      },
      myUid
    );

    if (!devValidation.valid || !devValidation.codeData) {
      console.error('❌ Validation failed for dev code:', devValidation.error);
      process.exit(1);
    }

    // الكود الثاني: كود ترحيبي عام للاعبين
    const playerValidation = validateRedeemCode(
      {
        code: 'WELCOME2026',
        type: 'player',
        active: true,
        startAt: '2026-10-01T00:00:00Z',
        expiresAt: '2026-10-31T23:59:59Z',
        maxRedemptions: 5000,
        rewardCoins: 50000,
        rewardDiamonds: 100,
        rewardTrainingPoints: 100,
        labelAr: 'كود ترحيبي',
        labelEn: 'Welcome Code',
      },
      myUid
    );

    if (!playerValidation.valid || !playerValidation.codeData) {
      console.error('❌ Validation failed for player code:', playerValidation.error);
      process.exit(1);
    }

    await firestore.collection('redeem_codes').doc(devValidation.codeData.code!).set(devValidation.codeData, { merge: true });
    console.log('Redeem code seeded successfully.');
    console.log(`Code: ${devValidation.codeData.code}`);
    console.log(`Type: ${devValidation.codeData.type}`);
    console.log('Restricted: Developer Only');

    await firestore.collection('redeem_codes').doc(playerValidation.codeData.code!).set(playerValidation.codeData, { merge: true });
    console.log('Redeem code seeded successfully.');
    console.log(`Code: ${playerValidation.codeData.code}`);
    console.log(`Type: ${playerValidation.codeData.type}`);
    console.log(`Max redemptions: ${playerValidation.codeData.maxRedemptions}`);
    return;
  }

  // 2. عمليات GitHub Actions: create / update / disable
  const rawCode = (process.env.CODE || '').trim().toUpperCase();
  const rawType = (process.env.TYPE || 'player').trim().toLowerCase() as 'dev' | 'player';

  if (!rawCode) {
    console.error('❌ Error: CODE input is required.');
    process.exit(1);
  }

  const firestore = getFirestoreInstance();
  const codeRef = firestore.collection('redeem_codes').doc(rawCode);

  if (action === 'disable') {
    const docSnap = await codeRef.get();
    if (!docSnap.exists) {
      console.error(`❌ Error: Code ${rawCode} does not exist.`);
      process.exit(1);
    }
    await codeRef.update({
      active: false,
      updatedAt: new Date().toISOString(),
    });
    console.log('Redeem code disabled successfully.');
    console.log(`Code: ${rawCode}`);
    console.log('Active: false');
    return;
  }

  const input: RedeemCodeInput = {
    code: rawCode,
    type: rawType,
    active: process.env.ACTIVE !== undefined ? process.env.ACTIVE.toLowerCase() === 'true' : true,
    startAt: process.env.START_AT || null,
    expiresAt: process.env.EXPIRES_AT || null,
    maxRedemptions: process.env.MAX_REDEMPTIONS !== undefined ? Number(process.env.MAX_REDEMPTIONS) : (rawType === 'dev' ? 0 : 5000),
    rewardCoins: Number(process.env.REWARD_COINS ?? (rawType === 'dev' ? 500000000 : 50000)),
    rewardDiamonds: Number(process.env.REWARD_DIAMONDS ?? (rawType === 'dev' ? 999999 : 100)),
    rewardTrainingPoints: Number(process.env.REWARD_TRAINING_POINTS ?? (rawType === 'dev' ? 999999 : 100)),
    labelAr: process.env.LABEL_AR || (rawType === 'dev' ? 'كود اختبار المطور' : 'كود هدية'),
    labelEn: process.env.LABEL_EN || (rawType === 'dev' ? 'Developer Test Code' : 'Gift Code'),
  };

  if (action === 'create') {
    const validation = validateRedeemCode(input, myUid, false);
    if (!validation.valid || !validation.codeData) {
      console.error(`❌ Validation Error: ${validation.error}`);
      process.exit(1);
    }

    const docSnap = await codeRef.get();
    if (docSnap.exists) {
      console.error(`❌ Error: Code ${rawCode} already exists. Use action 'update' to modify existing codes.`);
      process.exit(1);
    }

    await codeRef.set(validation.codeData);
    console.log('Redeem code created successfully.');
    console.log(`Code: ${validation.codeData.code}`);
    console.log(`Type: ${validation.codeData.type}`);
    console.log(`Max redemptions: ${validation.codeData.maxRedemptions}`);
    return;
  }

  if (action === 'update') {
    const docSnap = await codeRef.get();
    if (!docSnap.exists) {
      console.error(`❌ Error: Code ${rawCode} does not exist. Use action 'create' first.`);
      process.exit(1);
    }

    const existingData = docSnap.data() as ValidatedRedeemCode;
    // Don't allow changing code type from player to dev or vice versa
    input.type = existingData.type;

    const validation = validateRedeemCode(input, myUid, true);
    if (!validation.valid || !validation.codeData) {
      console.error(`❌ Validation Error: ${validation.error}`);
      process.exit(1);
    }

    await codeRef.update(validation.codeData);
    console.log('Redeem code updated successfully.');
    console.log(`Code: ${rawCode}`);
    console.log(`Type: ${validation.codeData.type}`);
    console.log(`Max redemptions: ${validation.codeData.maxRedemptions}`);
    return;
  }

  console.error(`❌ Unknown action '${action}'. Allowed actions: 'create', 'update', 'disable', 'seed'.`);
  process.exit(1);
}

// تشغيل السكربت عند استدعائه مباشرة فقط وليس عند استيراده في الاختبارات
const isDirectRun = Boolean(
  process.argv[1] && (process.argv[1].endsWith('seedRedeemCodes.ts') || process.argv[1].endsWith('seedRedeemCodes.js'))
);

if (isDirectRun && process.env.NODE_ENV !== 'test') {
  main().catch((err) => {
    console.error('❌ Execution error:', err?.message || 'Unexpected failure');
    process.exit(1);
  });
}
