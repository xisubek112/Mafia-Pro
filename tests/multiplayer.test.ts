import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as ioc, Socket } from 'socket.io-client';
import { AddressInfo } from 'net';
import { createAppServer } from '../src/server/createAppServer';
import { RoomStateView } from '../src/shared/types';

function waitForState(
  socket: Socket,
  predicate: (s: RoomStateView) => boolean,
  timeoutMs = 5000
): Promise<RoomStateView> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('room:state', handler);
      reject(new Error('Timed out waiting for room:state'));
    }, timeoutMs);

    const handler = (state: RoomStateView) => {
      if (predicate(state)) {
        clearTimeout(timer);
        socket.off('room:state', handler);
        resolve(state);
      }
    };
    socket.on('room:state', handler);
  });
}

function connectClient(url: string, guestId: string, guestName: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const s = ioc(url, {
      auth: { guestId, guestName },
      transports: ['websocket'],
      reconnection: false,
    });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });
}

describe('MAFIA PRO — 5-Client Real-Time Multiplayer Integration', () => {
  let appServer: ReturnType<typeof createAppServer>;
  let baseUrl: string;
  const clients: Socket[] = [];
  const latestStates = new Map<number, RoomStateView>();

  beforeAll(async () => {
    appServer = createAppServer();
    await new Promise<void>((resolve) => {
      appServer.server.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = appServer.server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    for (const c of clients) {
      if (c.connected) c.disconnect();
    }
    await appServer.closeServer();
  });

  it('supports 5 clients: room creation, joining, secret role privacy, night actions, voting, disconnect/reconnect, and victory', async () => {
    // 1. Connect 5 independent clients
    for (let i = 0; i < 5; i++) {
      const c = await connectClient(baseUrl, `gst_player_${i}`, `Agent_${i}`);
      c.on('room:state', (st: RoomStateView) => latestStates.set(i, st));
      clients.push(c);
    }
    expect(clients.length).toBe(5);

    // 2. Host (client 0) creates a room with fast timers for testing
    const createRes = await new Promise<{ ok: boolean; code?: string }>((resolve) => {
      clients[0].emit(
        'room:create',
        {
          name: 'Test Arena',
          settings: {
            mode: 'CLASSIC',
            maxPlayers: 10,
            isPrivate: true,
            allowSpectators: false,
            fillWithBots: false,
            revealRolesOnDeath: true,
            timers: {
              roleAssignment: 2,
              night: 10,
              day: 3,
              discussion: 15,
              voting: 10,
              execution: 3,
            },
          },
        },
        resolve
      );
    });
    expect(createRes.ok).toBe(true);
    expect(createRes.code).toMatch(/^[A-Z0-9]{6}$/);
    const roomCode = createRes.code!;

    // 3. Other 4 clients join using the 6-character code
    for (let i = 1; i < 5; i++) {
      const joinRes = await new Promise<{ ok: boolean }>((resolve) => {
        clients[i].emit('room:join', { code: roomCode }, resolve);
      });
      expect(joinRes.ok).toBe(true);
      clients[i].emit('room:ready', { code: roomCode });
    }

    const lobbyState = await waitForState(clients[0], (s) => s.players.length === 5);
    expect(lobbyState.players.length).toBe(5);

    // 4. Host starts the game
    const rolePromises = clients.map((c) => waitForState(c, (s) => s.phase === 'ROLE_ASSIGNMENT'));
    const startRes = await new Promise<{ ok: boolean }>((resolve) => {
      clients[0].emit('game:start', { code: roomCode }, resolve);
    });
    expect(startRes.ok).toBe(true);

    const roleStates = await Promise.all(rolePromises);

    // Verify consistent state & secret role privacy across all 5 clients
    for (let i = 0; i < 5; i++) {
      const st = roleStates[i];
      expect(st.code).toBe(roomCode);
      expect(st.players.length).toBe(5);
      expect(st.myPrivateData?.roleId).toBeDefined();

      // Town players must NOT see other players' secret roles
      if (st.myPrivateData?.team === 'TOWN') {
        const othersWithVisibleRoles = st.players.filter(
          (p) => p.id !== st.myPrivateData?.playerId && p.revealedRoleId !== undefined
        );
        expect(othersWithVisibleRoles.length).toBe(0);
      }
    }

    // 5. Wait for NIGHT phase (2s roleAssignment timer)
    const nightStates = await Promise.all(
      clients.map((c) => waitForState(c, (s) => s.phase === 'NIGHT'))
    );
    expect(nightStates[0].round).toBe(1);

    // 6. Test Disconnection & Reconnection during NIGHT
    const disconnectedStatePromise = waitForState(
      clients[0],
      (s) => s.players.some((p) => p.id === 'gst_player_4' && !p.isConnected)
    );
    clients[4].disconnect();
    const afterDisconnect = await disconnectedStatePromise;
    expect(afterDisconnect.players.find((p) => p.id === 'gst_player_4')?.isConnected).toBe(false);

    // Reconnect client 4 with same guestId
    const reconnectedClient4 = await connectClient(baseUrl, 'gst_player_4', 'Agent_4');
    reconnectedClient4.on('room:state', (st: RoomStateView) => latestStates.set(4, st));
    clients[4] = reconnectedClient4;

    const restoredState = await waitForState(
      reconnectedClient4,
      (s) => s.code === roomCode && s.players.length === 5
    );
    expect(restoredState.myPrivateData?.roleId).toBe(roleStates[4].myPrivateData?.roleId);
    expect(restoredState.players.filter((p) => p.id === 'gst_player_4').length).toBe(1);

    // 7. Night actions: Mafia kills a Town player
    const mafiaIdx = roleStates.findIndex((s) => s.myPrivateData?.team === 'MAFIA');
    const townIdx = roleStates.findIndex((s) => s.myPrivateData?.team === 'TOWN');
    expect(mafiaIdx).toBeGreaterThanOrEqual(0);
    expect(townIdx).toBeGreaterThanOrEqual(0);

    const townPlayerId = roleStates[townIdx].myPrivateData!.playerId;
    const nightActionRes = await new Promise<{ ok: boolean }>((resolve) => {
      clients[mafiaIdx].emit(
        'game:nightAction',
        { code: roomCode, targetId: townPlayerId },
        resolve
      );
    });
    expect(nightActionRes.ok).toBe(true);

    // Host advances NIGHT -> DAY -> DISCUSSION -> VOTING
    const dayPromise = waitForState(clients[0], (s) => s.phase === 'DAY');
    clients[0].emit('game:skipPhase', { code: roomCode });
    const dayState = await dayPromise;
    expect(dayState.players.find((p) => p.id === townPlayerId)?.isAlive).toBe(false);

    const discPromise = waitForState(clients[0], (s) => s.phase === 'DISCUSSION');
    clients[0].emit('game:skipPhase', { code: roomCode });
    await discPromise;

    const votePromise = waitForState(clients[0], (s) => s.phase === 'VOTING');
    clients[0].emit('game:skipPhase', { code: roomCode });
    const voteState = await votePromise;

    // 8. Alive players vote to eliminate another non-Mafia player to trigger Mafia victory
    const aliveTownTarget = voteState.players.find(
      (p) => p.isAlive && p.id !== roleStates[mafiaIdx].myPrivateData!.playerId
    )!;
    const aliveClientIndices = [0, 1, 2, 3, 4].filter(
      (idx) => voteState.players.find((p) => p.id === `gst_player_${idx}`)?.isAlive
    );

    for (const idx of aliveClientIndices) {
      if (`gst_player_${idx}` !== aliveTownTarget.id) {
        await new Promise<{ ok: boolean }>((resolve) => {
          clients[idx].emit('game:vote', { code: roomCode, targetId: aliveTownTarget.id }, resolve);
        });
      }
    }

    // Host skips VOTING -> EXECUTION
    const execPromise = waitForState(
      clients[0],
      (s) => s.phase === 'EXECUTION' || s.phase === 'VICTORY'
    );
    clients[0].emit('game:skipPhase', { code: roomCode });
    const execState = await execPromise;

    if (execState.phase !== 'VICTORY') {
      // Wait for Night 2 (3s execution timer)
      const night2State = await waitForState(clients[0], (s) => s.phase === 'NIGHT' && s.round === 2, 6000);
      const aliveTownInNight2 = night2State.players.find(
        (p) => p.isAlive && p.id !== roleStates[mafiaIdx].myPrivateData!.playerId
      )!;
      await new Promise<{ ok: boolean }>((resolve) => {
        clients[mafiaIdx].emit(
          'game:nightAction',
          { code: roomCode, targetId: aliveTownInNight2.id },
          resolve
        );
      });
      // Advance Night 2 -> Victory (1 Mafia >= 1 Town)
      const victoryPromises = clients.map((c) => waitForState(c, (s) => s.phase === 'VICTORY', 6000));
      clients[0].emit('game:skipPhase', { code: roomCode });
      const victoryStates = await Promise.all(victoryPromises);
      for (const vs of victoryStates) {
        expect(vs.winnerTeam).toBe('MAFIA');
        expect(vs.players.every((p) => p.revealedRoleId !== undefined)).toBe(true);
      }
    }
  }, 25000);
});
