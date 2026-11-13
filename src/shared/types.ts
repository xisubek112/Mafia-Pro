export type Language = 'uz' | 'ru';

export type Team = 'MAFIA' | 'TOWN' | 'NEUTRAL';

export type GameMode = 'CLASSIC' | 'ADVANCED' | 'CHAOS';

export type GamePhase =
  | 'LOBBY'
  | 'ROLE_ASSIGNMENT'
  | 'NIGHT'
  | 'DAY'
  | 'DISCUSSION'
  | 'VOTING'
  | 'EXECUTION'
  | 'VICTORY'
  | 'NEW_GAME';

export type RoleId =
  // MAFIA TEAM (7)
  | 'don'
  | 'mafia'
  | 'consigliere'
  | 'silencer'
  | 'framer'
  | 'janitor'
  | 'godfather'
  // TOWN TEAM (13)
  | 'citizen'
  | 'sheriff'
  | 'doctor'
  | 'bodyguard'
  | 'detective'
  | 'veteran'
  | 'vigilante'
  | 'mayor'
  | 'medium'
  | 'lookout'
  | 'tracker'
  | 'escort'
  | 'jailer'
  // NEUTRAL TEAM (10)
  | 'serial_killer'
  | 'jester'
  | 'survivor'
  | 'arsonist'
  | 'witch'
  | 'executioner'
  | 'amnesiac'
  | 'guardian_angel'
  | 'plaguebearer'
  | 'vampire';

export interface RoleDefinition {
  id: RoleId;
  team: Team;
  name: Record<Language, string>;
  shortDesc: Record<Language, string>;
  abilityName: Record<Language, string>;
  abilityDesc: Record<Language, string>;
  actionPhase: 'NIGHT' | 'DAY' | 'PASSIVE' | 'BOTH';
  targetType: 'OTHER_ALIVE' | 'ANY_ALIVE' | 'SELF' | 'DEAD' | 'TWO_ALIVE' | 'NONE';
  cooldown: number; // nights between uses (0 = every night)
  maxUses: number; // -1 = unlimited
  priority: number; // lower executes first at night
  winCondition: Record<Language, string>;
  limitations: Record<Language, string>;
  modes: GameMode[];
  minPlayers: number;
  imageUrl: string;
}

export interface PhaseTimers {
  roleAssignment: number;
  night: number;
  day: number;
  discussion: number;
  voting: number;
  execution: number;
}

export interface RoomSettings {
  mode: GameMode;
  maxPlayers: number; // 5 - 20
  isPrivate: boolean;
  timers: PhaseTimers;
  allowSpectators: boolean;
  fillWithBots: boolean;
  revealRolesOnDeath?: boolean;
}

export interface NightAction {
  actorId: string;
  roleId: RoleId;
  targetId?: string;
  secondaryTargetId?: string;
  actionType: 'KILL' | 'HEAL' | 'PROTECT' | 'INVESTIGATE' | 'BLOCK' | 'SILENCE' | 'FRAME' | 'CLEAN' | 'ALERT' | 'REVEAL' | 'DOUSE' | 'IGNITE' | 'CONTROL' | 'REMEMBER' | 'INFECT' | 'BITE' | 'JAIL' | 'SEANCE' | 'WATCH' | 'TRACK';
  nightNumber: number;
}

export type FunctionalItemCategory =
  | 'STATISTICS_RESET'
  | 'DOCUMENTS'
  | 'PROTECTIVE_MASK'
  | 'RIFLE'
  | 'WHITE_KILLER_PROTECTION'
  | 'VOTING_PROTECTION'
  | 'ROLE_PURCHASE';

export type FunctionalEffectType =
  | 'STATS_RESET'
  | 'DOC_INVESTIGATE'
  | 'DOC_IDENTITY'
  | 'DOC_PROTECTION'
  | 'DOC_EVIDENCE'
  | 'MASK_STATUS_BLOCK'
  | 'RIFLE_NIGHT_STRIKE'
  | 'WHITE_KILLER_SHIELD'
  | 'VOTE_PARDON_SHIELD'
  | 'ROLE_UNLOCK'
  | 'ROLE_TOKEN';

