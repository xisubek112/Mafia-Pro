import crypto from 'crypto';
import express, { NextFunction, Request, Response } from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import {
  assignRolesToPlayers,
  buildRoomViewForPlayer,
  checkWinCondition,
  createEvent,
  generateBotNightActions,
  generateBotVotes,
  InternalRoomState,
  resolveNightPhase,
  resolveVotingPhase,
  validateNightAction,
} from '../engine/gameEngine';
import {
  AdminModuleId,
  AdminRoleSlug,
  ChatMessage,
  GameMode,
  ModulePermissionSet,
  PaymentProvider,
  PlayerState,
  RoleId,
  RoomSettings,
  UserProfile,
} from '../shared/types';
import {
  isPostgresEnabled,
  recordGameHistoryToPostgres,
  removeRoomFromPostgres,
  syncRoomToPostgres,
} from './db';
import { COSMETICS, DAILY_REWARD_CALENDAR, MISSIONS } from '../shared/ecosystem';
import { createSessionToken, store, verifySessionToken } from './store';

export type VoiceChannel = 'PUBLIC' | 'MAFIA' | 'DEAD' | 'MUTED';

export function getAllowedVoiceChannel(room: InternalRoomState, player: PlayerState): VoiceChannel {
  if (player.isSpectator || !player.isAlive) return 'DEAD';
  if (player.isSilenced && ['DAY', 'DISCUSSION', 'VOTING'].includes(room.phase)) return 'MUTED';
  if (room.phase === 'NIGHT') {
    return player.team === 'MAFIA' ? 'MAFIA' : 'MUTED';
  }
  return 'PUBLIC';
}

