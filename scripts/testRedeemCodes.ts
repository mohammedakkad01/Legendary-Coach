/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * scripts/testRedeemCodes.ts
 *
 * اختبارات شاملة لنظام Redeem Codes تغطي جميع الحالات الأمنية والمنطقية:
 * 1. Developer Code + correct UID
 * 2. Developer Code + wrong UID
 * 3. Developer Code بدون MY_UID
 * 4. Player Code صالح
 * 5. Inactive Code (كود معطل)
 * 6. Code قبل startAt
 * 7. Code بعد expiresAt
 * 8. Max redemptions reached (استنفاد الحد الأقصى)
 * 9. Duplicate redemption (منع التكرار للاعبين)
 * 10. Invalid code (أقل أو أكثر من 10 خانات أو رموز غير مسموحة)
 * 11. Invalid rewards (أرقام سالبة أو كسور)
 * 12. Invalid dates (تاريخ البدء بعد تاريخ الانتهاء)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRedeemCode, evaluateRedeemEligibility } from './seedRedeemCodes.js';

const MOCK_MY_UID = 'dev_uid_abc123456';
const MOCK_OTHER_UID = 'player_uid_987654321';

test('1. Developer Code validation + correct UID succeeds', () => {
  const result = validateRedeemCode(
    {
      code: 'MOHDEVTEST',
      type: 'dev',
      rewardCoins: 500_000_000,
      rewardDiamonds: 999_999,
      rewardTrainingPoints: 999_999,
    },
    MOCK_MY_UID
  );

  assert.equal(result.valid, true);
  assert.equal(result.codeData?.code, 'MOHDEVTEST');
  assert.equal(result.codeData?.type, 'dev');
  assert.equal(result.codeData?.restrictedToUid, MOCK_MY_UID);
  assert.equal(result.codeData?.maxRedemptions, 0);

  // Test eligibility with correct UID
  const evalResult = evaluateRedeemEligibility(result.codeData, MOCK_MY_UID);
  assert.equal(evalResult.allowed, true);
  assert.equal(evalResult.status, 'success');
  assert.equal(evalResult.reward?.coins, 500_000_000);
});

test('2. Developer Code redemption with wrong UID fails with not_allowed', () => {
  const devDoc = {
    code: 'MOHDEVTEST',
    type: 'dev',
    active: true,
    restrictedToUid: MOCK_MY_UID,
    maxRedemptions: 0,
    rewardCoins: 500_000_000,
    rewardDiamonds: 999_999,
    rewardTrainingPoints: 999_999,
  };

  const evalResult = evaluateRedeemEligibility(devDoc, MOCK_OTHER_UID);
  assert.equal(evalResult.allowed, false);
  assert.equal(evalResult.status, 'not_allowed');
});

test('3. Developer Code creation without MY_UID fails immediately', () => {
  // Empty string
  const resEmpty = validateRedeemCode(
    {
      code: 'MOHDEVTEST',
      type: 'dev',
      rewardCoins: 500_000_000,
      rewardDiamonds: 999_999,
      rewardTrainingPoints: 999_999,
    },
    ''
  );
  assert.equal(resEmpty.valid, false);
  assert.match(resEmpty.error || '', /MY_UID is missing or empty/);

  // Whitespace only
  const resWhitespace = validateRedeemCode(
    {
      code: 'MOHDEVTEST',
      type: 'dev',
      rewardCoins: 500_000_000,
      rewardDiamonds: 999_999,
      rewardTrainingPoints: 999_999,
    },
    '   '
  );
  assert.equal(resWhitespace.valid, false);
  assert.match(resWhitespace.error || '', /MY_UID is missing or empty/);
});

test('4. Player Code validation & redemption succeeds for any authenticated player', () => {
  const result = validateRedeemCode(
    {
      code: 'WELCOME2026',
      type: 'player',
      maxRedemptions: 5000,
      rewardCoins: 50000,
      rewardDiamonds: 100,
      rewardTrainingPoints: 100,
    },
    MOCK_MY_UID
  );

  assert.equal(result.valid, true);
  assert.equal(result.codeData?.code, 'WELCOME2026');
  assert.equal(result.codeData?.type, 'player');
  assert.equal(result.codeData?.restrictedToUid, ''); // Player codes must not be restricted

  const evalResult = evaluateRedeemEligibility(result.codeData, MOCK_OTHER_UID);
  assert.equal(evalResult.allowed, true);
  assert.equal(evalResult.status, 'success');
  assert.equal(evalResult.reward?.coins, 50000);
});

test('5. Inactive Code returns status inactive', () => {
  const inactiveDoc = {
    code: 'INACTIVE01',
    type: 'player',
    active: false,
    restrictedToUid: '',
    maxRedemptions: 100,
    redemptionsCount: 0,
    rewardCoins: 1000,
    rewardDiamonds: 10,
    rewardTrainingPoints: 10,
  };

  const evalResult = evaluateRedeemEligibility(inactiveDoc, MOCK_OTHER_UID);
  assert.equal(evalResult.allowed, false);
  assert.equal(evalResult.status, 'inactive');
});