export type FunctionalItemType = 'CONSUMABLE' | 'DURATION' | 'PERMANENT_UNLOCK' | 'ACCOUNT_UTILITY';

export interface ActiveMatchItemState {
  inventoryItemId: string;
  productId: string;
  category: FunctionalItemCategory;
  effectType: FunctionalEffectType;
  remainingRounds?: number; // 1 for round-scoped, -1 for whole match
  activatedAtRound: number;
  consumed?: boolean;
}

export interface PlayerState {
  id: string;
  username: string;
  avatar: string;
  isBot: boolean;
  isHost: boolean;
  isReady: boolean;
  isConnected: boolean;
  isAlive: boolean;
  isSpectator: boolean;
  // Secret fields — stripped before sending to unauthorized clients
  roleId?: RoleId;
  team?: Team;
  desiredRoleId?: RoleId;
  desiredRoleInventoryId?: string;
  // Active in-match functional items (private to owner & server)
  activeMatchItems?: ActiveMatchItemState[];
  usedItemCountsInMatch?: Record<string, number>;
  // Transient status effects
  isSilenced: boolean;
  isFramed: boolean;
  isJailed: boolean;
  isDoused: boolean;
  isInfected: boolean;
  isMayorRevealed: boolean;
  protectedByGA?: string;
  executionerTargetId?: string;
  gaTargetId?: string;
  // Ability tracking
  abilityCooldowns: Partial<Record<RoleId, number>>;
  abilityUses: Partial<Record<RoleId, number>>;
  lastProtectedTargetId?: string;
  deathReason?: string;
  eliminatedOnRound?: number;
  eliminatedBy?: 'MAFIA' | 'VOTE' | 'KILLER' | 'VIGILANTE' | 'VETERAN' | 'ARSONIST' | 'JAILER' | 'BODYGUARD' | 'RIFLE';
  cleanedRole?: boolean;
  investigationHistory?: {
    targetId: string;
    targetUsername: string;
    round: number;
    result: 'SUSPICIOUS' | 'INNOCENT' | 'TOWN' | 'MAFIA' | 'NEUTRAL';
    roleId?: RoleId;
    team?: Team;
    label: Record<Language, string>;
  }[];
}

export interface PublicPlayerView {
  id: string;
  username: string;
  avatar: string;
  isBot: boolean;
  isHost: boolean;
  isReady: boolean;
  isConnected: boolean;
  isAlive: boolean;
  isSpectator: boolean;
  isSilenced: boolean;
  isJailed: boolean;
  isMayorRevealed: boolean;
  isDoused: boolean;
  isInfected: boolean;
  deathReason?: string;
  eliminatedOnRound?: number;
  // Only populated for self, dead players (unless cleaned), mafia teammates, or after game ends
  revealedRoleId?: RoleId;
  revealedTeam?: Team;
  investigatedByMe?: {
    result: 'SUSPICIOUS' | 'INNOCENT' | 'TOWN' | 'MAFIA' | 'NEUTRAL';
    roleId?: RoleId;
    team?: Team;
    label: Record<Language, string>;
  };
}

export interface ChatMessage {
  id: string;
  channel: 'PUBLIC' | 'MAFIA' | 'DEAD' | 'SYSTEM';
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  reactions: Record<string, string[]>; // emoji -> userIds
}

export interface GameEvent {
  id: string;
  round: number;
  phase: GamePhase;
  text: Record<Language, string>;
  timestamp: number;
  visibility: 'PUBLIC' | 'MAFIA' | 'PRIVATE';
  targetPlayerId?: string;
}

export interface VoteState {
  votes: Record<string, string>; // voterId -> targetId or 'SKIP'
}

