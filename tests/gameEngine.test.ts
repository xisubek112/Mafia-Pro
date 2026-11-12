import { describe, expect, it } from 'vitest';
import {
  assignRolesToPlayers,
  buildRoomViewForPlayer,
  checkWinCondition,
  InternalRoomState,
  resolveNightPhase,
  resolveVotingPhase,
  validateNightAction,
} from '../src/engine/gameEngine';
import { ROLE_LIST } from '../src/shared/roles';
import { PlayerState, RoleId } from '../src/shared/types';

function makePlayer(id: string, roleId?: RoleId): PlayerState {
  return {
    id,
    username: `User_${id}`,
    avatar: 'crimson',
    isBot: false,
    isHost: id === 'p1',
    isReady: true,
    isConnected: true,
    isAlive: true,
    isSpectator: false,
    roleId,
    team: roleId === 'don' || roleId === 'mafia' || roleId === 'silencer' ? 'MAFIA' : roleId === 'jester' || roleId === 'serial_killer' ? 'NEUTRAL' : 'TOWN',
    isSilenced: false,
    isFramed: false,
    isJailed: false,
    isDoused: false,
    isInfected: false,
    isMayorRevealed: false,
    abilityCooldowns: {},
    abilityUses: {},
  };
}

function makeRoom(players: PlayerState[]): InternalRoomState {
  return {
    code: 'TEST99',
    name: 'Test Room',
    settings: {
      mode: 'CLASSIC',
      maxPlayers: 10,
      isPrivate: false,
      allowSpectators: true,
      fillWithBots: false,
      timers: { roleAssignment: 5, night: 30, day: 10, discussion: 30, voting: 25, execution: 5 },
    },
    phase: 'NIGHT',
    round: 1,
    phaseEndsAt: Date.now() + 30000,
    players,
    nightActions: [],
    nightFeedback: {},
    votes: {},
    events: [],
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
  };
}

describe('MAFIA PRO Game Engine', () => {
  it('defines exactly 30 unique roles', () => {
    expect(ROLE_LIST.length).toBe(30);
    const ids = new Set(ROLE_LIST.map((r) => r.id));
    expect(ids.size).toBe(30);
  });

  it('assigns balanced roles for CLASSIC, ADVANCED, and CHAOS modes', () => {
    const base = Array.from({ length: 10 }, (_, i) => makePlayer(`p${i + 1}`));
    for (const mode of ['CLASSIC', 'ADVANCED', 'CHAOS'] as const) {
      const assigned = assignRolesToPlayers(base, mode);
      expect(assigned.every((p) => Boolean(p.roleId && p.team))).toBe(true);
      expect(assigned.some((p) => p.team === 'MAFIA')).toBe(true);
      expect(assigned.some((p) => p.team === 'TOWN')).toBe(true);
    }
  });

  it('resolves Doctor heal blocking Mafia kill', () => {
    const p1 = makePlayer('p1', 'don');
    const p2 = makePlayer('p2', 'doctor');
    const p3 = makePlayer('p3', 'citizen');
    const p4 = makePlayer('p4', 'sheriff');
    const p5 = makePlayer('p5', 'citizen');
    const room = makeRoom([p1, p2, p3, p4, p5]);

    const mafiaAct = validateNightAction(room, 'p1', 'p3');
    const docAct = validateNightAction(room, 'p2', 'p3');
    expect(mafiaAct.valid).toBe(true);
    expect(docAct.valid).toBe(true);

    room.nightActions.push(mafiaAct.action!, docAct.action!);
    const { deaths } = resolveNightPhase(room);
    expect(deaths.length).toBe(0);
    expect(p3.isAlive).toBe(true);
  });

  it('eliminates target when unhealed and detects Town vs Mafia win conditions', () => {
    const p1 = makePlayer('p1', 'don');
    const p2 = makePlayer('p2', 'citizen');
    const p3 = makePlayer('p3', 'sheriff');
    const p4 = makePlayer('p4', 'citizen');
    const room = makeRoom([p1, p2, p3, p4]);

    const mafiaAct = validateNightAction(room, 'p1', 'p2');
    room.nightActions.push(mafiaAct.action!);
    const { deaths } = resolveNightPhase(room);
    expect(deaths.length).toBe(1);
    expect(p2.isAlive).toBe(false);

    // 1 Mafia vs 2 Town -> not ended yet
    expect(checkWinCondition(room).ended).toBe(false);

    // Vote out Don -> Town wins
    room.phase = 'VOTING';
    room.votes = { p3: 'p1', p4: 'p1' };
    const voteRes = resolveVotingPhase(room);
    expect(voteRes.executedPlayerId).toBe('p1');
    const win = checkWinCondition(room);
    expect(win.ended).toBe(true);
    expect(win.winnerTeam).toBe('TOWN');
  });

  it('triggers Jester instant win when voted out during day', () => {
    const p1 = makePlayer('p1', 'don');
    const p2 = makePlayer('p2', 'jester');
    const p3 = makePlayer('p3', 'citizen');
    const room = makeRoom([p1, p2, p3]);
    room.phase = 'VOTING';
    room.votes = { p1: 'p2', p3: 'p2' };

    const voteRes = resolveVotingPhase(room);
    expect(voteRes.jesterWinnerId).toBe('p2');
    const win = checkWinCondition(room, voteRes.jesterWinnerId);
    expect(win.ended).toBe(true);
    expect(win.winnerTeam).toBe('JESTER');
  });

  it('enforces secret role privacy in player views', () => {
    const p1 = makePlayer('p1', 'don');
    const p2 = makePlayer('p2', 'sheriff');
    const p3 = makePlayer('p3', 'mafia');
    const room = makeRoom([p1, p2, p3]);

    const sheriffView = buildRoomViewForPlayer(room, 'p2');
    const p1FromSheriff = sheriffView.players.find((p) => p.id === 'p1');
    expect(p1FromSheriff?.revealedRoleId).toBeUndefined();

    const donView = buildRoomViewForPlayer(room, 'p1');
    const p3FromDon = donView.players.find((p) => p.id === 'p3');
    expect(p3FromDon?.revealedRoleId).toBe('mafia');
  });
});