export function createAppServer(options?: { corsOrigin?: string }) {
  const app = express();
  app.use(express.json({ limit: '3mb' }));

  const corsOrigin = options?.corsOrigin || process.env.CORS_ORIGIN || '*';

  // Simple in-memory HTTP rate limiter
  const rateBuckets = new Map<string, { count: number; resetAt: number }>();
  function rateLimit(maxReq: number, windowMs: number) {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = `${req.ip}:${req.path}`;
      const now = Date.now();
      const bucket = rateBuckets.get(key);
      if (!bucket || bucket.resetAt < now) {
        rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
        return next();
      }
      if (bucket.count >= maxReq) {
        return res.status(429).json({ error: 'Too many requests. Please slow down.' });
      }
      bucket.count += 1;
      next();
    };
  }

  function extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
    const cookie = req.headers.cookie;
    if (cookie) {
      const match = cookie.match(/mafia_token=([^;]+)/);
      if (match) return decodeURIComponent(match[1]);
    }
    return null;
  }

  function getAuthUser(req: Request): UserProfile | null {
    const token = extractToken(req);
    if (!token) return null;
    const userId = verifySessionToken(token);
    if (!userId) return null;
    const user = store.findUserById(userId);
    if (!user || user.isBanned) return null;
    store.expireVipIfNeeded(user);
    return store.sanitizeUser(user);
  }

  function requireAuth(req: Request, res: Response, next: NextFunction) {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    (req as Request & { user: UserProfile }).user = user;
    next();
  }

  function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const user = getAuthUser(req);
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Administrator access required' });
    }
    (req as Request & { user: UserProfile }).user = user;
    next();
  }

  function requirePermission(moduleId: AdminModuleId, action: keyof ModulePermissionSet) {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = getAuthUser(req);
      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Administrator access required' });
      }
      if (!store.hasAdminPermission(user, moduleId, action)) {
        return res.status(403).json({ error: `Missing ${action} permission for ${moduleId}` });
      }
      (req as Request & { user: UserProfile }).user = user;
      next();
    };
  }

  // ======================== REST API ROUTES ========================

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      db: isPostgresEnabled() ? 'postgres' : 'local',
      activeRooms: rooms.size,
      uptime: Math.floor(process.uptime()),
    });
  });

  app.post('/api/auth/register', rateLimit(15, 60000), (req, res) => {
    try {
      const { username, email, password, avatar } = req.body || {};
      if (!username || !email || !password || String(password).length < 6) {
        return res.status(400).json({ error: 'Username, valid email, and password (min 6 chars) required.' });
      }
      const user = store.registerUser(String(username), String(email), String(password), avatar || 'crimson');
      const token = createSessionToken(user.id);
      res.json({ user, token });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Registration failed' });
    }
  });

  app.post('/api/auth/login', rateLimit(20, 60000), (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required.' });
      }
      const user = store.authenticate(String(email), String(password));
      const token = createSessionToken(user.id);
      res.json({ user, token });
    } catch (err: unknown) {
      res.status(401).json({ error: err instanceof Error ? err.message : 'Login failed' });
    }
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/auth/recover', rateLimit(5, 60000), (req, res) => {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email required' });
    res.json({
      ok: true,
      message: 'If an account with that email exists, recovery instructions have been queued.',
    });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    res.json({ user });
  });

  app.patch('/api/profile', requireAuth, (req, res) => {
    try {
      const user = (req as Request & { user: UserProfile }).user;
      const updated = store.updateProfile(user.id, req.body || {});
      res.json({ user: updated });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Update failed' });
    }
  });

  app.get('/api/leaderboard', (req, res) => {
    const authUser = getAuthUser(req);
    const period = req.query.period === 'weekly' || req.query.period === 'monthly' ? req.query.period : 'global';
    const country = typeof req.query.country === 'string' ? req.query.country : undefined;
    const friendsOnly = req.query.friends === 'true';
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    res.json({
      leaderboard: store.getLeaderboard({
        period,
        country,
        userId: authUser?.id,
        friendsOnly,
        search,
      }),
    });
  });

  app.get('/api/history', (req, res) => {
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
    res.json({ history: store.getHistory(userId) });
  });

  app.post('/api/reports', requireAuth, rateLimit(10, 60000), (req, res) => {
    const user = (req as Request & { user: UserProfile }).user;
    const { targetUserId, targetUsername, roomCode, reason } = req.body || {};
    if (!targetUserId || !reason) {
      return res.status(400).json({ error: 'Target user and reason are required' });
    }
    const report = store.addReport({
      reporterId: user.id,
      reporterName: user.username,
      targetUserId: String(targetUserId),
      targetUsername: String(targetUsername || 'Player'),
      roomCode: String(roomCode || 'GLOBAL'),
      reason: String(reason).slice(0, 300),
    });
    res.json({ report });
  });

  // ======================== ELITE ECOSYSTEM ROUTES ========================

  app.get('/api/rewards/daily', requireAuth, (req, res) => {
    const user = (req as Request & { user: UserProfile }).user;
    res.json({ calendar: DAILY_REWARD_CALENDAR, dailyReward: user.dailyReward });
  });

  app.post('/api/rewards/daily/claim', requireAuth, rateLimit(10, 60000), (req, res) => {
    try {
      const user = (req as Request & { user: UserProfile }).user;
      const result = store.claimDailyReward(user.id);
      res.json(result);
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Claim failed' });
    }
  });

  app.get('/api/missions', requireAuth, (req, res) => {
    const user = (req as Request & { user: UserProfile }).user;
    res.json({ missions: MISSIONS, progress: user.missionProgress });
  });

  app.post('/api/missions/:id/claim', requireAuth, rateLimit(15, 60000), (req, res) => {
    try {
      const user = (req as Request & { user: UserProfile }).user;
      const updated = store.claimMissionReward(user.id, String(req.params.id));
      res.json({ user: updated });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Mission claim failed' });
    }
  });

  app.get('/api/store', (_req, res) => {
    res.json({ items: COSMETICS });
  });

  app.post('/api/store/buy', requireAuth, rateLimit(15, 60000), (req, res) => {
    try {
      const user = (req as Request & { user: UserProfile }).user;
      const { itemId } = req.body || {};
      const updated = store.purchaseCosmetic(user.id, String(itemId));
      res.json({ user: updated });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Purchase failed' });
    }
  });

  app.post('/api/store/equip', requireAuth, (req, res) => {
    try {
      const user = (req as Request & { user: UserProfile }).user;
      const { itemId } = req.body || {};
      const updated = store.equipCosmetic(user.id, String(itemId));
      res.json({ user: updated });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Equip failed' });
    }
  });

  app.get('/api/transactions', requireAuth, (req, res) => {
    const user = (req as Request & { user: UserProfile }).user;
    res.json({ transactions: store.getTransactions(user.id) });
  });

  app.post('/api/subscription/verify', requireAuth, rateLimit(5, 60000), (req, res) => {
    try {
      const user = (req as Request & { user: UserProfile }).user;
      const { provider, verificationToken } = req.body || {};
      if (!provider || !verificationToken) {
        return res.status(400).json({ error: 'Payment provider and verification token are required.' });
      }
      const updated = store.verifyExternalSubscription(user.id, String(provider), String(verificationToken));
      res.json({ user: updated });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Subscription verification failed';
      const status = msg.includes('not configured') ? 501 : 402;
      res.status(status).json({ error: msg });
    }
  });

  app.post('/api/subscription/cancel', requireAuth, (req, res) => {
    try {
      const user = (req as Request & { user: UserProfile }).user;
      const updated = store.cancelSubscription(user.id);
      res.json({ user: updated });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Cancel failed' });
    }
  });

  // ======================== MAFIA PRO 2.0 SHOP, VIP, INVENTORY & PAYMENTS ========================

  app.get('/api/vip/plans', (_req, res) => {
    res.json({ plans: store.getVipPlans(false) });
  });

  app.get('/api/shop/catalog', (_req, res) => {
    res.json({
      categories: store.getCategories(false),
      products: store.getShopProducts(false),
      vipPlans: store.getVipPlans(false),
      campaigns: store.getCampaigns(false),
      paymentMode: process.env.PAYMENT_MODE || 'sandbox',
    });
  });

  app.get('/api/inventory', requireAuth, (req, res) => {
    try {
      const user = (req as Request & { user: UserProfile }).user;
      res.json(store.getUserInventory(user.id));
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load inventory' });
    }
  });

  app.post('/api/inventory/equip', requireAuth, (req, res) => {
    try {
      const user = (req as Request & { user: UserProfile }).user;
      const { itemId } = req.body || {};
      if (!itemId) return res.status(400).json({ error: 'itemId is required' });
      const updated = store.equipCosmetic(user.id, String(itemId));
      res.json({ user: updated });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Equip failed' });
    }
  });

  app.get('/api/payments/history', requireAuth, (req, res) => {
    const user = (req as Request & { user: UserProfile }).user;
    res.json({
      orders: store.getOrders(user.id),
      payments: store.getPayments(user.id),
      subscriptions: store.getSubscriptions(user.id),
    });
  });

  app.post('/api/payments/orders', requireAuth, rateLimit(20, 60000), (req, res) => {
    try {
      const user = (req as Request & { user: UserProfile }).user;
      const { orderType, referenceId, provider, promoCode } = req.body || {};
      if (!['VIP_PLAN', 'SHOP_PRODUCT'].includes(orderType) || !referenceId) {
        return res.status(400).json({ error: 'Valid orderType and referenceId are required.' });
      }
      const normalizedProvider: PaymentProvider =
        provider === 'PAYME' || provider === 'CLICK' ? provider : 'SANDBOX';
      const result = store.createPaymentOrder(user.id, {
        orderType,
        referenceId: String(referenceId),
        provider: normalizedProvider,
        promoCode: promoCode ? String(promoCode) : undefined,
      });
      res.json({ ...result, paymentMode: process.env.PAYMENT_MODE || 'sandbox' });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Order creation failed' });
    }
  });

  app.post('/api/payments/webhook/:provider', rateLimit(60, 60000), (req, res) => {
    try {
      const rawProv = String(req.params.provider || '').toUpperCase();
      const provider: PaymentProvider =
        rawProv === 'PAYME' || rawProv === 'CLICK' ? rawProv : 'SANDBOX';
      const { orderId, providerTxId, status } = req.body || {};
      if (!orderId || !['PAID', 'FAILED', 'CANCELLED'].includes(status)) {
        return res.status(400).json({ error: 'orderId and valid status required' });
      }

      const secret =
        provider === 'PAYME'
          ? process.env.PAYME_SECRET_KEY || process.env.PAYMENT_WEBHOOK_SECRET || ''
          : provider === 'CLICK'
            ? process.env.CLICK_SECRET_KEY || process.env.PAYMENT_WEBHOOK_SECRET || ''
            : process.env.PAYMENT_WEBHOOK_SECRET || 'dev-sandbox-webhook-secret';

      const sigHeader = String(req.headers['x-payment-signature'] || '');
      const expected = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}:${status}:${providerTxId || ''}`)
        .digest('hex');

      const signatureValid =
        Boolean(secret) &&
        sigHeader.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(sigHeader), Buffer.from(expected));

      const result = store.processPaymentCallback({
        provider,
        orderId: String(orderId),
        providerTxId: String(providerTxId || `${provider.toLowerCase()}_${Date.now()}`),
        status,
        signatureValid,
        payloadSummary: JSON.stringify(req.body || {}),
      });
      res.json({ ok: true, order: result.order, payment: result.payment });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Webhook error';
      res.status(msg.includes('signature') ? 401 : 400).json({ error: msg });
    }
  });

  app.post('/api/payments/sandbox/complete', requireAuth, rateLimit(20, 60000), (req, res) => {
    try {
      if ((process.env.PAYMENT_MODE || 'sandbox') === 'production') {
        return res.status(403).json({ error: 'Sandbox endpoint is disabled in production mode.' });
      }
      const authUser = (req as Request & { user: UserProfile }).user;
      const { orderId, status } = req.body || {};
      if (!orderId || !['PAID', 'FAILED', 'CANCELLED'].includes(status)) {
        return res.status(400).json({ error: 'Valid orderId and status (PAID/FAILED/CANCELLED) required.' });
      }
      const order = store.getOrders(authUser.id).find((o) => o.id === orderId);
      if (!order) return res.status(404).json({ error: 'Order not found' });

      const result = store.processPaymentCallback({
        provider: order.provider,
        orderId: order.id,
        providerTxId: `sbx_${crypto.randomBytes(5).toString('hex')}`,
        status,
        signatureValid: true,
        payloadSummary: JSON.stringify({ mode: 'sandbox', orderId: order.id, status }),
      });
      res.json(result);
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Sandbox payment failed' });
    }
  });

  app.post('/api/payments/orders/:id/refund-request', requireAuth, (req, res) => {
    try {
      const user = (req as Request & { user: UserProfile }).user;
      const reason = String(req.body?.reason || 'User requested refund');
      const order = store.requestOrderRefund(user.id, String(req.params.id), reason);
      res.json({ order });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Refund request failed' });
    }
  });

  // ======================== TOURNAMENT ROUTES ========================

  app.get('/api/tournaments', (_req, res) => {
    res.json({ tournaments: store.getTournaments() });
  });

  app.post('/api/tournaments', requireAuth, rateLimit(5, 60000), (req, res) => {
    try {
      const user = (req as Request & { user: UserProfile }).user;
      const { name, format, mode, maxPlayers, prizeGold, prizeDiamonds, entryFeeGold } = req.body || {};
      const trn = store.createTournament(user.id, {
        name: String(name || 'MAFIA PRO Cup'),
        format: ['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN'].includes(format)
          ? format
          : 'SINGLE_ELIMINATION',
        mode: ['CLASSIC', 'ADVANCED', 'CHAOS'].includes(mode) ? mode : 'CLASSIC',
        maxPlayers: Number(maxPlayers) || 8,
        prizeGold: Number(prizeGold) || 500,
        prizeDiamonds: Number(prizeDiamonds) || 10,
        entryFeeGold: Number(entryFeeGold) || 0,
      });
      res.json({ tournament: trn });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create tournament' });
    }
  });

  app.post('/api/tournaments/:id/join', requireAuth, rateLimit(10, 60000), (req, res) => {
    try {
      const user = (req as Request & { user: UserProfile }).user;
      const trn = store.joinTournament(user.id, String(req.params.id));
      res.json({ tournament: trn });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Join failed' });
    }
  });

  app.post('/api/tournaments/:id/start', requireAuth, (req, res) => {
    try {
      const user = (req as Request & { user: UserProfile }).user;
      const trn = store.startTournament(user.id, String(req.params.id));
      res.json({ tournament: trn });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Start failed' });
    }
  });

  app.post('/api/tournaments/:id/matches/:matchId/result', requireAuth, (req, res) => {
    try {
      const user = (req as Request & { user: UserProfile }).user;
      const { winnerId } = req.body || {};
      const trn = store.reportTournamentMatchResult(
        user.id,
        String(req.params.id),
        String(req.params.matchId),
        String(winnerId)
      );
      res.json({ tournament: trn });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Result update failed' });
    }
  });

  // ======================== SOCIAL ROUTES ========================

  app.get('/api/social', requireAuth, (req, res) => {
    const user = (req as Request & { user: UserProfile }).user;
    res.json(store.getSocialOverview(user.id));
  });

  app.get('/api/social/search', requireAuth, (req, res) => {
    const user = (req as Request & { user: UserProfile }).user;
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    res.json({ players: store.searchPlayers(q, user.id) });
  });

  app.post('/api/social/request', requireAuth, (req, res) => {
    try {
      const user = (req as Request & { user: UserProfile }).user;
      store.sendFriendRequest(user.id, String(req.body?.targetId));
      res.json(store.getSocialOverview(user.id));
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Request failed' });
    }
  });

  app.post('/api/social/accept', requireAuth, (req, res) => {
    try {
      const user = (req as Request & { user: UserProfile }).user;
      store.acceptFriendRequest(user.id, String(req.body?.requesterId));
      res.json(store.getSocialOverview(user.id));
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Accept failed' });
    }
  });

  app.post('/api/social/decline', requireAuth, (req, res) => {
    const user = (req as Request & { user: UserProfile }).user;
    store.declineFriendRequest(user.id, String(req.body?.requesterId));
    res.json(store.getSocialOverview(user.id));
  });

  app.post('/api/social/remove', requireAuth, (req, res) => {
    const user = (req as Request & { user: UserProfile }).user;
    store.removeFriend(user.id, String(req.body?.friendId));
    res.json(store.getSocialOverview(user.id));
  });

  app.post('/api/social/block', requireAuth, (req, res) => {
    const user = (req as Request & { user: UserProfile }).user;
    store.blockUser(user.id, String(req.body?.targetId));
    res.json(store.getSocialOverview(user.id));
  });

  app.post('/api/social/unblock', requireAuth, (req, res) => {
    const user = (req as Request & { user: UserProfile }).user;
    store.unblockUser(user.id, String(req.body?.targetId));
    res.json(store.getSocialOverview(user.id));
  });

  // ======================== ADMIN API ROUTES ========================

  app.get('/api/site-settings', (_req, res) => {
    res.json({ websiteSettings: store.getWebsiteSettings() });
  });

  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    const users = store.getAllUsers();
    const orders = store.getOrders();
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();
    const paidOrders = orders.filter((o) => o.status === 'PAID' || o.status === 'REFUND_REQUESTED');
    const refundedOrders = orders.filter((o) => o.status === 'REFUNDED');
    const roomList = Array.from(rooms.values()).map((r) => {
      const host = r.players.find((p) => p.isHost);
      return {
        code: r.code,
        name: r.name,
        mode: r.settings.mode,
        phase: r.phase,
        playerCount: r.players.filter((p) => !p.isSpectator).length,
        maxPlayers: r.settings.maxPlayers,
        isPrivate: r.settings.isPrivate,
        hostName: host?.username || 'Host',
        createdAt: r.createdAt,
      };
    });
    res.json({
      totalUsers: users.length,
      newUsersToday: users.filter((u) => u.createdAt >= todayMs).length,
      onlineUsersCount: playerSockets.size,
      bannedUsers: users.filter((u) => u.isBanned).length,
      activeRooms: roomList.length,
      activePlayersInRooms: roomList.reduce((sum, r) => sum + r.playerCount, 0),
      totalGamesPlayed: store.getHistory().length,
      totalGoldInCirculation: users.reduce((sum, u) => sum + (u.gold || 0), 0),
      totalDiamondsInCirculation: users.reduce((sum, u) => sum + (u.diamonds || 0), 0),
      totalRevenueUzs: paidOrders.reduce((sum, o) => sum + o.amountUzs, 0),
      todayOrdersCount: orders.filter((o) => o.createdAt >= todayMs).length,
      refundedTotalUzs: refundedOrders.reduce((sum, o) => sum + o.amountUzs, 0),
      activeVipCount: users.filter((u) => u.subscription?.status === 'ACTIVE').length,
      paidOrdersCount: paidOrders.length,
      pendingRefundsCount: orders.filter((o) => o.status === 'REFUND_REQUESTED').length,
      failedLoginsCount: store.getSystemEvents().filter((e) => e.eventType === 'FAILED_LOGIN' && e.createdAt >= now - 86400000).length,
      uptimeSec: Math.floor(process.uptime()),
      dbMode: isPostgresEnabled() ? 'postgres' : 'local',
      users,
      rooms: roomList,
      reports: store.getReports(),
      recentTransactions: store.getTransactions(),
      auditLogs: store.getAuditLogs(),
      tournaments: store.getTournaments(),
      vipPlans: store.getVipPlans(true),
      subscriptions: store.getSubscriptions(),
      categories: store.getCategories(true),
      products: store.getShopProducts(true),
      orders,
      payments: store.getPayments(),
      paymentEvents: store.getPaymentEvents(),
      campaigns: store.getCampaigns(true),
      promoRedemptions: store.getPromoRedemptions(),
      notifications: store.getNotifications(),
      roleConfigs: store.getRoleConfigs(),
      websiteSettings: store.getWebsiteSettings(),
      adminRoles: store.getAdminRoles(),
      systemEvents: store.getSystemEvents(),
      backups: store.listBackups(),
      serverConfig: store.getServerConfig(),
    });
  });

  app.get('/api/admin/analytics', requirePermission('analytics', 'read'), (req, res) => {
    const rangeDays = Math.min(90, Math.max(7, Number(req.query.range) || 30));
    res.json(store.getAnalytics(rangeDays));
  });

  app.get('/api/admin/analytics/export.csv', requirePermission('analytics', 'read'), (req, res) => {
    const rangeDays = Math.min(90, Math.max(7, Number(req.query.range) || 30));
    const analytics = store.getAnalytics(rangeDays);
    const lines = ['day,registrations,orders,revenue_uzs'];
    for (const row of analytics.dailySeries) {
      lines.push(`${row.day},${row.registrations},${row.orders},${row.revenueUzs}`);
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="mafia-pro-analytics-${rangeDays}d.csv"`);
    res.send(lines.join('\n'));
  });

  app.post('/api/admin/users/:id/suspend', requirePermission('users', 'edit'), (req, res) => {
    try {
      const actor = (req as Request & { user: UserProfile }).user;
      const hours = Number(req.body?.hours) || 24;
      const reason = String(req.body?.reason || 'Temporary suspension');
      const user = store.suspendUser(String(req.params.id), hours, reason, actor);
      res.json({ user });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Suspend failed' });
    }
  });

  app.post('/api/admin/users/:id/restore', requirePermission('users', 'edit'), (req, res) => {
    try {
      const actor = (req as Request & { user: UserProfile }).user;
      const user = store.restoreUser(String(req.params.id), actor);
      res.json({ user });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Restore failed' });
    }
  });

  app.post('/api/admin/rooms/:code/close', requirePermission('rooms', 'delete'), (req, res) => {
    const actor = (req as Request & { user: UserProfile }).user;
    const code = String(req.params.code || '').toUpperCase();
    const room = rooms.get(code);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const tmr = roomTimers.get(code);
    if (tmr) {
      clearTimeout(tmr);
      roomTimers.delete(code);
    }
    for (const p of room.players) {
      const sock = playerSockets.get(p.id);
      if (sock) {
        io.to(sock.socketId).emit('user:notification', {
          title: 'Room Closed by Administration',
          message: `Room ${code} was closed for moderation/maintenance.`,
        });
      }
    }
    rooms.delete(code);
    removeRoomFromPostgres(code);
    store.addAuditLog(actor.id, actor.username, 'ROOM_CLOSED', `Closed room ${code}`, 'WARN');
    res.json({ ok: true });
  });

  app.post('/api/admin/roles', requirePermission('roles', 'edit'), (req, res) => {
    try {
      const actor = (req as Request & { user: UserProfile }).user;
      const { roleId } = req.body || {};
      if (!roleId) return res.status(400).json({ error: 'roleId is required' });
      const config = store.saveRoleConfig({ ...req.body, roleId: roleId as RoleId }, actor);
      res.json({ roleConfig: config });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Role update failed' });
    }
  });

  app.post('/api/admin/tournaments', requirePermission('tournaments', 'create'), (req, res) => {
    try {
      const actor = (req as Request & { user: UserProfile }).user;
      const { name, format, mode, maxPlayers, prizeGold, prizeDiamonds } = req.body || {};
      const trn = store.createTournament(actor.id, {
        name: String(name || 'MAFIA PRO Official Cup'),
        format: ['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN'].includes(format)
          ? format
          : 'SINGLE_ELIMINATION',
        mode: ['CLASSIC', 'ADVANCED', 'CHAOS'].includes(mode) ? mode : 'CLASSIC',
        maxPlayers: Number(maxPlayers) || 8,
        prizeGold: Number(prizeGold) || 500,
        prizeDiamonds: Number(prizeDiamonds) || 10,
        entryFeeGold: 0,
      });
      res.json({ tournament: trn });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Create tournament failed' });
    }
  });

  app.post('/api/admin/notifications', requirePermission('notifications', 'create'), (req, res) => {
    try {
      const actor = (req as Request & { user: UserProfile }).user;
      const { title, content, audience, targetUserIds, scheduledAt } = req.body || {};
      if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
      const ntf = store.sendAdminNotification(
        {
          title: String(title),
          content: String(content),
          audience: audience || 'GLOBAL',
          targetUserIds: Array.isArray(targetUserIds) ? targetUserIds : undefined,
          scheduledAt: scheduledAt ? Number(scheduledAt) : undefined,
        },
        actor
      );
      if (ntf.status === 'SENT') {
        io.emit('user:notification', { title: ntf.title, message: ntf.content });
      }
      res.json({ notification: ntf });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Notification failed' });
    }
  });

  app.delete('/api/admin/campaigns/:id', requirePermission('promos', 'delete'), (req, res) => {
    const actor = (req as Request & { user: UserProfile }).user;
    store.deleteCampaign(String(req.params.id), actor);
    res.json({ ok: true });
  });

  app.post('/api/admin/site-settings', requirePermission('settings', 'edit'), (req, res) => {
    try {
      const actor = (req as Request & { user: UserProfile }).user;
      const websiteSettings = store.saveWebsiteSettings(req.body || {}, actor);
      res.json({ websiteSettings });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Settings save failed' });
    }
  });

  app.post('/api/admin/roles-permissions', requirePermission('admins', 'edit'), (req, res) => {
    try {
      const actor = (req as Request & { user: UserProfile }).user;
      const { slug, moduleId, permissions } = req.body || {};
      const updated = store.updateAdminRolePermissions(
        slug as AdminRoleSlug,
        moduleId as AdminModuleId,
        permissions || {},
        actor
      );
      res.json({ adminRole: updated });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Permission update failed' });
    }
  });

  app.post('/api/admin/assign-role', requirePermission('admins', 'edit'), (req, res) => {
    try {
      const actor = (req as Request & { user: UserProfile }).user;
      const { userId, role, adminRole } = req.body || {};
      const updated = store.assignAdminRole(String(userId), role === 'ADMIN' ? 'ADMIN' : 'USER', adminRole, actor);
      res.json({ user: updated });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Role assign failed' });
    }
  });

  app.post('/api/admin/system/backup', requirePermission('system', 'create'), (req, res) => {
    const actor = (req as Request & { user: UserProfile }).user;
    const file = store.createBackupSnapshot();
    store.recordSystemEvent('BACKUP', 'INFO', 'Admin', `Verified backup created by ${actor.username}`);
    store.addAuditLog(actor.id, actor.username, 'BACKUP_CREATED', file);
    res.json({ ok: true, file, backups: store.listBackups() });
  });

  app.post('/api/admin/vip-plans', requireAdmin, (req, res) => {
    try {
      const actor = (req as Request & { user: UserProfile }).user;
      const plan = store.saveVipPlan(req.body || {}, actor);
      res.json({ plan });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Save VIP plan failed' });
    }
  });

  app.delete('/api/admin/vip-plans/:id', requireAdmin, (req, res) => {
    const actor = (req as Request & { user: UserProfile }).user;
    store.deleteVipPlan(String(req.params.id), actor);
    res.json({ ok: true });
  });

  app.post('/api/admin/categories', requireAdmin, (req, res) => {
    try {
      const actor = (req as Request & { user: UserProfile }).user;
      const category = store.saveCategory(req.body || {}, actor);
      res.json({ category });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Save category failed' });
    }
  });

  app.post('/api/admin/products', requireAdmin, (req, res) => {
    try {
      const actor = (req as Request & { user: UserProfile }).user;
      const product = store.saveShopProduct(req.body || {}, actor);
      res.json({ product });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Save product failed' });
    }
  });

  app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
    const actor = (req as Request & { user: UserProfile }).user;
    store.deleteShopProduct(String(req.params.id), actor);
    res.json({ ok: true });
  });

  app.post('/api/admin/campaigns', requireAdmin, (req, res) => {
    try {
      const actor = (req as Request & { user: UserProfile }).user;
      const campaign = store.saveCampaign(req.body || {}, actor);
      res.json({ campaign });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Save campaign failed' });
    }
  });

  app.post('/api/admin/refunds/:orderId', requireAdmin, (req, res) => {
    try {
      const actor = (req as Request & { user: UserProfile }).user;
      const approve = Boolean(req.body?.approve);
      const order = store.adminResolveRefund(String(req.params.orderId), approve, actor);
      res.json({ order });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Refund resolution failed' });
    }
  });

  app.post('/api/admin/tournaments/:id/cancel', requireAdmin, (req, res) => {
    try {
      const user = (req as Request & { user: UserProfile }).user;
      const trn = store.cancelTournament(user.id, String(req.params.id));
      res.json({ tournament: trn });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Cancel failed' });
    }
  });

  app.post('/api/admin/ban', requireAdmin, (req, res) => {
    try {
      const actor = (req as Request & { user: UserProfile }).user;
      const { userId, reason } = req.body || {};
      const user = store.banUser(String(userId), String(reason || 'Rule violation'), actor);
      res.json({ user });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Ban failed' });
    }
  });

  app.post('/api/admin/unban', requireAdmin, (req, res) => {
    try {
      const actor = (req as Request & { user: UserProfile }).user;
      const { userId } = req.body || {};
      const user = store.unbanUser(String(userId), actor);
      res.json({ user });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Unban failed' });
    }
  });

  app.post('/api/admin/flag', requireAdmin, (req, res) => {
    try {
      const actor = (req as Request & { user: UserProfile }).user;
      const { userId, reason } = req.body || {};
      const user = store.flagUser(String(userId), String(reason || 'Reported misconduct'), actor);
      res.json({ user });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Flag failed' });
    }
  });

  app.post('/api/admin/unflag', requireAdmin, (req, res) => {
    try {
      const actor = (req as Request & { user: UserProfile }).user;
      const { userId } = req.body || {};
      const user = store.unflagUser(String(userId), actor);
      res.json({ user });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Unflag failed' });
    }
  });

  app.post('/api/admin/warn', requireAdmin, (req, res) => {
    try {
      const actor = (req as Request & { user: UserProfile }).user;
      const { userId, reason } = req.body || {};
      const user = store.warnUser(String(userId), String(reason || 'Misconduct warning'), actor);
      const sockEntry = playerSockets.get(String(userId));
      if (sockEntry) {
        io.to(sockEntry.socketId).emit('user:notification', {
          title: `Official Warning (Strike #${user.warningsCount ?? 1})`,
          message: user.lastWarningReason || 'Misconduct warning',
        });
      }
      res.json({ user });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Warn failed' });
    }
  });

  app.post('/api/notifications/read', requireAuth, (req, res) => {
    try {
      const user = (req as Request & { user: UserProfile }).user;
      const updated = store.markNotificationsRead(user.id);
      res.json({ user: updated });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Update failed' });
    }
  });

  app.post('/api/admin/reports/:id', requireAdmin, (req, res) => {
    try {
      const actor = (req as Request & { user: UserProfile }).user;
      const { status } = req.body || {};
      const report = store.updateReportStatus(String(req.params.id), status, actor);
      res.json({ report });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Report update failed' });
    }
  });

  app.post('/api/admin/config', requireAdmin, (req, res) => {
    const actor = (req as Request & { user: UserProfile }).user;
    const config = store.updateServerConfig(req.body || {}, actor);
    res.json({ serverConfig: config });
  });

  // ======================== MULTIPLAYER ROOMS & SOCKET.IO ========================

  const rooms = new Map<string, InternalRoomState>();
  const roomChat = new Map<string, ChatMessage[]>();
  const roomTimers = new Map<string, NodeJS.Timeout>();
  const playerSockets = new Map<string, { socketId: string; roomCode?: string }>();
  const chatRateLimits = new Map<string, number>();
  const socketActionLimits = new Map<string, { count: number; resetAt: number }>();
  const roomVoicePeers = new Map<string, Set<string>>(); // roomCode -> Set<playerId>

  function checkSocketRateLimit(playerId: string, maxEvents = 30, windowMs = 5000): boolean {
    const now = Date.now();
    const bucket = socketActionLimits.get(playerId);
    if (!bucket || bucket.resetAt < now) {
      socketActionLimits.set(playerId, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (bucket.count >= maxEvents) return false;
    bucket.count += 1;
    return true;
  }

  function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (rooms.has(code));
    return code;
  }

  app.get('/api/rooms/public', (_req, res) => {
    const list = Array.from(rooms.values())
      .filter((r) => !r.settings.isPrivate && r.phase === 'LOBBY')
      .map((r) => ({
        code: r.code,
        name: r.name,
        mode: r.settings.mode,
        playerCount: r.players.filter((p) => !p.isSpectator).length,
        maxPlayers: r.settings.maxPlayers,
        hostName: r.players.find((p) => p.isHost)?.username || 'Host',
      }));
    res.json({ rooms: list });
  });

  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
    pingInterval: 15000,
    pingTimeout: 25000,
  });

  function broadcastRoomState(roomCode: string) {
    const room = rooms.get(roomCode);
    if (!room) return;
    syncRoomToPostgres(room);
    for (const player of room.players) {
      if (player.isBot) continue;
      const conn = playerSockets.get(player.id);
      if (conn) {
        io.to(conn.socketId).emit('room:state', buildRoomViewForPlayer(room, player.id));
      }
    }
  }

  function pushSystemChat(roomCode: string, text: string) {
    const msgs = roomChat.get(roomCode) || [];
    const msg: ChatMessage = {
      id: Math.random().toString(36).slice(2, 10),
      channel: 'SYSTEM',
      senderId: 'SYSTEM',
      senderName: 'MAFIA PRO',
      text,
      timestamp: Date.now(),
      reactions: {},
    };
    msgs.push(msg);
    if (msgs.length > 150) msgs.shift();
    roomChat.set(roomCode, msgs);
    io.to(roomCode).emit('chat:message', msg);
  }

  function schedulePhaseTransition(roomCode: string, delaySec: number, nextFn: () => void) {
    const existing = roomTimers.get(roomCode);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      roomTimers.delete(roomCode);
      nextFn();
    }, delaySec * 1000);
    roomTimers.set(roomCode, timer);
  }

  function advanceToNight(roomCode: string) {
    const room = rooms.get(roomCode);
    if (!room) return;
    room.round += 1;
    room.phase = 'NIGHT';
    room.nightActions = [];
    room.nightFeedback = {};
    room.votes = {};
    const sec = room.settings.timers.night;
    room.phaseEndsAt = Date.now() + sec * 1000;
    room.events.push(
      createEvent(room.round, 'NIGHT', `${room.round}-tun boshlandi.`, `Наступила ночь ${room.round}.`)
    );
    broadcastRoomState(roomCode);

    setTimeout(() => {
      const r = rooms.get(roomCode);
      if (r && r.phase === 'NIGHT') {
        generateBotNightActions(r);
        broadcastRoomState(roomCode);
      }
    }, Math.min(3500, Math.floor(sec * 300)));

    schedulePhaseTransition(roomCode, sec, () => advanceToDay(roomCode));
  }

  function advanceToDay(roomCode: string) {
    const room = rooms.get(roomCode);
    if (!room || room.phase !== 'NIGHT') return;

    generateBotNightActions(room);
    resolveNightPhase(room);

    const win = checkWinCondition(room);
    if (win.ended) {
      finishGame(room, win.winnerTeam!, win.winnerIds);
      return;
    }

    room.phase = 'DAY';
    const sec = room.settings.timers.day;
    room.phaseEndsAt = Date.now() + sec * 1000;
    broadcastRoomState(roomCode);

    schedulePhaseTransition(roomCode, sec, () => advanceToDiscussion(roomCode));
  }

  function advanceToDiscussion(roomCode: string) {
    const room = rooms.get(roomCode);
    if (!room) return;
    room.phase = 'DISCUSSION';
    const sec = room.settings.timers.discussion;
    room.phaseEndsAt = Date.now() + sec * 1000;
    broadcastRoomState(roomCode);

    schedulePhaseTransition(roomCode, sec, () => advanceToVoting(roomCode));
  }

  function advanceToVoting(roomCode: string) {
    const room = rooms.get(roomCode);
    if (!room) return;
    room.phase = 'VOTING';
    room.votes = {};
    const sec = room.settings.timers.voting;
    room.phaseEndsAt = Date.now() + sec * 1000;
    broadcastRoomState(roomCode);

    setTimeout(() => {
      const r = rooms.get(roomCode);
      if (r && r.phase === 'VOTING') {
        generateBotVotes(r);
        broadcastRoomState(roomCode);
      }
    }, Math.min(3000, Math.floor(sec * 350)));

    schedulePhaseTransition(roomCode, sec, () => advanceToExecution(roomCode));
  }

  function advanceToExecution(roomCode: string) {
    const room = rooms.get(roomCode);
    if (!room || room.phase !== 'VOTING') return;

    generateBotVotes(room);
    const voteRes = resolveVotingPhase(room);
    room.phase = 'EXECUTION';
    const sec = room.settings.timers.execution;
    room.phaseEndsAt = Date.now() + sec * 1000;
    broadcastRoomState(roomCode);

    schedulePhaseTransition(roomCode, sec, () => {
      const r = rooms.get(roomCode);
      if (!r) return;
      const win = checkWinCondition(r, voteRes.jesterWinnerId, voteRes.executionerWinnerId);
      if (win.ended) {
        finishGame(r, win.winnerTeam!, win.winnerIds);
      } else {
        advanceToNight(roomCode);
      }
    });
  }

  function finishGame(
    room: InternalRoomState,
    winnerTeam: NonNullable<InternalRoomState['winnerTeam']>,
    winnerIds: string[]
  ) {
    const existing = roomTimers.get(room.code);
    if (existing) clearTimeout(existing);

    room.phase = 'VICTORY';
    room.winnerTeam = winnerTeam;
    room.winnerIds = winnerIds;
    room.phaseEndsAt = Date.now();
    room.events.push(
      createEvent(
        room.round,
        'VICTORY',
        `O‘yin yakunlandi! G‘olib: ${winnerTeam}`,
        `Игра завершена! Победитель: ${winnerTeam}`
      )
    );

    const durationSec = room.startedAt ? Math.max(10, Math.floor((Date.now() - room.startedAt) / 1000)) : 60;
    const historyRecord = {
      id: `gm_${Date.now().toString(36)}`,
      roomCode: room.code,
      mode: room.settings.mode,
      playerCount: room.players.filter((p) => !p.isSpectator).length,
      winner: winnerTeam,
      rounds: room.round,
      durationSec,
      endedAt: Date.now(),
      players: room.players
        .filter((p) => !p.isSpectator && p.roleId && p.team)
        .map((p) => ({
          userId: p.id,
          username: p.username,
          roleId: p.roleId!,
          team: p.team!,
          won: winnerIds.includes(p.id),
          survived: p.isAlive,
        })),
    };

    store.recordGameResult(historyRecord);
    recordGameHistoryToPostgres(historyRecord);
    broadcastRoomState(room.code);
  }

  function removeVoicePeer(roomCode: string, peerId: string) {
    const peers = roomVoicePeers.get(roomCode);
    if (!peers || !peers.has(peerId)) return;
    peers.delete(peerId);
    io.to(roomCode).emit('voice:peer-left', { peerId });
  }

  io.on('connection', (socket: Socket) => {
    const token = typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : '';
    const rawGuestId = typeof socket.handshake.auth?.guestId === 'string' ? socket.handshake.auth.guestId : '';
    const guestId = /^gst_[a-zA-Z0-9_-]{4,24}$/.test(rawGuestId) ? rawGuestId : `gst_${socket.id.slice(0, 8)}`;
    const rawGuestName = typeof socket.handshake.auth?.guestName === 'string' ? socket.handshake.auth.guestName.trim() : 'Player';
    const guestName = (rawGuestName || 'Player').slice(0, 24);

    const userId = token ? verifySessionToken(token) : null;
    const authUser = userId && !store.findUserById(userId)?.isBanned ? store.findUserById(userId) : undefined;
    const playerId = authUser ? authUser.id : guestId;
    const playerName = authUser ? authUser.username : guestName;
    const playerAvatar = authUser ? authUser.avatar : 'crimson';

    const prev = playerSockets.get(playerId);
    playerSockets.set(playerId, { socketId: socket.id, roomCode: prev?.roomCode });

    // Automatic reconnection to active room
    if (prev?.roomCode && rooms.has(prev.roomCode)) {
      const room = rooms.get(prev.roomCode)!;
      const p = room.players.find((pl) => pl.id === playerId);
      if (p) {
        p.isConnected = true;
        room.lastActivityAt = Date.now();
        socket.join(prev.roomCode);
        socket.emit('room:state', buildRoomViewForPlayer(room, playerId));
        socket.emit('chat:history', roomChat.get(prev.roomCode) || []);
        broadcastRoomState(prev.roomCode);
      }
    }

    socket.on('room:create', (payload: { name: string; settings: RoomSettings }, cb?: (res: unknown) => void) => {
      if (!checkSocketRateLimit(playerId, 10, 10000)) {
        return cb?.({ ok: false, error: 'Rate limit exceeded' });
      }
      const code = generateRoomCode();
      const defaultTimers = store.getServerConfig().defaultTimers;
      const settings: RoomSettings = {
        mode: (['CLASSIC', 'ADVANCED', 'CHAOS'].includes(payload?.settings?.mode) ? payload.settings.mode : 'CLASSIC') as GameMode,
        maxPlayers: Math.max(5, Math.min(20, Number(payload?.settings?.maxPlayers) || 10)),
        isPrivate: Boolean(payload?.settings?.isPrivate),
        allowSpectators: payload?.settings?.allowSpectators ?? true,
        fillWithBots: Boolean(payload?.settings?.fillWithBots),
        revealRolesOnDeath: payload?.settings?.revealRolesOnDeath ?? true,
        timers: {
          roleAssignment: Math.max(2, Math.min(15, Number(payload?.settings?.timers?.roleAssignment) || defaultTimers.roleAssignment)),
          night: Math.max(10, Math.min(120, Number(payload?.settings?.timers?.night) || defaultTimers.night)),
          day: Math.max(3, Math.min(30, Number(payload?.settings?.timers?.day) || defaultTimers.day)),
          discussion: Math.max(15, Math.min(180, Number(payload?.settings?.timers?.discussion) || defaultTimers.discussion)),
          voting: Math.max(10, Math.min(120, Number(payload?.settings?.timers?.voting) || defaultTimers.voting)),
          execution: Math.max(3, Math.min(20, Number(payload?.settings?.timers?.execution) || defaultTimers.execution)),
        },
      };

      const hostPlayer: PlayerState = {
        id: playerId,
        username: playerName,
        avatar: playerAvatar,
        isBot: false,
        isHost: true,
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
      };

      const newRoom: InternalRoomState = {
        code,
        name: String(payload?.name || `${playerName}'s Room`).slice(0, 40),
        settings,
        phase: 'LOBBY',
        round: 0,
        phaseEndsAt: Date.now(),
        players: [hostPlayer],
        nightActions: [],
        nightFeedback: {},
        votes: {},
        events: [],
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
      };

      rooms.set(code, newRoom);
      roomChat.set(code, []);
      playerSockets.set(playerId, { socketId: socket.id, roomCode: code });
      socket.join(code);
      broadcastRoomState(code);
      cb?.({ ok: true, code });
    });

    socket.on('room:join', (payload: { code: string }, cb?: (res: unknown) => void) => {
      if (!checkSocketRateLimit(playerId, 15, 10000)) {
        return cb?.({ ok: false, error: 'Rate limit exceeded' });
      }
      const code = String(payload?.code || '').trim().toUpperCase();
      const room = rooms.get(code);
      if (!room) {
        return cb?.({ ok: false, error: 'Room not found' });
      }

      room.lastActivityAt = Date.now();
      const existing = room.players.find((p) => p.id === playerId);
      if (existing) {
        existing.isConnected = true;
        playerSockets.set(playerId, { socketId: socket.id, roomCode: code });
        socket.join(code);
        broadcastRoomState(code);
        socket.emit('chat:history', roomChat.get(code) || []);
        return cb?.({ ok: true, code });
      }

      const activeCount = room.players.filter((p) => !p.isSpectator).length;
      const asSpectator = room.phase !== 'LOBBY';
      if (asSpectator && !room.settings.allowSpectators) {
        return cb?.({ ok: false, error: 'Game already in progress' });
      }
      if (!asSpectator && activeCount >= room.settings.maxPlayers) {
        return cb?.({ ok: false, error: 'Room is full' });
      }

      room.players.push({
        id: playerId,
        username: playerName,
        avatar: playerAvatar,
        isBot: false,
        isHost: false,
        isReady: false,
        isConnected: true,
        isAlive: !asSpectator,
        isSpectator: asSpectator,
        isSilenced: false,
        isFramed: false,
        isJailed: false,
        isDoused: false,
        isInfected: false,
        isMayorRevealed: false,
        abilityCooldowns: {},
        abilityUses: {},
      });

      playerSockets.set(playerId, { socketId: socket.id, roomCode: code });
      socket.join(code);
      pushSystemChat(code, `${playerName} joined the room.`);
      broadcastRoomState(code);
      socket.emit('chat:history', roomChat.get(code) || []);
      cb?.({ ok: true, code });
    });

    socket.on('room:kick', (payload: { code: string; targetId: string }, cb?: (res: unknown) => void) => {
      if (!checkSocketRateLimit(playerId, 15, 10000)) {
        return cb?.({ ok: false, error: 'Rate limit exceeded' });
      }
      const code = String(payload?.code || '').toUpperCase();
      const room = rooms.get(code);
      if (!room) return cb?.({ ok: false, error: 'Room not found' });

      const host = room.players.find((p) => p.id === playerId && p.isHost);
      if (!host) return cb?.({ ok: false, error: 'Only host can kick players' });
      if (payload.targetId === playerId) return cb?.({ ok: false, error: 'Cannot kick yourself' });

      const target = room.players.find((p) => p.id === payload.targetId);
      if (!target) return cb?.({ ok: false, error: 'Player not found' });

      room.players = room.players.filter((p) => p.id !== payload.targetId);
      removeVoicePeer(code, payload.targetId);

      const targetConn = playerSockets.get(payload.targetId);
      if (targetConn) {
        const targetSocket = io.sockets.sockets.get(targetConn.socketId);
        targetSocket?.leave(code);
        io.to(targetConn.socketId).emit('room:kicked', { code });
        playerSockets.set(payload.targetId, { socketId: targetConn.socketId, roomCode: undefined });
      }

      pushSystemChat(code, `${target.username} was removed by the host.`);
      broadcastRoomState(code);
      cb?.({ ok: true });
    });

    socket.on('room:leave', (payload: { code: string }) => {
      const code = String(payload?.code || '').toUpperCase();
      const room = rooms.get(code);
      if (!room) return;
      room.players = room.players.filter((p) => p.id !== playerId);
      removeVoicePeer(code, playerId);
      socket.leave(code);
      playerSockets.set(playerId, { socketId: socket.id, roomCode: undefined });

      const humanLeft = room.players.filter((p) => !p.isBot);
      if (humanLeft.length === 0) {
        const t = roomTimers.get(code);
        if (t) clearTimeout(t);
        rooms.delete(code);
        roomChat.delete(code);
        roomVoicePeers.delete(code);
        removeRoomFromPostgres(code);
        return;
      }

      if (!room.players.some((p) => p.isHost && !p.isBot)) {
        humanLeft[0].isHost = true;
        humanLeft[0].isReady = true;
      }
      broadcastRoomState(code);
    });

    socket.on('room:ready', (payload: { code: string }) => {
      if (!checkSocketRateLimit(playerId, 20, 5000)) return;
      const room = rooms.get(String(payload?.code || '').toUpperCase());
      if (!room || room.phase !== 'LOBBY') return;
      const p = room.players.find((pl) => pl.id === playerId);
      if (p && !p.isHost) {
        p.isReady = !p.isReady;
        room.lastActivityAt = Date.now();
        broadcastRoomState(room.code);
      }
    });

    socket.on('room:fillBots', (payload: { code: string; count?: number }) => {
      const room = rooms.get(String(payload?.code || '').toUpperCase());
      if (!room || room.phase !== 'LOBBY') return;
      const host = room.players.find((p) => p.id === playerId && p.isHost);
      if (!host) return;

      const botNames = [
        'Rustam', 'Malika', 'Sardor', 'Kamila', 'Jasur',
        'Dilnoza', 'Aziz', 'Madina', 'Timur', 'Nigora',
        'Alisher', 'Zarina', 'Bekzod', 'Sevara', 'Otabek',
        'Shahlo', 'Doston', 'Lola', 'Farrux', 'Gulnora',
      ];
      const requested = typeof payload.count === 'number' && payload.count > 0
        ? payload.count
        : room.settings.maxPlayers;
      const targetTotal = Math.min(room.settings.maxPlayers, Math.max(5, requested));
      while (room.players.filter((p) => !p.isSpectator).length < targetTotal) {
        const idx = room.players.length;
        const baseName = botNames[idx % botNames.length];
        const suffix = idx >= botNames.length ? ` #${Math.floor(idx / botNames.length) + 1}` : '';
        const name = `${baseName}${suffix} (Bot)`;
        room.players.push({
          id: `bot_${Math.random().toString(36).slice(2, 8)}`,
          username: name,
          avatar: idx % 2 === 0 ? 'gold' : 'violet',
          isBot: true,
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
        });
      }
      broadcastRoomState(room.code);
    });

    socket.on('game:start', (payload: { code: string }, cb?: (res: unknown) => void) => {
      if (!checkSocketRateLimit(playerId, 10, 10000)) {
        return cb?.({ ok: false, error: 'Rate limit exceeded' });
      }
      const room = rooms.get(String(payload?.code || '').toUpperCase());
      if (!room || room.phase !== 'LOBBY') return cb?.({ ok: false, error: 'Cannot start right now' });
      const host = room.players.find((p) => p.id === playerId && p.isHost);
      if (!host) return cb?.({ ok: false, error: 'Only host can start the game' });

      if (room.settings.fillWithBots && room.players.filter((p) => !p.isSpectator).length < 5) {
        const botNames = ['Rustam', 'Malika', 'Sardor', 'Kamila', 'Jasur', 'Dilnoza'];
        while (room.players.filter((p) => !p.isSpectator).length < 6) {
          const idx = room.players.length;
          room.players.push({
            id: `bot_${Math.random().toString(36).slice(2, 8)}`,
            username: `${botNames[idx % botNames.length]} (Bot)`,
            avatar: 'gold',
            isBot: true,
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
          });
        }
      }

      const active = room.players.filter((p) => !p.isSpectator);
      if (active.length < 5) {
        return cb?.({ ok: false, error: 'Minimum 5 players required to start' });
      }

      room.players = assignRolesToPlayers(room.players, room.settings.mode);
      room.phase = 'ROLE_ASSIGNMENT';
      room.round = 0;
      room.startedAt = Date.now();
      room.lastActivityAt = Date.now();
      room.winnerTeam = undefined;
      room.winnerIds = undefined;
      room.events = [
        createEvent(0, 'ROLE_ASSIGNMENT', 'Rollar taqsimlandi. O‘yin boshlanmoqda!', 'Роли распределены. Игра начинается!'),
      ];
      const sec = room.settings.timers.roleAssignment;
      room.phaseEndsAt = Date.now() + sec * 1000;
      broadcastRoomState(room.code);
      cb?.({ ok: true });

      schedulePhaseTransition(room.code, sec, () => advanceToNight(room.code));
    });

    socket.on(
      'game:nightAction',
      (payload: { code: string; targetId?: string; secondaryTargetId?: string }, cb?: (res: unknown) => void) => {
        if (!checkSocketRateLimit(playerId, 15, 5000)) {
          return cb?.({ ok: false, error: 'Rate limit exceeded' });
        }
        const room = rooms.get(String(payload?.code || '').toUpperCase());
        if (!room) return cb?.({ ok: false, error: 'Room not found' });

        const check = validateNightAction(room, playerId, payload.targetId, payload.secondaryTargetId);
        if (!check.valid || !check.action) {
          return cb?.({ ok: false, error: check.error });
        }

        room.nightActions = room.nightActions.filter((a) => a.actorId !== playerId);
        room.nightActions.push(check.action);
        room.lastActivityAt = Date.now();
        broadcastRoomState(room.code);
        cb?.({ ok: true });
      }
    );

    socket.on('game:mayorReveal', (payload: { code: string }) => {
      const room = rooms.get(String(payload?.code || '').toUpperCase());
      if (!room || !['DAY', 'DISCUSSION', 'VOTING'].includes(room.phase)) return;
      const p = room.players.find((pl) => pl.id === playerId && pl.isAlive && pl.roleId === 'mayor');
      if (!p || p.isMayorRevealed) return;
      p.isMayorRevealed = true;
      room.events.push(
        createEvent(
          room.round,
          room.phase,
          `${p.username} o‘zini Shahar Hokimi sifatida oshkor qildi!`,
          `${p.username} раскрылся(лась) как Мэр города!`
        )
      );
      broadcastRoomState(room.code);
    });

    socket.on('game:vote', (payload: { code: string; targetId: string }, cb?: (res: unknown) => void) => {
      if (!checkSocketRateLimit(playerId, 20, 5000)) {
        return cb?.({ ok: false, error: 'Rate limit exceeded' });
      }
      const room = rooms.get(String(payload?.code || '').toUpperCase());
      if (!room || room.phase !== 'VOTING') return cb?.({ ok: false, error: 'Not in voting phase' });
      const voter = room.players.find((p) => p.id === playerId && p.isAlive && !p.isSpectator);
      if (!voter) return cb?.({ ok: false, error: 'Only alive players can vote' });
      if (voter.isSilenced) return cb?.({ ok: false, error: 'Silenced players cannot vote' });

      if (payload.targetId !== 'SKIP') {
        const target = room.players.find((p) => p.id === payload.targetId && p.isAlive && !p.isSpectator);
        if (!target) return cb?.({ ok: false, error: 'Invalid vote target' });
      }

      room.votes[playerId] = payload.targetId;
      room.lastActivityAt = Date.now();
      broadcastRoomState(room.code);
      cb?.({ ok: true });
    });

    socket.on('game:skipPhase', (payload: { code: string }) => {
      if (!checkSocketRateLimit(playerId, 10, 5000)) return;
      const room = rooms.get(String(payload?.code || '').toUpperCase());
      if (!room) return;
      const host = room.players.find((p) => p.id === playerId && p.isHost);
      if (!host) return;
      if (room.phase === 'NIGHT') advanceToDay(room.code);
      else if (room.phase === 'DAY') advanceToDiscussion(room.code);
      else if (room.phase === 'DISCUSSION') advanceToVoting(room.code);
      else if (room.phase === 'VOTING') advanceToExecution(room.code);
    });

    socket.on('game:playAgain', (payload: { code: string }) => {
      const room = rooms.get(String(payload?.code || '').toUpperCase());
      if (!room) return;
      const host = room.players.find((p) => p.id === playerId && p.isHost);
      if (!host) return;
      const t = roomTimers.get(room.code);
      if (t) clearTimeout(t);
      room.phase = 'LOBBY';
      room.round = 0;
      room.winnerTeam = undefined;
      room.winnerIds = undefined;
      room.votes = {};
      room.nightActions = [];
      room.nightFeedback = {};
      room.events = [];
      for (const p of room.players) {
        p.isAlive = !p.isSpectator;
        p.roleId = undefined;
        p.team = undefined;
        p.isReady = p.isHost || p.isBot;
      }
      broadcastRoomState(room.code);
    });

    // ======================== CHAT ========================

    socket.on('chat:send', (payload: { code: string; channel: 'PUBLIC' | 'MAFIA' | 'DEAD'; text: string }) => {
      const now = Date.now();
      const last = chatRateLimits.get(playerId) || 0;
      if (now - last < 500) return;
      chatRateLimits.set(playerId, now);

      const code = String(payload?.code || '').toUpperCase();
      const room = rooms.get(code);
      if (!room) return;
      const p = room.players.find((pl) => pl.id === playerId);
      if (!p) return;

      const text = String(payload?.text || '').trim().slice(0, 280);
      if (!text) return;

      if (payload.channel === 'PUBLIC') {
        if (room.phase === 'NIGHT' || !p.isAlive || p.isSilenced || p.isSpectator) return;
      } else if (payload.channel === 'MAFIA') {
        if (room.phase !== 'NIGHT' || p.team !== 'MAFIA' || !p.isAlive) return;
      } else if (payload.channel === 'DEAD') {
        if (p.isAlive && !p.isSpectator && p.roleId !== 'medium') return;
      }

      const msg: ChatMessage = {
        id: Math.random().toString(36).slice(2, 10),
        channel: payload.channel,
        senderId: p.id,
        senderName: p.username,
        text,
        timestamp: now,
        reactions: {},
      };
      const list = roomChat.get(code) || [];
      list.push(msg);
      if (list.length > 150) list.shift();
      roomChat.set(code, list);

      if (payload.channel === 'PUBLIC') {
        io.to(code).emit('chat:message', msg);
      } else if (payload.channel === 'MAFIA') {
        for (const pl of room.players) {
          if (pl.team === 'MAFIA' && !pl.isBot) {
            const conn = playerSockets.get(pl.id);
            if (conn) io.to(conn.socketId).emit('chat:message', msg);
          }
        }
      } else if (payload.channel === 'DEAD') {
        for (const pl of room.players) {
          if ((!pl.isAlive || pl.isSpectator || pl.roleId === 'medium') && !pl.isBot) {
            const conn = playerSockets.get(pl.id);
            if (conn) io.to(conn.socketId).emit('chat:message', msg);
          }
        }
      }
    });

    socket.on('chat:react', (payload: { code: string; messageId: string; emoji: string }) => {
      const code = String(payload?.code || '').toUpperCase();
      const list = roomChat.get(code);
      if (!list) return;
      const msg = list.find((m) => m.id === payload.messageId);
      if (!msg) return;
      const users = msg.reactions[payload.emoji] || [];
      if (users.includes(playerId)) {
        msg.reactions[payload.emoji] = users.filter((u) => u !== playerId);
      } else {
        msg.reactions[payload.emoji] = [...users, playerId];
      }
      io.to(code).emit('chat:reaction', { messageId: msg.id, reactions: msg.reactions });
    });

    // ======================== WEBRTC VOICE SIGNALING ========================

    socket.on('voice:join', (payload: { code: string }) => {
      const code = String(payload?.code || '').toUpperCase();
      const room = rooms.get(code);
      if (!room) return;
      const p = room.players.find((pl) => pl.id === playerId);
      if (!p) return;

      let peers = roomVoicePeers.get(code);
      if (!peers) {
        peers = new Set();
        roomVoicePeers.set(code, peers);
      }
      const existingPeers = Array.from(peers).filter((id) => id !== playerId);
      peers.add(playerId);

      // Tell joining peer who is already in voice
      socket.emit('voice:peers', { peers: existingPeers });
      // Notify others in room
      socket.to(code).emit('voice:peer-joined', { peerId: playerId });
    });

    socket.on('voice:leave', (payload: { code: string }) => {
      const code = String(payload?.code || '').toUpperCase();
      removeVoicePeer(code, playerId);
    });

    socket.on('voice:offer', (payload: { code: string; targetId: string; sdp: unknown }) => {
      const code = String(payload?.code || '').toUpperCase();
      const room = rooms.get(code);
      if (!room || !room.players.some((p) => p.id === playerId)) return;
      const targetConn = playerSockets.get(payload.targetId);
      if (targetConn && targetConn.roomCode === code) {
        io.to(targetConn.socketId).emit('voice:offer', { fromId: playerId, sdp: payload.sdp });
      }
    });

    socket.on('voice:answer', (payload: { code: string; targetId: string; sdp: unknown }) => {
      const code = String(payload?.code || '').toUpperCase();
      const room = rooms.get(code);
      if (!room || !room.players.some((p) => p.id === playerId)) return;
      const targetConn = playerSockets.get(payload.targetId);
      if (targetConn && targetConn.roomCode === code) {
        io.to(targetConn.socketId).emit('voice:answer', { fromId: playerId, sdp: payload.sdp });
      }
    });

    socket.on('voice:ice-candidate', (payload: { code: string; targetId: string; candidate: unknown }) => {
      const code = String(payload?.code || '').toUpperCase();
      const room = rooms.get(code);
      if (!room || !room.players.some((p) => p.id === playerId)) return;
      const targetConn = playerSockets.get(payload.targetId);
      if (targetConn && targetConn.roomCode === code) {
        io.to(targetConn.socketId).emit('voice:ice-candidate', { fromId: playerId, candidate: payload.candidate });
      }
    });

    socket.on('voice:state', (payload: { code: string; isMuted: boolean; isSpeaking: boolean }) => {
      const code = String(payload?.code || '').toUpperCase();
      const room = rooms.get(code);
      if (!room) return;
      const p = room.players.find((pl) => pl.id === playerId);
      if (!p) return;
      const allowed = getAllowedVoiceChannel(room, p);
      io.to(code).emit('voice:peer-state', {
        peerId: playerId,
        isMuted: allowed === 'MUTED' ? true : Boolean(payload.isMuted),
        isSpeaking: allowed === 'MUTED' ? false : Boolean(payload.isSpeaking),
        channel: allowed,
      });
    });

    // ======================== DISCONNECT ========================

    socket.on('disconnect', () => {
      const info = playerSockets.get(playerId);
      if (info?.roomCode) {
        removeVoicePeer(info.roomCode, playerId);
        const room = rooms.get(info.roomCode);
        if (room) {
          const p = room.players.find((pl) => pl.id === playerId);
          if (p) {
            p.isConnected = false;
            if (p.isHost && room.phase === 'LOBBY') {
              const nextHost = room.players.find((pl) => !pl.isBot && pl.isConnected && pl.id !== playerId);
              if (nextHost) {
                p.isHost = false;
                nextHost.isHost = true;
                nextHost.isReady = true;
              }
            }
            broadcastRoomState(room.code);
          }
        }
      }
    });
  });

  // Room expiration cleanup (2 hours inactivity)
  const cleanupInterval = setInterval(() => {
    const cutoff = Date.now() - 1000 * 60 * 120;
    for (const [code, room] of rooms.entries()) {
      if (room.lastActivityAt < cutoff) {
        const t = roomTimers.get(code);
        if (t) clearTimeout(t);
        rooms.delete(code);
        roomChat.delete(code);
        roomVoicePeers.delete(code);
        removeRoomFromPostgres(code);
      }
    }
  }, 60000 * 5);

  function closeServer(): Promise<void> {
    clearInterval(cleanupInterval);
    for (const t of roomTimers.values()) clearTimeout(t);
    roomTimers.clear();
    return new Promise((resolve) => {
      io.close(() => {
        server.close(() => resolve());
      });
    });
  }

  return { app, server, io, rooms, closeServer };
}