export interface RoomStateView {
  code: string;
  name: string;
  settings: RoomSettings;
  phase: GamePhase;
  round: number;
  phaseEndsAt: number;
  serverTime?: number;
  players: PublicPlayerView[];
  votes: Record<string, string>;
  events: GameEvent[];
  winnerTeam?: Team | 'JESTER' | 'EXECUTIONER' | 'SERIAL_KILLER' | 'ARSONIST' | 'PLAGUEBEARER' | 'VAMPIRE' | 'DRAW';
  winnerIds?: string[];
  myPrivateData?: {
    playerId: string;
    roleId?: RoleId;
    team?: Team;
    desiredRoleId?: RoleId;
    mafiaTeammates: string[];
    nightFeedback: string[];
    hasActedThisNight: boolean;
    currentNightTargetId?: string;
    currentSecondaryTargetId?: string;
    cooldownRemaining: number;
    usesRemaining: number;
    executionerTargetId?: string;
    gaTargetId?: string;
    activeMatchItems?: ActiveMatchItemState[];
    usedItemCountsInMatch?: Record<string, number>;
    investigationDossier?: {
      targetId: string;
      targetUsername: string;
      round: number;
      result: 'SUSPICIOUS' | 'INNOCENT' | 'TOWN' | 'MAFIA' | 'NEUTRAL';
      roleId?: RoleId;
      team?: Team;
      label: Record<Language, string>;
    }[];
  };
}

export type CosmeticCategory =
  | 'AVATAR'
  | 'FRAME'
  | 'CARD_SKIN'
  | 'NAME_EFFECT'
  | 'CHAT_DECORATION'
  | 'PROFILE_BG'
  | 'BADGE'
  | 'VICTORY_ANIM'
  | 'LOBBY_THEME';

export type TournamentFormat = 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN';

export interface SubscriptionState {
  tier: 'FREE' | 'ELITE';
  status: 'NONE' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  expiresAt?: number;
  provider?: string;
  verified: boolean;
}

export interface DailyRewardState {
  streak: number;
  lastClaimAt: number;
  totalClaims: number;
}

export interface MissionProgressState {
  progress: number;
  claimed: boolean;
  periodKey: string;
}

export interface RecentPlayerEntry {
  userId: string;
  username: string;
  lastPlayedAt: number;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar: string;
  country: string;
  role: 'USER' | 'ADMIN';
  adminRole?: AdminRoleSlug;
  isBanned: boolean;
  banReason?: string;
  suspendedUntil?: number;
  isFlagged?: boolean;
  flagReason?: string;
  warningsCount?: number;
  lastWarningReason?: string;
  notifications?: { id: string; title: string; message: string; createdAt: number; read: boolean }[];
  level: number;
  xp: number;
  weeklyXp: number;
  monthlyXp: number;
  rating: number;
  tournamentPoints: number;
  gold: number;
  diamonds: number;
  totalGames: number;
  wins: number;
  losses: number;
  draws?: number;
  weeklyWins: number;
  monthlyWins: number;
  winStreak: number;
  bestWinStreak: number;
  highestRating?: number;
  modeRatings?: Partial<Record<GameMode, number>>;
  totalPlaytimeSec?: number;
  clanId?: string;
  clanTag?: string;
  referralCode?: string;
  referredBy?: string;
  successfulReferralsCount?: number;
  claimedReferralMilestones?: number[];
  favoriteRole?: RoleId;
  favoriteMode?: GameMode;
  rolePlayCounts: Record<string, number>;
  modePlayCounts: Record<string, number>;
  achievements: string[];
  activeTitle?: string;
  unlockedTitles: string[];
  ownedCosmetics: string[];
  equippedCosmetics: Partial<Record<CosmeticCategory, string>>;
  unlockedRoles?: RoleId[];
  activeRolePreference?: RoleId;
  subscription: SubscriptionState;
  dailyReward: DailyRewardState;
  missionProgress: Record<string, MissionProgressState>;
  friends: string[];
  friendRequestsIn: string[];
  friendRequestsOut: string[];
  blockedUsers: string[];
  recentPlayers: RecentPlayerEntry[];
  createdAt: number;
  lastSeenAt: number;
}

