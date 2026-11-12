import crypto from 'crypto';
import { AddressInfo } from 'net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, TITLES } from '../src/shared/achievements';
import {
  calculateGoldReward,
  calculateRatingDelta,
  calculateXpReward,
  COSMETICS,
  DAILY_REWARD_CALENDAR,
  generateTournamentBracket,
  getCompetitiveRankName,
} from '../src/shared/ecosystem';
import { createAppServer } from '../src/server/createAppServer';
import { createSessionToken, store } from '../src/server/store';

describe('MAFIA PRO ELITE — Competitive Ecosystem & Security', () => {
  let appServer: ReturnType<typeof createAppServer>;
  let baseUrl: string;
  let testUserId: string;
  let testUser2Id: string;
  let testToken: string;

  beforeAll(async () => {
    appServer = createAppServer();
    await new Promise<void>((resolve) => {
      appServer.server.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = appServer.server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;

    const suffix = crypto.randomBytes(4).toString('hex');
    const u1 = store.registerUser(`EcoTester_${suffix}`, `eco1_${suffix}@mafiapro.uz`, 'Secret123!', 'crimson', 'UZ');
    const u2 = store.registerUser(`EcoRival_${suffix}`, `eco2_${suffix}@mafiapro.uz`, 'Secret123!', 'gold', 'RU');
    testUserId = u1.id;
    testUser2Id = u2.id;
    testToken = createSessionToken(u1.id);
  });

  afterAll(async () => {
    await appServer.closeServer();
  });

  it('includes at least 40 achievements, 15 titles, 7-day rewards, and 7 cosmetic categories', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(40);
    expect(TITLES.length).toBeGreaterThanOrEqual(15);
    expect(DAILY_REWARD_CALENDAR.length).toBe(7);

    const categories = new Set(COSMETICS.map((c) => c.category));
    expect(categories.size).toBe(7);
    expect(categories.has('AVATAR')).toBe(true);
    expect(categories.has('FRAME')).toBe(true);
    expect(categories.has('CARD_SKIN')).toBe(true);
    expect(categories.has('NAME_EFFECT')).toBe(true);
    expect(categories.has('BADGE')).toBe(true);
    expect(categories.has('VICTORY_ANIM')).toBe(true);
    expect(categories.has('LOBBY_THEME')).toBe(true);
  });

  it('calculates XP, Gold, MMR rating deltas, and competitive ranks accurately', () => {
    expect(calculateXpReward(true, true, 'CHAOS')).toBe(230);
    expect(calculateXpReward(false, false, 'CLASSIC')).toBe(45);
    expect(calculateGoldReward(true, true, 'ADVANCED')).toBe(90);
    expect(calculateGoldReward(false, false, 'CLASSIC')).toBe(20);

    expect(calculateRatingDelta(true, 1000, 10)).toBe(34);
    expect(calculateRatingDelta(false, 1000, 8)).toBe(-12);
    expect(getCompetitiveRankName(2050, 'uz')).toBe('Afsona');
    expect(getCompetitiveRankName(1450, 'ru')).toBe('Алмаз');
  });

  it('records game results once, updates stats/XP/MMR, unlocks achievements, and prevents duplicates', () => {
    const before = store.findUserById(testUserId)!;
    const initialXp = before.xp;
    const initialGold = before.gold;
    const matchId = `match_${crypto.randomBytes(4).toString('hex')}`;

    const record = {
      id: matchId,
      roomCode: 'TST001',
      mode: 'CLASSIC' as const,
      winner: 'TOWN',
      rounds: 3,
      durationSec: 180,
      playerCount: 6,
      endedAt: Date.now(),
      players: [
        {
          userId: testUserId,
          username: before.username,
          roleId: 'sheriff' as const,
          team: 'TOWN' as const,
          survived: true,
          won: true,
        },
        {
          userId: testUser2Id,
          username: 'Rival',
          roleId: 'mafia' as const,
          team: 'MAFIA' as const,
          survived: false,
          won: false,
        },
      ],
    };

    store.recordGameResult(record);
    const afterFirst = store.findUserById(testUserId)!;
    expect(afterFirst.totalGames).toBe(1);
    expect(afterFirst.wins).toBe(1);
    expect(afterFirst.xp).toBeGreaterThan(initialXp);
    expect(afterFirst.gold).toBeGreaterThan(initialGold);
    expect(afterFirst.achievements).toContain('first_blood');
    expect(afterFirst.achievements).toContain('first_win');
    expect(afterFirst.achievements).toContain('master_detective');

    // Attempt duplicate recording of the exact same match ID
    const xpAfterFirst = afterFirst.xp;
    const goldAfterFirst = afterFirst.gold;
    store.recordGameResult(record);
    const afterDuplicate = store.findUserById(testUserId)!;
    expect(afterDuplicate.totalGames).toBe(1);
    expect(afterDuplicate.xp).toBe(xpAfterFirst);
    expect(afterDuplicate.gold).toBe(goldAfterFirst);
  });

  it('enforces daily reward streak progression and blocks same-day duplicate claims', () => {
    const baseTime = Date.UTC(2026, 5, 1, 12, 0, 0);
    const day1 = store.claimDailyReward(testUserId, baseTime);
    expect(day1.reward.day).toBe(1);
    expect(day1.user.dailyReward.streak).toBe(1);

    // Same UTC day claim must fail
    expect(() => store.claimDailyReward(testUserId, baseTime + 3600000)).toThrow(
      'Daily reward already claimed today'
    );

    // Next UTC day advances streak to Day 2
    const day2 = store.claimDailyReward(testUserId, baseTime + 86400000);
    expect(day2.reward.day).toBe(2);
    expect(day2.user.dailyReward.streak).toBe(2);
  });

  it('enforces cosmetic purchase validation, ownership, and ELITE restrictions', () => {
    // Non-ELITE user cannot buy premiumOnly item
    expect(() => store.purchaseCosmetic(testUserId, 'av_obsidian_king')).toThrow(
      'Active ELITE membership required'
    );

    // Normal item purchase succeeds and auto-equips
    const updated = store.purchaseCosmetic(testUserId, 'av_crimson_don');
    expect(updated.ownedCosmetics).toContain('av_crimson_don');
    expect(updated.equippedCosmetics.AVATAR).toBe('av_crimson_don');

    // Duplicate purchase fails
    expect(() => store.purchaseCosmetic(testUserId, 'av_crimson_don')).toThrow('Item already owned');

    // Toggle equip off and on
    const unequipped = store.equipCosmetic(testUserId, 'av_crimson_don');
    expect(unequipped.equippedCosmetics.AVATAR).toBeUndefined();
    const reequipped = store.equipCosmetic(testUserId, 'av_crimson_don');
    expect(reequipped.equippedCosmetics.AVATAR).toBe('av_crimson_don');
  });

  it('never fakes paid subscription activation without server-side PAYMENT_PROVIDER_SECRET HMAC', async () => {
    const prevSecret = process.env.PAYMENT_PROVIDER_SECRET;
    delete process.env.PAYMENT_PROVIDER_SECRET;

    const unconfiguredRes = await fetch(`${baseUrl}/api/subscription/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({ provider: 'stripe', verificationToken: 'fake_token' }),
    });
    expect(unconfiguredRes.status).toBe(501);

    // With configured secret: invalid token fails, valid HMAC succeeds
    process.env.PAYMENT_PROVIDER_SECRET = 'test_webhook_secret_123';
    expect(() => store.verifyExternalSubscription(testUserId, 'stripe', 'invalid_sig')).toThrow(
      'Payment verification failed'
    );

    const validSig = crypto
      .createHmac('sha256', 'test_webhook_secret_123')
      .update(`${testUserId}:stripe`)
      .digest('hex');
    const activated = store.verifyExternalSubscription(testUserId, 'stripe', validSig);
    expect(activated.subscription.tier).toBe('ELITE');
    expect(activated.subscription.status).toBe('ACTIVE');
    expect(activated.subscription.verified).toBe(true);

    const cancelled = store.cancelSubscription(testUserId);
    expect(cancelled.subscription.status).toBe('CANCELLED');

    if (prevSecret !== undefined) process.env.PAYMENT_PROVIDER_SECRET = prevSecret;
    else delete process.env.PAYMENT_PROVIDER_SECRET;
  });

  it('supports tournament bracket generation, registration, match progression, and prize payout', () => {
    expect(generateTournamentBracket(['a', 'b', 'c', 'd'], 'SINGLE_ELIMINATION').length).toBe(3);
    expect(generateTournamentBracket(['a', 'b', 'c', 'd'], 'DOUBLE_ELIMINATION').length).toBe(3);
    expect(generateTournamentBracket(['a', 'b', 'c', 'd'], 'ROUND_ROBIN').length).toBe(6);

    const trn = store.createTournament(testUserId, {
      name: 'Test Cup',
      format: 'SINGLE_ELIMINATION',
      mode: 'CLASSIC',
      maxPlayers: 4,
      prizeGold: 500,
      prizeDiamonds: 10,
      entryFeeGold: 0,
    });
    expect(trn.status).toBe('REGISTRATION');

    store.joinTournament(testUser2Id, trn.id);
    const started = store.startTournament(testUserId, trn.id);
    expect(started.status).toBe('IN_PROGRESS');
    expect(started.matches.length).toBe(1);

    const beforeGold = store.findUserById(testUserId)!.gold;
    const completed = store.reportTournamentMatchResult(
      testUserId,
      trn.id,
      started.matches[0].id,
      testUserId
    );
    expect(completed.status).toBe('COMPLETED');
    expect(completed.winnerId).toBe(testUserId);
    expect(completed.podiumIds).toContain(testUserId);

    const champAchGold = ACHIEVEMENTS.find((a) => a.id === 'tournament_champion')!.goldReward;
    const afterUser = store.findUserById(testUserId)!;
    expect(afterUser.gold).toBe(beforeGold + 500 + champAchGold);
    expect(afterUser.tournamentPoints).toBeGreaterThanOrEqual(100);
    expect(afterUser.achievements).toContain('tournament_champion');
  });

  it('enforces leaderboard filtering and admin-only endpoint authorization', async () => {
    const lbRes = await fetch(`${baseUrl}/api/leaderboard?period=global&country=UZ`);
    expect(lbRes.status).toBe(200);
    const lbData = (await lbRes.json()) as { leaderboard: Array<{ country: string }> };
    expect(lbData.leaderboard.length).toBeGreaterThan(0);
    expect(lbData.leaderboard.every((u) => u.country === 'UZ')).toBe(true);

    const nonAdminRes = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${testToken}` },
    });
    expect(nonAdminRes.status).toBe(403);
  });
});