test('6. Code before startAt returns status not_started', () => {
  const futureDoc = {
    code: 'FUTURE2099',
    type: 'player',
    active: true,
    startAt: '2099-01-01T00:00:00Z',
    restrictedToUid: '',
    maxRedemptions: 100,
    redemptionsCount: 0,
    rewardCoins: 1000,
    rewardDiamonds: 10,
    rewardTrainingPoints: 10,
  };

  const evalResult = evaluateRedeemEligibility(futureDoc, MOCK_OTHER_UID, new Date('2026-10-01T00:00:00Z'));
  assert.equal(evalResult.allowed, false);
  assert.equal(evalResult.status, 'not_started');
});

test('7. Code after expiresAt returns status expired', () => {
  const expiredDoc = {
    code: 'EXPIRED001',
    type: 'player',
    active: true,
    expiresAt: '2025-01-01T00:00:00Z',
    restrictedToUid: '',
    maxRedemptions: 100,
    redemptionsCount: 0,
    rewardCoins: 1000,
    rewardDiamonds: 10,
    rewardTrainingPoints: 10,
  };

  const evalResult = evaluateRedeemEligibility(expiredDoc, MOCK_OTHER_UID, new Date('2026-10-01T00:00:00Z'));
  assert.equal(evalResult.allowed, false);
  assert.equal(evalResult.status, 'expired');
});

test('8. Max redemptions reached returns status exhausted', () => {
  const exhaustedDoc = {
    code: 'LIMITED001',
    type: 'player',
    active: true,
    restrictedToUid: '',
    maxRedemptions: 100,
    redemptionsCount: 100,
    rewardCoins: 1000,
    rewardDiamonds: 10,
    rewardTrainingPoints: 10,
  };

  const evalResult = evaluateRedeemEligibility(exhaustedDoc, MOCK_OTHER_UID);
  assert.equal(evalResult.allowed, false);
  assert.equal(evalResult.status, 'exhausted');
});

test('9. Duplicate redemption returns status already_redeemed for players', () => {
  const playerDoc = {
    code: 'ONETIME001',
    type: 'player',
    active: true,
    restrictedToUid: '',
    maxRedemptions: 1000,
    redemptionsCount: 10,
    rewardCoins: 5000,
    rewardDiamonds: 50,
    rewardTrainingPoints: 50,
  };

  const evalResult = evaluateRedeemEligibility(playerDoc, MOCK_OTHER_UID, new Date(), true);
  assert.equal(evalResult.allowed, false);
  assert.equal(evalResult.status, 'already_redeemed');
});

test('10. Invalid code formatting is rejected', () => {
  // Too short (< 8 chars)
  const resShort = validateRedeemCode(
    { code: 'SHORT', type: 'player', rewardCoins: 10, rewardDiamonds: 1, rewardTrainingPoints: 1 },
    MOCK_MY_UID
  );
  assert.equal(resShort.valid, false);

  // Too long (> 16 chars)
  const resLong = validateRedeemCode(
    { code: 'THISCODEISTOOLONG123', type: 'player', rewardCoins: 10, rewardDiamonds: 1, rewardTrainingPoints: 1 },
    MOCK_MY_UID
  );
  assert.equal(resLong.valid, false);

  // Special characters
  const resSpecial = validateRedeemCode(
    { code: 'CODE!@#$%^', type: 'player', rewardCoins: 10, rewardDiamonds: 1, rewardTrainingPoints: 1 },
    MOCK_MY_UID
  );
  assert.equal(resSpecial.valid, false);

  // Lowercase is automatically trimmed and uppercased
  const resLower = validateRedeemCode(
    { code: 'welcome001', type: 'player', rewardCoins: 10, rewardDiamonds: 1, rewardTrainingPoints: 1 },
    MOCK_MY_UID
  );
  assert.equal(resLower.valid, true);
  assert.equal(resLower.codeData?.code, 'WELCOME001');
});

test('11. Invalid rewards (negative or float) are rejected', () => {
  // Negative coins
  const resNegCoins = validateRedeemCode(
    { code: 'VALID12345', type: 'player', rewardCoins: -500, rewardDiamonds: 10, rewardTrainingPoints: 10 },
    MOCK_MY_UID
  );
  assert.equal(resNegCoins.valid, false);

  // Negative diamonds
  const resNegDia = validateRedeemCode(
    { code: 'VALID12345', type: 'player', rewardCoins: 500, rewardDiamonds: -10, rewardTrainingPoints: 10 },
    MOCK_MY_UID
  );
  assert.equal(resNegDia.valid, false);

  // Non-integer
  const resFloat = validateRedeemCode(
    { code: 'VALID12345', type: 'player', rewardCoins: 500.5, rewardDiamonds: 10, rewardTrainingPoints: 10 },
    MOCK_MY_UID
  );
  assert.equal(resFloat.valid, false);
});

test('12. Invalid dates (expiresAt before startAt) are rejected', () => {
  const resInvalidDates = validateRedeemCode(
    {
      code: 'DATEERR001',
      type: 'player',
      startAt: '2026-10-31T00:00:00Z',
      expiresAt: '2026-10-01T00:00:00Z', // Expires BEFORE starting!
      rewardCoins: 100,
      rewardDiamonds: 10,
      rewardTrainingPoints: 10,
    },
    MOCK_MY_UID
  );
  assert.equal(resInvalidDates.valid, false);
  assert.match(resInvalidDates.error || '', /expiresAt .* must be strictly after startAt/);
});