export interface AchievementDef {
  id: string;
  category: 'PROGRESSION' | 'COMBAT' | 'MASTERY' | 'SOCIAL' | 'SURVIVAL';
  name: Record<Language, string>;
  description: Record<Language, string>;
  xpReward: number;
  goldReward: number;
  diamondReward?: number;
  titleId?: string;
  icon: string;
}

export interface TitleDef {
  id: string;
  name: Record<Language, string>;
  color: string;
}

export interface CosmeticItem {
  id: string;
  category: CosmeticCategory;
  name: Record<Language, string>;
  description: Record<Language, string>;
  priceGold?: number;
  priceDiamonds?: number;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  premiumOnly?: boolean;
  previewColor: string;
}

export interface CurrencyTransaction {
  id: string;
  userId: string;
  username: string;
  currency: 'GOLD' | 'DIAMONDS';
  amount: number;
  type: 'GAME_REWARD' | 'DAILY_REWARD' | 'MISSION_REWARD' | 'ACHIEVEMENT' | 'PURCHASE' | 'TOURNAMENT_PRIZE' | 'ADMIN_ADJUST';
  description: string;
  createdAt: number;
}

export interface MissionDef {
  id: string;
  period: 'DAILY' | 'WEEKLY';
  name: Record<Language, string>;
  description: Record<Language, string>;
  metric: 'GAMES_PLAYED' | 'WINS' | 'SURVIVED' | 'TOURNAMENT_JOIN';
  target: number;
  xpReward: number;
  goldReward: number;
  diamondReward?: number;
}

export interface TournamentMatch {
  id: string;
  round: number;
  matchNumber: number;
  bracket: 'WINNERS' | 'LOSERS' | 'GRAND_FINAL' | 'ROUND_ROBIN';
  player1Id?: string;
  player2Id?: string;
  winnerId?: string;
  status: 'PENDING' | 'COMPLETED';
  scheduledAt: number;
}

export interface Tournament {
  id: string;
  name: string;
  format: TournamentFormat;
  mode: GameMode;
  maxPlayers: number;
  prizeGold: number;
  prizeDiamonds: number;
  entryFeeGold: number;
  status: 'REGISTRATION' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdBy: string;
  participants: string[];
  matches: TournamentMatch[];
  winnerId?: string;
  podiumIds: string[];
  createdAt: number;
  startsAt: number;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  details: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  createdAt: number;
}

export interface GameHistoryRecord {
  id: string;
  roomCode: string;
  mode: GameMode;
  playerCount: number;
  winner: string;
  rounds: number;
  durationSec: number;
  endedAt: number;
  players: {
    userId: string;
    username: string;
    roleId: RoleId;
    team: Team;
    won: boolean;
    survived: boolean;
  }[];
}

export interface ModerationReport {
  id: string;
  reporterId: string;
  reporterName: string;
  targetUserId: string;
  targetUsername: string;
  roomCode: string;
  category?: 'USER' | 'CHAT' | 'VOICE' | 'SPAM' | 'HARASSMENT';
  reason: string;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  moderatorId?: string;
  moderatorNote?: string;
  actionTaken?: string;
  appealStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  resolvedAt?: number;
  createdAt: number;
}

export type PaymentProvider = 'PAYME' | 'CLICK' | 'SANDBOX';
export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUND_REQUESTED' | 'REFUNDED';

export interface VipPlan {
  id: string;
  code: string;
  name: Record<Language, string>;
  description: Record<Language, string>;
  priceUzs: number;
  durationDays: number;
  isActive: boolean;
  features: Record<Language, string[]>;
  createdAt: number;
  updatedAt: number;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';
  startedAt: number;
  expiresAt: number;
  orderId?: string;
  provider?: PaymentProvider;
  createdAt: number;
}

