import { generateRoleDistribution, ROLES } from '../shared/roles';
import {
  ActiveMatchItemState,
  FunctionalEffectType,
  GameEvent,
  GameMode,
  GamePhase,
  Language,
  NightAction,
  PlayerState,
  PublicPlayerView,
  RoleId,
  RoomSettings,
  RoomStateView,
  Team,
} from '../shared/types';

export interface NightItemAction {
  actorId: string;
  inventoryItemId: string;
  effectType: FunctionalEffectType;
  targetId?: string;
}

export interface InternalRoomState {
  code: string;
  name: string;
  settings: RoomSettings;
  phase: GamePhase;
  round: number;
  phaseEndsAt: number;
  players: PlayerState[];
  nightActions: NightAction[];
  nightItemActions?: NightItemAction[];
  nightFeedback: Record<string, string[]>; // playerId -> private feedback lines
  votes: Record<string, string>; // voterId -> targetId | 'SKIP'
  events: GameEvent[];
  winnerTeam?: RoomStateView['winnerTeam'];
  winnerIds?: string[];
  createdAt: number;
  startedAt?: number;
  lastActivityAt: number;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function createEvent(
  round: number,
  phase: GamePhase,
  uz: string,
  ru: string,
  visibility: GameEvent['visibility'] = 'PUBLIC',
  targetPlayerId?: string
): GameEvent {
  return {
    id: uid(),
    round,
    phase,
    text: { uz, ru },
    timestamp: Date.now(),
    visibility,
    targetPlayerId,
  };
}

export function assignRolesToPlayers(players: PlayerState[], mode: GameMode): PlayerState[] {
  const activePlayers = players.filter((p) => !p.isSpectator);
  const roles = generateRoleDistribution(activePlayers.length, mode);
  const pool = [...roles].sort(() => Math.random() - 0.5);

  const updated = players.map((p) => ({ ...p }));
  const assignedRolesByPlayer = new Map<string, RoleId>();

  // Phase 1: Honor validated pre-match desiredRoleId preferences without duplicate unique roles
  const multiCopyRoles = new Set<RoleId>(['citizen', 'mafia']);
  for (const p of updated) {
    if (p.isSpectator || !p.desiredRoleId) continue;
    const reqRole = p.desiredRoleId;
    const roleDef = ROLES[reqRole];
    if (!roleDef || !roleDef.modes.includes(mode) || activePlayers.length < roleDef.minPlayers) {
      continue;
    }
    const alreadyClaimedUnique =
      !multiCopyRoles.has(reqRole) && Array.from(assignedRolesByPlayer.values()).includes(reqRole);
    if (alreadyClaimedUnique) continue;

    const exactIdx = pool.indexOf(reqRole);
    if (exactIdx !== -1) {
      pool.splice(exactIdx, 1);
      assignedRolesByPlayer.set(p.id, reqRole);
    } else {
      // Swap out a filler slot of the same team (citizen/mafia/survivor) or last filler to honor eligible unlock/token
      let swapIdx = pool.findIndex((r) => ROLES[r].team === roleDef.team && (r === 'citizen' || r === 'mafia' || r === 'survivor'));
      if (swapIdx === -1) swapIdx = pool.findIndex((r) => ROLES[r].team === roleDef.team);
      if (swapIdx === -1 && pool.length > 0) swapIdx = pool.length - 1;
      if (swapIdx !== -1) {
        pool.splice(swapIdx, 1);
        assignedRolesByPlayer.set(p.id, reqRole);
      }
    }
  }

  // Phase 2: Assign remaining roles randomly
  let poolIdx = 0;
  for (const p of updated) {
    if (p.isSpectator) continue;
    const roleId = assignedRolesByPlayer.get(p.id) || pool[poolIdx++];
    const roleDef = ROLES[roleId];
    p.roleId = roleId;
    p.team = roleDef.team;
    p.isAlive = true;
    p.isSilenced = false;
    p.isFramed = false;
    p.isJailed = false;
    p.isDoused = false;
    p.isInfected = roleId === 'plaguebearer';
    p.isMayorRevealed = false;
    p.abilityCooldowns = {};
    p.abilityUses = {};
    p.lastProtectedTargetId = undefined;
    p.deathReason = undefined;
    p.eliminatedOnRound = undefined;
    p.eliminatedBy = undefined;
    p.cleanedRole = false;
    p.executionerTargetId = undefined;
    p.gaTargetId = undefined;
    p.investigationHistory = [];
    p.activeMatchItems = [];
    p.usedItemCountsInMatch = {};
  }

  // Assign Executioner & Guardian Angel targets
  const aliveNonMafiaTown = updated.filter((p) => !p.isSpectator && p.team === 'TOWN');
  const allActive = updated.filter((p) => !p.isSpectator);

  for (const p of updated) {
    if (p.roleId === 'executioner') {
      const pool = aliveNonMafiaTown.filter((t) => t.id !== p.id);
      if (pool.length > 0) {
        p.executionerTargetId = pool[Math.floor(Math.random() * pool.length)].id;
      } else {
        p.roleId = 'survivor';
        p.team = 'NEUTRAL';
      }
    }
    if (p.roleId === 'guardian_angel') {
      const pool = allActive.filter((t) => t.id !== p.id);
      if (pool.length > 0) {
        p.gaTargetId = pool[Math.floor(Math.random() * pool.length)].id;
      }
    }
  }

  return updated;
}

export function validateNightAction(
  room: InternalRoomState,
  actorId: string,
  targetId?: string,
  secondaryTargetId?: string
): { valid: boolean; error?: string; action?: NightAction } {
  if (room.phase !== 'NIGHT') {
    return { valid: false, error: 'Actions are only allowed during NIGHT phase.' };
  }
  const actor = room.players.find((p) => p.id === actorId);
  if (!actor || !actor.isAlive || actor.isSpectator || !actor.roleId) {
    return { valid: false, error: 'Player cannot perform night actions.' };
  }
  const role = ROLES[actor.roleId];
  if (role.actionPhase !== 'NIGHT' && role.actionPhase !== 'BOTH') {
    return { valid: false, error: 'Your role has no night action.' };
  }

  const cd = actor.abilityCooldowns[actor.roleId] ?? 0;
  if (cd > 0) {
    return { valid: false, error: `Ability on cooldown (${cd} night(s) left).` };
  }
  const used = actor.abilityUses[actor.roleId] ?? 0;
  if (role.maxUses > 0 && used >= role.maxUses) {
    return { valid: false, error: 'No ability uses remaining.' };
  }

  if (role.targetType === 'OTHER_ALIVE') {
    const target = room.players.find((p) => p.id === targetId && p.isAlive && !p.isSpectator);
    if (!target || target.id === actor.id) {
      return { valid: false, error: 'Must select another alive player.' };
    }
  } else if (role.targetType === 'ANY_ALIVE') {
    const target = room.players.find((p) => p.id === targetId && p.isAlive && !p.isSpectator);
    if (!target) {
      return { valid: false, error: 'Must select an alive player.' };
    }
    if (actor.roleId === 'doctor' && actor.lastProtectedTargetId === target.id) {
      return { valid: false, error: 'Doctor cannot heal the same player two nights in a row.' };
    }
  } else if (role.targetType === 'DEAD') {
    const target = room.players.find((p) => p.id === targetId && !p.isAlive && !p.isSpectator);
    if (!target) {
      return { valid: false, error: 'Must select a dead player.' };
    }
  } else if (role.targetType === 'TWO_ALIVE') {
    const t1 = room.players.find((p) => p.id === targetId && p.isAlive && !p.isSpectator);
    const t2 = room.players.find((p) => p.id === secondaryTargetId && p.isAlive && !p.isSpectator);
    if (!t1 || !t2 || t1.id === t2.id) {
      return { valid: false, error: 'Must select two different alive players.' };
    }
  }

  const actionTypeMap: Record<RoleId, NightAction['actionType']> = {
    don: 'KILL',
    mafia: 'KILL',
    godfather: 'KILL',
    consigliere: 'INVESTIGATE',
    silencer: 'SILENCE',
    framer: 'FRAME',
    janitor: 'CLEAN',
    citizen: 'KILL',
    sheriff: 'INVESTIGATE',
    doctor: 'HEAL',
    bodyguard: 'PROTECT',
    detective: 'INVESTIGATE',
    veteran: 'ALERT',
    vigilante: 'KILL',
    mayor: 'REVEAL',
    medium: 'SEANCE',
    lookout: 'WATCH',
    tracker: 'TRACK',
    escort: 'BLOCK',
    jailer: 'JAIL',
    serial_killer: 'KILL',
    jester: 'KILL',
    survivor: 'PROTECT',
    arsonist: targetId === actor.id ? 'IGNITE' : 'DOUSE',
    witch: 'CONTROL',
    executioner: 'KILL',
    amnesiac: 'REMEMBER',
    guardian_angel: 'PROTECT',
    plaguebearer: 'INFECT',
    vampire: 'BITE',
  };

  return {
    valid: true,
    action: {
      actorId,
      roleId: actor.roleId,
      targetId: role.targetType === 'SELF' ? actor.id : targetId,
      secondaryTargetId,
      actionType: actionTypeMap[actor.roleId],
      nightNumber: room.round,
    },
  };
}

export function resolveNightPhase(room: InternalRoomState): {
  deaths: { playerId: string; reason: string; by: PlayerState['eliminatedBy'] }[];
} {
  // Reset transient flags
  for (const p of room.players) {
    p.isSilenced = false;
    p.isFramed = false;
    p.isJailed = false;
  }

  const actions = [...room.nightActions].sort(
    (a, b) => ROLES[a.roleId].priority - ROLES[b.roleId].priority
  );

  const blockedIds = new Set<string>();
  const jailedIds = new Set<string>();
  const healedIds = new Set<string>();
  const divineProtectedIds = new Set<string>();
  const bodyguardedTargets = new Map<string, string>(); // targetId -> bodyguardId
  const alertVeteranIds = new Set<string>();
  const cleanedTargets = new Set<string>();
  const visitsByTarget = new Map<string, string[]>(); // targetId -> visitorIds
  const visitedByActor = new Map<string, string>(); // actorId -> targetId
  const pendingKills: { targetId: string; attackerId: string; by: PlayerState['eliminatedBy'] }[] = [];
  const maskedPlayerIds = new Set<string>();
  const identityDocPlayerIds = new Set<string>();

  const hasActiveItem = (p: PlayerState, effectType: FunctionalEffectType): ActiveMatchItemState | undefined =>
    p.activeMatchItems?.find((i) => i.effectType === effectType && !i.consumed);

  for (const p of room.players) {
    if (!p.isAlive || p.isSpectator) continue;
    if (hasActiveItem(p, 'MASK_STATUS_BLOCK')) maskedPlayerIds.add(p.id);
    if (hasActiveItem(p, 'DOC_IDENTITY')) identityDocPlayerIds.add(p.id);
    if (hasActiveItem(p, 'DOC_PROTECTION')) healedIds.add(p.id);
  }

  const addFeedback = (playerId: string, msg: string) => {
    if (!room.nightFeedback[playerId]) room.nightFeedback[playerId] = [];
    room.nightFeedback[playerId].push(msg);
  };

  // Witch redirection first
  for (const act of actions) {
    if (act.roleId === 'witch' && act.targetId && act.secondaryTargetId) {
      const targetAct = actions.find((a) => a.actorId === act.targetId);
      if (targetAct) {
        targetAct.targetId = act.secondaryTargetId;
        addFeedback(act.actorId, `Controlled action redirected.`);
      }
    }
  }

  // Record visits & execute non-kill abilities in priority order
  for (const act of actions) {
    const actor = room.players.find((p) => p.id === act.actorId);
    if (!actor || !actor.isAlive) continue;

    if (jailedIds.has(actor.id) || blockedIds.has(actor.id)) {
      addFeedback(actor.id, 'Your night action was blocked.');
      continue;
    }

    // Track visits
    if (act.targetId && act.targetId !== actor.id) {
      visitedByActor.set(actor.id, act.targetId);
      const list = visitsByTarget.get(act.targetId) || [];
      list.push(actor.id);
      visitsByTarget.set(act.targetId, list);
    }

    // Increment uses & set cooldown
    const roleDef = ROLES[act.roleId];
    actor.abilityUses[act.roleId] = (actor.abilityUses[act.roleId] ?? 0) + 1;
    if (roleDef.cooldown > 0) {
      actor.abilityCooldowns[act.roleId] = roleDef.cooldown + 1;
    }

    switch (act.roleId) {
      case 'jailer': {
        if (act.targetId) {
          jailedIds.add(act.targetId);
          const t = room.players.find((p) => p.id === act.targetId);
          if (t) t.isJailed = true;
          addFeedback(act.targetId, 'You were jailed for the night.');
        }
        break;
      }
      case 'veteran': {
        alertVeteranIds.add(actor.id);
        healedIds.add(actor.id);
        break;
      }
      case 'escort': {
        if (act.targetId) {
          const target = room.players.find((p) => p.id === act.targetId);
          if (target?.roleId === 'serial_killer') {
            pendingKills.push({ targetId: actor.id, attackerId: target.id, by: 'KILLER' });
          } else if (maskedPlayerIds.has(act.targetId)) {
            addFeedback(act.targetId, '🛡️ Himoya niqobi tungi rol bloklanishini to‘sdi / Защитная маска заблокировала вмешательство.');
          } else {
            blockedIds.add(act.targetId);
          }
        }
        break;
      }
      case 'amnesiac': {
        if (act.targetId) {
          const deadTarget = room.players.find((p) => p.id === act.targetId && !p.isAlive);
          if (deadTarget?.roleId) {
            actor.roleId = deadTarget.roleId;
            actor.team = ROLES[deadTarget.roleId].team;
            addFeedback(actor.id, `You remembered being: ${ROLES[deadTarget.roleId].name.uz} / ${ROLES[deadTarget.roleId].name.ru}`);
          }
        }
        break;
      }
      case 'framer': {
        const target = room.players.find((p) => p.id === act.targetId);
        if (target) {
          if (maskedPlayerIds.has(target.id) || identityDocPlayerIds.has(target.id)) {
            addFeedback(target.id, '🛡️ Hujjat/niqob shaxsiyatingizni soxtalashtirishdan himoya qildi / Личность защищена от подставы.');
          } else {
            target.isFramed = true;
          }
        }
        break;
      }
      case 'guardian_angel': {
        if (actor.gaTargetId) {
          divineProtectedIds.add(actor.gaTargetId);
          addFeedback(actor.gaTargetId, 'Guardian Angel protected you tonight.');
        }
        break;
      }
      case 'silencer': {
        const target = room.players.find((p) => p.id === act.targetId);
        if (target) {
          if (maskedPlayerIds.has(target.id)) {
            addFeedback(target.id, '🛡️ Himoya niqobi ovoz o‘chirishni to‘sdi / Защитная маска отразила глушение.');
          } else {
            target.isSilenced = true;
            addFeedback(target.id, 'You were silenced for the upcoming day.');
          }
        }
        break;
      }
      case 'survivor': {
        healedIds.add(actor.id);
        break;
      }
      case 'doctor': {
        if (act.targetId) {
          healedIds.add(act.targetId);
          actor.lastProtectedTargetId = act.targetId;
        }
        break;
      }
      case 'bodyguard': {
        if (act.targetId) {
          bodyguardedTargets.set(act.targetId, actor.id);
        }
        break;
      }
      case 'consigliere': {
        const target = room.players.find((p) => p.id === act.targetId);
        if (target?.roleId) {
          const roleDef = ROLES[target.roleId];
          const roleNameUz = roleDef?.name.uz || target.roleId;
          const roleNameRu = roleDef?.name.ru || target.roleId;
          const label = {
            uz: `🔍 ${roleNameUz} (${target.team})`,
            ru: `🔍 ${roleNameRu} (${target.team})`,
          };
          addFeedback(
            actor.id,
            `📜 ${target.username} ning roli: ${roleNameUz} (${roleNameRu}) — ${target.team}`
          );
          if (!actor.investigationHistory) actor.investigationHistory = [];
          actor.investigationHistory.push({
            targetId: target.id,
            targetUsername: target.username,
            round: room.round,
            result: target.team === 'MAFIA' ? 'MAFIA' : target.team === 'TOWN' ? 'TOWN' : 'NEUTRAL',
            roleId: target.roleId,
            team: target.team,
            label,
          });
        }
        break;
      }
      case 'sheriff': {
        const target = room.players.find((p) => p.id === act.targetId);
        if (target?.roleId) {
          const isSuspicious =
            target.isFramed ||
            (target.team === 'MAFIA' && target.roleId !== 'don' && target.roleId !== 'godfather') ||
            target.roleId === 'serial_killer';
          
          const label = {
            uz: isSuspicious ? '🚨 SHUBHALI (Mafiya/Qotil)' : '🛡️ TOZA (Begunoh)',
            ru: isSuspicious ? '🚨 ПОДОЗРИТЕЛЬНЫЙ (Мафия/Убийца)' : '🛡️ ЧИСТ (Невиновен)',
          };

          addFeedback(
            actor.id,
            isSuspicious
              ? `🚨 ${target.username} tekshiruvi: SHUBHALI! (Mafiya yoki xavfli qotil a’zosi)`
              : `🛡️ ${target.username} tekshiruvi: TOZA! (Begunoh shahar fuqarosi)`
          );

          if (!actor.investigationHistory) actor.investigationHistory = [];
          actor.investigationHistory.push({
            targetId: target.id,
            targetUsername: target.username,
            round: room.round,
            result: isSuspicious ? 'SUSPICIOUS' : 'INNOCENT',
            roleId: isSuspicious ? target.roleId : undefined,
            team: target.isFramed ? 'MAFIA' : target.team,
            label,
          });
        }
        break;
      }
      case 'detective': {
        const target = room.players.find((p) => p.id === act.targetId);
        if (target?.team) {
          const apparentTeam: Team = target.isFramed ? 'MAFIA' : target.team;
          const label = {
            uz: apparentTeam === 'TOWN' ? '🛡️ SHAHAR (Town)' : apparentTeam === 'MAFIA' ? '💀 MAFIYA (Mafia)' : '🔮 NEYTRAL (Neutral)',
            ru: apparentTeam === 'TOWN' ? '🛡️ ГОРОД (Town)' : apparentTeam === 'MAFIA' ? '💀 МАФИЯ (Mafia)' : '🔮 НЕЙТРАЛ (Neutral)',
          };
          addFeedback(actor.id, `🕵️ ${target.username} jamoasi: ${apparentTeam}`);
          if (!actor.investigationHistory) actor.investigationHistory = [];
          actor.investigationHistory.push({
            targetId: target.id,
            targetUsername: target.username,
            round: room.round,
            result: apparentTeam,
            team: apparentTeam,
            label,
          });
        }
        break;
      }
      case 'medium': {
        const deadTarget = room.players.find((p) => p.id === act.targetId && !p.isAlive);
        if (deadTarget?.roleId) {
          addFeedback(
            actor.id,
            `${deadTarget.username}: ${ROLES[deadTarget.roleId].name.uz} / ${ROLES[deadTarget.roleId].name.ru}`
          );
        }
        break;
      }
      case 'plaguebearer': {
        const target = room.players.find((p) => p.id === act.targetId);
        if (target) {
          target.isInfected = true;
          const allAliveInfected = room.players.filter((p) => p.isAlive && !p.isSpectator).every((p) => p.isInfected);
          if (allAliveInfected) {
            pendingKills.push({ targetId: target.id, attackerId: actor.id, by: 'KILLER' });
          }
        }
        break;
      }
      case 'don':
      case 'godfather':
      case 'mafia': {
        if (act.targetId) {
          // Only one mafia kill per night (highest priority takes precedence)
          const alreadyMafiaKill = pendingKills.some((k) => k.by === 'MAFIA');
          if (!alreadyMafiaKill) {
            pendingKills.push({ targetId: act.targetId, attackerId: actor.id, by: 'MAFIA' });
          }
        }
        break;
      }
      case 'serial_killer': {
        if (act.targetId) {
          pendingKills.push({ targetId: act.targetId, attackerId: actor.id, by: 'KILLER' });
        }
        break;
      }
      case 'vampire': {
        const target = room.players.find((p) => p.id === act.targetId);
        if (target && target.isAlive) {
          if (target.roleId === 'citizen') {
            target.roleId = 'vampire';
            target.team = 'NEUTRAL';
            addFeedback(target.id, 'You were converted into a Vampire!');
          } else if (target.team !== 'MAFIA') {
            pendingKills.push({ targetId: target.id, attackerId: actor.id, by: 'KILLER' });
          }
        }
        break;
      }
      case 'vigilante': {
        if (act.targetId) {
          pendingKills.push({ targetId: act.targetId, attackerId: actor.id, by: 'VIGILANTE' });
        }
        break;
      }
      case 'arsonist': {
        if (act.actionType === 'IGNITE') {
          for (const p of room.players) {
            if (p.isAlive && p.isDoused && p.id !== actor.id) {
              pendingKills.push({ targetId: p.id, attackerId: actor.id, by: 'ARSONIST' });
              p.isDoused = false;
            }
          }
        } else if (act.targetId) {
          const t = room.players.find((p) => p.id === act.targetId);
          if (t) t.isDoused = true;
        }
        break;
      }
      case 'janitor': {
        if (act.targetId) cleanedTargets.add(act.targetId);
        break;
      }
      default:
        break;
    }
  }

  // Execute Functional Shop Night Item Actions (Documents & Rifle)
  for (const itemAct of room.nightItemActions || []) {
    const actor = room.players.find((p) => p.id === itemAct.actorId);
    if (!actor || !actor.isAlive) continue;

    if (itemAct.effectType === 'DOC_INVESTIGATE' && itemAct.targetId) {
      const target = room.players.find((p) => p.id === itemAct.targetId && p.isAlive);
      if (target?.roleId) {
        const isSuspicious =
          (target.isFramed && !identityDocPlayerIds.has(target.id)) ||
          (target.team === 'MAFIA' && target.roleId !== 'don' && target.roleId !== 'godfather') ||
          target.roleId === 'serial_killer';
        const label = {
          uz: isSuspicious ? '🚨 HUJJAT: Shubhali shaxs' : '🛡️ HUJJAT: Toza fuqaro',
          ru: isSuspicious ? '🚨 ОРДЕР: Подозрительный статус' : '🛡️ ОРДЕР: Статус чист',
        };
        addFeedback(
          actor.id,
          isSuspicious
            ? `📄 Tergov Hujjati (${target.username}): SHUBHALI status aniqlandi / Ордер (${target.username}): ПОДОЗРИТЕЛЬНЫЙ статус.`
            : `📄 Tergov Hujjati (${target.username}): TOZA (begunoh) / Ордер (${target.username}): ЧИСТ.`
        );
        if (!actor.investigationHistory) actor.investigationHistory = [];
        actor.investigationHistory.push({
          targetId: target.id,
          targetUsername: target.username,
          round: room.round,
          result: isSuspicious ? 'SUSPICIOUS' : 'INNOCENT',
          team: target.isFramed && !identityDocPlayerIds.has(target.id) ? 'MAFIA' : target.team,
          label,
        });
      }
    } else if (itemAct.effectType === 'DOC_EVIDENCE' && itemAct.targetId) {
      const target = room.players.find((p) => p.id === itemAct.targetId);
      if (target) {
        const acted = visitedByActor.has(target.id);
        const visitedCount = (visitsByTarget.get(target.id) || []).length;
        addFeedback(
          actor.id,
          acted
            ? `📂 Dalillar Hujjati: ${target.username} tunda harakat qildi (${visitedCount} ta mehmon) / Документ улик: ${target.username} выходил(а) ночью.`
            : `📂 Dalillar Hujjati: ${target.username} tunda uyda qoldi (${visitedCount} ta mehmon) / Документ улик: ${target.username} остался(лась) дома.`
        );
      }
    } else if (itemAct.effectType === 'RIFLE_NIGHT_STRIKE' && itemAct.targetId) {
      const target = room.players.find((p) => p.id === itemAct.targetId && p.isAlive);
      if (target && target.id !== actor.id) {
        pendingKills.push({ targetId: target.id, attackerId: actor.id, by: 'RIFLE' });
        addFeedback(actor.id, `🎯 Miltiqdan o‘q uzildi: ${target.username} / Выстрел из винтовки по цели ${target.username}.`);
      }
    }
  }

  // Veteran kills all visitors
  for (const vetId of alertVeteranIds) {
    const visitors = visitsByTarget.get(vetId) || [];
    for (const vId of visitors) {
      pendingKills.push({ targetId: vId, attackerId: vetId, by: 'VETERAN' });
    }
  }

  // Lookout & Tracker feedback
  for (const act of actions) {
    if (blockedIds.has(act.actorId) || jailedIds.has(act.actorId)) continue;
    if (act.roleId === 'lookout' && act.targetId) {
      const visitors = (visitsByTarget.get(act.targetId) || [])
        .map((id) => room.players.find((p) => p.id === id)?.username)
        .filter(Boolean);
      addFeedback(
        act.actorId,
        visitors.length > 0 ? `Visitors: ${visitors.join(', ')}` : 'No visitors tonight.'
      );
    }
    if (act.roleId === 'tracker' && act.targetId) {
      const visitedId = visitedByActor.get(act.targetId);
      const visitedName = room.players.find((p) => p.id === visitedId)?.username;
      addFeedback(
        act.actorId,
        visitedName ? `Visited: ${visitedName}` : 'Target stayed home.'
      );
    }
  }

  // Resolve kills
  const deaths: { playerId: string; reason: string; by: PlayerState['eliminatedBy'] }[] = [];
  const deadSet = new Set<string>();

  for (const kill of pendingKills) {
    if (deadSet.has(kill.targetId)) continue;
    const target = room.players.find((p) => p.id === kill.targetId);
    if (!target || !target.isAlive) continue;

    if (jailedIds.has(target.id) || divineProtectedIds.has(target.id)) {
      continue;
    }

    // White Killer Protection: blocks solo neutral lethal killer attacks (serial_killer, vampire, arsonist, plaguebearer) without leaking attacker role
    if (kill.by === 'KILLER' || kill.by === 'ARSONIST') {
      const wkShield = hasActiveItem(target, 'WHITE_KILLER_SHIELD');
      if (wkShield) {
        wkShield.consumed = true;
        addFeedback(
          target.id,
          '🛡️ Oq Qotildan Himoya qalqoni tungi halokatli hujumni qaytardi! / Щит от Белого Убийцы отразил смертельную атаку!'
        );
        continue;
      }
    }

    if (healedIds.has(target.id) && kill.by !== 'ARSONIST') {
      addFeedback(target.id, 'You were attacked but saved!');
      continue;
    }

    const bgId = bodyguardedTargets.get(target.id);
    if (bgId) {
      const bg = room.players.find((p) => p.id === bgId);
      const attacker = room.players.find((p) => p.id === kill.attackerId);
      if (bg && bg.isAlive) {
        bg.isAlive = false;
        bg.eliminatedOnRound = room.round;
        bg.eliminatedBy = 'BODYGUARD';
        bg.deathReason = 'Died protecting target';
        deadSet.add(bg.id);
        deaths.push({ playerId: bg.id, reason: bg.deathReason, by: 'BODYGUARD' });
      }
      if (attacker && attacker.isAlive && !divineProtectedIds.has(attacker.id)) {
        attacker.isAlive = false;
        attacker.eliminatedOnRound = room.round;
        attacker.eliminatedBy = 'BODYGUARD';
        attacker.deathReason = 'Killed by Bodyguard';
        deadSet.add(attacker.id);
        deaths.push({ playerId: attacker.id, reason: attacker.deathReason, by: 'BODYGUARD' });
      }
      continue;
    }

    // Godfather survives first night attack
    if (target.roleId === 'godfather' && (target.abilityUses['godfather'] ?? 0) === 0 && kill.by !== 'ARSONIST') {
      target.abilityUses['godfather'] = 1;
      addFeedback(target.id, 'Your Godfather armor absorbed the attack!');
      continue;
    }

    target.isAlive = false;
    target.eliminatedOnRound = room.round;
    target.eliminatedBy = kill.by;
    target.cleanedRole = cleanedTargets.has(target.id);
    target.deathReason = `Eliminated by ${kill.by}`;
    deadSet.add(target.id);
    deaths.push({ playerId: target.id, reason: target.deathReason, by: kill.by });

    // Vigilante guilt if killed TOWN
    if (kill.by === 'VIGILANTE' && target.team === 'TOWN') {
      const vig = room.players.find((p) => p.id === kill.attackerId);
      if (vig && vig.isAlive) {
        vig.isAlive = false;
        vig.eliminatedOnRound = room.round;
        vig.eliminatedBy = 'VIGILANTE';
        vig.deathReason = 'Died of guilt';
        deadSet.add(vig.id);
        deaths.push({ playerId: vig.id, reason: vig.deathReason, by: 'VIGILANTE' });
      }
    }
  }

  // Executioner fallback if target died at night
  for (const p of room.players) {
    if (p.isAlive && p.roleId === 'executioner' && p.executionerTargetId && deadSet.has(p.executionerTargetId)) {
      p.roleId = 'survivor';
      p.team = 'NEUTRAL';
      addFeedback(p.id, 'Your target died at night. You are now a Survivor.');
    }
  }

  // Decrement cooldowns
  for (const p of room.players) {
    for (const key of Object.keys(p.abilityCooldowns) as RoleId[]) {
      const val = p.abilityCooldowns[key] ?? 0;
      if (val > 0) p.abilityCooldowns[key] = val - 1;
    }
  }

  // Log morning events
  if (deaths.length === 0) {
    room.events.push(
      createEvent(
        room.round,
        'DAY',
        'Tun tinch o‘tdi. Hech kim halok bo‘lmadi.',
        'Ночь прошла спокойно. Никто не погиб.'
      )
    );
  } else {
    const revealOnDeath = room.settings.revealRolesOnDeath !== false;
    for (const d of deaths) {
      const p = room.players.find((pl) => pl.id === d.playerId);
      if (p) {
        const hideRole = p.cleanedRole || !revealOnDeath;
        const roleLabelUz = hideRole ? 'Sir saqlandi' : ROLES[p.roleId!].name.uz;
        const roleLabelRu = hideRole ? 'Роль скрыта' : ROLES[p.roleId!].name.ru;
        room.events.push(
          createEvent(
            room.round,
            'DAY',
            `${p.username} tunda halok bo‘ldi (${roleLabelUz}).`,
            `${p.username} погиб(ла) ночью (${roleLabelRu}).`
          )
        );
      }
    }
  }

  // Expire round-scoped active match items cleanly
  for (const p of room.players) {
    if (!p.activeMatchItems) continue;
    for (const it of p.activeMatchItems) {
      if (!it.consumed && it.remainingRounds && it.remainingRounds > 0) {
        it.remainingRounds -= 1;
        if (it.remainingRounds <= 0) {
          it.consumed = true;
        }
      }
    }
  }

  room.nightActions = [];
  room.nightItemActions = [];
  return { deaths };
}

export function resolveVotingPhase(room: InternalRoomState): {
  executedPlayerId?: string;
  voteProtectedPlayerId?: string;
  isTie: boolean;
  jesterWinnerId?: string;
  executionerWinnerId?: string;
} {
  const tally: Record<string, number> = {};
  const alivePlayers = room.players.filter((p) => p.isAlive && !p.isSpectator);

  for (const [voterId, targetId] of Object.entries(room.votes)) {
    const voter = alivePlayers.find((p) => p.id === voterId);
    if (!voter || voter.isSilenced) continue;
    if (targetId === 'SKIP') continue;
    const weight = voter.roleId === 'mayor' && voter.isMayorRevealed ? 2 : 1;
    tally[targetId] = (tally[targetId] ?? 0) + weight;
  }

  let maxVotes = 0;
  let topTargets: string[] = [];
  for (const [targetId, count] of Object.entries(tally)) {
    if (count > maxVotes) {
      maxVotes = count;
      topTargets = [targetId];
    } else if (count === maxVotes) {
      topTargets.push(targetId);
    }
  }

  if (maxVotes === 0 || topTargets.length > 1) {
    room.events.push(
      createEvent(
        room.round,
        'EXECUTION',
        'Ovozlar teng keldi yoki yetarli emas. Hech kim chiqarib yuborilmadi.',
        'Голоса разделились поровну или их недостаточно. Никто не казнён.'
      )
    );
    return { isTie: topTargets.length > 1 };
  }

  const executedId = topTargets[0];
  const executed = room.players.find((p) => p.id === executedId);
  if (!executed) return { isTie: false };

  // Voting Protection Check: Votes remain transparent, but shield vetoes execution once
  const voteShield = executed.activeMatchItems?.find(
    (i) => i.effectType === 'VOTE_PARDON_SHIELD' && !i.consumed
  );
  if (voteShield) {
    voteShield.consumed = true;
    room.events.push(
      createEvent(
        room.round,
        'EXECUTION',
        `⚖️ ${executed.username} Ovozdan Himoya (Veto) qalqoni yordamida qatldan saqlanib qoldi! (Ovozlar o‘zgarishsiz qoldi)`,
        `⚖️ ${executed.username} избежал(а) казни благодаря Защите от голосования! (Голоса не изменялись)`
      )
    );
    return { isTie: false, voteProtectedPlayerId: executedId };
  }

  executed.isAlive = false;
  executed.eliminatedOnRound = room.round;
  executed.eliminatedBy = 'VOTE';
  executed.deathReason = 'Executed by town vote';

  const revealOnDeath = room.settings.revealRolesOnDeath !== false;
  const roleUz = revealOnDeath && executed.roleId ? ROLES[executed.roleId].name.uz : 'Sir saqlandi';
  const roleRu = revealOnDeath && executed.roleId ? ROLES[executed.roleId].name.ru : 'Роль скрыта';

  room.events.push(
    createEvent(
      room.round,
      'EXECUTION',
      `${executed.username} ovoz berish orqali o‘yindan chiqarildi (${roleUz}).`,
      `${executed.username} казнён(а) по решению города (${roleRu}).`
    )
  );

  // Check Jester win
  if (executed.roleId === 'jester') {
    return { executedPlayerId: executedId, isTie: false, jesterWinnerId: executedId };
  }

  // Check Executioner win
  const exec = room.players.find(
    (p) => p.isAlive && p.roleId === 'executioner' && p.executionerTargetId === executedId
  );
  if (exec) {
    return { executedPlayerId: executedId, isTie: false, executionerWinnerId: exec.id };
  }

  return { executedPlayerId: executedId, isTie: false };
}

export function checkWinCondition(
  room: InternalRoomState,
  jesterWinnerId?: string,
  executionerWinnerId?: string
): { ended: boolean; winnerTeam?: RoomStateView['winnerTeam']; winnerIds: string[] } {
  if (jesterWinnerId) {
    return { ended: true, winnerTeam: 'JESTER', winnerIds: [jesterWinnerId] };
  }
  if (executionerWinnerId) {
    return { ended: true, winnerTeam: 'EXECUTIONER', winnerIds: [executionerWinnerId] };
  }

  const alive = room.players.filter((p) => p.isAlive && !p.isSpectator);
  const mafiaAlive = alive.filter((p) => p.team === 'MAFIA');
  const townAlive = alive.filter((p) => p.team === 'TOWN');
  const lethalNeutrals = alive.filter((p) =>
    ['serial_killer', 'arsonist', 'plaguebearer', 'vampire'].includes(p.roleId || '')
  );

  // Add Survivors & Guardian Angels whose target is alive to any winner list
  const bonusWinnerIds = room.players
    .filter((p) => {
      if (p.roleId === 'survivor' && p.isAlive) return true;
      if (p.roleId === 'guardian_angel' && p.gaTargetId) {
        const target = room.players.find((t) => t.id === p.gaTargetId);
        return Boolean(target?.isAlive);
      }
      return false;
    })
    .map((p) => p.id);

  if (alive.length === 0) {
    return { ended: true, winnerTeam: 'DRAW', winnerIds: [] };
  }

  // Town win: No mafia and no lethal neutrals
  if (mafiaAlive.length === 0 && lethalNeutrals.length === 0) {
    const townWinners = room.players.filter((p) => p.team === 'TOWN').map((p) => p.id);
    return { ended: true, winnerTeam: 'TOWN', winnerIds: Array.from(new Set([...townWinners, ...bonusWinnerIds])) };
  }

  // Mafia win: Mafia >= Town + lethalNeutrals (and no lethal neutrals left or Mafia outnumbers all)
  if (mafiaAlive.length > 0 && lethalNeutrals.length === 0 && mafiaAlive.length >= townAlive.length) {
    const mafiaWinners = room.players.filter((p) => p.team === 'MAFIA').map((p) => p.id);
    const witchWinners = alive.filter((p) => p.roleId === 'witch').map((p) => p.id);
    return {
      ended: true,
      winnerTeam: 'MAFIA',
      winnerIds: Array.from(new Set([...mafiaWinners, ...witchWinners, ...bonusWinnerIds])),
    };
  }

  // Solo Neutral win: Only 1 lethal neutral faction remains and mafia & town cannot stop them
  if (mafiaAlive.length === 0 && townAlive.length <= 1 && lethalNeutrals.length === 1) {
    const solo = lethalNeutrals[0];
    const teamKey =
      solo.roleId === 'serial_killer'
        ? 'SERIAL_KILLER'
        : solo.roleId === 'arsonist'
          ? 'ARSONIST'
          : solo.roleId === 'plaguebearer'
            ? 'PLAGUEBEARER'
            : 'VAMPIRE';
    return { ended: true, winnerTeam: teamKey, winnerIds: Array.from(new Set([solo.id, ...bonusWinnerIds])) };
  }

  // All alive are vampires
  if (alive.every((p) => p.roleId === 'vampire')) {
    return { ended: true, winnerTeam: 'VAMPIRE', winnerIds: alive.map((p) => p.id) };
  }

  return { ended: false, winnerIds: [] };
}

export function buildRoomViewForPlayer(room: InternalRoomState, viewerId: string): RoomStateView {
  const viewer = room.players.find((p) => p.id === viewerId);
  const isGameEnded = room.phase === 'VICTORY' || room.phase === 'NEW_GAME';
  const viewerIsMafia = viewer?.team === 'MAFIA';

  const revealOnDeath = room.settings.revealRolesOnDeath !== false;
  const investigations = viewer?.investigationHistory || [];
  const latestInvestigationByTarget = new Map<string, typeof investigations[0]>();
  for (const inv of investigations) {
    latestInvestigationByTarget.set(inv.targetId, inv);
  }

  const currentAction = room.nightActions.find((a) => a.actorId === viewerId);

  const players: PublicPlayerView[] = room.players.map((p) => {
    const canSeeRole =
      isGameEnded ||
      p.id === viewerId ||
      (viewerIsMafia && p.team === 'MAFIA') ||
      (revealOnDeath && !p.isAlive && !p.cleanedRole);

    const inv = latestInvestigationByTarget.get(p.id);

    return {
      id: p.id,
      username: p.username,
      avatar: p.avatar,
      isBot: p.isBot,
      isHost: p.isHost,
      isReady: p.isReady,
      isConnected: p.isConnected,
      isAlive: p.isAlive,
      isSpectator: p.isSpectator,
      isSilenced: p.isSilenced,
      isJailed: p.isJailed,
      isMayorRevealed: p.isMayorRevealed,
      isDoused: viewer?.roleId === 'arsonist' ? p.isDoused : false,
      isInfected: viewer?.roleId === 'plaguebearer' ? p.isInfected : false,
      deathReason: p.deathReason,
      eliminatedOnRound: p.eliminatedOnRound,
      revealedRoleId: canSeeRole ? p.roleId : undefined,
      revealedTeam: canSeeRole ? p.team : undefined,
      investigatedByMe: inv
        ? {
            result: inv.result,
            roleId: inv.roleId,
            team: inv.team,
            label: inv.label,
          }
        : undefined,
    };
  });

  const mafiaTeammates =
    viewerIsMafia
      ? room.players.filter((p) => p.team === 'MAFIA' && p.id !== viewerId).map((p) => p.id)
      : [];

  const roleDef = viewer?.roleId ? ROLES[viewer.roleId] : undefined;
  const cd = viewer?.roleId ? viewer.abilityCooldowns[viewer.roleId] ?? 0 : 0;
  const used = viewer?.roleId ? viewer.abilityUses[viewer.roleId] ?? 0 : 0;

  return {
    code: room.code,
    name: room.name,
    settings: room.settings,
    phase: room.phase,
    round: room.round,
    phaseEndsAt: room.phaseEndsAt,
    serverTime: Date.now(),
    players,
    votes: room.votes,
    events: room.events.filter(
      (e) =>
        e.visibility === 'PUBLIC' ||
        (e.visibility === 'MAFIA' && viewerIsMafia) ||
        (e.visibility === 'PRIVATE' && e.targetPlayerId === viewerId)
    ),
    winnerTeam: room.winnerTeam,
    winnerIds: room.winnerIds,
    myPrivateData: viewer
      ? {
          playerId: viewer.id,
          roleId: viewer.roleId,
          team: viewer.team,
          desiredRoleId: viewer.desiredRoleId,
          mafiaTeammates,
          nightFeedback: room.nightFeedback[viewer.id] || [],
          hasActedThisNight: Boolean(currentAction),
          currentNightTargetId: currentAction?.targetId,
          currentSecondaryTargetId: currentAction?.secondaryTargetId,
          cooldownRemaining: cd,
          usesRemaining: roleDef && roleDef.maxUses > 0 ? Math.max(0, roleDef.maxUses - used) : -1,
          executionerTargetId: viewer.executionerTargetId,
          gaTargetId: viewer.gaTargetId,
          activeMatchItems: (viewer.activeMatchItems || []).filter((i) => !i.consumed),
          usedItemCountsInMatch: viewer.usedItemCountsInMatch || {},
          investigationDossier: investigations,
        }
      : undefined,
  };
}

export function generateBotNightActions(room: InternalRoomState): void {
  const alive = room.players.filter((p) => p.isAlive && !p.isSpectator);
  for (const bot of alive) {
    if (!bot.isBot || !bot.roleId) continue;
    if (room.nightActions.some((a) => a.actorId === bot.id)) continue;

    const role = ROLES[bot.roleId];
    if (role.actionPhase !== 'NIGHT' && role.actionPhase !== 'BOTH') continue;
    if ((bot.abilityCooldowns[bot.roleId] ?? 0) > 0) continue;
    if (role.maxUses > 0 && (bot.abilityUses[bot.roleId] ?? 0) >= role.maxUses) continue;

    let targetId: string | undefined;
    if (role.targetType === 'SELF') {
      targetId = bot.id;
    } else if (role.targetType === 'OTHER_ALIVE' || role.targetType === 'ANY_ALIVE') {
      let pool = alive.filter((p) => p.id !== bot.id);
      if (bot.team === 'MAFIA') {
        const nonMafia = pool.filter((p) => p.team !== 'MAFIA');
        if (nonMafia.length > 0) pool = nonMafia;
      }
      if (pool.length > 0) {
        targetId = pool[Math.floor(Math.random() * pool.length)].id;
      }
    }

    if (targetId) {
      const check = validateNightAction(room, bot.id, targetId);
      if (check.valid && check.action) {
        room.nightActions.push(check.action);
      }
    }
  }
}

export function generateBotVotes(room: InternalRoomState): void {
  const alive = room.players.filter((p) => p.isAlive && !p.isSpectator);
  for (const bot of alive) {
    if (!bot.isBot || bot.isSilenced || room.votes[bot.id]) continue;
    const pool = alive.filter((p) => p.id !== bot.id && (bot.team !== 'MAFIA' || p.team !== 'MAFIA'));
    if (pool.length > 0 && Math.random() > 0.25) {
      room.votes[bot.id] = pool[Math.floor(Math.random() * pool.length)].id;
    } else {
      room.votes[bot.id] = 'SKIP';
    }
  }
}

export function formatPhaseTitle(phase: GamePhase, lang: Language): string {
  const map: Record<GamePhase, Record<Language, string>> = {
    LOBBY: { uz: 'Kutish zali', ru: 'Лобби' },
    ROLE_ASSIGNMENT: { uz: 'Rollar taqsimoti', ru: 'Раздача ролей' },
    NIGHT: { uz: 'Tun', ru: 'Ночь' },
    DAY: { uz: 'Tong', ru: 'Утро' },
    DISCUSSION: { uz: 'Muhokama', ru: 'Обсуждение' },
    VOTING: { uz: 'Ovoz berish', ru: 'Голосование' },
    EXECUTION: { uz: 'Hukm ijrosi', ru: 'Казнь' },
    VICTORY: { uz: 'G‘alaba', ru: 'Победа' },
    NEW_GAME: { uz: 'Yangi o‘yin', ru: 'Новая игра' },
  };
  return map[phase][lang];
}
