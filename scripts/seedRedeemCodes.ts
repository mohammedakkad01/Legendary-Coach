/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * scripts/seedRedeemCodes.ts
 *
 * ينشئ/يحدّث أكواد الهدايا في Firestore (المجموعة redeem_codes).
 * لا يعمل هذا من داخل التطبيق أبداً — التطبيق يقرأ الكود فقط بمعرفته المسبقة
 * (getDoc)، ولا يمكنه سرد الأكواد (rules: allow list: if false)، لذلك أي كود
 * لا تُشاركه هنا يبقى سرّياً حتى لو تم فك تحزيم الـ APK بالكامل.
 *
 * نوعان:
 *  1) DEV_CODE — لك فقط (restrictedToUid = UID حسابك في Google)، بلا حد أقصى
 *     لعدد الاستخدامات، جواهر وكوينز كثيرة جداً لتجربة اللعبة وفحصها.
 *  2) PLAYER_CODES — أكواد عامة للاعبين، بحد أقصى لعدد الاستخدامات وجوائز معقولة.
 *
 * التشغيل:
 *   FIREBASE_SERVICE_ACCOUNT='<json>' MY_UID='<uid حسابك>' npx tsx scripts/seedRedeemCodes.ts
 *
 * احصل على MY_UID من: Firebase Console → Authentication → Users (عمود User UID)
 * بعد تسجيل دخولك مرة واحدة بحساب Google داخل اللعبة.
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT;
const MY_UID = (process.env.MY_UID || '').trim();

if (!SERVICE_ACCOUNT_JSON) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT env var is required (service account JSON string).');
  process.exit(1);
}

const serviceAccount = JSON.parse(SERVICE_ACCOUNT_JSON);
initializeApp({ credential: cert(serviceAccount) });
const firestore = getFirestore(undefined as any, (firebaseConfig as any).firestoreDatabaseId);

interface SeedCode {
  code: string;                 // EXACTLY 10 chars, [A-Z0-9]
  type: 'dev' | 'player';
  maxRedemptions: number;       // 0 = unlimited
  restrictedToUid: string;      // '' = anyone with the code
  rewardCoins: number;
  rewardDiamonds: number;
  rewardTrainingPoints: number;
  labelAr: string;
  labelEn: string;
}

const CODES: SeedCode[] = [
  // 1) Your personal testing code — huge rewards, unlimited uses, locked to your UID only.
  //    Change the `code` value to whatever you like before running (10 chars).
  {
    code: 'MOHDEVTEST',
    type: 'dev',
    maxRedemptions: 0,
    restrictedToUid: MY_UID, // empty string = NOT locked (only safe if MY_UID is set!)
    rewardCoins: 500_000_000,
    rewardDiamonds: 999_999,
    rewardTrainingPoints: 999_999,
    labelAr: 'كود اختبار المطور',
    labelEn: 'Developer Test Code',
  },

  // 2) Example public player codes — edit rewards/limits/codes as you like,
  //    then run this script again any time you want to publish a new one.
  {
    code: 'WELCOME2026',
    type: 'player',
    maxRedemptions: 5000,
    restrictedToUid: '',
    rewardCoins: 50_000,
    rewardDiamonds: 100,
    rewardTrainingPoints: 100,
    labelAr: 'كود ترحيبي',
    labelEn: 'Welcome Code',
  },
];

async function main() {
  if (!MY_UID) {
    console.warn('⚠️  MY_UID غير محدد — سيتم رفع كود المطور بدون قفل uid (أي شخص يعرف الكود يستطيع استخدامه). أوقف التشغيل وحدد MY_UID إن أردت قفله عليك فقط.');
  }

  for (const c of CODES) {
    if (c.code.length !== 10) {
      console.error(`❌ Skipping ${c.code}: code must be exactly 10 characters.`);
      continue;
    }
    await firestore.collection('redeem_codes').doc(c.code).set({
      code: c.code,
      type: c.type,
      active: true,
      maxRedemptions: c.maxRedemptions,
      redemptionsCount: 0,
      restrictedToUid: c.restrictedToUid,
      rewardCoins: c.rewardCoins,
      rewardDiamonds: c.rewardDiamonds,
      rewardTrainingPoints: c.rewardTrainingPoints,
      labelAr: c.labelAr,
      labelEn: c.labelEn,
      createdAt: new Date().toISOString(),
    }, { merge: true });
    console.log(`✅ Seeded code: ${c.code} (${c.type})`);
  }

  console.log('\nDone. Codes are only reachable by exact match (no listing) — share each code only with its intended audience.');
}

main().catch((err) => {
  console.error('❌ Failed to seed redeem codes:', err);
  process.exit(1);
});