export interface FunctionalEffectConfig {
  allowedModes?: GameMode[];
  allowedPhases?: GamePhase[];
  allowedRoles?: RoleId[];
  blockedRoles?: RoleId[];
  durationScope?: 'ROUND' | 'MATCH' | 'PERMANENT';
  documentKind?: 'INVESTIGATION' | 'IDENTITY' | 'PROTECTION' | 'EVIDENCE';
  maxPerMatch?: number;
  consumable?: boolean;
  requiresTarget?: boolean;
  targetRoleId?: RoleId;
  resettableFields?: (
    | 'wins'
    | 'losses'
    | 'draws'
    | 'totalGames'
    | 'winStreak'
    | 'bestWinStreak'
    | 'rolePlayCounts'
    | 'modePlayCounts'
  )[];
  customRuleNote?: Record<Language, string>;
}

export interface ProductCategory {
  id: string;
  slug: FunctionalItemCategory | CosmeticCategory;
  name: Record<Language, string>;
  description?: Record<Language, string>;
  sortOrder: number;
  isActive: boolean;
}

export interface ShopProduct {
  id: string;
  category: FunctionalItemCategory | CosmeticCategory;
  name: Record<Language, string>;
  description: Record<Language, string>;
  imageUrl: string;
  priceUzs: number;
  priceGold?: number;
  priceDiamonds?: number;
  currencyMode?: 'UZS' | 'GOLD' | 'DIAMONDS' | 'HYBRID';
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  previewColor: string;
  itemType?: FunctionalItemType;
  effectType?: FunctionalEffectType;
  effectConfig?: FunctionalEffectConfig;
  usageCondition?: Record<Language, string>;
  maxUsesPerItem?: number; // -1 = unlimited, 1+ = charges
  purchaseLimitPerUser?: number; // -1 = unlimited, 1+ = max total active/owned
  durationHours?: number; // 0 or undefined = permanent until used
  isUnique: boolean;
  vipOnly: boolean;
  isActive: boolean;
  isArchived?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type InventoryItemStatus = 'ACTIVE' | 'EQUIPPED' | 'CONSUMED' | 'EXPIRED';

export interface InventoryItemRecord {
  id: string;
  userId: string;
  productId: string;
  category: FunctionalItemCategory | CosmeticCategory;
  effectType?: FunctionalEffectType;
  itemName?: Record<Language, string>;
  quantity?: number;
  remainingUses?: number;
  maxUsesPerItem?: number;
  status?: InventoryItemStatus;
  targetRoleId?: RoleId;
  orderId?: string;
  acquiredAt: number;
  purchasedAt?: number;
  expiresAt?: number;
  lastUsedAt?: number;
}

export interface InventoryTransactionRecord {
  id: string;
  userId: string;
  username: string;
  inventoryItemId?: string;
  productId: string;
  productName: string;
  action: 'PURCHASED' | 'CONSUMED' | 'ACTIVATED' | 'EXPIRED' | 'REFUNDED' | 'ADMIN_GRANTED' | 'STATISTICS_RESET';
  quantityDelta: number;
  usesDelta: number;
  matchId?: string;
  roomCode?: string;
  details: string;
  createdAt: number;
}

export interface ItemUsageHistoryRecord {
  id: string;
  userId: string;
  username: string;
  inventoryItemId: string;
  productId: string;
  category: FunctionalItemCategory;
  effectType: FunctionalEffectType;
  roomCode?: string;
  matchId?: string;
  round?: number;
  phase?: GamePhase;
  targetId?: string;
  targetName?: string;
  outcome: string;
  createdAt: number;
}

export interface StatisticsResetRecord {
  id: string;
  userId: string;
  username: string;
  inventoryItemId: string;
  resetFields: string[];
  previousSnapshot: {
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
    winStreak: number;
    bestWinStreak: number;
  };
  preservedEloRating: number;
  createdAt: number;
}

export interface OrderRecord {
  id: string;
  userId: string;
  username: string;
  orderType: 'VIP_PLAN' | 'SHOP_PRODUCT';
  referenceId: string;
  itemName: string;
  amountUzs: number;
  discountUzs: number;
  promoCode?: string;
  provider: PaymentProvider;
  status: OrderStatus;
  refundReason?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  userId: string;
  provider: PaymentProvider;
  providerTxId: string;
  amountUzs: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  idempotencyKey: string;
  paidAt?: number;
  createdAt: number;
}

export interface PaymentEventRecord {
  id: string;
  provider: PaymentProvider;
  eventType: string;
  orderId?: string;
  providerTxId?: string;
  signatureValid: boolean;
  payloadSummary: string;
  createdAt: number;
}

export type AdminRoleSlug =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MODERATOR'
  | 'SHOP_MANAGER'
  | 'FINANCE_MANAGER'
  | 'TOURNAMENT_MANAGER';

export type AdminModuleId =
  | 'dashboard'
  | 'users'
  | 'vip'
  | 'shop'
  | 'payments'
  | 'rooms'
  | 'roles'
  | 'tournaments'
  | 'moderation'
  | 'notifications'
  | 'promos'
  | 'settings'
  | 'admins'
  | 'analytics'
  | 'system';

export interface ModulePermissionSet {
  read: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface AdminRoleDef {
  slug: AdminRoleSlug;
  name: Record<Language, string>;
  description: Record<Language, string>;
  permissions: Record<AdminModuleId, ModulePermissionSet>;
}

export interface AdminNotificationRecord {
  id: string;
  title: string;
  content: string;
  audience: 'GLOBAL' | 'VIP' | 'TOURNAMENT' | 'PRODUCT' | 'MAINTENANCE' | 'SELECTED';
  targetUserIds: string[];
  status: 'SENT' | 'SCHEDULED' | 'CANCELLED';
  recipientCount: number;
  createdBy: string;
  scheduledAt?: number;
  createdAt: number;
}

export interface RoleConfigOverride {
  roleId: RoleId;
  name?: Record<Language, string>;
  description?: Record<Language, string>;
  abilityName?: Record<Language, string>;
  team?: Team;
  rarity?: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  imageUrl?: string;
  isActive: boolean;
  updatedAt: number;
}

export interface WebsiteSettings {
  siteTitle: string;
  logoUrl: string;
  faviconUrl: string;
  heroTitle: Record<Language, string>;
  bannerText: Record<Language, string>;
  socialLinks: {
    telegram: string;
    discord: string;
    instagram: string;
    youtube: string;
  };
  adsEnabled: boolean;
  privacyPolicy: string;
  termsOfService: string;
  updatedAt: number;
}

export interface SystemEventRecord {
  id: string;
  eventType: 'FAILED_LOGIN' | 'SECURITY' | 'API_ERROR' | 'BACKUP' | 'SYSTEM';
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  source: string;
  message: string;
  createdAt: number;
}

export interface PromoRedemptionRecord {
  id: string;
  promoId: string;
  code: string;
  userId: string;
  username: string;
  orderId: string;
  discountUzs: number;
  redeemedAt: number;
}

export interface PromoCampaign {
  id: string;
  code: string;
  title: Record<Language, string>;
  discountType?: 'PERCENT' | 'FIXED';
  discountPercent: number;
  fixedAmountUzs?: number;
  appliesTo: 'ALL' | 'VIP_PLAN' | 'SHOP_PRODUCT';
  maxUses?: number;
  perUserLimit?: number;
  usedCount?: number;
  isActive: boolean;
  startsAt?: number;
  expiresAt?: number;
  createdAt: number;
}

export interface AdminOverview {
  totalUsers: number;
  newUsersToday: number;
  onlineUsersCount: number;
  bannedUsers: number;
  activeRooms: number;
  activePlayersInRooms: number;
  totalGamesPlayed: number;
  totalGoldInCirculation: number;
  totalDiamondsInCirculation: number;
  totalRevenueUzs: number;
  todayOrdersCount: number;
  refundedTotalUzs: number;
  activeVipCount: number;
  paidOrdersCount: number;
  pendingRefundsCount: number;
  failedLoginsCount: number;
  uptimeSec: number;
  dbMode: 'postgres' | 'local';
  users: Omit<UserProfile, 'rolePlayCounts' | 'modePlayCounts' | 'missionProgress'>[];
  rooms: {
    code: string;
    name: string;
    mode: GameMode;
    phase: GamePhase;
    playerCount: number;
    maxPlayers: number;
    isPrivate?: boolean;
    hostName?: string;
    createdAt: number;
  }[];
  reports: ModerationReport[];
  recentTransactions: CurrencyTransaction[];
  auditLogs: AuditLogEntry[];
  tournaments: Tournament[];
  vipPlans: VipPlan[];
  subscriptions: SubscriptionRecord[];
  categories: ProductCategory[];
  products: ShopProduct[];
  orders: OrderRecord[];
  payments: PaymentRecord[];
  paymentEvents: PaymentEventRecord[];
  campaigns: PromoCampaign[];
  promoRedemptions: PromoRedemptionRecord[];
  notifications: AdminNotificationRecord[];
  roleConfigs: RoleConfigOverride[];
  websiteSettings: WebsiteSettings;
  adminRoles: AdminRoleDef[];
  systemEvents: SystemEventRecord[];
  backups: { file: string; sizeBytes: number; createdAt: number }[];
  serverConfig: {
    maintenanceMode: boolean;
    defaultTimers: PhaseTimers;
    enabledModes: GameMode[];
  };
  shopAnalytics?: {
    totalFunctionalOrders: number;
    totalFunctionalPurchases: number;
    totalItemUsages: number;
    totalStatsResets: number;
    activeInventoryItems: number;
    productStats: {
      productId: string;
      name: Record<Language, string>;
      category: string;
      totalSold: number;
      activeOwned: number;
      totalConsumed: number;
    }[];
    recentUsageHistory: ItemUsageHistoryRecord[];
  };
}

// ----------------------------------------------------
// ADVANCED GAMING ECOSYSTEM (15 FEATURES) SCHEMAS
// ----------------------------------------------------

export type RankTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'MASTER' | 'GRANDMASTER';

export interface RatingHistoryEntry {
  id: string;
  userId: string;
  username: string;
  mode: GameMode;
  oldRating: number;
  newRating: number;
  delta: number;
  matchId?: string;
  reason: 'MATCH_WIN' | 'MATCH_LOSS' | 'MATCH_DRAW' | 'ADMIN_RESET' | 'SEASON_RESET';
  createdAt: number;
}

export interface BattlePassReward {
  type: 'GOLD' | 'DIAMONDS' | 'AVATAR' | 'FRAME' | 'BADGE' | 'TITLE' | 'VIP_DAYS';
  amount?: number;
  itemId?: string;
  label: Record<Language, string>;
}

export interface BattlePassLevel {
  level: number;
  xpRequired: number;
  freeReward: BattlePassReward;
  vipReward: BattlePassReward;
}

export interface SeasonRecord {
  id: string;
  number: number;
  title: Record<Language, string>;
  description: Record<Language, string>;
  startsAt: number;
  endsAt: number;
  isActive: boolean;
  levels: BattlePassLevel[];
  totalXpPerLevel: number;
}

export interface UserSeasonProgress {
  userId: string;
  seasonId: string;
  currentLevel: number;
  currentXp: number;
  claimedFreeLevels: number[];
  claimedVipLevels: number[];
  completedMissions: string[];
}

export type ClanRole = 'LEADER' | 'OFFICER' | 'MEMBER';

export interface ClanMember {
  userId: string;
  username: string;
  avatar: string;
  role: ClanRole;
  joinedAt: number;
  rating: number;
  contributionXp: number;
}

export interface ClanRecord {
  id: string;
  name: string;
  tag: string;
  description: string;
  logoUrl: string;
  leaderId: string;
  leaderName: string;
  members: ClanMember[];
  memberLimit: number;
  level: number;
  totalRating: number;
  announcements: { id: string; author: string; text: string; createdAt: number }[];
  isSuspended?: boolean;
  createdAt: number;
}

export interface ClanInvitation {
  id: string;
  clanId: string;
  clanName: string;
  clanTag: string;
  inviterId: string;
  inviterName: string;
  inviteeId: string;
  inviteeName: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: number;
}

export interface ReplayEvent {
  timestamp: number;
  round: number;
  phase: GamePhase;
  type: 'PHASE_CHANGE' | 'CHAT' | 'VOTE' | 'ELIMINATION' | 'VERDICT' | 'VICTORY';
  actorId?: string;
  actorName?: string;
  targetId?: string;
  targetName?: string;
  text?: string;
  data?: Record<string, unknown>;
}

export interface ReplayRecord {
  id: string;
  matchId: string;
  roomCode: string;
  mode: GameMode;
  rounds: number;
  durationSec: number;
  winner: string;
  players: {
    userId: string;
    username: string;
    roleId: RoleId;
    team: Team;
    won: boolean;
  }[];
  events: ReplayEvent[];
  createdAt: number;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  recipientId: string;
  recipientName: string;
  text: string;
  read: boolean;
  createdAt: number;
}

export interface ConversationSummary {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string;
  isOnline: boolean;
  lastMessage: string;
  lastMessageAt: number;
  unreadCount: number;
}

export interface SpectatorSession {
  roomCode: string;
  userId: string;
  username: string;
  joinedAt: number;
}

export interface VoiceModerationEvent {
  id: string;
  roomCode: string;
  targetUserId: string;
  targetUsername: string;
  action: 'MUTE' | 'UNMUTE' | 'ROOM_MUTE_ALL' | 'RESTRICT';
  moderatorId: string;
  createdAt: number;
}

export type SecurityEventType =
  | 'IMPOSSIBLE_TRANSITION'
  | 'RATE_LIMIT_BURST'
  | 'INVALID_VOTE'
  | 'ROLE_TAMPERING'
  | 'WIN_TRADING'
  | 'COORDINATED_ABUSE';

export interface SecurityEventRecord {
  id: string;
  userId: string;
  username: string;
  ip: string;
  type: SecurityEventType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: string;
  status: 'PENDING' | 'REVIEWED' | 'DISMISSED' | 'ACTIONED';
  reviewedBy?: string;
  actionNote?: string;
  createdAt: number;
}

export interface MatchmakingTicket {
  userId: string;
  username: string;
  rating: number;
  mode: GameMode;
  lang: Language;
  queuedAt: number;
  minRating: number;
  maxRating: number;
  socketId?: string;
}

export interface ReferralRecord {
  id: string;
  referrerId: string;
  referrerUsername: string;
  referredUserId: string;
  referredUsername: string;
  status: 'PENDING' | 'QUALIFIED' | 'REWARDED';
  registeredAt: number;
  qualifiedAt?: number;
  rewardClaimed: boolean;
}

export interface AiKnowledgeArticle {
  id: string;
  category: 'RULES' | 'ROLES' | 'VIP' | 'ECONOMY' | 'CLANS' | 'TOURNAMENTS' | 'TROUBLESHOOTING';
  title: Record<Language, string>;
  content: Record<Language, string>;
  tags: string[];
}

export interface SupportTicket {
  id: string;
  userId: string;
  username: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  responses: {
    id: string;
    authorId: string;
    authorName: string;
    isStaff: boolean;
    message: string;
    createdAt: number;
  }[];
  createdAt: number;
  updatedAt: number;
}


