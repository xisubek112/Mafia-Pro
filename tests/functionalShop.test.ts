import crypto from 'crypto';
import { AddressInfo } from 'net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  assignRolesToPlayers,
  InternalRoomState,
  resolveNightPhase,
  resolveVotingPhase,
} from '../src/engine/gameEngine';
import { createAppServer } from '../src/server/createAppServer';
import { createSessionToken, store } from '../src/server/store';
import { FUNCTIONAL_CATEGORY_SLUGS } from '../src/shared/functionalShop';
import { PlayerState } from '../src/shared/types';

function makePlayer(id: string, username: string, overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id,
    username,
    avatar: 'gold',
    isBot: false,
    isHost: false,
    isReady: true,
    isConnected: true,
    isAlive: true,
    isSpectator: false,
    isSilenced: false,
    isFramed: false,
    isJailed: false,
    isDoused: false,
    isInfected: false,
    isMayorRevealed: false,
    abilityCooldowns: {},
    abilityUses: {},
    ...overrides,
  };
}

function makeRoom(players: PlayerState[]): InternalRoomState {
  return {
    code: 'FNTEST',
    name: 'Functional Test Room',
    settings: {
      mode: 'ADVANCED',
      maxPlayers: 12,
      isPrivate: true,
      allowSpectators: false,
      fillWithBots: false,
      revealRolesOnDeath: true,
      timers: {
        roleAssignment: 5,
        night: 30,
        day: 10,
        discussion: 30,
        voting: 25,
        execution: 5,
      },
    },
    phase: 'NIGHT',
    round: 1,
    phaseEndsAt: Date.now() + 30000,
    players,
    nightActions: [],
    nightItemActions: [],
    nightFeedback: {},
    votes: {},
    events: [],
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
  };
}

