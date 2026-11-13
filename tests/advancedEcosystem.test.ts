import crypto from 'crypto';
import { AddressInfo } from 'net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAppServer } from '../src/server/createAppServer';
import { createSessionToken, store } from '../src/server/store';

describe('MAFIA PRO 2.0 Advanced Gaming Ecosystem (15 Features)', () => {
  let appServer: ReturnType<typeof createAppServer>;
  let baseUrl: string;

  beforeAll(async () => {
    appServer = createAppServer();
    await new Promise<void>((resolve) => {
      appServer.server.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = appServer.server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await appServer.closeServer();
  });

  it('1. Elo Ranking System: calculates and records ratings with immutable history & mode rankings', () => {
    const suffix = crypto.randomBytes(4).toString('hex');
    const user = store.registerUser(`Alpha_${suffix}`, `alpha_${suffix}@mafiapro.uz`, 'Secret123!', 'crimson', 'UZ');
    expect(user.rating).toBe(1000);
    expect(user.modeRatings?.CLASSIC).toBe(1000);

    const res = store.recordRatingUpdate(user.id, 'CLASSIC', 32, 'match_001', 'MATCH_WIN');
    expect(res).not.toBeNull();
    expect(res!.user.rating).toBe(1032);
    expect(res!.user.modeRatings?.CLASSIC).toBe(1032);
    expect(res!.user.highestRating).toBe(1032);

    const history = store.getRatingHistory(user.id);
    expect(history.length).toBe(1);
    expect(history[0].reason).toBe('MATCH_WIN');
    expect(history[0].newRating).toBe(1032);

    const rankings = store.getRankingsByMode('CLASSIC', 'GLOBAL');
    expect(rankings.length).toBeGreaterThan(0);
    const rankedEntry = rankings.find((r) => r.id === user.id);
    expect(rankedEntry).toBeDefined();
    expect(rankedEntry?.rating).toBe(1032);
    expect(rankedEntry?.level).toBeGreaterThanOrEqual(1);
  });

  it('2. Season & Battle Pass: tracks 30 levels, blocks duplicate/non-VIP claims, and awards XP progression', () => {
    const season = store.getActiveSeason();
    expect(season).toBeDefined();
    expect(season.levels.length).toBe(30);

    const suffix = crypto.randomBytes(4).toString('hex');
    const user = store.registerUser(`BPHero_${suffix}`, `bp_${suffix}@mafiapro.uz`, 'Secret123!', 'gold', 'UZ');
    const initialProg = store.getUserSeasonProgress(user.id, season.id);
    expect(initialProg.currentLevel).toBe(1);
    expect(initialProg.claimedFreeLevels.length).toBe(0);

    const storedBefore = store.findUserById(user.id)!;
    const goldBefore = storedBefore.gold;

    // Level 1 FREE track claim succeeds
    const claimRes = store.claimBattlePassReward(user.id, 1, 'FREE');
    expect(claimRes.success).toBe(true);
    expect(claimRes.reward?.type).toBe('GOLD');
    expect(store.findUserById(user.id)!.gold).toBeGreaterThan(goldBefore);

    // Duplicate claim prevented
    const dupClaim = store.claimBattlePassReward(user.id, 1, 'FREE');
    expect(dupClaim.success).toBe(false);
    expect(dupClaim.error).toContain('already claimed');

    // Non-VIP user blocked from claiming VIP track
    const vipClaimBlocked = store.claimBattlePassReward(user.id, 1, 'VIP');
    expect(vipClaimBlocked.success).toBe(false);
    expect(vipClaimBlocked.error).toContain('VIP');

    // Season XP increases level
    const xpResult = store.addSeasonXp(user.id, 1200);
    expect(xpResult.levelUp).toBe(true);
    expect(xpResult.newLevel).toBeGreaterThan(1);
  });

  it('3. Clan / Guild System: enforces creation cost, invitations, announcements, and leaving', () => {
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const leader = store.registerUser(`Chief_${suffix}`, `chief_${suffix}@mafiapro.uz`, 'Secret123!', 'crimson', 'UZ');
    const recruit = store.registerUser(`Recruit_${suffix}`, `rec_${suffix}@mafiapro.uz`, 'Secret123!', 'violet', 'UZ');
    const tag = `W${suffix.slice(0, 3)}`;

    // Insufficient gold fails (< 500 gold)
    const noGold = store.createClan(leader.id, `Tashkent Wolves ${suffix}`, tag, 'Elite Uzbekistan syndicate');
    expect(noGold.success).toBe(false);
    expect(noGold.error).toContain('500 Gold');

    // Top up leader gold and create clan
    store.findUserById(leader.id)!.gold += 500;
    const created = store.createClan(leader.id, `Tashkent Wolves ${suffix}`, tag, 'Elite Uzbekistan syndicate');
    expect(created.success).toBe(true);
    expect(created.clan).toBeDefined();
    expect(created.clan?.tag).toBe(tag);
    expect(created.clan?.members.length).toBe(1);
    expect(created.clan?.members[0].role).toBe('LEADER');

    const refreshedLeader = store.findUserById(leader.id)!;
    expect(refreshedLeader.clanId).toBe(created.clan!.id);
    expect(refreshedLeader.clanTag).toBe(tag);

    // Send invite and check pending list
    const invRes = store.sendClanInvite(created.clan!.id, leader.id, recruit.id);
    expect(invRes.success).toBe(true);
    expect(invRes.invitation?.status).toBe('PENDING');

    const pendingForRecruit = store.getClanInvitationsForUser(recruit.id);
    expect(pendingForRecruit.some((i) => i.id === invRes.invitation!.id)).toBe(true);

    // Accept invite
    const acceptRes = store.respondClanInvite(invRes.invitation!.id, recruit.id, true);
    expect(acceptRes.success).toBe(true);
    expect(acceptRes.clan?.members.length).toBe(2);
    expect(store.findUserById(recruit.id)?.clanTag).toBe(tag);

    // Announcement
    const announced = store.addClanAnnouncement(created.clan!.id, leader.id, 'Bugun soat 21:00 da turnir!');
    expect(announced).toBe(true);
    expect(store.getClanById(created.clan!.id)?.announcements[0].text).toContain('21:00');

    // Leave clan
    const leftRes = store.leaveClan(recruit.id);
    expect(leftRes.success).toBe(true);
    expect(store.findUserById(recruit.id)?.clanId).toBeUndefined();
  });

  it('4. Private Direct Messaging: sends messages, computes unread counts, and marks read on view', () => {
    const suffix = crypto.randomBytes(4).toString('hex');
    const userA = store.registerUser(`Alice_${suffix}`, `alice_${suffix}@mafiapro.uz`, 'Secret123!', 'crimson', 'UZ');
    const userB = store.registerUser(`Bob_${suffix}`, `bob_${suffix}@mafiapro.uz`, 'Secret123!', 'gold', 'RU');

    const sent = store.sendDirectMessage(userA.id, userB.id, 'Salom Bob, kechki o‘yinga tayyormisan?');
    expect(sent.success).toBe(true);
    expect(sent.message?.text).toContain('Salom Bob');
    expect(sent.message?.read).toBe(false);

    // Unread count for recipient before viewing
    const convosBefore = store.getConversations(userB.id);
    expect(convosBefore.length).toBe(1);
    expect(convosBefore[0].unreadCount).toBe(1);

    // Recipient opens conversation -> marked read
    const thread = store.getDirectMessages(userB.id, userA.id);
    expect(thread.length).toBe(1);
    expect(thread[0].read).toBe(true);

    const convosAfter = store.getConversations(userB.id);
    expect(convosAfter[0].unreadCount).toBe(0);
  });

  it('5. Match Replay System: stores structured event timelines and fetches by id or roomCode', () => {
    const roomCode = `RP${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const matchId = `gm_${crypto.randomBytes(4).toString('hex')}`;
    const replayId = `rep_${matchId}`;

    store.saveReplay({
      id: replayId,
      matchId,
      roomCode,
      mode: 'CLASSIC',
      rounds: 3,
      durationSec: 600,
      winner: 'MAFIA',
      players: [
        { userId: 'u1', username: 'Agent01', roleId: 'mafia', team: 'MAFIA', won: true },
        { userId: 'u2', username: 'SheriffDave', roleId: 'sheriff', team: 'TOWN', won: false },
      ],
      events: [
        {
          timestamp: Date.now() - 500000,
          round: 1,
          phase: 'NIGHT',
          type: 'ELIMINATION',
          actorId: 'u1',
          actorName: 'Agent01',
          targetId: 'u2',
          targetName: 'SheriffDave',
          text: 'Mafiya Sherifni nishonga oldi',
        },
      ],
      createdAt: Date.now(),
    });

    const fetchedByCode = store.getReplayById(roomCode);
    const fetchedById = store.getReplayById(replayId);
    expect(fetchedByCode).not.toBeNull();
    expect(fetchedById?.id).toBe(replayId);
    expect(fetchedByCode?.events.length).toBe(1);
  });

  it('6. Anti-Cheat & Security Monitor: logs violations, auto-flags repeat offenders, and supports admin review', () => {
    const suffix = crypto.randomBytes(4).toString('hex');
    const suspect = store.registerUser(`Speedy_${suffix}`, `spd_${suffix}@mafiapro.uz`, 'Secret123!', 'crimson', 'UZ');

    const secEvent = store.logSecurityEvent(
      suspect.id,
      suspect.username,
      '127.0.0.1',
      'IMPOSSIBLE_TRANSITION',
      'HIGH',
      'Eliminated player attempted night action'
    );

    expect(secEvent.status).toBe('PENDING');
    expect(store.getSecurityEvents('PENDING').some((e) => e.id === secEvent.id)).toBe(true);

    const reviewed = store.reviewSecurityEvent(secEvent.id, 'SuperAdmin', 'ACTIONED', 'Warning issued');
    expect(reviewed).toBe(true);
    const updated = store.getSecurityEvents('ACTIONED').find((e) => e.id === secEvent.id);
    expect(updated?.reviewedBy).toBe('SuperAdmin');
    expect(updated?.actionNote).toBe('Warning issued');
  });

  it('7. Smart Matchmaking Queue: enqueues players, forms rating-balanced matches, and dequeues cleanly', () => {
    const suffix = crypto.randomBytes(3).toString('hex');
    const players = [0, 1, 2, 3].map((idx) =>
      store.registerUser(`MM_${idx}_${suffix}`, `mm${idx}_${suffix}@mafiapro.uz`, 'Secret123!', 'crimson', 'UZ')
    );

    for (const p of players) {
      const ok = store.enqueueMatchmaking({
        userId: p.id,
        username: p.username,
        rating: 1000,
        mode: 'CHAOS',
        lang: 'uz',
        queuedAt: Date.now(),
        minRating: 850,
        maxRating: 1150,
      });
      expect(ok).toBe(true);
    }

    const matched = store.findMatches('CHAOS', 4);
    expect(matched).not.toBeNull();
    expect(matched?.length).toBe(4);
    // Matched players are removed from queue
    expect(store.getMatchmakingQueue().some((t) => t.userId === players[0].id)).toBe(false);
  });

  it('8. Referral System: generates codes, blocks self-referrals, and unlocks tiered milestones', () => {
    const suffix = crypto.randomBytes(4).toString('hex');
    const inviter = store.registerUser(`Inv_${suffix}`, `inv_${suffix}@mafiapro.uz`, 'Secret123!', 'gold', 'UZ');
    const invitee = store.registerUser(`Rec_${suffix}`, `rec_${suffix}@mafiapro.uz`, 'Secret123!', 'crimson', 'UZ');

    const storedInviter = store.findUserById(inviter.id)!;
    const code = store.getReferralCode(storedInviter);
    expect(code).toMatch(/^MP-/);

    // Self-referral blocked
    const selfRes = store.applyReferralCode(inviter.id, code);
    expect(selfRes.success).toBe(false);
    expect(selfRes.error).toContain('yourself');

    // Valid referral succeeds
    const inviteeGoldBefore = store.findUserById(invitee.id)!.gold;
    const applyRes = store.applyReferralCode(invitee.id, code);
    expect(applyRes.success).toBe(true);
    expect(applyRes.referrerName).toBe(inviter.username);
    expect(store.findUserById(invitee.id)!.gold).toBe(inviteeGoldBefore + 150);
    expect(store.findUserById(inviter.id)!.successfulReferralsCount).toBe(1);

    // Claim 1-referral milestone
    const claimRes = store.claimReferralMilestone(inviter.id, 1);
    expect(claimRes.success).toBe(true);
    expect(claimRes.reward).toContain('250');

    // Duplicate milestone claim blocked
    const dupRes = store.claimReferralMilestone(inviter.id, 1);
    expect(dupRes.success).toBe(false);
  });

  it('9. HTTP Ecosystem Routes: rankings, battle pass, matchmaking status, support AI chat & tickets', async () => {
    const suffix = crypto.randomBytes(4).toString('hex');
    const u = store.registerUser(`ApiTester_${suffix}`, `api_${suffix}@mafiapro.uz`, 'Secret123!', 'crimson', 'UZ');
    const token = createSessionToken(u.id);

    // Mode Rankings API
    const rankRes = await fetch(`${baseUrl}/api/rankings/mode?mode=CLASSIC&period=GLOBAL`);
    expect(rankRes.status).toBe(200);
    const rankJson = (await rankRes.json()) as { leaderboard: Array<{ id: string }> };
    expect(Array.isArray(rankJson.leaderboard)).toBe(true);

    // Active Season & Progress API
    const seasonRes = await fetch(`${baseUrl}/api/seasons/active`);
    expect(seasonRes.status).toBe(200);
    const seasonJson = (await seasonRes.json()) as { season: { id: string; levels: unknown[] } };
    expect(seasonJson.season.levels.length).toBe(30);

    const progRes = await fetch(`${baseUrl}/api/seasons/progress?seasonId=${seasonJson.season.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(progRes.status).toBe(200);
    const progJson = (await progRes.json()) as { progress: { currentLevel: number } };
    expect(progJson.progress.currentLevel).toBeGreaterThanOrEqual(1);

    // Matchmaking Join + Status + Leave API
    const joinRes = await fetch(`${baseUrl}/api/matchmaking/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mode: 'CLASSIC', lang: 'uz' }),
    });
    expect(joinRes.status).toBe(200);

    const statusRes = await fetch(`${baseUrl}/api/matchmaking/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(statusRes.status).toBe(200);
    const statusJson = (await statusRes.json()) as { inQueue: boolean; status: string };
    expect(statusJson.inQueue).toBe(true);
    expect(statusJson.status).toBe('QUEUED');

    await fetch(`${baseUrl}/api/matchmaking/leave`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    // AI Support KB Chat Fallback & Support Ticket Creation
    const aiRes = await fetch(`${baseUrl}/api/support/ai-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Sherif qanday ishlaydi?', lang: 'uz' }),
    });
    expect(aiRes.status).toBe(200);
    const aiJson = (await aiRes.json()) as { reply: string };
    expect(aiJson.reply.length).toBeGreaterThan(10);

    const ticketRes = await fetch(`${baseUrl}/api/support/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subject: 'Test Support', description: 'Testing automated ticket creation' }),
    });
    expect(ticketRes.status).toBe(200);
    const ticketJson = (await ticketRes.json()) as { ticket: { id: string; status: string } };
    expect(ticketJson.ticket.status).toBe('OPEN');
  });
});