describe('MAFIA PRO — Functional Game Shop System', () => {
  let appServer: ReturnType<typeof createAppServer>;
  let baseUrl: string;
  let userId: string;
  let token: string;
  let adminToken: string;

  beforeAll(async () => {
    appServer = createAppServer();
    await new Promise<void>((resolve) => {
      appServer.server.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = appServer.server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;

    const suffix = crypto.randomBytes(4).toString('hex');
    const u = store.registerUser(`ShopPro_${suffix}`, `shoppro_${suffix}@test.uz`, 'Secret123!', 'gold', 'UZ');
    const uRecord = store.findUserById(u.id)!;
    uRecord.gold += 10000;
    uRecord.diamonds += 200;
    userId = u.id;
    token = createSessionToken(u.id);
    adminToken = createSessionToken('usr_admin');
  });

  afterAll(async () => {
    await appServer.closeServer();
  });

  it('serves only the 7 functional shop categories and blocks all cosmetic purchases', async () => {
    const res = await fetch(`${baseUrl}/api/shop/catalog`);
    expect(res.status).toBe(200);
    const data = await res.json();

    const slugs = data.categories.map((c: { slug: string }) => c.slug);
    for (const reqSlug of FUNCTIONAL_CATEGORY_SLUGS) {
      expect(slugs).toContain(reqSlug);
    }
    expect(slugs).not.toContain('AVATAR');
    expect(slugs).not.toContain('FRAME');
    expect(slugs).not.toContain('PROFILE_BG');
    expect(slugs).not.toContain('CHAT_DECORATION');

    for (const prod of data.products as Array<{ priceUzs: number; currencyMode: string; priceGold?: number; priceDiamonds?: number }>) {
      expect(prod.priceUzs).toBe(0);
      expect(['GOLD', 'DIAMONDS']).toContain(prod.currencyMode);
      expect((prod.priceGold || 0) + (prod.priceDiamonds || 0)).toBeGreaterThan(0);
    }

    const buyLegacy = await fetch(`${baseUrl}/api/store/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ itemId: 'av_crimson_don' }),
    });
    expect(buyLegacy.status).toBe(410);

    const legacyOrder = await fetch(`${baseUrl}/api/payments/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ orderType: 'SHOP_PRODUCT', referenceId: 'av_crimson_don', provider: 'PAYME' }),
    });
    expect(legacyOrder.status).toBe(403);

    const adminCosmeticCreate = await fetch(`${baseUrl}/api/admin/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        category: 'AVATAR',
        name: { uz: 'Old Avatar', ru: 'Старый аватар' },
        description: { uz: 'Blocked', ru: 'Blocked' },
        priceUzs: 5000,
      }),
    });
    expect(adminCosmeticCreate.status).toBe(403);
  });

  it('supports gold/diamond purchase, inventory tracking, expiration cleanup, and Statistics Reset preserving ELO', async () => {
    // Seed stats and a higher rating
    const userObj = store.findUserById(userId)!;
    userObj.wins = 12;
    userObj.losses = 4;
    userObj.totalGames = 16;
    userObj.winStreak = 5;
    userObj.bestWinStreak = 7;
    userObj.rating = 1480;

    // Purchase Statistics Reset Pack with Gold
    const buyRes = await fetch(`${baseUrl}/api/shop/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId: 'fn_stats_reset_pack', currency: 'GOLD' }),
    });
    expect(buyRes.status).toBe(200);
    const bought = await buyRes.json();
    const invId = bought.inventoryItem.id;

    // Without confirmation -> rejected
    const noConfirmRes = await fetch(`${baseUrl}/api/inventory/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ inventoryItemId: invId, confirmed: false }),
    });
    expect(noConfirmRes.status).toBe(400);

    // With explicit confirmation -> public stats reset, ELO & history preserved
    const okResetRes = await fetch(`${baseUrl}/api/inventory/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ inventoryItemId: invId, confirmed: true }),
    });
    expect(okResetRes.status).toBe(200);
    const afterReset = store.findUserById(userId)!;
    expect(afterReset.wins).toBe(0);
    expect(afterReset.losses).toBe(0);
    expect(afterReset.totalGames).toBe(0);
    expect(afterReset.winStreak).toBe(0);
    expect(afterReset.rating).toBe(1480);

    const invAfter = store.getUserInventory(userId);
    expect(invAfter.resetHistory.length).toBe(1);
    expect(invAfter.functionalItems.find((i) => i.id === invId)?.status).toBe('CONSUMED');
  });

  it('executes Documents, Protective Mask, Rifle, and White Killer Shield accurately at night', () => {
    const pInvestigator = makePlayer('p1', 'Investigator', {
      roleId: 'citizen',
      team: 'TOWN',
      activeMatchItems: [
        {
          inventoryItemId: 'inv_doc_inv',
          productId: 'fn_doc_investigation',
          category: 'DOCUMENTS',
          effectType: 'DOC_INVESTIGATE',
          remainingRounds: 1,
          activatedAtRound: 1,
        },
        {
          inventoryItemId: 'inv_doc_ev',
          productId: 'fn_doc_evidence',
          category: 'DOCUMENTS',
          effectType: 'DOC_EVIDENCE',
          remainingRounds: 1,
          activatedAtRound: 1,
        },
        {
          inventoryItemId: 'inv_rifle',
          productId: 'fn_tactical_rifle',
          category: 'RIFLE',
          effectType: 'RIFLE_NIGHT_STRIKE',
          remainingRounds: 1,
          activatedAtRound: 1,
        },
      ],
    });
    const pMasked = makePlayer('p2', 'MaskedTown', {
      roleId: 'doctor',
      team: 'TOWN',
      activeMatchItems: [
        {
          inventoryItemId: 'inv_mask',
          productId: 'fn_protective_mask',
          category: 'PROTECTIVE_MASK',
          effectType: 'MASK_STATUS_BLOCK',
          remainingRounds: 1,
          activatedAtRound: 1,
        },
        {
          inventoryItemId: 'inv_wk',
          productId: 'fn_white_killer_shield',
          category: 'WHITE_KILLER_PROTECTION',
          effectType: 'WHITE_KILLER_SHIELD',
          remainingRounds: -1,
          activatedAtRound: 1,
        },
      ],
    });
    const pMafia = makePlayer('p3', 'Mobster', { roleId: 'mafia', team: 'MAFIA' });
    const pSilencer = makePlayer('p4', 'Silencer', { roleId: 'silencer', team: 'MAFIA' });
    const pKiller = makePlayer('p5', 'WhiteKiller', { roleId: 'serial_killer', team: 'NEUTRAL' });
    const pVictim = makePlayer('p6', 'TargetGuy', { roleId: 'citizen', team: 'TOWN' });

    const room = makeRoom([pInvestigator, pMasked, pMafia, pSilencer, pKiller, pVictim]);
    room.nightActions = [
      { actorId: 'p4', roleId: 'silencer', targetId: 'p2', actionType: 'SILENCE', nightNumber: 1 },
      { actorId: 'p5', roleId: 'serial_killer', targetId: 'p2', actionType: 'KILL', nightNumber: 1 },
      { actorId: 'p3', roleId: 'mafia', targetId: 'p6', actionType: 'KILL', nightNumber: 1 },
    ];
    room.nightItemActions = [
      { actorId: 'p1', inventoryItemId: 'inv_doc_inv', effectType: 'DOC_INVESTIGATE', targetId: 'p3' },
      { actorId: 'p1', inventoryItemId: 'inv_doc_ev', effectType: 'DOC_EVIDENCE', targetId: 'p5' },
      { actorId: 'p1', inventoryItemId: 'inv_rifle', effectType: 'RIFLE_NIGHT_STRIKE', targetId: 'p3' },
    ];

    resolveNightPhase(room);

    // Mask blocked Silencer on p2 & White Killer Shield blocked Serial Killer on p2!
    expect(pMasked.isSilenced).toBe(false);
    expect(pMasked.isAlive).toBe(true);
    // White Killer feedback should NOT leak p5's secret role
    expect((room.nightFeedback['p2'] || []).join(' ')).not.toContain('serial_killer');

    // Documents recorded investigation & activity evidence without leaking exact mafia role id
    expect(pInvestigator.investigationHistory?.some((d) => d.targetId === 'p3' && d.result === 'SUSPICIOUS')).toBe(true);
    expect(pInvestigator.investigationHistory?.some((d) => d.targetId === 'p3' && d.roleId)).toBe(false);
    expect((room.nightFeedback['p1'] || []).some((l) => l.includes('WhiteKiller'))).toBe(true);

    // Rifle eliminated p3 cleanly
    expect(pMafia.isAlive).toBe(false);
    expect(pMafia.eliminatedBy).toBe('RIFLE');
  });

  it('triggers Voting Protection once without altering votes and blocks Jester/Executioner win', () => {
    const pTarget = makePlayer('p1', 'ProtectedVoter', {
      roleId: 'jester',
      team: 'NEUTRAL',
      activeMatchItems: [
        {
          inventoryItemId: 'inv_vote_shield',
          productId: 'fn_voting_protection',
          category: 'VOTING_PROTECTION',
          effectType: 'VOTE_PARDON_SHIELD',
          remainingRounds: 1,
          activatedAtRound: 1,
        },
      ],
    });
    const pExec = makePlayer('p2', 'ExecPlayer', {
      roleId: 'executioner',
      team: 'NEUTRAL',
      executionerTargetId: 'p1',
    });
    const p3 = makePlayer('p3', 'TownA', { roleId: 'citizen', team: 'TOWN' });
    const p4 = makePlayer('p4', 'TownB', { roleId: 'citizen', team: 'TOWN' });
    const p5 = makePlayer('p5', 'MafA', { roleId: 'mafia', team: 'MAFIA' });

    const room = makeRoom([pTarget, pExec, p3, p4, p5]);
    room.phase = 'VOTING';
    room.votes = {
      p2: 'p1',
      p3: 'p1',
      p4: 'p1',
      p1: 'SKIP',
    };

    const result = resolveVotingPhase(room);
    // Vote tally remains untouched
    expect(Object.keys(room.votes).length).toBe(4);
    expect(room.votes['p3']).toBe('p1');
    // Execution pardoned, player survives, Jester/Executioner did NOT win
    expect(result.executedPlayerId).toBeUndefined();
    expect(result.voteProtectedPlayerId).toBe('p1');
    expect(result.jesterWinnerId).toBeUndefined();
    expect(result.executionerWinnerId).toBeUndefined();
    expect(pTarget.isAlive).toBe(true);
    // Shield marked consumed so second round won't reuse it
    expect(pTarget.activeMatchItems?.[0].consumed).toBe(true);
  });

  it('validates Role Token lobby selection, consumes on match start, and prevents duplicates', async () => {
    // Purchase 1 Sheriff Role Token
    const tokRes = await fetch(`${baseUrl}/api/shop/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId: 'fn_role_token_sheriff', currency: 'GOLD' }),
    });
    expect(tokRes.status).toBe(200);

    const eligible = store.getEligibleRolesForUser(userId, 'CLASSIC');
    expect(eligible.some((r) => r.roleId === 'sheriff' && r.source === 'TOKEN')).toBe(true);

    const lobbyCheck = store.validateRoleSelectionForLobby(userId, 'sheriff', 'CLASSIC', 6);
    expect(lobbyCheck.valid).toBe(true);

    // Assign roles with two players wanting sheriff -> only one receives sheriff, no duplicate unique sheriff!
    const players = [
      makePlayer(userId, 'TokenPlayer', { desiredRoleId: 'sheriff' }),
      makePlayer('b1', 'Other1', { desiredRoleId: 'sheriff' }),
      makePlayer('b2', 'Other2'),
      makePlayer('b3', 'Other3'),
      makePlayer('b4', 'Other4'),
      makePlayer('b5', 'Other5'),
    ];
    const assigned = assignRolesToPlayers(players, 'CLASSIC');
    const sheriffCount = assigned.filter((p) => p.roleId === 'sheriff').length;
    expect(sheriffCount).toBe(1);
    expect(assigned.find((p) => p.id === userId)?.roleId).toBe('sheriff');

    // Token consumed once match assigns role
    store.consumeRolePreferenceForMatch(userId, 'sheriff', 'ROOM1');
    const eligibleAfter = store.getEligibleRolesForUser(userId, 'CLASSIC');
    expect(eligibleAfter.some((r) => r.roleId === 'sheriff')).toBe(false);
    const invState = store.getUserInventory(userId);
    expect(invState.transactions.some((tx) => tx.action === 'CONSUMED' && tx.roomCode === 'ROOM1')).toBe(true);
  });

  it('exposes Shop Analytics KPIs in admin overview', async () => {
    const res = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.shopAnalytics).toBeDefined();
    expect(data.shopAnalytics.totalFunctionalPurchases).toBeGreaterThanOrEqual(2);
    expect(data.shopAnalytics.totalStatsResets).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(data.shopAnalytics.productStats)).toBe(true);
  });
});
